import { Inject, Injectable, Logger } from '@nestjs/common';
import { DepotsService } from '../depots/depots.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import type { Depot } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { DepositReleaseRequestedEvent, EV, VehicleStatusChangedEvent } from '../../common/events';
import { assertNotFixedForOther } from '../../common/fixed-vehicle';
import { badRequest, conflict, notFound, ProblemException } from '../../common/problem';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { PUSH_NOTIFIER, type PushNotifier } from '../../ports/push-notifier.port';
import { RENTAL_BILLING, type RentalBillingPort } from '../../ports/rental-billing.port';
import { PrismaService } from '../../prisma/prisma.service';
import { assertCustomerEligible, COUNTER_DEBT_MESSAGE } from '../customers/eligibility';
import { type DepotRulesInput, type OpeningHours, pickupExpiry, type PickupErrorCode, type PickupMode, validatePickup } from '../depots/depot-rules';
import { isUniqueViolation } from '../payments/payment-state.service';
import { PICKUP_CODE_SECRET, signPickupCode } from './pickup-code';
import { ReservationsService, toReservation } from './reservations.service';
import { ExclusiveJob, jobLockTtl } from '../../common/job-lock';

export interface DepotReservationInput {
  vehicleId: string;
  depotId: string;
  pickupMode: PickupMode;
  pickupAt?: string;
}

/** Lembrete de retirada: reservas que vencem em até 30 min. */
const REMIND_BEFORE_MS = 30 * 60_000;
/** Caução de reserva antiga (beta12) sem reserva nem aluguel depois disto é órfã (processo caiu entre a caução e a transação). */
const ORPHAN_DEPOSIT_AGE_MS = 10 * 60_000;

/** Erros de `validatePickup` → problemas do contrato (`depot-closed` não tem slug próprio: vira `pickup-outside-hours`). */
const PICKUP_ERRORS: Record<PickupErrorCode, () => ProblemException> = {
  'depot-closed': () => new ProblemException(422, 'pickup-outside-hours', 'O galpão está fechado agora. Agende a retirada para o horário de funcionamento.', undefined, 'Fora do horário do galpão'),
  'pickup-outside-hours': () => new ProblemException(422, 'pickup-outside-hours', 'Escolha um horário dentro do funcionamento do galpão.', undefined, 'Fora do horário do galpão'),
  'pickup-too-far-ahead': () => new ProblemException(422, 'pickup-too-far-ahead', 'Esse horário está longe demais. Escolha uma data mais próxima.', undefined, 'Agendamento distante demais'),
  'pickup-in-past': () => badRequest('O horário de retirada já passou.', [{ field: 'pickupAt', message: 'deve ser no futuro' }]),
  'pickup-at-required': () => badRequest('Informe o horário da retirada agendada.', [{ field: 'pickupAt', message: 'obrigatório em scheduled' }]),
};

