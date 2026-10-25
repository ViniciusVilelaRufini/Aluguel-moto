import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { assertNotFixedForOther } from '../../common/fixed-vehicle';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import type { Deposit, Prisma, Reservation, Vehicle } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { DepositReleaseRequestedEvent, EV, ReservationEndedEvent, VehicleStatusChangedEvent } from '../../common/events';
import { conflict, notFound, ProblemException } from '../../common/problem';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { RENTAL_BILLING, type RentalBillingPort } from '../../ports/rental-billing.port';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_STORE, type RedisStore } from '../../redis/redis-store';
import { assertCustomerEligible } from '../customers/eligibility';
import { DEPOSIT_FAILED, type DepositFailedEvent } from '../payments/deposit-events';
import { toDeposit } from '../rentals/rentals.mapper';
import { toVehicleSummary } from '../vehicles/vehicles.mapper';
import { ExclusiveJob, jobLockTtl } from '../../common/job-lock';

const KEY_PREFIX = 'reservation:';
const SWEEP_BATCH = 500;
type Tx = Prisma.TransactionClient;

const inHandover = () =>
  new ProblemException(409, 'reservation-in-handover', 'A entrega da moto já começou. Para desistir, conteste a entrega.', undefined, 'Entrega em andamento');

export interface ReservationExtras {
  deposit?: Deposit | null;
  /** Só na resposta ao cliente dono da reserva (nunca em listagens de staff ou exportações). */
  pickupCode?: string;
  handoverId?: string;
}

export function toReservation(r: Reservation & { vehicle?: Vehicle | null }, extras: ReservationExtras = {}) {
  return {
    id: r.id,
    vehicleId: r.vehicleId,
    ...(r.vehicle ? { vehicle: toVehicleSummary(r.vehicle) } : {}),
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
    ...(r.depotId
      ? {
          depotId: r.depotId,
          ...(r.pickupMode ? { pickupMode: r.pickupMode } : {}),
          ...(r.pickupAt ? { pickupAt: r.pickupAt.toISOString() } : {}),
          ...(r.planCode ? { planCode: r.planCode } : {}),
          ...(r.coverage ? { coverage: r.coverage } : {}),
          ...(r.depositMethod ? { depositMethod: r.depositMethod } : {}),
        }
      : {}),
    ...(extras.deposit ? { deposit: toDeposit(extras.deposit) } : {}),
    ...(extras.pickupCode ? { pickupCode: extras.pickupCode } : {}),
    ...(extras.handoverId ? { handoverId: extras.handoverId } : {}),
  };
}

