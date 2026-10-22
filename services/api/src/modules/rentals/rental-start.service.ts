import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Coupon, Deposit, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { DepositReleaseRequestedEvent, EV, RentalChangedEvent, VehicleStatusChangedEvent } from '../../common/events';
import { conflict, notFound, ProblemException } from '../../common/problem';
import { INSURANCE, type InsurancePort } from '../../ports/insurance.port';
import { RENTAL_BILLING, type RentalBillingPort } from '../../ports/rental-billing.port';
import { PrismaService } from '../../prisma/prisma.service';
import type { Principal } from '../auth/principal';
import { CommandsService } from '../commands/commands.service';
import { assertCustomerEligible } from '../customers/eligibility';
import { PricingService } from '../pricing/pricing.service';
import { ReservationsService } from '../reservations/reservations.service';
import type { StartRentalDto } from './rentals.dto';
import { toDeposit, toRental } from './rentals.mapper';

export interface StartResult {
  status: 201 | 202;
  body: { outcome: 'started' | 'awaiting_deposit'; rental?: ReturnType<typeof toRental>; deposit: ReturnType<typeof toDeposit> };
}

/**
 * `POST /rentals`: KYC aprovado → sem bloqueio → sem inadimplência → consentimento de localização → moto `free`
 * (ou reservada pelo próprio cliente) → caução (cartão: retida; Pix: 202 + reserva até o prazo do Pix) → apólice → aluguel `active`
 * e desbloqueio pedido ao módulo IoT. A idempotência por `Idempotency-Key` fica no interceptor.
 */
@Injectable()
export class RentalStartService {
  private readonly logger = new Logger('RentalStartService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly reservations: ReservationsService,
    private readonly commands: CommandsService,
    @Inject(RENTAL_BILLING) private readonly billing: RentalBillingPort,
    @Inject(INSURANCE) private readonly insurance: InsurancePort,
    private readonly events: EventEmitter2,
  ) {}