/**
 * Pré-reserva de retirada no galpão (`POST /reservations` com `depotId`): valida galpão, horário, cliente (com consentimento
 * de localização) e moto e separa a moto com uma transição condicional (`free` + mesmo galpão → `reserved`). Sem caução e
 * sem plano: plano, seguro, caução e pagamento são acertados no balcão (os campos antigos dos apps beta12 são ignorados).
 * Quem perde a corrida recebe `409`. Cancelamento e expiração reaproveitam o `ReservationsService` (moto `reserved → free`;
 * reservas antigas com caução ainda têm a caução liberada).
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
    private readonly depots: DepotsService,
  ) {}

  /** Código de retirada (QR) da reserva; vence junto com ela. Só para o cliente dono. */
  pickupCode(reservationId: string, expiresAt: Date): string {
    return signPickupCode(reservationId, expiresAt, this.pickupSecret);
  }

  /** O `Idempotency-Key` é exigido e repetido pelo interceptor do controller (sem cobrança aqui, nada mais o usa). */
  async create(customerId: string, dto: DepotReservationInput, _idempotencyKey: string) {
    const now = new Date();
    const depot = await this.requireActiveDepot(dto.depotId);
    const rules = depotRules(depot);
    const pickupAt = dto.pickupAt ? new Date(dto.pickupAt) : undefined;
    const check = validatePickup(rules, dto.pickupMode, now, pickupAt);
    if (!check.ok) throw PICKUP_ERRORS[check.code]();

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    await assertCustomerEligible(customer, customerId, this.billing, { requireLocationConsent: true, requireTerms: true, debtAsConflict: true, debtMessage: COUNTER_DEBT_MESSAGE });

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
            depositId: null,
            expiresAt,
            pickupMode: dto.pickupMode,
            pickupAt: dto.pickupMode === 'scheduled' ? pickupAt : null,
            // Plano, seguro, caução e cupom são escolhidos no balcão.
            planCode: null,
            coverage: null,
            depositMethod: null,
            cardId: null,
            couponCode: null,
          },
          include: { vehicle: true },
        });
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        const target = JSON.stringify((err as { meta?: { target?: unknown } }).meta?.target ?? '');
        throw target.includes('customer') ? reservationOpen() : vehicleUnavailable();
      }
      throw err;
    }

    await this.reservations.trackExpiry(reservation.id, customerId, expiresAt);
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId: vehicle.id, status: 'reserved', ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
    this.logger.log({ msg: 'depot_reservation_created', reservationId: reservation.id, depotId: depot.id, pickupMode: dto.pickupMode });
    return toReservation(reservation, { pickupCode: this.pickupCode(reservation.id, expiresAt) });
  }

  /** Cancelamento grátis: moto `reserved → free` (caução de reserva antiga liberada); `handover` → 409 `reservation-in-handover`. */
  async cancel(customerId: string, id: string): Promise<void> {
    await this.reservations.cancel(customerId, id);
  }

  private requireActiveDepot(depotId: string): Promise<Depot> {
    return this.depots.requireActive(depotId);
  }

  /** Espera o consumidor registrar a liberação, como no início de aluguel (uma repetição já encontra a caução liberada). */
  private async requestDepositRelease(depositId: string, customerId: string): Promise<void> {
    const ev: DepositReleaseRequestedEvent = { depositId, customerId, reason: 'reservation_canceled' };
    await this.events.emitAsync(EV.DEPOSIT_RELEASE_REQUESTED, ev).catch((err) => this.logger.error({ msg: 'deposit_release_request_failed', depositId, error: (err as Error).message }));
  }

  // ───────────────────────── caução órfã ─────────────────────────

  @Interval('depot-reservations-orphan-deposits', 5 * 60_000)
  @ExclusiveJob('depot-reservations-orphan-deposits', jobLockTtl(5 * 60_000))
  async orphanDepositsJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    await this.releaseOrphanDeposits().catch((err) => this.logger.error({ msg: 'orphan_deposit_release_failed', error: (err as Error).message }));
  }

  /**
   * Fix round 1: caução de reserva de galpão (`held`/`awaiting_pix`, chave `deposit:<cliente>:reservation:…`) sem reserva
   * nem aluguel há mais de 10 min — o processo caiu entre a caução e a transação — é liberada.
   * Auditoria run-4 onda 2: também a caução de rua (`deposit:<cliente>:<chave>` do `POST /rentals`) sem reserva, aluguel
   * nem início em andamento (`RentalStart`), 10 min depois do prazo do Pix (ou da criação, no cartão) — p.ex. a caução
   * trocada numa reserva Pix ou um início que morreu antes do marcador.
   */
  async releaseOrphanDeposits(now = new Date()): Promise<number> {
    const olderThan = new Date(now.getTime() - ORPHAN_DEPOSIT_AGE_MS);
    // Revisão onda 2: o filtro de "em uso" fica no SQL (NOT EXISTS), para cauções de aluguéis longos (ou de reservas
    // abertas) não ocuparem o lote e esconderem as órfãs. Só reserva `active`/`handover` protege a caução: convertida,
    // vencida ou cancelada sem aluguel com a caução não a segura. Rua: só 10 min depois do prazo do Pix.
    const candidates =
      (await this.prisma.$queryRaw<Array<{ id: string; customerId: string }>>`
        SELECT d."id", d."customerId" FROM "Deposit" d
        WHERE d."status" IN ('held', 'awaiting_pix')
          AND d."idempotencyKey" LIKE 'deposit:%'
          AND d."createdAt" < ${olderThan}
          AND (d."idempotencyKey" LIKE '%:reservation:%' OR COALESCE((d."pix"->>'expiresAt')::timestamptz, d."createdAt") < ${olderThan})
          AND NOT EXISTS (SELECT 1 FROM "Rental" r WHERE r."depositId" = d."id")
          AND NOT EXISTS (SELECT 1 FROM "Reservation" v WHERE v."depositId" = d."id" AND v."status" IN ('active', 'handover'))
          AND NOT EXISTS (SELECT 1 FROM "RentalStart" s WHERE s."depositId" = d."id")
          AND NOT EXISTS (SELECT 1 FROM "DepositRelease" x WHERE x."depositId" = d."id")
        ORDER BY d."createdAt" ASC LIMIT 100`) ?? [];
    let released = 0;
    for (const d of candidates) if (await this.releaseIfOrphan(d)) released++;
    return released;
  }

  /** Reconfere caso a caso (corrida entre a consulta e a liberação: aluguel, início ou liberação gravados no meio). */
  private async releaseIfOrphan(d: { id: string; customerId: string }): Promise<boolean> {
    // Liberação já pedida (DepositRelease): o job de retentativa de pagamentos cuida dela.
    if (await this.prisma.depositRelease.findUnique({ where: { depositId: d.id } })) return false;
    if (await this.prisma.reservation.findFirst({ where: { depositId: d.id, status: { in: ['active', 'handover'] } }, select: { id: true } })) return false;
    if (await this.prisma.rental.findFirst({ where: { depositId: d.id }, select: { id: true } })) return false;
    // Início em andamento com esta caução: a liberação fica para depois que o marcador sumir.
    if (await this.prisma.rentalStart.findFirst({ where: { depositId: d.id }, select: { rentalId: true } })) return false;
    await this.requestDepositRelease(d.id, d.customerId);
    this.logger.warn({ msg: 'orphan_deposit_released', depositId: d.id });
    return true;
  }

  // ───────────────────────── lembrete ─────────────────────────

  @Interval('depot-reservations-remind', 60_000)
  @ExclusiveJob('depot-reservations-remind', jobLockTtl(60_000))
  async remindJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    await this.remind().catch((err) => this.logger.error({ msg: 'depot_reservation_remind_failed', error: (err as Error).message }));
  }

  /** Reservas de galpão `active` que vencem em até 30 min, ainda sem lembrete: push uma vez só (claim condicional). */
  async remind(now = new Date()): Promise<number> {
    const due = await this.prisma.reservation.findMany({
      where: { status: 'active', depotId: { not: null }, reminderSentAt: null, expiresAt: { gt: now, lte: new Date(now.getTime() + REMIND_BEFORE_MS) } },
      include: { depot: true },
      orderBy: { expiresAt: 'asc' },
      take: 200,
    });
    let sent = 0;
    for (const r of due) {
      // Fix round 1: reserva que dura 30 min ou menos já nasce dentro da janela; o app mostra o prazo — sem lembrete.
      if (r.expiresAt.getTime() - r.createdAt.getTime() <= REMIND_BEFORE_MS) continue;
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
