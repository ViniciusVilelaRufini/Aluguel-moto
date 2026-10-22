import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { ZonesService } from '../zones/zones.service';
import { rentalTimes, toRental } from './rentals.mapper';

export const FORCE_END_FEE_CODE = 'force_end_outside_return_zone';
export const FORCE_END_FEE_DEFAULT_CENTS = 1500;
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
export interface FinalizeOptions {
  fees?: FeeCharge[];
  actor?: Principal;
  returnTo?: ReturnTo;
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
  ) {}

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

  async end(customerId: string, rentalId: string, dto: { returnPhotoObjectKey: string }) {
    const rental = await this.load(rentalId);
    if (rental.customerId !== customerId) throw notFound('Aluguel não encontrado.');
    if (rental.status === 'ending') return { status: 202 as const, rental: toRental(rental) };
    if (rental.status !== 'active' && rental.status !== 'paused') throw conflict('rental-not-active', 'Este aluguel não está em andamento.');

    if (!rental.returnPhotoUploadKey || dto.returnPhotoObjectKey !== rental.returnPhotoUploadKey) {
      throw unprocessable('return-photo-missing', 'Envie a foto da moto estacionada antes de encerrar.');
    }
    const zone = await this.zones.findContaining(await this.positionOf(rental.vehicle), 'return');
    if (!zone) throw unprocessable('rental-outside-return-zone', 'Estacione numa zona de devolução para encerrar.');

    const now = new Date();
    const closedPause = rental.status === 'paused' && rental.pausedAt ? Math.floor((now.getTime() - rental.pausedAt.getTime()) / 1000) : 0;
    const moved = await this.prisma.rental.updateMany({
      where: { id: rentalId, status: { in: ['active', 'paused'] } },
      data: {
        status: 'ending',
        endRequestedAt: now,
        pausedAt: null,
        pausedSecondsAcc: rental.pausedSecondsAcc + closedPause,
        endZoneId: zone.id,
        returnPhotoObjectKey: dto.returnPhotoObjectKey,
        endLastAttemptAt: now,
        endAttempts: { increment: 1 },
      },
    });
    if (moved.count === 0) throw conflict('rental-not-active', 'Este aluguel não está em andamento.');
    await this.prisma.rentalEvent.create({ data: { rentalId, type: 'ending', actorType: 'customer', actorId: customerId, data: { zoneId: zone.id } } });

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
    return this.finalize(rentalId, 'force_ended', { fees, actor });
  }

  /** Pede o travamento (bloqueio seguro). `true` se o rastreador confirmou na hora. */
  private async requestLock(rentalId: string, vehicleId: string, purpose: 'rental_end' | 'rental_force_end'): Promise<boolean> {
    try {
      const cmd = await this.commands.dispatch({
        vehicleId,
        type: 'lock',
        reason: purpose === 'rental_end' ? 'Encerramento do aluguel' : 'Encerramento forçado do aluguel',
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
    const breakdown = this.pricing.calculate({
      snapshot: rental.priceSnapshot as unknown as PriceSnapshot,
      elapsedSeconds: timing.elapsedSeconds,
      pausedSeconds: timing.pausedSeconds,
      fees: opts.fees,
    });
    const claimed = await this.prisma.rental.updateMany({
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
    if (claimed.count === 0) return toRental(await this.load(rentalId));

    const awaitingPickup = opts.returnTo !== 'depot' && (await this.isDepotVehicle(rental));
    const vehicleStatus = awaitingPickup ? 'awaiting_pickup' : 'free';
    if (awaitingPickup) await this.leaveForPickup(rental);
    else await this.prisma.vehicle.updateMany({ where: { id: rental.vehicleId, status: { in: ['rented', 'paused'] } }, data: { status: 'free' } });
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
      const settlement = await this.billing.settle({ rentalId, amountCents: breakdown.totalCents, idempotencyKey: `rental-settlement:${rentalId}` });
      await this.prisma.rental.update({ where: { id: rentalId }, data: { paymentId: settlement.paymentId } });
    } catch (err) {
      // A cobrança é reprocessada pela Task 5 (inadimplência); o aluguel continua encerrado.
      this.logger.error({ msg: 'rental_settlement_failed', rentalId, error: (err as Error).message });
    }

    const final = await this.load(rentalId);
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId: rental.vehicleId, status: vehicleStatus, ts: now.toISOString() } satisfies VehicleStatusChangedEvent);
    this.emitRental(final);
    this.logger.log({ msg: 'rental_finalized', rentalId, status: kind, costCents: breakdown.totalCents });
    return toRental(final);
  }

  /** Moto do galpão: tem `depotId` ou saiu por uma entrega de galpão aceita para este aluguel. Só sai de novo pela entrega. */
  private async isDepotVehicle(rental: RentalWithVehicle): Promise<boolean> {
    if (rental.vehicle.depotId) return true;
    const pickup = await this.prisma.handover.findFirst({ where: { rentalId: rental.id, type: 'pickup', status: 'accepted' }, select: { id: true } });
    return !!pickup;
  }

  /**
   * Ponto verde: moto fica `awaiting_pickup` e nasce uma tarefa `collect` na posição dela. Idempotente: sob um lock
   * transacional por moto, não cria outra se já houver `collect` aberta (finalizações concorrentes em instâncias diferentes).
   */
  private async leaveForPickup(rental: RentalWithVehicle): Promise<void> {
    const pos = await this.positionOf(rental.vehicle);
    const vehicleId = rental.vehicleId;
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`collect:${vehicleId}`}))::text`;
      await tx.vehicle.updateMany({ where: { id: vehicleId, status: { in: ['rented', 'paused'] } }, data: { status: 'awaiting_pickup' } });
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
