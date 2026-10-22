import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import type { Depot, Deposit, InsuranceCoverage, PlanCode } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { DepositReleaseRequestedEvent, EV, VehicleStatusChangedEvent } from '../../common/events';
import { assertNotFixedForOther } from '../../common/fixed-vehicle';
import { badRequest, conflict, notFound, ProblemException } from '../../common/problem';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { PUSH_NOTIFIER, type PushNotifier } from '../../ports/push-notifier.port';
import { RENTAL_BILLING, type RentalBillingPort } from '../../ports/rental-billing.port';
import { PrismaService } from '../../prisma/prisma.service';
import { assertCustomerEligible } from '../customers/eligibility';
import { type DepotRulesInput, type OpeningHours, pickupExpiry, type PickupErrorCode, type PickupMode, validatePickup } from '../depots/depot-rules';
import { isUniqueViolation } from '../payments/payment-state.service';
import { PICKUP_CODE_SECRET, signPickupCode } from './pickup-code';
import { ReservationsService, toReservation } from './reservations.service';

export interface DepotReservationInput {
  vehicleId: string;
  depotId: string;
  pickupMode: PickupMode;
  pickupAt?: string;
  planCode: PlanCode;
  coverage: InsuranceCoverage;
  depositMethod: 'card' | 'pix';
  cardId?: string;
  couponCode?: string;
}

/** Lembrete de retirada: reservas que vencem em até 30 min. */
const REMIND_BEFORE_MS = 30 * 60_000;

/** Erros de `validatePickup` → problemas do contrato (`depot-closed` não tem slug próprio: vira `pickup-outside-hours`). */
const PICKUP_ERRORS: Record<PickupErrorCode, () => ProblemException> = {
  'depot-closed': () => new ProblemException(422, 'pickup-outside-hours', 'O galpão está fechado agora. Agende a retirada para o horário de funcionamento.', undefined, 'Fora do horário do galpão'),
  'pickup-outside-hours': () => new ProblemException(422, 'pickup-outside-hours', 'Escolha um horário dentro do funcionamento do galpão.', undefined, 'Fora do horário do galpão'),
  'pickup-too-far-ahead': () => new ProblemException(422, 'pickup-too-far-ahead', 'Esse horário está longe demais. Escolha uma data mais próxima.', undefined, 'Agendamento distante demais'),
  'pickup-in-past': () => badRequest('O horário de retirada já passou.', [{ field: 'pickupAt', message: 'deve ser no futuro' }]),
  'pickup-at-required': () => badRequest('Informe o horário da retirada agendada.', [{ field: 'pickupAt', message: 'obrigatório em scheduled' }]),
};

/**
 * Reserva de retirada no galpão (`POST /reservations` com `depotId`): valida galpão, horário, cliente e moto, bloqueia a
 * caução (as mesmas funções do início de aluguel: cartão pré-autorizado, Pix com QR) e separa a moto com uma transição
 * condicional (`free` + mesmo galpão → `reserved`). Quem perde a corrida tem a caução liberada e recebe `409`.
 * Cancelamento e expiração reaproveitam o `ReservationsService` (caução liberada, moto `reserved → free`).
 */