/** Reserva com expiração por TTL no Redis (15 min), uma por cliente. Ao expirar, a moto volta a `free`. */
@Injectable()
export class ReservationsService implements OnModuleInit {
  private readonly logger = new Logger('ReservationsService');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_STORE) private readonly redis: RedisStore,
    @Inject(RENTAL_BILLING) private readonly billing: RentalBillingPort,
    private readonly events: EventEmitter2,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  onModuleInit(): void {
    this.redis.onExpired((key) => {
      if (!key.startsWith(KEY_PREFIX)) return;
      const id = key.slice(KEY_PREFIX.length);
      this.expire(id, 'expired').catch((err) => this.logger.error({ msg: 'reservation_expire_failed', reservationId: id, error: (err as Error).message }));
    });
  }

  private get ttlMs(): number {
    return Math.round(this.cfg.reservationTtlSeconds * 1000);
  }

  async create(customerId: string, vehicleId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    await assertCustomerEligible(customer, customerId, this.billing, { requireLocationConsent: false, debtAsConflict: true });

    const active = await this.prisma.reservation.findFirst({
      where: { customerId, OR: [{ status: 'active', expiresAt: { gt: new Date() } }, { status: 'handover' }] },
    });
    if (active) throw conflict('reservation-already-active', 'Você já tem uma reserva ativa.');
    const openRental = await this.prisma.rental.findFirst({ where: { customerId, status: { in: OPEN_RENTAL_STATUSES } } });
    if (openRental) throw conflict('rental-already-active', 'Você já tem um aluguel em andamento.');

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw notFound('Moto não encontrada.');
    // Moto do galpão (inclusive separada por reserva de galpão) só sai pela entrega.
    if (vehicle.depotId) throw conflict('vehicle-unavailable', 'Esta moto está no galpão: reserve a retirada pelo galpão.');
    // Contrato v2 (I3): moto fixa de outro plano com período vigente.
    await assertNotFixedForOther(this.prisma, vehicleId, customerId);

    const expiresAt = new Date(Date.now() + this.ttlMs);
    const reservation = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.vehicle.updateMany({ where: { id: vehicleId, status: 'free', depotId: null }, data: { status: 'reserved' } });
      if (claimed.count === 0) throw conflict('vehicle-unavailable', 'Esta moto não está disponível.');
      return tx.reservation.create({ data: { customerId, vehicleId, expiresAt }, include: { vehicle: true } });
    });
    await this.redis.set(KEY_PREFIX + reservation.id, customerId, this.ttlMs);
    this.emitVehicleStatus(vehicleId, 'reserved');
    return toReservation(reservation);
  }

  /**
   * Fluxo Pix (decisão #16): cria ou estende a reserva do cliente para a moto até `until` (prazo do Pix),
   * com as mesmas regras das reservas. Chamado pelo módulo de aluguel dentro da transação dele.
   */
  async reserveForPix(customerId: string, vehicleId: string, depositId: string, until: Date): Promise<Reservation> {
    const existing = await this.prisma.reservation.findFirst({ where: { customerId, status: 'active', expiresAt: { gt: new Date() } } });
    let reservation: Reservation;
    if (existing && existing.vehicleId === vehicleId) {
      reservation = await this.prisma.reservation.update({
        where: { id: existing.id },
        data: { expiresAt: until > existing.expiresAt ? until : existing.expiresAt, depositId },
      });
    } else {
      if (existing) throw conflict('reservation-already-active', 'Você já tem uma reserva ativa em outra moto.');
      await assertNotFixedForOther(this.prisma, vehicleId, customerId);
      reservation = await this.prisma.$transaction(async (tx) => {
        // Moto do galpão só sai pela entrega.
        const claimed = await tx.vehicle.updateMany({ where: { id: vehicleId, status: 'free', depotId: null }, data: { status: 'reserved' } });
        if (claimed.count === 0) throw conflict('vehicle-unavailable', 'Esta moto não está disponível.');
        return tx.reservation.create({ data: { customerId, vehicleId, expiresAt: until, depositId } });
      });
      this.emitVehicleStatus(vehicleId, 'reserved');
    }
    await this.redis.set(KEY_PREFIX + reservation.id, customerId, Math.max(1000, reservation.expiresAt.getTime() - Date.now()));
    return reservation;
  }

  /**
   * Reserva aberta do cliente (`active` dentro do prazo ou `handover`). É a rota do próprio dono: em reserva de galpão
   * traz a caução, o `pickupCode` (enquanto `active`) e a entrega aberta (`handoverId`).
   */
  async current(customerId: string, signCode?: (reservationId: string, expiresAt: Date) => string) {
    const r = await this.prisma.reservation.findFirst({
      where: { customerId, OR: [{ status: 'active', expiresAt: { gt: new Date() } }, { status: 'handover' }] },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!r) return {};
    if (!r.depotId) return { reservation: toReservation(r) };
    const deposit = r.depositId ? await this.prisma.deposit.findUnique({ where: { id: r.depositId } }) : null;
    const handover = await this.prisma.handover.findFirst({
      where: { reservationId: r.id, type: 'pickup', status: { in: ['pending_customer', 'accepted'] } },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    const pickupCode = r.status === 'active' && signCode ? signCode(r.id, r.expiresAt) : undefined;
    return { reservation: toReservation(r, { deposit, pickupCode, handoverId: handover?.id }) };
  }

  /** Grava a chave com TTL no Redis (expiração automática); a varredura é a rede de segurança. */
  async trackExpiry(reservationId: string, customerId: string, expiresAt: Date): Promise<void> {
    await this.redis.set(KEY_PREFIX + reservationId, customerId, Math.max(1000, expiresAt.getTime() - Date.now()));
  }

  async cancel(customerId: string, id: string): Promise<void> {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r || r.customerId !== customerId) throw notFound('Reserva não encontrada.');
    if (r.status === 'handover') throw inHandover();
    if (r.status !== 'active') throw conflict('conflict', 'A reserva não está mais ativa.');
    if (await this.end(r.id, 'canceled')) return;
    // Perdeu a corrida (entrega aberta, expiração ou outro cancelamento no mesmo instante): nunca 204 sem cancelar.
    const now = await this.prisma.reservation.findUnique({ where: { id } });
    if (now?.status === 'handover') throw inHandover();
    throw conflict('conflict', 'A reserva não está mais ativa.');
  }

  async expire(id: string, reason: 'expired' | 'canceled'): Promise<void> {
    await this.end(id, reason);
  }

  /** Fix round 1: caução Pix não paga (vencida/cancelada no gateway) → a reserva ativa presa nela expira. */
  @OnEvent(DEPOSIT_FAILED, { async: true, promisify: true })
  async onDepositFailed(ev: DepositFailedEvent): Promise<void> {
    try {
      const r = await this.prisma.reservation.findFirst({ where: { depositId: ev.depositId, status: 'active' }, select: { id: true } });
      if (r) await this.end(r.id, 'expired');
    } catch (err) {
      this.logger.error({ msg: 'reservation_deposit_failed_expire_error', depositId: ev.depositId, error: (err as Error).message });
    }
  }

  /** Converte a reserva ativa (ou em entrega de galpão) da moto em aluguel (sem liberar a moto). */
  async convert(tx: Tx, reservationId: string): Promise<void> {
    await tx.reservation.updateMany({ where: { id: reservationId, status: { in: ['active', 'handover'] } }, data: { status: 'converted', endedAt: new Date() } });
    await this.redis.del(KEY_PREFIX + reservationId);
  }

  /** `true` só se esta chamada encerrou a reserva (transição condicional `active → reason`). */
  private async end(id: string, reason: 'expired' | 'canceled'): Promise<boolean> {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r || r.status !== 'active') return false;
    const done = await this.prisma.$transaction(async (tx) => {
      const upd = await tx.reservation.updateMany({ where: { id, status: 'active' }, data: { status: reason, endedAt: new Date() } });
      if (upd.count === 0) return false;
      await tx.vehicle.updateMany({ where: { id: r.vehicleId, status: 'reserved' }, data: { status: 'free' } });
      return true;
    });
    await this.redis.del(KEY_PREFIX + id);
    if (!done) return false;
    this.emitVehicleStatus(r.vehicleId, 'free');
    const ev: ReservationEndedEvent = { reservationId: id, customerId: r.customerId, vehicleId: r.vehicleId, depositId: r.depositId ?? undefined, reason };
    this.events.emit(EV.RESERVATION_ENDED, ev);
    if (r.depositId) {
      const release: DepositReleaseRequestedEvent = {
        depositId: r.depositId,
        customerId: r.customerId,
        reason: reason === 'expired' ? 'reservation_expired' : 'reservation_canceled',
      };
      this.events.emit(EV.DEPOSIT_RELEASE_REQUESTED, release);
    }
    this.logger.log({ msg: 'reservation_ended', reservationId: id, reason });
    return true;
  }

  /** Rede de segurança (rua e galpão; só `active`: `handover` não vence pelo prazo): expira reservas vencidas (Redis sem keyspace notifications, reinício da API…). */
  @Interval('reservations-sweep', 10_000)
  @ExclusiveJob('reservations-sweep', jobLockTtl(10_000))
  async sweepJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    await this.sweep().catch((err) => this.logger.error({ msg: 'reservation_sweep_failed', error: (err as Error).message }));
  }

  /**
   * Fix round 1: três passes independentes. (1) Vencidas: só `expiresAt <= agora`, mais antigas primeiro (nunca ficam de fora
   * por haver muitas ativas no prazo). (2) Galpão com caução `failed` ou Pix vencido sem pagamento. (3) Ativas no prazo sem
   * chave no Redis: regrava o TTL.
   */
  async sweep(): Promise<void> {
    const now = new Date();
    const overdue = await this.prisma.reservation.findMany({
      where: { status: 'active', expiresAt: { lte: now } },
      select: { id: true },
      orderBy: { expiresAt: 'asc' },
      take: SWEEP_BATCH,
    });
    for (const c of overdue) await this.end(c.id, 'expired');

    const unpaid = (await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT r."id" FROM "Reservation" r JOIN "Deposit" d ON d."id" = r."depositId"
      WHERE r."status" = 'active' AND r."depotId" IS NOT NULL
        AND (d."status" = 'failed' OR (d."status" = 'awaiting_pix' AND (d."pix"->>'expiresAt')::timestamptz <= now()))
      LIMIT 500`) ?? [];
    for (const c of unpaid) await this.end(c.id, 'expired');

    const live = await this.prisma.reservation.findMany({
      where: { status: 'active', expiresAt: { gt: now } },
      select: { id: true, expiresAt: true },
      orderBy: { expiresAt: 'asc' },
      take: SWEEP_BATCH,
    });
    for (const c of live) {
      const ttl = c.expiresAt.getTime() - Date.now();
      if (ttl > 0 && !(await this.redis.exists(KEY_PREFIX + c.id))) await this.redis.set(KEY_PREFIX + c.id, '1', ttl);
    }
  }

  private emitVehicleStatus(vehicleId: string, status: VehicleStatusChangedEvent['status']): void {
    const ev: VehicleStatusChangedEvent = { vehicleId, status, ts: new Date().toISOString() };
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, ev);
  }
}
