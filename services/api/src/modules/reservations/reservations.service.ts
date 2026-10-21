import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import type { Prisma, Reservation, Vehicle } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { DepositReleaseRequestedEvent, EV, ReservationEndedEvent, VehicleStatusChangedEvent } from '../../common/events';
import { conflict, notFound } from '../../common/problem';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { RENTAL_BILLING, type RentalBillingPort } from '../../ports/rental-billing.port';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_STORE, type RedisStore } from '../../redis/redis-store';
import { assertCustomerEligible } from '../customers/eligibility';
import { toVehicleSummary } from '../vehicles/vehicles.mapper';

const KEY_PREFIX = 'reservation:';
type Tx = Prisma.TransactionClient;

export function toReservation(r: Reservation & { vehicle?: Vehicle | null }) {
  return {
    id: r.id,
    vehicleId: r.vehicleId,
    ...(r.vehicle ? { vehicle: toVehicleSummary(r.vehicle) } : {}),
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
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
    await assertCustomerEligible(customer, customerId, this.billing, { requireLocationConsent: false });

    const active = await this.prisma.reservation.findFirst({ where: { customerId, status: 'active', expiresAt: { gt: new Date() } } });
    if (active) throw conflict('reservation-already-active', 'Você já tem uma reserva ativa.');
    const openRental = await this.prisma.rental.findFirst({ where: { customerId, status: { in: OPEN_RENTAL_STATUSES } } });
    if (openRental) throw conflict('rental-already-active', 'Você já tem um aluguel em andamento.');

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw notFound('Moto não encontrada.');

    const expiresAt = new Date(Date.now() + this.ttlMs);
    const reservation = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.vehicle.updateMany({ where: { id: vehicleId, status: 'free' }, data: { status: 'reserved' } });
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
    const existing = await this.prisma.reservation.findFirst({ where: { customerId, status: 'active' } });
    let reservation: Reservation;
    if (existing && existing.vehicleId === vehicleId) {
      reservation = await this.prisma.reservation.update({
        where: { id: existing.id },
        data: { expiresAt: until > existing.expiresAt ? until : existing.expiresAt, depositId },
      });
    } else {
      if (existing) throw conflict('reservation-already-active', 'Você já tem uma reserva ativa em outra moto.');
      reservation = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.vehicle.updateMany({ where: { id: vehicleId, status: 'free' }, data: { status: 'reserved' } });
        if (claimed.count === 0) throw conflict('vehicle-unavailable', 'Esta moto não está disponível.');
        return tx.reservation.create({ data: { customerId, vehicleId, expiresAt: until, depositId } });
      });
      this.emitVehicleStatus(vehicleId, 'reserved');
    }
    await this.redis.set(KEY_PREFIX + reservation.id, customerId, Math.max(1000, reservation.expiresAt.getTime() - Date.now()));
    return reservation;
  }

  async current(customerId: string) {
    const r = await this.prisma.reservation.findFirst({
      where: { customerId, status: 'active', expiresAt: { gt: new Date() } },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });
    return r ? { reservation: toReservation(r) } : {};
  }

  async cancel(customerId: string, id: string): Promise<void> {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r || r.customerId !== customerId) throw notFound('Reserva não encontrada.');
    if (r.status !== 'active') throw conflict('conflict', 'A reserva não está mais ativa.');
    await this.end(r.id, 'canceled');
  }

  async expire(id: string, reason: 'expired' | 'canceled'): Promise<void> {
    await this.end(id, reason);
  }

  /** Converte a reserva ativa da moto em aluguel (sem liberar a moto). */
  async convert(tx: Tx, reservationId: string): Promise<void> {
    await tx.reservation.updateMany({ where: { id: reservationId, status: 'active' }, data: { status: 'converted', endedAt: new Date() } });
    await this.redis.del(KEY_PREFIX + reservationId);
  }

  private async end(id: string, reason: 'expired' | 'canceled'): Promise<void> {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r || r.status !== 'active') return;
    const done = await this.prisma.$transaction(async (tx) => {
      const upd = await tx.reservation.updateMany({ where: { id, status: 'active' }, data: { status: reason, endedAt: new Date() } });
      if (upd.count === 0) return false;
      await tx.vehicle.updateMany({ where: { id: r.vehicleId, status: 'reserved' }, data: { status: 'free' } });
      return true;
    });
    await this.redis.del(KEY_PREFIX + id);
    if (!done) return;
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
  }

  /** Rede de segurança: expira reservas vencidas (Redis sem keyspace notifications, reinício da API…). */
  @Interval('reservations-sweep', 10_000)
  async sweepJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    await this.sweep().catch((err) => this.logger.error({ msg: 'reservation_sweep_failed', error: (err as Error).message }));
  }

  async sweep(): Promise<void> {
    const candidates = await this.prisma.reservation.findMany({ where: { status: 'active' }, select: { id: true, expiresAt: true }, take: 500 });
    for (const c of candidates) {
      const overdue = c.expiresAt.getTime() <= Date.now();
      if (overdue || !(await this.redis.exists(KEY_PREFIX + c.id))) {
        if (overdue) await this.end(c.id, 'expired');
        else await this.redis.set(KEY_PREFIX + c.id, '1', c.expiresAt.getTime() - Date.now());
      }
    }
  }

  private emitVehicleStatus(vehicleId: string, status: VehicleStatusChangedEvent['status']): void {
    const ev: VehicleStatusChangedEvent = { vehicleId, status, ts: new Date().toISOString() };
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, ev);
  }
}