@Injectable()
export class DepotReservationsService {
  private readonly logger = new Logger('DepotReservationsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly reservations: ReservationsService,
    @Inject(RENTAL_BILLING) private readonly billing: RentalBillingPort,
    private readonly events: EventEmitter2,
    @Inject(PUSH_NOTIFIER) private readonly push: PushNotifier,
    @Inject(PICKUP_CODE_SECRET) private readonly pickupSecret: string,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  /** Código de retirada (QR) da reserva; vence junto com ela. Só para o cliente dono. */
  pickupCode(reservationId: string, expiresAt: Date): string {
    return signPickupCode(reservationId, expiresAt, this.pickupSecret);
  }

  async create(customerId: string, dto: DepotReservationInput, idempotencyKey: string) {
    const now = new Date();
    const depot = await this.requireActiveDepot(dto.depotId);
    const rules = depotRules(depot);
    const pickupAt = dto.pickupAt ? new Date(dto.pickupAt) : undefined;
    const check = validatePickup(rules, dto.pickupMode, now, pickupAt);
    if (!check.ok) throw PICKUP_ERRORS[check.code]();

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    await assertCustomerEligible(customer, customerId, this.billing, { requireLocationConsent: false, requireTerms: true });

    const openRental = await this.prisma.rental.findFirst({ where: { customerId, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } });
    if (openRental) throw conflict('rental-already-active', 'Você já tem um aluguel em andamento.');
    const openReservation = await this.prisma.reservation.findFirst({
      where: { customerId, OR: [{ status: 'active', expiresAt: { gt: now } }, { status: 'handover' }] },
      select: { id: true },
    });
    if (openReservation) throw reservationOpen();

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw notFound('Moto não encontrada.');
    if (vehicle.depotId !== depot.id || vehicle.status !== 'free') throw vehicleUnavailable();
    // Contrato v2: moto fixa de outro plano vigente.
    await assertNotFixedForOther(this.prisma, vehicle.id, customerId);

    const deposit = await this.holdDeposit(customerId, dto, idempotencyKey);
    const expiresAt = pickupExpiry(rules, dto.pickupMode, now, pickupAt);
    let reservation;
    try {
      reservation = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.vehicle.updateMany({ where: { id: vehicle.id, status: 'free', depotId: depot.id }, data: { status: 'reserved' } });
        if (claimed.count === 0) throw vehicleUnavailable();
        return tx.reservation.create({
          data: {
            customerId,
            vehicleId: vehicle.id,
            depotId: depot.id,
            depositId: deposit.id,
            expiresAt,
            pickupMode: dto.pickupMode,
            pickupAt: dto.pickupMode === 'scheduled' ? pickupAt : null,
            planCode: dto.planCode,
            coverage: dto.coverage,
            depositMethod: dto.depositMethod,
            cardId: dto.cardId ?? null,
            couponCode: dto.couponCode ?? null,
          },
          include: { vehicle: true },
        });
      });
    } catch (err) {
      await this.requestDepositRelease(deposit.id, customerId);
      if (isUniqueViolation(err)) {
        const target = JSON.stringify((err as { meta?: { target?: unknown } }).meta?.target ?? '');
        throw target.includes('customer') ? reservationOpen() : vehicleUnavailable();
      }
      throw err;
    }

