import { Inject, Injectable, Logger } from '@nestjs/common';
import { assertDepositCard } from '../payments/card-required';
import { assertNotFixedForOther } from '../../common/fixed-vehicle';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Coupon, Deposit, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { hasOpenRental } from '../../common/vehicle-in-use';
import { CommandChangedEvent, DepositReleaseRequestedEvent, EV, RentalChangedEvent, VehicleStatusChangedEvent } from '../../common/events';
import { conflict, notFound, ProblemException, unprocessable } from '../../common/problem';
import { INSURANCE, type InsurancePort } from '../../ports/insurance.port';
import { IOT_GATEWAY, type IotGateway } from '../../ports/iot-gateway.port';
import { IOT_CONFIG, type IotConfig } from '../iot/iot-config';
import { Interval } from '@nestjs/schedule';

/** Folga da espera do desbloqueio além do prazo do comando. */
const UNLOCK_WAIT_MARGIN_MS = 5_000;
/** Marcador `RentalStart` mais velho que a espera máxima + isto é compensado pela varredura. */
const STALE_START_MARGIN_MS = 60_000;
/** Auditoria item adiado 1: moto com trava que o cliente não desfaz (equipe/sistema, hold, modo roubada). */
const LOCKED_BY_STAFF_DETAIL = 'A moto está bloqueada pela equipe. Escolha outra.';
/** Run-2: caução de outra reserva (ou liberada durante o desbloqueio) não sustenta este aluguel. */
const depositInUse = () => conflict('deposit-in-use', 'Essa caução já está em uso em outra reserva.');
import { RENTAL_BILLING, type RentalBillingPort } from '../../ports/rental-billing.port';
import { PrismaService } from '../../prisma/prisma.service';
import type { Principal } from '../auth/principal';
import { CommandsService } from '../commands/commands.service';
import { assertCustomerEligible } from '../customers/eligibility';
import { PricingService } from '../pricing/pricing.service';
import { ReservationsService } from '../reservations/reservations.service';
import type { StartRentalDto } from './rentals.dto';
import { toDeposit, toRental } from './rentals.mapper';
import { ExclusiveJob, jobLockTtl } from '../../common/job-lock';

/** Aceite da entrega de galpão (`POST /handovers/{id}/accept`): a única passagem de uma moto do galpão para o aluguel. */
export interface StartOptions {
  fromHandover?: { reservationId: string; handoverId: string };
}

export interface StartResult {
  status: 201 | 202;
  body: { outcome: 'started' | 'awaiting_deposit'; rental?: ReturnType<typeof toRental>; deposit: ReturnType<typeof toDeposit> };
}

