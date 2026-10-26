import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import type { Prisma, Rental, Vehicle } from '@prisma/client';
import { CommandChangedEvent, EV, RentalChangedEvent, VehicleStatusChangedEvent } from '../../common/events';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../../common/problem';
import { IOT_GATEWAY, type IotGateway } from '../../ports/iot-gateway.port';
import { RENTAL_BILLING, type RentalBillingPort } from '../../ports/rental-billing.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { AuditService } from '../audit/audit.service';
import { isAdmin, type Principal } from '../auth/principal';
import { CommandsService } from '../commands/commands.service';
import { FeeCharge, PriceSnapshot, PricingService } from '../pricing/pricing.service';
import { OPEN_SWAP_STATUSES } from '../station-swaps/station-swap.rules';
import { StationSwapsService } from '../station-swaps/station-swaps.service';
import { ZonesService } from '../zones/zones.service';
import { rentalTimes, toRental } from './rentals.mapper';
import { ExclusiveJob, jobLockTtl } from '../../common/job-lock';
import { appendWalletEntry, walletCentsAvailable } from '../wallet/wallet-ledger';

export const FORCE_END_FEE_CODE = 'force_end_outside_return_zone';
export const FORCE_END_FEE_DEFAULT_CENTS = 1500;
/** Mesmo código de `SWAP_FEE_CODE` (módulo station-swaps), sem importar o módulo para cá. */
export const STATION_SWAP_FEE_CODE = 'battery_swap_fee';

/**
 * Troca de bateria na estação em andamento no aluguel (fix 1, I7): o cliente não encerra nem troca de moto no meio dela
 * (`409 swap-open`). O encerramento forçado pelo staff continua permitido (emergência).
 */
export async function hasOpenStationSwap(prisma: Pick<PrismaService, 'stationSwap'>, rentalId: string): Promise<boolean> {
  const open = await prisma.stationSwap.findFirst({ where: { rentalId, status: { in: OPEN_SWAP_STATUSES } }, select: { id: true } });
  return !!open;
}
/** Intervalo mínimo entre tentativas de travamento de um aluguel em `ending`. */
export const END_RETRY_INTERVAL_MS = 30_000;
/** Depois de tantas tentativas sem "travada", para de reenviar e chama a operação (alerta). */
export const MAX_END_ATTEMPTS = 10;
const SYSTEM = { system: true as const, name: 'encerramento' };

type RentalWithVehicle = Rental & { vehicle: Vehicle };

/**
 * Onde a moto termina: `street` (ponto verde, padrão) ou `depot` (devolução no galpão, Task 6 — quem chama já põe a moto
 * no galpão). Na rua, moto do galpão vai para `awaiting_pickup` com uma tarefa `collect`; moto de rua volta a `free`.
 */
export type ReturnTo = 'street' | 'depot';
/** Chegada no galpão: onde e em que status a moto termina (gravados juntos na transição de fechamento). */
export interface DepotPlacement {
  depotId: string;
  targetStatus: 'free' | 'maintenance';
  /** Posição do galpão: a moto passa a estar lá (como na chegada do recolhimento); o rastreador confirma na telemetria. */
  lat?: number;
  lng?: number;
}

/** `lat`/`lng` do galpão para gravar junto com a chegada (só quando os dois vieram). */
export function depotPosition(p: { lat?: number | null; lng?: number | null } | null | undefined): { lat: number; lng: number } | Record<string, never> {
  return p && typeof p.lat === 'number' && typeof p.lng === 'number' && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? { lat: p.lat, lng: p.lng } : {};
}
/**
 * Opções internas do encerramento pelo cliente (nunca vêm do corpo da requisição). `allowOutsideZone`: só o atalho de teste
 * `POST /rentals/{id}/test-end` (`ALLOW_TEST_HANDOVER=true`) passa — pula apenas a conferência do ponto verde.
 */
export interface EndOptions {
  allowOutsideZone?: boolean;
}

export interface FinalizeOptions {
  fees?: FeeCharge[];
  actor?: Principal;
  returnTo?: ReturnTo;
  /** Com `returnTo: 'depot'`: status final e `depotId` numa única transição (nunca `free` sem galpão no meio). */
  depot?: DepotPlacement;
}

/**
 * Encerramento: só em zona `return`, com a foto emitida, e com o rastreador confirmando "parada e travada".
 * Sem confirmação → `ending` (202) e retentativa. Liquidação única por aluguel (chave `rental-settlement:<id>`).
 */