    await this.reservations.trackExpiry(reservation.id, customerId, expiresAt);
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId: vehicle.id, status: 'reserved', ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
    this.logger.log({ msg: 'depot_reservation_created', reservationId: reservation.id, depotId: depot.id, pickupMode: dto.pickupMode, depositMethod: dto.depositMethod });
    return toReservation(reservation, { deposit, pickupCode: this.pickupCode(reservation.id, expiresAt) });
  }

  /** Cancelamento grátis: caução liberada e moto `reserved → free`; `handover` → 409 `reservation-in-handover`. */
  async cancel(customerId: string, id: string): Promise<void> {
    await this.reservations.cancel(customerId, id);
  }

  /**
   * Caução pelo mesmo `RentalBillingPort` do início de aluguel. Chave própria da reserva (`deposit:<cliente>:reservation:<chave>`),
   * para não colidir com a do `POST /rentals`.
   */
  private async holdDeposit(customerId: string, dto: DepotReservationInput, idempotencyKey: string): Promise<Deposit> {
    const held = await this.billing.holdDeposit({
      customerId,
      rentalId: randomUUID(),
      method: dto.depositMethod,
      idempotencyKey: `deposit:${customerId}:reservation:${idempotencyKey}`,
      ...(dto.cardId ? { cardId: dto.cardId } : {}),
    });
    const d = await this.prisma.deposit.findUnique({ where: { id: held.depositId } });
    // Repetição com a mesma chave depois de um 409: a caução daquela tentativa já foi liberada.
    if (d && (d.status === 'released' || d.status === 'captured' || (await this.prisma.depositRelease.findUnique({ where: { depositId: d.id } })))) {
      throw conflict('conflict', 'A caução desta tentativa já foi liberada. Tente de novo com uma nova requisição.');
    }
    if (held.status === 'failed' || !d) {
      throw new ProblemException(422, 'payment-declined', 'Não foi possível bloquear a caução. Tente outro cartão ou pague com Pix.', undefined, 'Pagamento não aprovado');
    }
    return d;
  }

  // TODO(T4 merge): usar DepotsService.requireActive
  private async requireActiveDepot(depotId: string): Promise<Depot> {
    const depot = await this.prisma.depot.findUnique({ where: { id: depotId } });
    if (!depot || !depot.active) {
      throw new ProblemException(422, 'depot-inactive', 'Este galpão não está recebendo reservas agora.', undefined, 'Galpão inativo');
    }
    return depot;
  }

  /** Espera o consumidor registrar a liberação, como no início de aluguel (uma repetição já encontra a caução liberada). */
  private async requestDepositRelease(depositId: string, customerId: string): Promise<void> {
    const ev: DepositReleaseRequestedEvent = { depositId, customerId, reason: 'reservation_canceled' };
    await this.events.emitAsync(EV.DEPOSIT_RELEASE_REQUESTED, ev).catch((err) => this.logger.error({ msg: 'deposit_release_request_failed', depositId, error: (err as Error).message }));
  }

  // ───────────────────────── lembrete ─────────────────────────

  @Interval('depot-reservations-remind', 60_000)
  async remindJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    await this.remind().catch((err) => this.logger.error({ msg: 'depot_reservation_remind_failed', error: (err as Error).message }));
  }

  /** Reservas de galpão `active` que vencem em até 30 min, ainda sem lembrete: push uma vez só (claim condicional). */
  async remind(now = new Date()): Promise<number> {
    const due = await this.prisma.reservation.findMany({
      where: { status: 'active', depotId: { not: null }, reminderSentAt: null, expiresAt: { gt: now, lte: new Date(now.getTime() + REMIND_BEFORE_MS) } },
      include: { depot: true },
      take: 200,
    });
    let sent = 0;
    for (const r of due) {
      const claimed = await this.prisma.reservation.updateMany({ where: { id: r.id, status: 'active', reminderSentAt: null }, data: { reminderSentAt: now } });
      if (claimed.count !== 1) continue;
      const time = formatTime(r.expiresAt, r.depot?.timezone ?? 'America/Sao_Paulo');
      try {
        await this.push.sendToOwner(r.customerId, {
          title: 'Retirada no galpão',
          body: `Sua retirada vence às ${time}`,
          data: { type: 'reservation.reminder', reservationId: r.id },
        });
        sent++;
      } catch (err) {
        this.logger.warn({ msg: 'depot_reservation_remind_push_failed', reservationId: r.id, error: (err as Error).message });
      }
    }
    return sent;
  }
}

function depotRules(depot: Depot): DepotRulesInput {
  return {
    openingHours: (depot.openingHours ?? []) as unknown as OpeningHours,
    timezone: depot.timezone,
    pickupNowWindowMinutes: depot.pickupNowWindowMinutes,
    maxScheduleDays: depot.maxScheduleDays,
    scheduledGraceMinutes: depot.scheduledGraceMinutes,
  };
}

function formatTime(at: Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
}

const vehicleUnavailable = () => conflict('vehicle-unavailable', 'Esta moto não está disponível.');
const reservationOpen = () =>
  new ProblemException(409, 'reservation-open', 'Você já tem uma reserva aberta. Cancele-a ou conclua a retirada antes de reservar outra moto.', undefined, 'Já existe uma reserva aberta');