/**
 * `POST /rentals`: KYC aprovado → sem bloqueio → sem inadimplência → consentimento de localização → moto `free`
 * (ou reservada pelo próprio cliente) e online → caução (cartão: retida; Pix: 202 + reserva até o prazo do Pix) → apólice → moto
 * reivindicada → desbloqueio **confirmado** pelo módulo IoT → aluguel `active` (QA-21: o relógio e a cobrança só começam aí;
 * moto offline ou desbloqueio não confirmado → `409 vehicle-offline`, caução liberada, apólice cancelada, nada cobrado).
 * A idempotência por `Idempotency-Key` fica no interceptor.
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
    @Inject(IOT_GATEWAY) private readonly iot: IotGateway,
    @Inject(IOT_CONFIG) private readonly iotCfg: IotConfig,
  ) {}

  /** Espera máxima do desbloqueio: prazo do comando (`IOT_COMMAND_TIMEOUT_MS`) + folga. */
  private unlockWaitMs(): number {
    return this.iotCfg.commandTimeoutMs + UNLOCK_WAIT_MARGIN_MS;
  }

  /**
   * Espera máxima do desbloqueio, exposta para a trava do aceite da entrega (`HandoversService`): ela precisa ficar abaixo
   * de `IDEMPOTENCY_STALE_MS` (60 s), senão a trava "vence" no meio do aceite (padrão: 30 s + 5 s = 35 s).
   */
  maxUnlockWaitMs(): number {
    return this.unlockWaitMs();
  }

  /**
   * Fix round 1: compensa inícios de aluguel que ficaram no meio (processo morreu durante a espera do desbloqueio).
   * Marcador mais velho que a espera máxima + 1 min: quem apaga o marcador (uma instância só) devolve a moto ao status
   * anterior, manda o lock de sistema, cancela a apólice e libera a caução. Idempotente.
   */
  async sweepStaleStarts(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - this.unlockWaitMs() - STALE_START_MARGIN_MS);
    const stale = await this.prisma.rentalStart.findMany({ where: { createdAt: { lt: cutoff } }, take: 50 });
    let done = 0;
    for (const m of stale) {
      const claimed = await this.prisma.rentalStart.deleteMany({ where: { rentalId: m.rentalId, createdAt: { lt: cutoff } } });
      if (claimed.count !== 1) continue;
      if (await this.prisma.rental.findUnique({ where: { id: m.rentalId }, select: { id: true } })) continue;
      const open = await this.prisma.rental.findFirst({ where: { vehicleId: m.vehicleId, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } });
      if (!open) await this.prisma.vehicle.updateMany({ where: { id: m.vehicleId, status: 'rented' }, data: { status: m.previousStatus } });
      await this.relock(m.vehicleId, m.rentalId);
      if (m.policyId) {
        try {
          await this.insurance.cancel(m.policyId);
        } catch (e) {
          this.logger.error({ msg: 'policy_cancel_failed', policyId: m.policyId, error: (e as Error).message });
        }
      }
      // Aceite de entrega de galpão que morreu no meio: a caução continua da reserva (ainda `handover`).
      const heldByHandover = m.depositId
        ? await this.prisma.reservation.findFirst({ where: { depositId: m.depositId, status: 'handover' }, select: { id: true } })
        : null;
      if (!heldByHandover) await this.requestDepositRelease(m.depositId ?? undefined, m.customerId);
      this.logger.warn({ msg: 'rental_start_compensated_by_sweep', rentalId: m.rentalId, vehicleId: m.vehicleId });
      done++;
    }
    return done;
  }

  @Interval('rental-start-sweep', 60_000)
  @ExclusiveJob('rental-start-sweep', jobLockTtl(60_000))
  async sweepJob(): Promise<void> {
    if (process.env.JOBS_ENABLED === 'false') return;
    await this.sweepStaleStarts().catch((err) => this.logger.error({ msg: 'rental_start_sweep_failed', error: (err as Error).message }));
  }

  /** Estado ao vivo do rastreador diz offline (sem estado conhecido = indefinido; o desbloqueio decide). */
  private async liveOffline(thingName: string): Promise<boolean> {
    const live = await this.iot.getLiveState(thingName).catch(() => null);
    return !!live && live.online === false;
  }

  /**
   * QA-21: pede o desbloqueio e espera o desfecho. `in_progress` (moto online, aguardando o reported) espera o
   * `command.changed` final até o prazo do comando (`IOT_COMMAND_TIMEOUT_MS`) + folga; `pending` (offline) e erro = não confirmado.
   */
  private async unlockAndWait(vehicleId: string, user: Principal, rentalId: string): Promise<{ status: string; statusReason?: string }> {
    let cmd: { id: string; status: string; statusReason?: string };
    try {
      cmd = await this.commands.dispatch({
        vehicleId,
        type: 'unlock',
        reason: 'Início do aluguel',
        actor: user,
        context: { rentalId, purpose: 'rental_start' },
        auditAction: 'rental.unlock',
      });
    } catch (err) {
      this.logger.error({ msg: 'rental_unlock_failed', rentalId, error: (err as Error).message });
      return { status: 'failed' };
    }
    if (cmd.status !== 'in_progress') return cmd;
    const timeoutMs = this.unlockWaitMs();
    const final = new Promise<string>((resolve) => {
      const timer = setTimeout(() => done('failed'), timeoutMs);
      const onChange = (ev: CommandChangedEvent) => {
        if (ev.commandId === cmd.id && (ev.status === 'confirmed' || ev.status === 'failed')) done(ev.status);
      };
      const done = (s: string) => {
        clearTimeout(timer);
        this.events.off(EV.COMMAND_CHANGED, onChange);
        resolve(s);
      };
      this.events.on(EV.COMMAND_CHANGED, onChange);
      // Desfecho que chegou entre a resposta do dispatch e a inscrição acima.
      void this.prisma.vehicleCommand.findUnique({ where: { id: cmd.id }, select: { status: true } }).then(
        (c) => c && (c.status === 'confirmed' || c.status === 'failed') && done(c.status),
        () => undefined,
      );
    });
    return { status: await final };
  }

  /** Desbloqueio pedido para um aluguel que não começou: bloqueio de sistema (substitui o desbloqueio pendente). */
  private async relock(vehicleId: string, rentalId: string): Promise<void> {
    try {
      await this.commands.dispatch({
        vehicleId,
        type: 'lock',
        reason: 'Aluguel não iniciado: desbloqueio não confirmado',
        actor: { system: true, name: 'rental-start' },
        context: { rentalId, purpose: 'rental_start_rollback' },
        auditAction: 'rental.unlock_rollback',
      });
    } catch (err) {
      this.logger.error({ msg: 'rental_start_relock_failed', vehicleId, rentalId, error: (err as Error).message });
    }
  }

  /** Reserva de galpão do próprio cliente em `handover` que separou esta moto (`reserved`); senão `null`. */
  private async handoverReservation(reservationId: string, customerId: string, vehicle: { id: string; status: string }) {
    const r = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!r || r.status !== 'handover' || r.customerId !== customerId || r.vehicleId !== vehicle.id || vehicle.status !== 'reserved') return null;
    return r;
  }

  async start(user: Principal, dto: StartRentalDto, idempotencyKey: string, opts: StartOptions = {}): Promise<StartResult> {
    const customerId = user.customerId!;
    const fromHandover = opts.fromHandover;
    // Entrega de galpão: a caução é da reserva (que continua `handover` se o aceite falhar); quem a libera é a reserva.
    const release = (depositId: string | undefined) => (fromHandover ? Promise.resolve() : this.requestDepositRelease(depositId, customerId));
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    await assertCustomerEligible(customer, customerId, this.billing, { requireLocationConsent: true, requireTerms: true });
    // Run-2: antes de qualquer liberação (as recusas abaixo liberam `dto.depositId`), para não soltar a caução de uma reserva.
    if (dto.depositId) await this.assertDepositNotInUse(dto.depositId, dto.vehicleId, fromHandover);

    const open = await this.prisma.rental.findFirst({ where: { customerId, status: { in: OPEN_RENTAL_STATUSES } } });
    if (open) {
      await release(dto.depositId);
      throw conflict('rental-already-active', 'Você já tem um aluguel em andamento.');
    }

    const plan = await this.pricing.activePlan(dto.planCode);
    const coupon: Coupon | null = dto.couponCode ? await this.pricing.requireCoupon(dto.couponCode, dto.planCode, customerId) : null;

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId }, include: { vehicleModel: { select: { pricePerMinuteCents: true, unlockFeeCents: true } } } });
    if (!vehicle) throw notFound('Moto não encontrada.');
    // Contrato v2: moto fixa de assinatura aberta só pode ser alugada pelo assinante.
    try {
      await assertNotFixedForOther(this.prisma, vehicle.id, customerId);
    } catch (err) {
      await release(dto.depositId);
      throw err;
    }
    // Retirada em galpão: moto do galpão (ou esperando recolhimento) só sai pela entrega. O aceite da entrega passa
    // (`fromHandover`) só com a moto `reserved` pela reserva do próprio cliente em status `handover`.
    const handoverReservation = fromHandover ? await this.handoverReservation(fromHandover.reservationId, customerId, vehicle) : null;
    if (fromHandover && !handoverReservation) throw conflict('vehicle-unavailable', 'Esta moto não está disponível.');
    if (!handoverReservation && isDepotLocked(vehicle)) {
      await release(dto.depositId);
      throw conflict('vehicle-unavailable', 'Esta moto fica no galpão e só sai pela entrega do operador.');
    }
    const reservation = handoverReservation ?? (await this.prisma.reservation.findFirst({
      where: { vehicleId: vehicle.id, status: 'active', expiresAt: { gt: new Date() } },
    }));
    const ownReservation = reservation && reservation.customerId === customerId ? reservation : null;
    // QA-21: moto offline não começa aluguel (o desbloqueio ficaria pendente e o relógio correria com a moto travada).
    if (vehicle.status === 'offline' || vehicle.online === false || (await this.liveOffline(vehicle.thingName))) {
      await release(dto.depositId);
      throw conflict('vehicle-offline', 'A moto está sem conexão agora. Escolha outra moto; nada foi cobrado.');
    }
    // Auditoria item 7 (defesa adicional): o status da moto pode não refletir um aluguel aberto dela.
    const available = ((vehicle.status === 'free' && !reservation) || (vehicle.status === 'reserved' && !!ownReservation)) && !(await hasOpenRental(this.prisma, vehicle.id));
    if (!available) {
      await release(dto.depositId);
      throw conflict('vehicle-unavailable', 'Esta moto não está disponível.');
    }

    // Auditoria item adiado 1: trava da equipe/sistema, hold ou modo roubada → o unlock do cliente seria recusado.
    // No aceite da entrega (`fromHandover`) a caução é da reserva e continua retida (o operador cancela a entrega).
    if (await this.commands.isLockedByStaff(vehicle)) {
      await release(dto.depositId);
      throw conflict('vehicle-unavailable', LOCKED_BY_STAFF_DETAIL);
    }

    // ── caução ──
    let deposit!: Deposit;
    let rentalId!: string;
    let heldDepositId: string | undefined;
    let policyId: string | undefined;
    let rental;
    let claimedFrom: 'free' | 'reserved' | undefined;
    let compensatedBySweep = false;
    let unlock: { status: string; statusReason?: string } | undefined;
    try {
    if (dto.depositId) {
      const d = await this.prisma.deposit.findUnique({ where: { id: dto.depositId } });
      if (!d || d.customerId !== customerId) throw notFound('Caução não encontrada.');
      if (d.status !== 'held') throw new ProblemException(402, 'deposit-not-held', 'A caução ainda não foi confirmada.');
      if (await this.prisma.depositRelease.findUnique({ where: { depositId: d.id } })) {
        throw new ProblemException(402, 'deposit-not-held', 'Esta caução está sendo liberada; pague uma nova caução.');
      }
      deposit = d;
      heldDepositId = d.id;
      rentalId = d.rentalId ?? randomUUID();
    } else {
      // Task 30 (item 12): sem cartão ativo para a caução, erro claro antes de criar a cobrança.
      if (dto.depositMethod === 'card') await assertDepositCard(this.prisma, customerId);
      rentalId = randomUUID();
      const held = await this.billing.holdDeposit({ customerId, rentalId, method: dto.depositMethod, idempotencyKey: `deposit:${customerId}:${idempotencyKey}` });
      const d = await this.prisma.deposit.findUnique({ where: { id: held.depositId } });
      // Repetição com a mesma chave depois de um 409: a caução daquela tentativa já foi liberada/capturada.
      if (held.status === 'failed' && d && (d.status === 'released' || d.status === 'captured')) {
        throw new ProblemException(402, 'deposit-not-held', 'A caução desta tentativa já foi liberada. Tente de novo com uma nova requisição.');
      }
      if (held.status === 'failed') throw new ProblemException(402, 'payment-failed', 'Não foi possível reter a caução. Tente outro meio de pagamento.');
      if (!d) throw new ProblemException(402, 'payment-failed', 'Caução não registrada pelo provedor.');
      if (held.status === 'held' && d.status !== 'held') throw new ProblemException(402, 'deposit-not-held', 'A caução ainda não foi confirmada.');
      if (held.status === 'held' && (await this.prisma.depositRelease.findUnique({ where: { depositId: d.id } }))) {
        throw new ProblemException(402, 'deposit-not-held', 'A caução desta tentativa está sendo liberada. Tente de novo com uma nova requisição.');
      }
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
    const snapshot = PricingService.snapshotFrom(plan, policy.premiumCents, dto.coverage, coupon, !!subscription, vehicle.vehicleModel);

    // QA-21: reivindica a moto, desbloqueia e só cria o aluguel (relógio e cobrança) com o desbloqueio confirmado.
    // Fix round 1: a reivindicação grava junto o marcador `RentalStart`; se o processo morrer durante a espera do
    // desbloqueio, o job de varredura compensa (moto, lock, caução, apólice).
    const previousStatus = vehicle.status === 'reserved' ? 'reserved' : 'free';
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.vehicle.updateMany({ where: { id: vehicle.id, status: { in: ['free', 'reserved'] } }, data: { status: 'rented' } });
      if (claimed.count === 0) throw conflict('vehicle-unavailable', 'Esta moto não está disponível.');
      await tx.rentalStart.create({ data: { rentalId, vehicleId: vehicle.id, customerId, depositId: deposit.id, policyId: policy.policyId, previousStatus } });
    });
    claimedFrom = previousStatus;
    unlock = await this.unlockAndWait(vehicle.id, user, rentalId);
    // Corrida (trava da equipe depois da verificação acima): mesma resposta, não "offline".
    if (unlock.statusReason === 'locked_by_staff') throw conflict('vehicle-unavailable', LOCKED_BY_STAFF_DETAIL);
    if (unlock.status !== 'confirmed') throw conflict('vehicle-offline', 'A moto não respondeu ao desbloqueio. Nada foi cobrado e a caução foi liberada.');

    rental = await this.prisma.$transaction(async (tx) => {
      // O marcador já foi compensado pela varredura (espera maior que o prazo): não cria o aluguel.
      const marker = await tx.rentalStart.deleteMany({ where: { rentalId } });
      if (marker.count !== 1) {
        compensatedBySweep = true;
        throw conflict('vehicle-offline', 'A moto não respondeu a tempo. Nada foi cobrado e a caução foi liberada.');
      }
      // Run-2: relê a caução com bloqueio condicional (ainda `held` e sem pedido de liberação gravado durante o unlock);
      // senão aborta e o catch desfaz como no `vehicle-offline`. `rentalId` já é o da caução quando ela tinha um.
      const kept = await tx.deposit.updateMany({ where: { id: deposit.id, status: 'held' }, data: { rentalId } });
      if (kept.count !== 1 || (await tx.depositRelease.findUnique({ where: { depositId: deposit.id } }))) throw depositInUse();
      if (ownReservation) await this.reservations.convert(tx, ownReservation.id);
      if (fromHandover) {
        // Aceite único: a entrega só passa a `accepted` se ainda estiver pendente (disputa/cancelamento concorrente desfaz tudo).
        const accepted = await tx.handover.updateMany({
          where: { id: fromHandover.handoverId, status: 'pending_customer' },
          data: { status: 'accepted', rentalId, lastError: null, respondedAt: new Date() },
        });
        if (accepted.count !== 1) throw new ProblemException(422, 'handover-not-pending', 'Esta entrega não está mais aguardando o seu aceite.');
      }
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
        await tx.couponRedemption.create({ data: { couponId: coupon.id, customerId, rentalId, cpfHash: await this.pricing.cpfHashFor(customerId) } });
        const reserved = await tx.coupon.updateMany({
          where: { id: coupon.id, OR: [{ maxRedemptions: null }, { redemptions: { lt: coupon.maxRedemptions ?? 0 } }] },
          data: { redemptions: { increment: 1 } },
        });
        if (reserved.count !== 1) throw unprocessable('coupon-invalid', 'Cupom esgotado.');
      }
      return created;
    });
    } catch (err) {
      // Marcador ausente = a varredura já compensou tudo (moto, lock, apólice, caução): não compensa de novo.
      if (claimedFrom && !rental && !compensatedBySweep) {
        const owned = await this.prisma.rentalStart.deleteMany({ where: { rentalId } }).then((r) => r.count === 1, () => true);
        if (!owned) compensatedBySweep = true;
      }
      if (compensatedBySweep) throw err;
      // QA-21: moto reivindicada e aluguel não criado → volta ao estado anterior; desbloqueio pedido (pendente ou já
      // aplicado) → bloqueio de sistema, que substitui o desbloqueio pendente e trava com segurança ao reconectar.
      if (claimedFrom && !rental) {
        await this.prisma.vehicle
          .updateMany({ where: { id: vehicle.id, status: 'rented' }, data: { status: claimedFrom } })
          .catch((e) => this.logger.error({ msg: 'vehicle_release_failed', vehicleId: vehicle.id, error: (e as Error).message }));
        if (unlock) await this.relock(vehicle.id, rentalId);
      }
      // Compensação (decisão #16): caução retida e apólice emitida não podem ficar órfãs.
      if (policyId) {
        try {
          await this.insurance.cancel(policyId);
        } catch (e) {
          this.logger.error({ msg: 'policy_cancel_failed', policyId, error: (e as Error).message });
        }
      }
      if (heldDepositId) await release(heldDepositId);
      throw err;
    }

    const mapped = toRental({ ...rental, vehicle });
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId: vehicle.id, status: 'rented', ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
    this.events.emit(EV.RENTAL_CHANGED, {
      rentalId, customerId, vehicleId: vehicle.id, status: 'active', elapsedSeconds: 0, costCents: mapped.costCents, ts: new Date().toISOString(),
    } satisfies RentalChangedEvent);
    this.logger.log({ msg: 'rental_started', rentalId, planCode: dto.planCode });
    return { status: 201, body: { outcome: 'started', rental: mapped, deposit: toDeposit({ ...deposit, rentalId }) } };
  }

  /**
   * Run-2: a caução de uma reserva `active`/`handover` não é reaproveitada por outro início (`409 deposit-in-use`).
   * Exceções: o aceite da entrega da própria reserva dona da caução (`fromHandover`) e a segunda chamada do fluxo Pix de
   * rua (reserva sem galpão, `active`, da mesma moto — o início converte essa reserva).
   */
  private async assertDepositNotInUse(depositId: string, vehicleId: string, fromHandover: StartOptions['fromHandover']): Promise<void> {
    const owner = await this.prisma.reservation.findFirst({
      where: { depositId, status: { in: ['active', 'handover'] } },
      select: { id: true, vehicleId: true, depotId: true, status: true },
    });
    if (!owner) return;
    const sameReservation = fromHandover
      ? owner.id === fromHandover.reservationId
      : !owner.depotId && owner.status === 'active' && owner.vehicleId === vehicleId;
    if (!sameReservation) throw depositInUse();
  }

  /**
   * Fix round 1: espera o consumidor registrar a liberação (`DepositRelease`) antes de responder, para que uma repetição
   * com a mesma `Idempotency-Key` já encontre a caução liberada (ou em liberação) e não comece um aluguel sobre ela.
   */
  private async requestDepositRelease(depositId: string | undefined, customerId: string): Promise<void> {
    if (!depositId) return;
    const ev: DepositReleaseRequestedEvent = { depositId, customerId, reason: 'rental_not_started' };
    await this.events.emitAsync(EV.DEPOSIT_RELEASE_REQUESTED, ev).catch((err) => this.logger.error({ msg: 'deposit_release_request_failed', depositId, error: (err as Error).message }));
  }
}

/**
 * Retirada em galpão: moto com `depotId` (no galpão ou separada por reserva de galpão) ou `awaiting_pickup` não pode ser
 * alugada pelo `POST /rentals` de rua. Seam para a Task 6: o aceite da entrega passa por aqui com um bypass `fromHandover`.
 */
export function isDepotLocked(vehicle: { depotId?: string | null; status: string }): boolean {
  return !!vehicle.depotId || vehicle.status === 'awaiting_pickup';
}

/** Coordenada com 3 casas (≈ 100 m). */
function roundCoord(v: number): number {
  return Math.round(v * 1000) / 1000;
}