@Injectable()
export class RentalEndService {
  private readonly logger = new Logger('RentalEndService');
  private readonly finalizing = new Map<string, ReturnType<RentalEndService['doFinalize']>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    @Inject(RENTAL_BILLING) private readonly billing: RentalBillingPort,
    private readonly commands: CommandsService,
    private readonly zones: ZonesService,
    @Inject(IOT_GATEWAY) private readonly iot: IotGateway,
    private readonly events: EventEmitter2,
    private readonly audit: AuditService,
    private readonly alerts: AlertsService,
    // Fix 2 (M-2): fecha trocas abertas na estação quando o staff encerra o aluguel. Opcional: módulos que montam o serviço
    // sem a estação (testes) seguem funcionando.
    @Optional() private readonly stationSwaps?: StationSwapsService,
  ) {}

  /** Fecha as trocas na estação ainda abertas antes de um encerramento pelo staff (forçado ou no galpão). */
  private async closeStationSwaps(rentalId: string): Promise<void> {
    await this.stationSwaps?.closeForRentalEnd(rentalId).catch((err) => this.logger.error({ msg: 'station_swaps_close_failed', rentalId, error: (err as Error).message }));
  }

  private async load(rentalId: string): Promise<RentalWithVehicle> {
    const r = await this.prisma.rental.findUnique({ where: { id: rentalId }, include: { vehicle: true } });
    if (!r) throw notFound('Aluguel não encontrado.');
    return r as RentalWithVehicle;
  }

  /** Posição atual: estado ao vivo do rastreador ou a última posição gravada. */
  private async positionOf(vehicle: Vehicle): Promise<{ lat: number; lng: number }> {
    try {
      const live = await this.iot.getLiveState(vehicle.thingName);
      if (live) return { lat: live.lat, lng: live.lng };
    } catch (err) {
      this.logger.warn({ msg: 'live_state_failed', vehicleId: vehicle.id, error: (err as Error).message });
    }
    return { lat: vehicle.lat, lng: vehicle.lng };
  }

  async end(customerId: string, rentalId: string, dto: { returnPhotoObjectKey: string }, opts: EndOptions = {}) {
    const rental = await this.load(rentalId);
    if (rental.customerId !== customerId) throw notFound('Aluguel não encontrado.');
    if (rental.status === 'ending') return { status: 202 as const, rental: toRental(rental) };
    if (rental.status !== 'active' && rental.status !== 'paused') throw conflict('rental-not-active', 'Este aluguel não está em andamento.');
    // Fix 1 (I7): a moto está sem bateria (ou com a vaga da estação aberta) no meio de uma troca.
    if (await hasOpenStationSwap(this.prisma, rentalId)) throw conflict('swap-open', 'Termine a troca de bateria na estação antes de encerrar o aluguel.');

    if (!rental.returnPhotoUploadKey || dto.returnPhotoObjectKey !== rental.returnPhotoUploadKey) {
      throw unprocessable('return-photo-missing', 'Envie a foto da moto estacionada antes de encerrar.');
    }
    const zone = await this.zones.findContaining(await this.positionOf(rental.vehicle), 'return');
    if (!zone && !opts.allowOutsideZone) throw unprocessable('rental-outside-return-zone', 'Estacione numa zona de devolução para encerrar.');
    // Atalho de teste (ALLOW_TEST_HANDOVER): segue sem zona; a trava continua pelo bloqueio seguro e só encerra confirmada.
    const testOutsideZone = !zone;
    if (testOutsideZone) this.logger.log({ msg: 'rental_test_end_outside_zone', rentalId, vehicleId: rental.vehicleId });

    const now = new Date();
    const closedPause = rental.status === 'paused' && rental.pausedAt ? Math.floor((now.getTime() - rental.pausedAt.getTime()) / 1000) : 0;
    // Fix 2 (M-3): trava a linha do aluguel (a mesma que a criação da troca trava) antes de conferir a troca aberta e passar a
    // `ending`: criação da troca e encerramento se serializam.
    const moved = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Rental" WHERE "id" = ${rentalId}::uuid FOR UPDATE`;
      if (await hasOpenStationSwap(tx, rentalId)) throw conflict('swap-open', 'Termine a troca de bateria na estação antes de encerrar o aluguel.');
      return tx.rental.updateMany({
        where: { id: rentalId, status: { in: ['active', 'paused'] } },
        data: {
          status: 'ending',
          endRequestedAt: now,
          pausedAt: null,
          pausedSecondsAcc: rental.pausedSecondsAcc + closedPause,
          endZoneId: zone?.id ?? null,
          returnPhotoObjectKey: dto.returnPhotoObjectKey,
          endLastAttemptAt: now,
          endAttempts: { increment: 1 },
        },
      });
    });
    if (moved.count === 0) throw conflict('rental-not-active', 'Este aluguel não está em andamento.');
    await this.prisma.rentalEvent.create({ data: { rentalId, type: 'ending', actorType: 'customer', actorId: customerId, data: testOutsideZone ? { zoneId: null, testOutsideZone: true } : { zoneId: zone!.id } } });

    const confirmed = await this.requestLock(rentalId, rental.vehicleId, 'rental_end');
    if (confirmed) return { status: 200 as const, rental: await this.finalize(rentalId, 'ended') };
    const current = await this.load(rentalId);
    // O evento de travada pode ter encerrado o aluguel enquanto o HTTP voltava do gateway.
    if (current.status === 'ended') return { status: 200 as const, rental: await this.finalize(rentalId, 'ended') };
    this.emitRental(current);
    return { status: 202 as const, rental: toRental(current) };
  }

  async forceEnd(actor: Principal, rentalId: string, reason: string) {
    if (!reason || reason.trim().length < 3) throw badRequest('Informe o motivo do encerramento forçado.', [{ field: 'reason', message: 'obrigatório' }]);
    const rental = await this.load(rentalId);
    if (!['active', 'paused', 'ending'].includes(rental.status)) throw conflict('rental-not-active', 'Este aluguel não está em andamento.');

    const zone = await this.zones.findContaining(await this.positionOf(rental.vehicle), 'return');
    if (!zone && !isAdmin(actor)) {
      throw forbidden('Fora da zona de devolução, só admin pode encerrar à força.', 'force-end-outside-zone-requires-admin');
    }
    const fees: FeeCharge[] = zone
      ? []
      : [{ code: FORCE_END_FEE_CODE, description: 'Encerramento fora da zona de devolução', amountCents: await this.pricing.feeAmount(FORCE_END_FEE_CODE, FORCE_END_FEE_DEFAULT_CENTS) }];

    const now = new Date();
    const closedPause = rental.status === 'paused' && rental.pausedAt ? Math.floor((now.getTime() - rental.pausedAt.getTime()) / 1000) : 0;
    await this.prisma.rental.updateMany({
      where: { id: rentalId, status: { in: ['active', 'paused', 'ending'] } },
      data: {
        endRequestedAt: rental.endRequestedAt ?? now,
        pausedAt: null,
        pausedSecondsAcc: rental.pausedSecondsAcc + closedPause,
        forceEndReason: reason.trim(),
        forcedEndById: actor.userId,
        endZoneId: zone?.id ?? null,
      },
    });
    await this.audit.record({ actor, action: 'rental.force_end', entityType: 'Rental', entityId: rentalId, reason: reason.trim(), metadata: { outsideReturnZone: !zone } });
    // Bloqueio seguro (rampa até parar) — o encerramento não espera a confirmação.
    await this.requestLock(rentalId, rental.vehicleId, 'rental_force_end').catch(() => false);
    await this.closeStationSwaps(rentalId);
    const closed = await this.finalize(rentalId, 'force_ended', { fees, actor });
    // Rodada 3: de novo depois do fechamento (idempotente) — uma troca criada entre a primeira chamada e o finalize não fica
    // aberta num aluguel encerrado.
    await this.closeStationSwaps(rentalId);
    return closed;
  }

  /**
   * Chegada no galpão (`POST /handovers`, `return_depot`, Task 6): pede o bloqueio seguro (rampa até parar, como no
   * encerramento forçado; o operador está com a moto) e fecha pelo caminho normal com `returnTo: 'depot'` (sem tarefa
   * `collect`). Quem chama põe a moto no galpão. Aluguel já encerrado → devolve como está (repetição idempotente).
   */
  async endAtDepot(actor: Principal, rentalId: string, depot: DepotPlacement) {
    const rental = await this.load(rentalId);
    if (rental.status === 'ended' || rental.status === 'force_ended') return toRental(rental);
    if (!['active', 'paused', 'ending'].includes(rental.status)) throw conflict('rental-not-active', 'Este aluguel não está em andamento.');
    await this.closeStationSwaps(rentalId);
    await this.requestLock(rentalId, rental.vehicleId, 'rental_depot_return');
    const closed = await this.finalize(rentalId, 'ended', { actor, returnTo: 'depot', depot });
    await this.closeStationSwaps(rentalId); // rodada 3: idem ao encerramento forçado
    return closed;
  }

  /** Pede o travamento (bloqueio seguro). `true` se o rastreador confirmou na hora. */
  private async requestLock(rentalId: string, vehicleId: string, purpose: 'rental_end' | 'rental_force_end' | 'rental_depot_return'): Promise<boolean> {
    try {
      const cmd = await this.commands.dispatch({
        vehicleId,
        type: 'lock',
        reason: purpose === 'rental_end' ? 'Encerramento do aluguel' : purpose === 'rental_depot_return' ? 'Chegada no galpão' : 'Encerramento forçado do aluguel',
        actor: SYSTEM,
        context: { rentalId, purpose },
        auditAction: 'rental.lock',
      });
      return cmd.status === 'confirmed';
    } catch (err) {
      this.logger.error({ msg: 'rental_lock_request_failed', rentalId, error: (err as Error).message });
      return false;
    }
  }

  /**
   * Fecha o aluguel e liquida **uma única vez**: a transição de status é condicional (`updateMany` com status em andamento),
   * então chamadas repetidas/concorrentes só liquidam na primeira.
   */
  finalize(rentalId: string, kind: 'ended' | 'force_ended', opts: FinalizeOptions = {}) {
    // Caminho único por aluguel: quem chega durante uma finalização em andamento (HTTP x evento x retentativa)
    // espera a mesma execução e devolve o aluguel já liquidado, em vez de ler um estado intermediário.
    const running = this.finalizing.get(rentalId);
    if (running) return running;
    const p = this.doFinalize(rentalId, kind, opts).finally(() => this.finalizing.delete(rentalId));
    this.finalizing.set(rentalId, p);
    return p;
  }

  private async doFinalize(rentalId: string, kind: 'ended' | 'force_ended', opts: FinalizeOptions) {
    const rental = await this.load(rentalId);
    if (rental.status === 'ended' || rental.status === 'force_ended') return toRental(rental);

    const now = new Date();
    const timing = rentalTimes({ ...rental, endRequestedAt: rental.endRequestedAt ?? now });
    const fees = [...(opts.fees ?? []), ...(await this.stationSwapFees(rentalId))];
    // R2-01: a carteira abate primeiro (ordem de liquidação: carteira → caução → cartão → dívida). O saldo é lido e debitado
    // na mesma transação que fecha o aluguel, com o cliente travado (FOR UPDATE): o débito acontece uma única vez (o
    // fechamento é condicional) e o mesmo saldo nunca paga dois fechamentos. O restante (`totalCents`) vai para a liquidação.
    const { claimed, breakdown } = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${rental.customerId}::uuid FOR UPDATE`;
      const walletAvailableCents = await walletCentsAvailable(tx, rental.customerId);
      const breakdown = this.pricing.calculate({
        snapshot: rental.priceSnapshot as unknown as PriceSnapshot,
        elapsedSeconds: timing.elapsedSeconds,
        pausedSeconds: timing.pausedSeconds,
        fees,
        walletAvailableCents,
      });
      const claimed = await tx.rental.updateMany({
        where: { id: rentalId, status: { in: ['active', 'paused', 'ending'] } },
        data: {
          status: kind,
          endedAt: now,
          endRequestedAt: rental.endRequestedAt ?? now,
          pausedAt: null,
          pausedSecondsAcc: timing.pausedSeconds,
          costCents: breakdown.totalCents,
          breakdown: breakdown as unknown as Prisma.InputJsonValue,
        },
      });
      if (claimed.count === 1 && breakdown.walletAppliedCents) {
        await appendWalletEntry(tx, {
          customerId: rental.customerId, type: 'rental_charge', amountCents: -breakdown.walletAppliedCents, rentalId,
          description: 'Aluguel: abatido da carteira no fechamento',
        });
      }
      return { claimed, breakdown };
    });
    if (claimed.count === 0) return toRental(await this.load(rentalId));

    const awaitingPickup = opts.returnTo !== 'depot' && (await this.isDepotVehicle(rental));
    let vehicleStatus: VehicleStatusChangedEvent['status'] | null = 'free';
    if (awaitingPickup) vehicleStatus = await this.leaveForPickup(rental);
    else if (opts.returnTo === 'depot' && opts.depot) {
      // Chegada no galpão: status final + depotId juntos (sem janela `free` sem galpão, alugável na rua). Sem transição
      // (moto offline, por exemplo) não emite nada: quem chama grava o `statusBeforeOffline`.
      const placed = await this.prisma.vehicle.updateMany({
        where: { id: rental.vehicleId, status: { in: ['rented', 'paused'] } },
        data: { status: opts.depot.targetStatus, depotId: opts.depot.depotId, ...depotPosition(opts.depot) },
      });
      vehicleStatus = placed.count ? opts.depot.targetStatus : null;
    } else await this.prisma.vehicle.updateMany({ where: { id: rental.vehicleId, status: { in: ['rented', 'paused'] } }, data: { status: 'free' } });
    await this.prisma.rentalEvent.create({
      data: {
        rentalId,
        type: kind,
        actorType: opts.actor ? 'staff' : kind === 'ended' ? 'customer' : 'system',
        actorId: opts.actor?.userId ?? (kind === 'ended' ? rental.customerId : null),
        data: { costCents: breakdown.totalCents },
      },
    });

    try {
      const settlement = await this.billing.settle({
        rentalId, amountCents: breakdown.totalCents, walletCents: breakdown.walletAppliedCents ?? 0, idempotencyKey: `rental-settlement:${rentalId}`,
      });
      await this.prisma.rental.update({ where: { id: rentalId }, data: { paymentId: settlement.paymentId } });
    } catch (err) {
      // A cobrança é reprocessada pela Task 5 (inadimplência); o aluguel continua encerrado.
      this.logger.error({ msg: 'rental_settlement_failed', rentalId, error: (err as Error).message });
    }

    const final = await this.load(rentalId);
    if (vehicleStatus) this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId: rental.vehicleId, status: vehicleStatus, ts: now.toISOString() } satisfies VehicleStatusChangedEvent);
    this.emitRental(final);
    this.logger.log({ msg: 'rental_finalized', rentalId, status: kind, costCents: breakdown.totalCents });
    return toRental(final);
  }

  /**
   * Troca de bateria na estação (spec 2026-10-22): cada troca concluída com taxa (congelada na criação; 0 nos planos
   * diário/semanal/mensal) entra como linha `battery_swap_fee` desta liquidação — nunca cobrada à parte.
   */
  private async stationSwapFees(rentalId: string): Promise<FeeCharge[]> {
    const swaps = (await this.prisma.stationSwap.findMany({ where: { rentalId, status: 'completed', feeCents: { gt: 0 } }, orderBy: { createdAt: 'asc' }, select: { id: true, feeCents: true } })) ?? [];
    return swaps.map((s) => ({ code: STATION_SWAP_FEE_CODE, description: 'Troca de bateria na estação', amountCents: s.feeCents }));
  }

  /** Moto do galpão: tem `depotId` ou saiu por uma entrega de galpão aceita para este aluguel. Só sai de novo pela entrega. */
  private async isDepotVehicle(rental: RentalWithVehicle): Promise<boolean> {
    if (rental.vehicle.depotId) return true;
    // Fallback: a própria moto da entrega aceita deste aluguel (depois de uma troca, a moto de rua volta a `free`).
    const pickup = await this.prisma.handover.findFirst({
      where: { rentalId: rental.id, vehicleId: rental.vehicleId, type: 'pickup', status: 'accepted' },
      select: { id: true },
    });
    return !!pickup;
  }

  /**
   * Ponto verde: moto fica `awaiting_pickup` e nasce uma tarefa `collect` na posição dela. Idempotente: sob um lock
   * transacional por moto, não cria outra se já houver `collect` aberta (finalizações concorrentes em instâncias diferentes).
   */
  private async leaveForPickup(rental: RentalWithVehicle): Promise<VehicleStatusChangedEvent['status'] | null> {
    const pos = await this.positionOf(rental.vehicle);
    const vehicleId = rental.vehicleId;
    let status: VehicleStatusChangedEvent['status'] | null = null;
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`collect:${vehicleId}`}))::text`;
      const moved = await tx.vehicle.updateMany({ where: { id: vehicleId, status: { in: ['rented', 'paused'] } }, data: { status: 'awaiting_pickup' } });
      if (moved.count) status = 'awaiting_pickup';
      else {
        // Moto offline durante o aluguel: ao reconectar ela volta como `awaiting_pickup` (restoredStatus), não `free`.
        const offline = await tx.vehicle.updateMany({
          where: { id: vehicleId, status: 'offline', statusBeforeOffline: { in: ['rented', 'paused'] } },
          data: { statusBeforeOffline: 'awaiting_pickup' },
        });
        if (offline.count) status = 'offline';
      }
      const open = await tx.fieldTask.findFirst({ where: { vehicleId, type: 'collect', status: { notIn: ['done', 'canceled'] } }, select: { id: true } });
      if (open) return null;
      return tx.fieldTask.create({
        data: {
          type: 'collect', priority: 'medium', status: 'open', vehicleId, targetLat: pos.lat, targetLng: pos.lng,
          notes: 'Recolher ao galpão: moto devolvida em ponto verde.',
        },
      });
    });
    if (created) this.logger.log({ msg: 'collect_task_created', rentalId: rental.id, vehicleId, fieldTaskId: created.id });
    return status;
  }

  /** Confirmação tardia do travamento (via `iot.command-updated` → `command.changed`). */
  @OnEvent(EV.COMMAND_CHANGED, { async: true, promisify: true })
  async onCommandChanged(ev: CommandChangedEvent): Promise<void> {
    const purpose = ev.payload?.purpose;
    const rentalId = ev.payload?.rentalId as string | undefined;
    if (ev.type !== 'lock' || purpose !== 'rental_end' || !rentalId || ev.status !== 'confirmed') return;
    const rental = await this.prisma.rental.findUnique({ where: { id: rentalId }, select: { status: true } });
    if (rental?.status !== 'ending') return;
    await this.finalize(rentalId, 'ended').catch((err) => this.logger.error({ msg: 'rental_finalize_failed', rentalId, error: (err as Error).message }));
  }

  /** Retentativa periódica dos aluguéis em `ending` (moto ainda andando, offline, timeout). */
  @Interval('rental-end-retry', 15_000)
  @ExclusiveJob('rental-end-retry', jobLockTtl(15_000), { runIfUnavailable: true })
  async retryJob(): Promise<void> {
    if (process.env.JOBS_ENABLED === 'false') return;
    await this.retryEnding().catch((err) => this.logger.error({ msg: 'rental_end_retry_failed', error: (err as Error).message }));
  }

  async retryEnding(): Promise<void> {
    const cutoff = new Date(Date.now() - END_RETRY_INTERVAL_MS);
    const pending = await this.prisma.rental.findMany({
      where: { status: 'ending', endAttempts: { lt: MAX_END_ATTEMPTS }, OR: [{ endLastAttemptAt: null }, { endLastAttemptAt: { lt: cutoff } }] },
      take: 100,
    });
    for (const r of pending) {
      await this.prisma.rental.updateMany({
        where: { id: r.id, status: 'ending' },
        data: { endLastAttemptAt: new Date(), endAttempts: { increment: 1 } },
      });
      const confirmed = await this.requestLock(r.id, r.vehicleId, 'rental_end');
      if (confirmed) {
        await this.finalize(r.id, 'ended');
        continue;
      }
      const attempts = r.endAttempts + 1;
      this.logger.warn({ msg: 'rental_end_lock_pending', rentalId: r.id, attempts });
      if (attempts >= MAX_END_ATTEMPTS) {
        await this.alerts.create(
          { type: 'command_failed', priority: 'high', message: `Encerramento sem confirmação de travamento após ${attempts} tentativas.`, vehicleId: r.vehicleId, rentalId: r.id },
          { dedupe: false },
        );
      }
    }
  }

  private emitRental(r: Rental): void {
    const mapped = toRental(r);
    const ev: RentalChangedEvent = {
      rentalId: r.id, customerId: r.customerId, vehicleId: r.vehicleId, status: r.status,
      elapsedSeconds: mapped.elapsedSeconds, costCents: mapped.costCents, ts: new Date().toISOString(),
    };
    this.events.emit(EV.RENTAL_CHANGED, ev);
  }
}
