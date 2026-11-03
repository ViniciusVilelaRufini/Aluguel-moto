import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import type { Prisma, Rental, Vehicle } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { assertNotFixedForOther } from '../../common/fixed-vehicle';
import { assertVehicleNotInUse } from '../../common/vehicle-in-use';
import { CommandChangedEvent, EV, RentalChangedEvent, VehicleStatusChangedEvent } from '../../common/events';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound, unprocessable } from '../../common/problem';
import { presignedUpload } from '../../common/uploads';
import { compact, distanceM } from '../../common/util';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { IOT_GATEWAY, type IotGateway } from '../../ports/iot-gateway.port';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { isStaff, type Principal } from '../auth/principal';
import { CommandsService } from '../commands/commands.service';
import { PricingService, type PriceBreakdown, type PriceSnapshot } from '../pricing/pricing.service';
import { OPEN_SWAP_STATUSES, SWAP_FEE_CODE, SWAP_FEE_DEFAULT_CENTS, swapFeeCents } from '../station-swaps/station-swap.rules';
import { toStationSwap } from '../station-swaps/station-swaps.mapper';
import { hasOpenStationSwap, MAX_END_ATTEMPTS } from './rental-end.service';
import { isDepotLocked } from './rental-start.service';
import type { ListRentalsQuery, LocationShareDto, RatingDto, SwapVehicleDto, WellbeingDto } from './rentals.dto';
import { toRental, toRentalEvent } from './rentals.mapper';
import { controlModeOf, latestRentalLock, LOCK_NOT_CUT_REASON, pauseAfterLateLock } from './relay-rental-lock';
import { receiptPaymentInfo } from '../payments/receipts/receipt-status';
import { receiptLinks } from '../payments/receipts/receipt-links';
import { ExclusiveJob, jobLockTtl } from '../../common/job-lock';

export const SWAP_MAX_DISTANCE_M = 200;
/** Auditoria run-4: trava da pausa recusada na hora em moto `relay_only` (409, o aluguel continua `active`). */
export const PAUSE_LOCK_REFUSED_MESSAGE = 'Não foi possível travar a moto; pare a moto e tente pausar de novo.';
/** Auditoria run-4: trava da pausa terminou sem corte (`relay_only`); o aluguel volta a `active`. */
export const PAUSE_LOCK_FAILED_MESSAGE = 'A moto não parou; pare e peça a pausa de novo.';
type RentalWithVehicle = Rental & { vehicle: Vehicle };

/** Leitura e ações do aluguel em andamento (pausa, retomada, troca, foto, avaliação, SOS, "você está bem?"). */
@Injectable()
export class RentalsService {
  private readonly logger = new Logger('RentalsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: CommandsService,
    private readonly alerts: AlertsService,
    private readonly events: EventEmitter2,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(IOT_GATEWAY) private readonly iot: IotGateway,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    // Taxa de troca na estação em `current()`; opcional (testes montam o serviço sem ela; cai no mesmo cálculo).
    @Optional() private readonly pricing?: PricingService,
  ) {}

  /** Cliente só enxerga os próprios aluguéis (404 para os demais, sem revelar existência). */
  private async loadFor(user: Principal, id: string): Promise<RentalWithVehicle> {
    // O modo do rastreador vem junto (auditoria run-4: regras da pausa em `relay_only`).
    const r = await this.prisma.rental.findUnique({ where: { id }, include: { vehicle: { include: { tracker: { select: { controlMode: true } } } } } });
    if (!r || (!isStaff(user) && r.customerId !== user.customerId)) throw notFound('Aluguel não encontrado.');
    return r as RentalWithVehicle;
  }