  async start(user: Principal, dto: StartRentalDto, idempotencyKey: string): Promise<StartResult> {
    const customerId = user.customerId!;
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    await assertCustomerEligible(customer, customerId, this.billing, { requireLocationConsent: true });

    const open = await this.prisma.rental.findFirst({ where: { customerId, status: { in: OPEN_RENTAL_STATUSES } } });
    if (open) {
      this.requestDepositRelease(dto.depositId, customerId);
      throw conflict('rental-already-active', 'Você já tem um aluguel em andamento.');
    }

    const plan = await this.pricing.activePlan(dto.planCode);
    const coupon: Coupon | null = dto.couponCode ? await this.pricing.requireCoupon(dto.couponCode, dto.planCode, customerId) : null;

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw notFound('Moto não encontrada.');
    const reservation = await this.prisma.reservation.findFirst({
      where: { vehicleId: vehicle.id, status: 'active', expiresAt: { gt: new Date() } },
    });
    const ownReservation = reservation && reservation.customerId === customerId ? reservation : null;
    const available = (vehicle.status === 'free' && !reservation) || (vehicle.status === 'reserved' && !!ownReservation);
    if (!available) {
      this.requestDepositRelease(dto.depositId, customerId);
      throw conflict('vehicle-unavailable', 'Esta moto não está disponível.');
    }

    // ── caução ──
    let deposit!: Deposit;
    let rentalId!: string;
    let heldDepositId: string | undefined;
    let policyId: string | undefined;
    let rental;
    try {
    if (dto.depositId) {
      const d = await this.prisma.deposit.findUnique({ where: { id: dto.depositId } });
      if (!d || d.customerId !== customerId) throw notFound('Caução não encontrada.');
      if (d.status !== 'held') throw new ProblemException(402, 'deposit-not-held', 'A caução ainda não foi confirmada.');
      deposit = d;
      heldDepositId = d.id;
      rentalId = d.rentalId ?? randomUUID();
    } else {
      rentalId = randomUUID();
      const held = await this.billing.holdDeposit({ customerId, rentalId, method: dto.depositMethod, idempotencyKey: `deposit:${customerId}:${idempotencyKey}` });
      if (held.status === 'failed') throw new ProblemException(402, 'payment-failed', 'Não foi possível reter a caução. Tente outro meio de pagamento.');
      const d = await this.prisma.deposit.findUnique({ where: { id: held.depositId } });
      if (!d) throw new ProblemException(402, 'payment-failed', 'Caução não registrada pelo provedor.');
      deposit = d;
      if (held.status === 'held') heldDepositId = d.id;
      if (held.status === 'awaiting_pix') {
        const until = new Date(held.pix?.expiresAt ?? Date.now() + 15 * 60 * 1000);
        await this.reservations.reserveForPix(customerId, vehicle.id, held.depositId, until);
        return { status: 202, body: { outcome: 'awaiting_deposit', deposit: toDeposit(deposit) } };
      }
    }

    // ── seguro, preço congelado e criação ──
    const subscription = dto.planCode === 'weekly' || dto.planCode === 'monthly'
      ? await this.prisma.subscription.findFirst({ where: { customerId, planCode: dto.planCode, status: 'active', currentPeriodEnd: { gt: new Date() } } })
      : null;
    const policy = await this.insurance.issueForRental({ rentalId, customerId, coverage: dto.coverage });
    policyId = policy.policyId;
    const snapshot = PricingService.snapshotFrom(plan, policy.premiumCents, dto.coverage, coupon, !!subscription);

    rental = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.vehicle.updateMany({ where: { id: vehicle.id, status: { in: ['free', 'reserved'] } }, data: { status: 'rented' } });
      if (claimed.count === 0) throw conflict('vehicle-unavailable', 'Esta moto não está disponível.');
      if (ownReservation) await this.reservations.convert(tx, ownReservation.id);
      const created = await tx.rental.create({
        data: {
          id: rentalId,
          customerId,
          vehicleId: vehicle.id,
          planCode: dto.planCode,
          coverage: dto.coverage,
          priceSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          couponCode: coupon?.code ?? null,
          depositId: deposit.id,
          insurancePolicyId: policy.policyId,
          // QA-12: arredondada (≈ 100 m; o mapa de calor usa 3 casas), anulada após TRACK_RETENTION_DAYS e na exclusão.
          startLat: roundCoord(vehicle.lat),
          startLng: roundCoord(vehicle.lng),
          speedLimitKmh: vehicle.speedLimitKmh,
        },
      });
      await tx.rentalEvent.create({ data: { rentalId, type: 'started', actorType: 'customer', actorId: customerId } });
      if (coupon) {
        await tx.couponRedemption.create({ data: { couponId: coupon.id, customerId, rentalId } });
        await tx.coupon.update({ where: { id: coupon.id }, data: { redemptions: { increment: 1 } } });
      }
      if (!deposit.rentalId) await tx.deposit.update({ where: { id: deposit.id }, data: { rentalId } });
      return created;
    });
    } catch (err) {
      // Compensação (decisão #16): caução retida e apólice emitida não podem ficar órfãs.
      if (policyId) {
        try {
          await this.insurance.cancel(policyId);
        } catch (e) {
          this.logger.error({ msg: 'policy_cancel_failed', policyId, error: (e as Error).message });
        }
      }
      if (heldDepositId) this.requestDepositRelease(heldDepositId, customerId);
      throw err;
    }

    // Desbloqueio pelo módulo IoT (não desfaz o aluguel se a moto estiver offline: o comando fica pendente).
    try {
      await this.commands.dispatch({
        vehicleId: vehicle.id,
        type: 'unlock',
        reason: 'Início do aluguel',
        actor: user,
        context: { rentalId, purpose: 'rental_start' },
        auditAction: 'rental.unlock',
      });
    } catch (err) {
      this.logger.error({ msg: 'rental_unlock_failed', rentalId, error: (err as Error).message });
    }

    const mapped = toRental({ ...rental, vehicle });
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId: vehicle.id, status: 'rented', ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
    this.events.emit(EV.RENTAL_CHANGED, {
      rentalId, customerId, vehicleId: vehicle.id, status: 'active', elapsedSeconds: 0, costCents: mapped.costCents, ts: new Date().toISOString(),
    } satisfies RentalChangedEvent);
    this.logger.log({ msg: 'rental_started', rentalId, planCode: dto.planCode });
    return { status: 201, body: { outcome: 'started', rental: mapped, deposit: toDeposit({ ...deposit, rentalId }) } };
  }

  private requestDepositRelease(depositId: string | undefined, customerId: string): void {
    if (!depositId) return;
    const ev: DepositReleaseRequestedEvent = { depositId, customerId, reason: 'rental_not_started' };
    this.events.emit(EV.DEPOSIT_RELEASE_REQUESTED, ev);
  }
}

/** Coordenada com 3 casas (≈ 100 m). */
function roundCoord(v: number): number {
  return Math.round(v * 1000) / 1000;
}