  async list(user: Principal, q: ListRentalsQuery) {
    const where: Prisma.RentalWhereInput = {};
    if (isStaff(user)) {
      if (q.customerId) where.customerId = q.customerId;
      if (q.vehicleId) where.vehicleId = q.vehicleId;
    } else {
      where.customerId = user.customerId;
    }
    if (q.status) where.status = q.status;
    if (q.from || q.to) where.startedAt = { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lt: new Date(q.to) } : {}) };
    const rows = await this.prisma.rental.findMany({
      where,
      include: { vehicle: { select: { code: true } } },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      ...pageArgs(q),
    });
    return toPage(rows, q, (r) => toRental(r));
  }

  async current(customerId: string) {
    const r = await this.prisma.rental.findFirst({
      where: { customerId, status: { in: OPEN_RENTAL_STATUSES } },
      include: { vehicle: { select: { code: true } } },
      orderBy: { startedAt: 'desc' },
    });
    if (!r) return {};
    // Fix 1 (I1): troca de bateria na estação em andamento, para o app retomar a tela da troca ao reabrir.
    const swap = await this.prisma.stationSwap.findFirst({ where: { rentalId: r.id, status: { in: OPEN_SWAP_STATUSES } } });
    // Taxa que uma troca agora congelaria (mesma regra e mesmas funções de `StationSwapsService.create`): o app mostra
    // "Taxa R$ X" na confirmação antes do POST, sem acesso a `/pricing/fees` (só staff).
    const pricing = this.pricing ?? new PricingService(this.prisma);
    const batterySwapFeeCents = swapFeeCents(r.planCode, await pricing.feeAmount(SWAP_FEE_CODE, SWAP_FEE_DEFAULT_CENTS));
    return { rental: toRental(r), ...(swap ? { currentStationSwap: toStationSwap(swap, { staff: false }) } : {}), batterySwapFeeCents };
  }

  async get(user: Principal, id: string) {
    return toRental(await this.loadFor(user, id));
  }

  async events_(user: Principal, id: string) {
    await this.loadFor(user, id);
    const events = await this.prisma.rentalEvent.findMany({ where: { rentalId: id }, orderBy: { at: 'asc' } });
    return { items: events.map(toRentalEvent) };
  }

  async pause(user: Principal, id: string) {
    const r = await this.loadFor(user, id);
    if (r.status !== 'active') throw conflict('rental-not-active', 'Só é possível pausar um aluguel em andamento.');
    const cmd = await this.commands.dispatch({ vehicleId: r.vehicleId, type: 'lock', reason: 'Pausa do aluguel', actor: user, context: { rentalId: id, purpose: 'rental_pause' }, auditAction: 'rental.pause' });
    // Auditoria run-4 (c): em `relay_only` a trava recusada deixa a moto destravada — não cobra pausa. `speed_control` como antes.
    const relayOnly = cmd.status !== 'confirmed' && (r.vehicle as { tracker?: { controlMode: string } | null }).tracker?.controlMode === 'relay_only';
    if (cmd.status === 'failed' && relayOnly) throw conflict('conflict', PAUSE_LOCK_REFUSED_MESSAGE);
    const moved = await this.prisma.rental.updateMany({ where: { id, status: 'active' }, data: { status: 'paused', pausedAt: new Date() } });
    if (moved.count === 0) throw conflict('rental-not-active', 'Só é possível pausar um aluguel em andamento.');
    await this.prisma.vehicle.updateMany({ where: { id: r.vehicleId, status: 'rented' }, data: { status: 'paused' } });
    await this.prisma.rentalEvent.create({ data: { rentalId: id, type: 'paused', actorType: 'customer', actorId: user.customerId } });
    if (relayOnly && cmd.id) {
      // Corrida (auditoria run-4): o desfecho `did_not_stop` pode ter chegado antes de a pausa ser gravada — o listener viu o
      // aluguel ainda `active` e não fez nada. Relê o comando e desfaz a pausa aqui.
      const now = await this.prisma.vehicleCommand.findUnique({ where: { id: cmd.id }, select: { status: true, statusReason: true } });
      if (now?.status === 'failed' && now.statusReason === LOCK_NOT_CUT_REASON && (await this.revertPause(id, r.vehicleId, cmd.id, now.statusReason))) {
        const after = await this.prisma.rental.findUnique({ where: { id }, include: { vehicle: true } });
        return toRental(after!);
      }
    }
    return this.afterChange(id, r.vehicleId, 'paused');
  }

  /**
   * Auditoria run-4 (c): desfecho tardio da trava da pausa de uma moto `relay_only` (só o último lock de pausa do aluguel conta).
   * - `failed`/`did_not_stop` (a moto não parou, nada foi cortado) com o aluguel `paused` → volta a `active` sem contar o trecho
   *   como pausa (a moto ficou destravada) e a moto a `rented`.
   * - `failed` por `timeout` (fase de corte: a moto pode estar travada) → continua `paused`; a varredura pede a trava de novo.
   * - `confirmed` com o aluguel já `active` (voltou por um `did_not_stop` e o corte chegou depois) → `paused` de novo.
   */
  @OnEvent(EV.COMMAND_CHANGED, { async: true, promisify: true })
  async onPauseLockChanged(ev: CommandChangedEvent): Promise<void> {
    const rentalId = ev.payload?.rentalId as string | undefined;
    if (ev.type !== 'lock' || (ev.status !== 'failed' && ev.status !== 'confirmed') || ev.payload?.purpose !== 'rental_pause' || !rentalId) return;
    try {
      const r = await this.prisma.rental.findUnique({ where: { id: rentalId }, select: { id: true, vehicleId: true, status: true } });
      if (!r) return;
      if (ev.status === 'confirmed') {
        if (r.status !== 'active') return;
        const paused = await pauseAfterLateLock(this.prisma, r, ev.commandId, 'rental_pause');
        if (paused) {
          this.logger.warn({ msg: 'rental_late_lock_paused', rentalId });
          await this.afterChange(rentalId, r.vehicleId, 'paused');
        }
        return;
      }
      if (r.status !== 'paused' || (await controlModeOf(this.prisma, r.vehicleId)) !== 'relay_only') return;
      const latest = await latestRentalLock(this.prisma, rentalId, r.vehicleId, 'rental_pause');
      if (!latest || latest.id !== ev.commandId || latest.status !== 'failed' || latest.statusReason !== LOCK_NOT_CUT_REASON) return;
      await this.revertPause(rentalId, r.vehicleId, ev.commandId, latest.statusReason);
    } catch (err) {
      this.logger.error({ msg: 'rental_pause_revert_failed', rentalId, error: (err as Error).message });
    }
  }

  /** Pausa → `active` sem somar o trecho pausado; moto `paused` → `rented`; evento `resumed` com o comando. */
  private async revertPause(rentalId: string, vehicleId: string, commandId: string, commandReason: string | null): Promise<boolean> {
    const moved = await this.prisma.rental.updateMany({ where: { id: rentalId, status: 'paused' }, data: { status: 'active', pausedAt: null } });
    if (moved.count !== 1) return false;
    await this.prisma.vehicle.updateMany({ where: { id: vehicleId, status: 'paused' }, data: { status: 'rented' } });
    await this.prisma.rentalEvent.create({
      data: { rentalId, type: 'resumed', actorType: 'system', message: PAUSE_LOCK_FAILED_MESSAGE, data: { reason: 'pause_lock_failed', commandId, commandReason } },
    });
    this.logger.warn({ msg: 'rental_pause_lock_failed_reverted', rentalId, reason: commandReason });
    await this.afterChange(rentalId, vehicleId, 'rented');
    return true;
  }

  /** Varredura (auditoria run-4): pausa `relay_only` cuja última trava terminou `failed` sem ser `did_not_stop` → pede de novo. */
  @Interval('rental-pause-lock-retry', 30_000)
  @ExclusiveJob('rental-pause-lock-retry', jobLockTtl(30_000), { runIfUnavailable: true })
  async retryPauseLocksJob(): Promise<void> {
    if (process.env.JOBS_ENABLED === 'false') return;
    await this.retryPauseLocks().catch((err) => this.logger.error({ msg: 'rental_pause_lock_retry_failed', error: (err as Error).message }));
  }

  async retryPauseLocks(): Promise<void> {
    const paused = await this.prisma.rental.findMany({
      where: { status: 'paused', vehicle: { tracker: { controlMode: 'relay_only' } } },
      select: { id: true, vehicleId: true, pausedAt: true },
      take: 100,
    });
    for (const r of paused ?? []) {
      const latest = await latestRentalLock(this.prisma, r.id, r.vehicleId, 'rental_pause');
      // Só `timeout` (e outros motivos explícitos que não `did_not_stop`): `failed` sem motivo vem de cancel/unlock da equipe ou
      // de comando conflitante — reenviar regravaria a trava que a equipe acabou de soltar.
      if (!latest || latest.status !== 'failed' || !latest.statusReason || latest.statusReason === LOCK_NOT_CUT_REASON) continue;
      const attempts = await this.prisma.vehicleCommand.count({
        where: {
          vehicleId: r.vehicleId,
          type: 'lock',
          ...(r.pausedAt ? { createdAt: { gte: r.pausedAt } } : {}),
          AND: [{ payload: { path: ['rentalId'], equals: r.id } }, { payload: { path: ['purpose'], equals: 'rental_pause' } }],
        },
      });
      if (attempts >= MAX_END_ATTEMPTS) {
        await this.pauseRetryExhausted(r.id, r.vehicleId, attempts);
        continue;
      }
      await this.commands
        .dispatch({ vehicleId: r.vehicleId, type: 'lock', reason: 'Pausa do aluguel (nova tentativa)', actor: { system: true, name: 'pausa' }, context: { rentalId: r.id, purpose: 'rental_pause' }, auditAction: 'rental.pause' })
        .catch((err: Error) => this.logger.error({ msg: 'rental_pause_lock_retry_failed', rentalId: r.id, error: err.message }));
    }
  }

  /** Limite de tentativas da trava da pausa: para de reenviar e chama a operação uma vez (marcada por evento `alert`). */
  private async pauseRetryExhausted(rentalId: string, vehicleId: string, attempts: number): Promise<void> {
    const already = await this.prisma.rentalEvent.findFirst({
      where: { rentalId, type: 'alert', data: { path: ['reason'], equals: 'pause_lock_retry_exhausted' } },
      select: { id: true },
    });
    if (already) return;
    await this.alerts.create(
      { type: 'command_failed', priority: 'high', message: `Pausa sem confirmação de travamento após ${attempts} tentativas.`, vehicleId, rentalId },
      { dedupe: false },
    );
    await this.prisma.rentalEvent.create({ data: { rentalId, type: 'alert', actorType: 'system', data: { reason: 'pause_lock_retry_exhausted', attempts } } });
    this.logger.warn({ msg: 'rental_pause_lock_retry_exhausted', rentalId, attempts });
  }


  async resume(user: Principal, id: string) {
    const r = await this.loadFor(user, id);
    if (r.status !== 'paused') throw conflict('rental-not-active', 'Só é possível retomar um aluguel pausado.');
    const cmd = await this.commands.dispatch({ vehicleId: r.vehicleId, type: 'unlock', reason: 'Retomada do aluguel', actor: user, context: { rentalId: id, purpose: 'rental_resume' }, auditAction: 'rental.resume' });
    // Trava da equipe/sistema (cerca, hold, modo roubada): o cliente não desfaz; o aluguel continua pausado.
    if (cmd.statusReason === 'locked_by_staff') throw conflict('vehicle-locked-by-staff', 'A moto foi bloqueada pela equipe. Fale com o suporte.');
    const pausedFor = r.pausedAt ? Math.floor((Date.now() - r.pausedAt.getTime()) / 1000) : 0;
    const moved = await this.prisma.rental.updateMany({
      where: { id, status: 'paused' },
      data: { status: 'active', pausedAt: null, pausedSecondsAcc: r.pausedSecondsAcc + pausedFor },
    });
    if (moved.count === 0) throw conflict('rental-not-active', 'Só é possível retomar um aluguel pausado.');
    await this.prisma.vehicle.updateMany({ where: { id: r.vehicleId, status: 'paused' }, data: { status: 'rented' } });
    await this.prisma.rentalEvent.create({ data: { rentalId: id, type: 'resumed', actorType: 'customer', actorId: user.customerId } });
    return this.afterChange(id, r.vehicleId, 'rented');
  }

  async swap(user: Principal, id: string, dto: SwapVehicleDto) {
    const r = await this.loadFor(user, id);
    if (r.status !== 'active' && r.status !== 'paused') throw conflict('rental-not-active', 'Este aluguel não está em andamento.');
    // Fix 1 (I7): no meio de uma troca de bateria na estação a moto não muda.
    if (await hasOpenStationSwap(this.prisma, id)) throw conflict('swap-open', 'Termine a troca de bateria na estação antes de trocar de moto.');
    // Revisão final item 2: a trava da equipe/sistema na moto ATUAL (cerca, hold, modo roubada) não se contorna com troca,
    // nem com incidente aberto: o cliente fala com o suporte.
    if (await this.commands.isLockedByStaff(r.vehicle)) throw conflict('vehicle-locked-by-staff', 'A moto foi bloqueada pela equipe. Fale com o suporte.');
    const target = await this.prisma.vehicle.findUnique({ where: { id: dto.newVehicleId }, include: { vehicleModel: { select: { pricePerMinuteCents: true } } } });
    if (!target) throw notFound('Moto não encontrada.');
    // Retirada em galpão: moto do galpão (ou esperando recolhimento) só sai pela entrega, nunca pela troca.
    if (target.id === r.vehicleId || target.status !== 'free' || isDepotLocked(target)) throw conflict('vehicle-unavailable', 'A nova moto não está disponível.');
    // Mesmas guardas do início do aluguel: sem aluguel/reserva, não fixa de outro plano (item 11) e online.
    await assertVehicleNotInUse(this.prisma, target.id);
    await assertNotFixedForOther(this.prisma, target.id, r.customerId);
    if (target.online === false || (await this.iot.getLiveState(target.thingName).catch(() => null))?.online === false) {
      throw conflict('vehicle-offline', 'A nova moto está sem conexão agora. Escolha outra moto.');
    }
    // Auditoria item adiado 1: o unlock do cliente na moto nova seria recusado (trava da equipe/sistema, hold, modo roubada).
    if (await this.commands.isLockedByStaff(target)) throw conflict('vehicle-unavailable', 'A moto escolhida está bloqueada pela equipe.');
    await this.assertSwapPrice(r, target.vehicleModel?.pricePerMinuteCents ?? null);
    const live = await this.iot.getLiveState(r.vehicle.thingName).catch(() => null);
    const here = live ? { lat: live.lat, lng: live.lng } : { lat: r.vehicle.lat, lng: r.vehicle.lng };
    if (distanceM(here, target) > SWAP_MAX_DISTANCE_M) {
      throw unprocessable('validation-error', `A nova moto precisa estar a até ${SWAP_MAX_DISTANCE_M} m.`);
    }
    await this.prisma.$transaction(async (tx) => {
      // Rodada 3: aluguel travado antes das motos (mesma ordem da liberação na estação: aluguel → moto, sem deadlock) e
      // troca aberta reconferida sob o lock (uma troca criada depois da pré-checagem também barra).
      await tx.$queryRaw`SELECT "id" FROM "Rental" WHERE "id" = ${id}::uuid FOR UPDATE`;
      if (await hasOpenStationSwap(tx, id)) throw conflict('swap-open', 'Termine a troca de bateria na estação antes de trocar de moto.');
      const claimed = await tx.vehicle.updateMany({ where: { id: target.id, status: 'free', depotId: null }, data: { status: r.status === 'paused' ? 'paused' : 'rented' } });
      if (claimed.count === 0) throw conflict('vehicle-unavailable', 'A nova moto não está disponível.');
      // Só troca se o aluguel ainda estiver no MESMO status e na moto lida acima: o status da moto nova e a decisão de
      // destravar dependem de r.status (revisão final item 1 — corrida com pausa/retomada).
      const moved = await tx.rental.updateMany({
        where: { id, status: r.status, vehicleId: r.vehicleId },
        data: { vehicleId: target.id, speedLimitKmh: target.speedLimitKmh },
      });
      if (moved.count !== 1) throw conflict('rental-not-active', 'Este aluguel não está em andamento.');
      await tx.vehicle.update({ where: { id: r.vehicleId }, data: { status: 'maintenance' } });
      await tx.rentalEvent.create({
        data: { rentalId: id, type: 'vehicle_swapped', actorType: 'customer', actorId: user.customerId, message: dto.reason, data: compact({ fromVehicleId: r.vehicleId, toVehicleId: target.id, incidentId: dto.incidentId }) },
      });
    });
    await this.commands.dispatch({ vehicleId: r.vehicleId, type: 'lock', reason: `Troca de moto: ${dto.reason}`, actor: user, context: { rentalId: id, purpose: 'rental_swap' }, auditAction: 'rental.swap' });
    if (r.status === 'active') {
      await this.commands.dispatch({ vehicleId: target.id, type: 'unlock', reason: 'Troca de moto', actor: user, context: { rentalId: id, purpose: 'rental_swap' }, auditAction: 'rental.swap' });
    }
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId: r.vehicleId, status: 'maintenance', ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
    return this.afterChange(id, target.id, r.status === 'paused' ? 'paused' : 'rented');
  }

  /**
   * Auditoria item 15: o preço do aluguel fica congelado no snapshot do início, então a troca só vale para moto de
   * mesmo preço por minuto ou mais barata. Plano por minuto compara com o snapshot (moto sem modelo usaria o preço do
   * plano); os demais planos comparam o modelo da moto alvo com o da moto atual.
   */
  private async assertSwapPrice(r: RentalWithVehicle, targetModelPrice: number | null): Promise<void> {
    const snap = r.priceSnapshot as unknown as PriceSnapshot;
    let reference: number | null;
    let targetPrice: number | null = targetModelPrice;
    if (snap.unit === 'minute') {
      reference = snap.unitPriceCents;
      if (targetPrice === null) {
        const plan = await this.prisma.pricingPlan.findFirst({ where: { code: snap.planCode }, select: { unitPriceCents: true } });
        targetPrice = plan?.unitPriceCents ?? Number.POSITIVE_INFINITY;
      }
    } else {
      const current = r.vehicle.vehicleModelId
        ? await this.prisma.vehicleModel.findUnique({ where: { id: r.vehicle.vehicleModelId }, select: { pricePerMinuteCents: true } })
        : null;
      reference = current?.pricePerMinuteCents ?? null;
    }
    if (reference !== null && targetPrice !== null && targetPrice > reference) {
      throw conflict('vehicle-unavailable', 'Só é possível trocar por uma moto de mesmo preço ou mais barata.');
    }
  }

  async returnPhotoUpload(user: Principal, id: string, contentType: string) {
    const r = await this.loadFor(user, id);
    if (!OPEN_RENTAL_STATUSES.includes(r.status)) throw conflict('rental-not-active', 'Este aluguel não está em andamento.');
    const upload = await presignedUpload(this.storage, this.cfg.buckets.returnPhotos, `returns/${id}`, contentType);
    await this.prisma.rental.update({ where: { id }, data: { returnPhotoUploadKey: upload.objectKey } });
    return upload;
  }

  async track(user: Principal, id: string) {
    const r = await this.loadFor(user, id);
    const points = await this.prisma.trackPoint.findMany({ where: { rentalId: id, expiresAt: { gt: new Date() } }, orderBy: { recordedAt: 'asc' } });
    return {
      rentalId: id,
      vehicleId: r.vehicleId,
      points: points.map((p) => ({ lat: p.lat, lng: p.lng, speedKmh: p.speedKmh, recordedAt: p.recordedAt.toISOString() })),
    };
  }

  async receipt(user: Principal, id: string) {
    const r = await this.loadFor(user, id);
    if (r.status !== 'ended' && r.status !== 'force_ended') throw conflict('rental-not-active', 'O recibo fica disponível depois do encerramento.');
    const [customer, payment, track] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: r.customerId }, select: { name: true } }),
      r.paymentId ? this.prisma.payment.findUnique({ where: { id: r.paymentId } }) : null,
      this.track(user, id),
    ]);
    const endedAt = r.endedAt ?? r.updatedAt;
    // R2-01: situação do pagamento (pago / pendente / processando), caução usada e saldo a pagar.
    const info = await receiptPaymentInfo(this.prisma, r, payment);
    // QA-11: link de 15 min gerado agora a partir da chave do objeto (nada que expire fica gravado). R2-01: só com o recibo pago.
    const pdfUrl = payment && info.status === 'paid' ? (await receiptLinks(this.prisma, this.storage, [payment.id])).get(payment.id) : undefined;
    return compact({
      rentalId: r.id,
      number: `VLT-${endedAt.toISOString().slice(0, 10).replace(/-/g, '')}-${r.id.slice(0, 8).toUpperCase()}`,
      issuedAt: endedAt.toISOString(),
      customerName: customer?.name ?? undefined,
      vehicleCode: r.vehicle.code,
      planCode: r.planCode,
      coverage: r.coverage,
      startedAt: r.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSeconds: Math.max(0, Math.floor(((r.endRequestedAt ?? endedAt).getTime() - r.startedAt.getTime()) / 1000)),
      breakdown: (r.breakdown as unknown as PriceBreakdown) ?? { lines: [], subtotalCents: 0, discountCents: 0, insuranceCents: 0, feesCents: 0, totalCents: r.costCents },
      paymentId: payment?.id,
      paymentStatus: info.status,
      paymentMethod: info.method,
      cardLast4: info.cardLast4,
      depositUsedCents: info.depositUsedCents,
      depositReleasedCents: info.depositReleasedCents,
      amountDueCents: info.amountDueCents,
      pdfUrl,
      track: track.points,
    });
  }

  async rate(user: Principal, id: string, dto: RatingDto) {
    const r = await this.loadFor(user, id);
    if (r.status !== 'ended' && r.status !== 'force_ended') throw conflict('rental-not-active', 'Avalie depois do encerramento.');
    await this.prisma.rental.update({ where: { id }, data: { rating: dto.stars, ratingComment: dto.comment ?? null } });
    return toRental(await this.loadFor(user, id));
  }

  async shareLocation(user: Principal, id: string, dto: LocationShareDto) {
    const r = await this.loadFor(user, id);
    if (!OPEN_RENTAL_STATUSES.includes(r.status)) throw conflict('rental-not-active', 'Só é possível compartilhar durante o aluguel.');
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + (dto.durationMinutes ?? 60) * 60 * 1000);
    await this.prisma.locationShare.create({ data: { rentalId: id, token, expiresAt } });
    return { url: `${this.cfg.publicShareBaseUrl.replace(/\/$/, '')}/${token}`, expiresAt: expiresAt.toISOString() };
  }

  async wellbeing(user: Principal, id: string, dto: WellbeingDto): Promise<void> {
    const r = await this.loadFor(user, id);
    await this.prisma.rental.update({ where: { id }, data: { wellbeingCheckDueAt: null } });
    if (!dto.ok) {
      await this.alerts.create(
        { type: 'customer_not_ok', priority: 'critical', message: 'Cliente informou que não está bem após queda.', vehicleId: r.vehicleId, rentalId: id, lat: r.vehicle.lat, lng: r.vehicle.lng },
        { dedupe: false },
      );
    }
  }

  /** Sem resposta ao "você está bem?" em 60 s → alerta `customer_not_ok` (critical). */
  @Interval('wellbeing-timeout', 10_000)
  @ExclusiveJob('wellbeing-timeout', jobLockTtl(10_000), { runIfUnavailable: true })
  async wellbeingJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    const overdue = await this.prisma.rental.findMany({ where: { wellbeingCheckDueAt: { lt: new Date() } }, include: { vehicle: true }, take: 50 });
    for (const r of overdue) {
      const cleared = await this.prisma.rental.updateMany({ where: { id: r.id, wellbeingCheckDueAt: { not: null } }, data: { wellbeingCheckDueAt: null } });
      if (cleared.count === 0) continue;
      await this.alerts.create(
        { type: 'customer_not_ok', priority: 'critical', message: 'Sem resposta ao "Você está bem?" após queda.', vehicleId: r.vehicleId, rentalId: r.id, lat: r.vehicle.lat, lng: r.vehicle.lng },
        { dedupe: false },
      );
    }
  }

  /** `rental.updated` a cada 30 s com o aluguel ativo/pausado (tempo e custo parcial). */
  @Interval('rental-ticker', 30_000)
  @ExclusiveJob('rental-ticker', jobLockTtl(30_000))
  async tickerJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    const open = await this.prisma.rental.findMany({ where: { status: { in: ['active', 'paused'] } }, take: 1000 });
    for (const r of open) this.emitRental(r);
  }

  private async afterChange(id: string, vehicleId: string, vehicleStatus: VehicleStatusChangedEvent['status']) {
    const r = await this.prisma.rental.findUnique({ where: { id }, include: { vehicle: true } });
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId, status: vehicleStatus, ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
    this.emitRental(r!);
    return toRental(r!);
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
