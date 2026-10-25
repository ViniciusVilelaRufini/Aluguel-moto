import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import type { Payment, Subscription, SubscriptionStatus } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { conflict, forbidden, notFound, ProblemException } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { isStaff, type Principal } from '../auth/principal';
import { toVehicleSummary } from '../vehicles/vehicles.mapper';
import { assertNotFixedForOther, currentSubscriptionWhere } from '../../common/fixed-vehicle';
import { loadV2Config, V2_CONFIG, type V2Config } from '../../config/v2-config';
import { assertVehicleSwapAllowed, checkPause, lifecycleCandidatesWhere, lifecycleTransition, renewEffect, resumeEffect } from './subscription-rules';
import { canTransition } from './payment-state';
import { isUniqueViolation, PaymentStateService } from './payment-state.service';
import { toSubscription } from './payments.mapper';
import { ProviderCustomersService } from './provider-customers.service';
import { PAYMENT_PROVIDER, type PaymentProvider, type ProviderPayment, RefundRejectedError } from './provider/payment-provider';
import { RentalBillingService } from './rental-billing.service';
import { ExclusiveJob, jobLockTtl } from '../../common/job-lock';

const DAY_MS = 86_400_000;
/** Página do job de ciclo de vida. */
const EXPIRE_PAGE = 200;
/** Assinaturas fechadas: nenhum webhook as reabre (fix round 2). */
const CLOSED: readonly SubscriptionStatus[] = ['canceled', 'expired'];
const OPEN: SubscriptionStatus[] = ['active', 'paused', 'past_due'];
/** Depois disto, o cancelamento pendente no gateway vira alerta de revisão manual (o job continua tentando). */
export const GATEWAY_CANCEL_ALERT_ATTEMPTS = 10;
const periodMs = (planCode: string) => (planCode === 'weekly' ? 7 : 30) * DAY_MS;

/**
 * Assinaturas semanal (24900) e mensal (79900) como recorrência no gateway. A primeira cobrança vem na criação
 * (fake) ou por webhook (Mercado Pago); as seguintes chegam por webhook com `external_reference = subscription:<id>`.
 * Cobrança recorrente recusada → assinatura `past_due` e cliente inadimplente.
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger('SubscriptionsService');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly state: PaymentStateService,
    private readonly customers: ProviderCustomersService,
    private readonly billing: RentalBillingService,
    @Optional() private readonly audit?: AuditService,
    @Optional() @Inject(V2_CONFIG) private readonly v2: V2Config = loadV2Config(),
  ) {}

  /** Gateway indisponível: nada mudou e o cliente pode tentar de novo (I1). */
  private gatewayUnavailable(): ProblemException {
    return new ProblemException(503, 'gateway-unavailable', 'Não conseguimos falar com o meio de pagamento agora. Nada foi alterado; tente de novo em instantes.');
  }

  /** Contrato v2: assinatura com cartão da recorrência, última cobrança e moto fixa. */
  async view(sub: Subscription) {
    const [card, lastPayment, vehicle] = await Promise.all([
      sub.cardId ? this.prisma.paymentCard.findUnique({ where: { id: sub.cardId }, select: { brand: true, last4: true } }) : null,
      this.prisma.payment.findFirst({ where: { subscriptionId: sub.id }, orderBy: { createdAt: 'desc' }, select: { status: true, createdAt: true } }),
      sub.assignedVehicleId
        ? this.prisma.vehicle.findUnique({ where: { id: sub.assignedVehicleId }, include: { vehicleModel: { select: { categoryLabel: true, pricePerMinuteCents: true } } } })
        : null,
    ]);
    return toSubscription(sub, { card, lastPayment, assignedVehicle: vehicle ? toVehicleSummary(vehicle) : null });
  }

  async list(customerId: string) {
    const subs = await this.prisma.subscription.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } });
    return { items: await Promise.all(subs.map((x) => this.view(x))) };
  }

  private async own(customerId: string, id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub || sub.customerId !== customerId) throw notFound('Assinatura não encontrada.');
    return sub;
  }

  async get(customerId: string, id: string) {
    return this.view(await this.own(customerId, id));
  }

  /**
   * Pausa (limites em subscription-rules.ts), sem aluguel aberto no plano. O gateway é a fonte da verdade das datas (I1):
   * a pausa é reservada no banco (transição condicional), confirmada no gateway e desfeita se o gateway falhar (503).
   */
  async pause(customerId: string, id: string, days: number) {
    const sub = await this.own(customerId, id);
    const now = new Date();
    const open = await this.prisma.rental.findFirst({ where: { customerId, planCode: sub.planCode, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } });
    const { pauseEndsAt } = checkPause(sub, { days, now, hasOpenRental: !!open });
    const claimed = await this.prisma.subscription.updateMany({
      where: { id, status: 'active', pausesUsedInPeriod: sub.pausesUsedInPeriod, cancelAtPeriodEnd: false },
      data: { status: 'paused', pausedAt: now, pauseEndsAt, pausesUsedInPeriod: { increment: 1 } },
    });
    if (claimed.count === 0) throw conflict('subscription-not-pausable', 'A assinatura mudou enquanto pausava. Tente de novo.');
    try {
      await this.providerPaused(id, true);
    } catch (err) {
      await this.prisma.subscription.updateMany({
        where: { id, status: 'paused', pausedAt: now },
        data: { status: 'active', pausedAt: null, pauseEndsAt: null, pausesUsedInPeriod: sub.pausesUsedInPeriod },
      });
      this.logger.error({ msg: 'subscription_pause_provider_failed', subscriptionId: id, error: (err as Error).message });
      throw this.gatewayUnavailable();
    }
    this.logger.log({ msg: 'subscription_paused', subscriptionId: id, days });
    return this.get(customerId, id);
  }

  async resume(customerId: string, id: string) {
    return this.view(await this.resumeSub(await this.own(customerId, id), new Date()));
  }

  /**
   * Retomada: o período (e a próxima cobrança) anda o tempo pausado; a nova data vai para o gateway. Falha do gateway desfaz
   * a retomada (continua pausada) e responde 503; o job de retomada automática tenta de novo no minuto seguinte.
   */
  private async resumeSub(sub: Subscription, now: Date): Promise<Subscription> {
    const { currentPeriodEnd } = resumeEffect(sub, now);
    const claimed = await this.prisma.subscription.updateMany({
      where: { id: sub.id, status: 'paused', pausedAt: sub.pausedAt },
      data: { status: 'active', pausedAt: null, pauseEndsAt: null, currentPeriodEnd },
    });
    if (claimed.count === 0) throw conflict('subscription-not-pausable', 'A assinatura não está pausada.');
    try {
      await this.providerPaused(sub.id, false, currentPeriodEnd);
    } catch (err) {
      await this.prisma.subscription.updateMany({
        where: { id: sub.id, status: 'active', currentPeriodEnd },
        data: { status: 'paused', pausedAt: sub.pausedAt, pauseEndsAt: sub.pauseEndsAt, currentPeriodEnd: sub.currentPeriodEnd },
      });
      this.logger.error({ msg: 'subscription_resume_provider_failed', subscriptionId: sub.id, error: (err as Error).message });
      throw this.gatewayUnavailable();
    }
    this.logger.log({ msg: 'subscription_resumed', subscriptionId: sub.id });
    return (await this.prisma.subscription.findUnique({ where: { id: sub.id } }))!;
  }

  /** Pausa/retomada no gateway; na retomada, empurra a nova data da próxima cobrança. Lança se o gateway falhar. */
  private async providerPaused(id: string, paused: boolean, nextChargeAt?: Date): Promise<void> {
    const providerId = await this.customers.providerRef('subscription', id);
    if (!providerId) return;
    await this.provider.setSubscriptionPaused({ providerSubscriptionId: providerId, paused, nextChargeAt });
  }

  /** Retomada automática das pausas vencidas e ciclo de vida (a cada minuto, `JOBS_ENABLED`). */
  @Interval('subscriptions-auto-resume', 60_000)
  @ExclusiveJob('subscriptions-auto-resume', jobLockTtl(60_000))
  async autoResumeJob(): Promise<void> {
    if (process.env.JOBS_ENABLED === 'false') return;
    await this.autoResume(new Date());
    await this.expireStale(new Date()).catch((err) => this.logger.error({ msg: 'subscription_lifecycle_failed', error: (err as Error).message }));
  }

  async autoResume(now: Date): Promise<number> {
    const due = await this.prisma.subscription.findMany({ where: { status: 'paused', pauseEndsAt: { lte: now } }, take: 100 });
    let n = 0;
    for (const sub of due) {
      try {
        await this.resumeSub(sub, now);
        n++;
      } catch (err) {
        this.logger.warn({ msg: 'subscription_auto_resume_failed', subscriptionId: sub.id, error: (err as Error).message });
      }
    }
    return n;
  }

  /**
   * C1: assinaturas que precisam sair do estado aberto — cancelamento agendado com período vencido → `canceled`;
   * sem renovação além da carência (`SUBSCRIPTION_RENEWAL_GRACE_HOURS`) → `expired`. Libera a moto fixa e o índice parcial.
   */
  async expireStale(now: Date, where: { customerId?: string; assignedVehicleId?: string } = {}): Promise<number> {
    let n = 0;
    let after: string | undefined;
    // Fix round 2 (achado 3): só candidatas que já devem mudar (carência no WHERE), em páginas por id.
    for (;;) {
      const rows = await this.prisma.subscription.findMany({
        where: { ...where, ...lifecycleCandidatesWhere(now, this.v2.subscriptionGraceMs), ...(after ? { id: { gt: after } } : {}) },
        orderBy: { id: 'asc' },
        take: EXPIRE_PAGE,
      });
      for (const sub of rows) {
        const to = lifecycleTransition(sub, now, this.v2.subscriptionGraceMs);
        if (!to) continue;
        // Expirada: a recorrência ainda está viva no gateway → cancelamento pendente (gravado junto) e tentativa já.
        // Cancelamento agendado já foi feito no gateway em `cancel()`.
        const done = await this.prisma.subscription.updateMany({
          // Mesmo período e agendamento lidos: renovação paga no meio do caminho não pode ser expirada.
          where: { id: sub.id, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd },
          data: { status: to, ...(to === 'canceled' ? { canceledAt: sub.canceledAt ?? now } : { gatewayCancelPendingAt: now }) },
        });
        if (done.count) {
          n++;
          this.logger.log({ msg: 'subscription_closed', subscriptionId: sub.id, status: to });
          if (to === 'expired') await this.cancelAtGateway(sub.id);
        }
      }
      if (rows.length < EXPIRE_PAGE) return n;
      after = rows[rows.length - 1].id;
    }
  }

  /** Valida a moto antes de qualquer cobrança (I2): existe, livre e sem outro assinante vigente. */
  private async assertAssignableByCustomer(customerId: string, vehicleId: string, currentVehicleId?: string | null) {
    await this.expireStale(new Date(), { assignedVehicleId: vehicleId });
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true, status: true, code: true } });
    if (!vehicle) throw notFound('Moto não encontrada.');
    await assertNotFixedForOther(this.prisma, vehicleId, customerId);
    if (vehicle.status !== 'free' && currentVehicleId !== vehicleId) throw conflict('vehicle-unavailable', 'Escolha uma moto livre.');
    return vehicle;
  }

  /**
   * Moto fixa: cliente só na própria assinatura vigente, moto `free` sem outro assinante e no máximo uma troca a cada
   * `SUBSCRIPTION_VEHICLE_SWAP_COOLDOWN_HOURS`; staff (admin/operacao) em qualquer assinatura vigente, com AuditLog. O índice
   * parcial `Subscription_one_open_per_vehicle` garante uma assinatura aberta por moto.
   */
  async assignVehicle(user: Principal, id: string, vehicleId: string) {
    const sub = isStaff(user) ? await this.prisma.subscription.findUnique({ where: { id } }) : await this.own(user.customerId!, id).catch(() => null);
    if (!sub) throw notFound('Assinatura não encontrada.');
    const now = new Date();
    if ((sub.status !== 'active' && sub.status !== 'paused') || sub.currentPeriodEnd <= now) throw conflict('conflict', 'A assinatura não está vigente.');
    if (sub.assignedVehicleId === vehicleId) return this.view(sub);
    let vehicleCode: string;
    if (isStaff(user)) {
      await this.expireStale(now, { assignedVehicleId: vehicleId });
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { code: true } });
      if (!vehicle) throw notFound('Moto não encontrada.');
      const taken = await this.prisma.subscription.findFirst({ where: { assignedVehicleId: vehicleId, ...currentSubscriptionWhere(now), NOT: { id } }, select: { id: true } });
      if (taken) throw conflict('vehicle-unavailable', 'Esta moto já é a moto fixa de outro plano.');
      vehicleCode = vehicle.code;
    } else {
      assertVehicleSwapAllowed(sub, now, this.v2.vehicleSwapCooldownMs);
      vehicleCode = (await this.assertAssignableByCustomer(sub.customerId, vehicleId, sub.assignedVehicleId)).code;
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.subscription.update({ where: { id }, data: { assignedVehicleId: vehicleId, assignedVehicleAt: now } });
        if (isStaff(user) && this.audit) {
          await this.audit.record(
            { actor: user, action: 'subscription.assign_vehicle', entityType: 'Subscription', entityId: id, metadata: { vehicleId, vehicleCode, previousVehicleId: sub.assignedVehicleId } },
            tx as any,
          );
        }
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict('vehicle-unavailable', 'Esta moto já é a moto fixa de outro plano.');
      throw err;
    }
    return this.view((await this.prisma.subscription.findUnique({ where: { id } }))!);
  }

  /**
   * M10: exclusão de conta — fecha a assinatura aberta e libera a moto fixa. Fix round 2: a falha do gateway não é engolida;
   * o cancelamento fica pendente (gravado junto com o fechamento) e o job `retryGatewayCancellations` refaz até o gateway aceitar.
   */
  async closeForAccountDeletion(customerId: string): Promise<void> {
    const open = await this.prisma.subscription.findMany({ where: { customerId, status: { in: OPEN } } });
    for (const sub of open) {
      const now = new Date();
      // Cancelamento agendado já cancelou a recorrência no gateway.
      const needsGateway = !sub.cancelAtPeriodEnd || !!sub.gatewayCancelPendingAt;
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'canceled', canceledAt: now, cancelAtPeriodEnd: true, assignedVehicleId: null, ...(needsGateway ? { gatewayCancelPendingAt: sub.gatewayCancelPendingAt ?? now } : {}) },
      });
      if (needsGateway) await this.cancelAtGateway(sub.id);
    }
  }

  /** Cancela a recorrência no gateway e limpa a pendência; falha conta a tentativa e deixa para o job. Nunca lança. */
  private async cancelAtGateway(subscriptionId: string): Promise<boolean> {
    try {
      const providerId = await this.customers.providerRef('subscription', subscriptionId);
      if (providerId) await this.provider.cancelSubscription({ providerSubscriptionId: providerId });
      await this.prisma.subscription.update({ where: { id: subscriptionId }, data: { gatewayCancelPendingAt: null } });
      this.logger.log({ msg: 'subscription_gateway_canceled', subscriptionId });
      return true;
    } catch (err) {
      const message = (err as Error).message;
      const row = await this.prisma.subscription
        .update({ where: { id: subscriptionId }, data: { gatewayCancelAttempts: { increment: 1 } }, select: { gatewayCancelAttempts: true } })
        .catch(() => null);
      const attempts = row?.gatewayCancelAttempts ?? 0;
      this.logger.warn({ msg: 'subscription_gateway_cancel_failed', subscriptionId, attempts, error: message });
      if (attempts >= GATEWAY_CANCEL_ALERT_ATTEMPTS) this.logger.error({ msg: 'subscription_gateway_cancel_needs_manual_review', subscriptionId, attempts });
      return false;
    }
  }

  /** Fix round 2: refaz os cancelamentos pendentes no gateway (mais antigos primeiro). Devolve quantos foram confirmados. */
  async retryGatewayCancellations(): Promise<number> {
    const pending = await this.prisma.subscription.findMany({
      where: { gatewayCancelPendingAt: { not: null } },
      orderBy: { gatewayCancelPendingAt: 'asc' },
      take: 50,
      select: { id: true },
    });
    let n = 0;
    for (const { id } of pending) if (await this.cancelAtGateway(id)) n++;
    return n;
  }

  @Interval('subscriptions-gateway-cancel-retry', 5 * 60_000)
  @ExclusiveJob('subscriptions-gateway-cancel-retry', jobLockTtl(5 * 60_000))
  async gatewayCancelRetryJob(): Promise<void> {
    if (process.env.JOBS_ENABLED === 'false') return;
    await this.retryGatewayCancellations().catch((err) => this.logger.error({ msg: 'subscription_gateway_cancel_retry_failed', error: (err as Error).message }));
  }

  async create(customerId: string, dto: { planCode: 'weekly' | 'monthly'; cardId?: string; vehicleId?: string }) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.kycStatus !== 'approved') throw forbidden('Conclua a verificação de identidade.', 'kyc-not-approved');
    if (customer.status !== 'active') throw forbidden('Sua conta está bloqueada.', 'customer-blocked');
    if (customer.delinquent) throw forbidden('Há um pagamento pendente. Regularize para assinar.', 'customer-delinquent');
    // C1: fecha assinaturas vencidas antes de checar (senão o índice parcial acusaria duplicidade).
    await this.expireStale(new Date(), { customerId });
    const active = await this.prisma.subscription.findFirst({ where: { customerId, status: { in: ['active', 'paused', 'past_due'] } } });
    if (active) throw conflict('conflict', 'Você já tem uma assinatura ativa.');
    // I2: a moto fixa é validada antes de cobrar.
    if (dto.vehicleId) await this.assertAssignableByCustomer(customerId, dto.vehicleId);
    const card = await this.customers.card(customerId, dto.cardId);
    if (!card) throw new ProblemException(402, 'card-not-found', 'Cadastre um cartão para assinar.');
    const plan = await this.prisma.pricingPlan.findFirst({ where: { code: dto.planCode, active: true } });
    if (!plan) throw notFound('Plano indisponível.');

    const start = new Date();
    const sub = await this.prisma.subscription.create({
      data: { customerId, planCode: dto.planCode, status: 'active', cardId: card.id, priceCents: plan.unitPriceCents, currentPeriodStart: start, currentPeriodEnd: new Date(start.getTime() + periodMs(dto.planCode)) },
    });
    const pay = await this.state.create({ customerId, subscriptionId: sub.id, kind: 'subscription', method: 'card', amountCents: plan.unitPriceCents, cardLast4: card.last4, idempotencyKey: `subscription:${sub.id}:1` });
    const res = await this.provider.createSubscription({
      providerCustomerId: await this.customers.ensureCustomer(customerId),
      providerCardId: card.providerCardId,
      payerEmail: customer.email,
      planCode: dto.planCode,
      amountCents: plan.unitPriceCents,
      idempotencyKey: `subscription:${sub.id}`,
      externalReference: `subscription:${sub.id}`,
    });
    if (res.status !== 'active') {
      await this.state.transition(pay.id, 'failed', { failureReason: res.failureReason ?? 'subscription_failed' });
      await this.prisma.subscription.update({ where: { id: sub.id }, data: { status: 'canceled', canceledAt: new Date() } });
      throw new ProblemException(402, 'payment-failed', 'Pagamento recusado. Tente outro cartão.');
    }
    await this.customers.saveRef('subscription', sub.id, res.providerSubscriptionId);
    if (res.firstPayment && canTransition('pending', res.firstPayment.status)) {
      await this.state.transition(pay.id, res.firstPayment.status, { providerPaymentId: res.firstPayment.providerPaymentId });
    }
    this.logger.log({ msg: 'subscription_created', subscriptionId: sub.id, planCode: dto.planCode });
    if (dto.vehicleId) {
      try {
        await this.prisma.subscription.update({ where: { id: sub.id }, data: { assignedVehicleId: dto.vehicleId, assignedVehicleAt: new Date() } });
      } catch (err) {
        // Corrida rara (outra assinatura levou a moto entre a validação e agora): a cobrança já aconteceu, então a
        // assinatura é devolvida sem moto fixa e o cliente escolhe outra (`PUT .../vehicle`).
        if (!isUniqueViolation(err)) throw err;
        this.logger.warn({ msg: 'subscription_vehicle_race', subscriptionId: sub.id });
      }
    }
    return this.view((await this.prisma.subscription.findUnique({ where: { id: sub.id } }))!);
  }

  async cancel(customerId: string, id: string) {
    const s = await this.prisma.subscription.findUnique({ where: { id } });
    if (!s || s.customerId !== customerId) throw notFound('Assinatura não encontrada.');
    if ((s.status !== 'active' && s.status !== 'paused') || s.cancelAtPeriodEnd) throw conflict('conflict', 'A assinatura já foi cancelada.');
    const providerId = await this.customers.providerRef('subscription', id);
    if (providerId) await this.provider.cancelSubscription({ providerSubscriptionId: providerId });
    const updated = await this.prisma.subscription.update({ where: { id }, data: { cancelAtPeriodEnd: true, canceledAt: new Date() } });
    return this.view(updated);
  }

  /** Cobrança da assinatura avisada por webhook (primeira do Mercado Pago ou renovação). */
  async onRecurringPayment(pp: ProviderPayment): Promise<void> {
    const subId = pp.externalReference?.slice('subscription:'.length);
    const sub = subId ? await this.prisma.subscription.findUnique({ where: { id: subId } }) : null;
    if (!sub) return;
    // Primeira cobrança do Mercado Pago: liga ao pagamento `:1` criado na assinatura.
    const first = await this.prisma.payment.findFirst({ where: { subscriptionId: sub.id, status: 'pending', providerPaymentId: null, idempotencyKey: `subscription:${sub.id}:1` } });
    let payment = first ? await this.state.annotate(first.id, { providerPaymentId: pp.providerPaymentId }) : null;
    if (!payment) {
      try {
        // Renovação: o id do gateway é gravado já na criação, então o próximo evento (pending → paid) acha este pagamento.
        payment = await this.state.create({ customerId: sub.customerId, subscriptionId: sub.id, kind: 'subscription', method: 'card', amountCents: pp.amountCents || sub.priceCents, providerPaymentId: pp.providerPaymentId, idempotencyKey: `subscription-charge:${pp.providerPaymentId}` });
      } catch (err) {
        if (isUniqueViolation(err)) return;
        throw err;
      }
    }
    if (!canTransition('pending', pp.status)) return;
    const updated = await this.state.transition(payment.id, pp.status, { ...(pp.failureReason && pp.status === 'failed' ? { failureReason: pp.failureReason } : {}) });
    await this.onSubscriptionPaymentChanged(updated);
  }

  /**
   * Pagamento da assinatura mudou (por qualquer caminho do webhook): renovação paga → renova; recusada → past_due.
   * Fix round 2: assinatura fechada (`canceled`/`expired`) nunca reabre — renovação paga que chega depois é estornada
   * pelo gateway (e o cancelamento da recorrência é pedido de novo); recusada é ignorada (não há dívida).
   */
  async onSubscriptionPaymentChanged(payment: Payment): Promise<void> {
    if (!payment.subscriptionId) return;
    let sub = await this.prisma.subscription.findUnique({ where: { id: payment.subscriptionId } });
    if (!sub) return;
    const isFirst = payment.idempotencyKey === `subscription:${sub.id}:1`;
    if (payment.status === 'paid' && !isFirst) {
      for (let attempt = 0; sub && !CLOSED.includes(sub.status) && attempt < 3; attempt++) {
        if (await this.renew(sub)) return;
        // Mudou entre a leitura e a gravação (job de ciclo de vida, pausa): relê e decide de novo.
        sub = await this.prisma.subscription.findUnique({ where: { id: sub.id } });
      }
      if (sub && CLOSED.includes(sub.status)) await this.onChargeAfterClose(sub, payment);
      return;
    }
    if (payment.status === 'failed') {
      const marked = await this.prisma.subscription.updateMany({ where: { id: sub.id, status: { in: OPEN } }, data: { status: 'past_due' } });
      if (marked.count === 0) {
        await this.onChargeAfterClose(sub, payment);
        return;
      }
      await this.billing.markDelinquent(sub.customerId, payment.id, payment.failureReason ?? 'subscription_charge_failed');
    }
  }

  /** Renovação paga: período seguinte; pausada continua pausada (I1, regra em `renewEffect`). Só sobre o estado lido. */
  private async renew(sub: Subscription): Promise<boolean> {
    if (CLOSED.includes(sub.status)) return false;
    const res = await this.prisma.subscription.updateMany({
      where: { id: sub.id, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd },
      data: renewEffect(sub, periodMs(sub.planCode)),
    });
    return res.count === 1;
  }

  /** Cobrança da recorrência numa assinatura já fechada: o gateway ainda cobra → pede o cancelamento de novo e estorna. */
  private async onChargeAfterClose(sub: Subscription, payment: Payment): Promise<void> {
    this.logger.warn({ msg: 'subscription_charge_after_close', subscriptionId: sub.id, paymentId: payment.id, status: payment.status });
    if (!sub.gatewayCancelPendingAt) {
      await this.prisma.subscription.update({ where: { id: sub.id }, data: { gatewayCancelPendingAt: new Date() } });
      await this.cancelAtGateway(sub.id);
    }
    if (payment.status === 'paid') await this.refundLateCharge(payment);
  }

  /**
   * Estorno total da cobrança tardia pela porta do gateway, no mesmo registro dos estornos manuais (`PaymentRefund`):
   * chave estável por pagamento (idempotente com webhook repetido); resultado desconhecido → `pending` (a reconciliação
   * de estornos em `PaymentsService` repete); recusa definitiva → desfaz e `needs_review` (alerta para o financeiro).
   */
  private async refundLateCharge(payment: Payment): Promise<void> {
    const key = `subscription-late-refund:${payment.id}`;
    if (await this.prisma.paymentRefund.findUnique({ where: { idempotencyKey: key } })) return;
    const p = await this.prisma.payment.findUnique({ where: { id: payment.id } });
    if (!p || p.status !== 'paid') return;
    const amount = p.amountCents - p.refundedCents;
    if (amount <= 0) return;
    if (!p.providerPaymentId) {
      this.logger.error({ msg: 'payment_needs_manual_review', paymentId: p.id, reason: 'subscription_late_charge_without_provider_id' });
      return;
    }
    let record;
    try {
      record = await this.prisma.$transaction(async (tx) => {
        if (!(await this.state.claimRefund(tx, p, 'refunded', p.amountCents))) return null;
        return tx.paymentRefund.create({
          data: { paymentId: p.id, idempotencyKey: key, amountCents: amount, prevStatus: p.status, prevRefundedCents: p.refundedCents, newStatus: 'refunded', newRefundedCents: p.amountCents, status: 'claimed' },
        });
      });
    } catch (err) {
      if (isUniqueViolation(err)) return;
      throw err;
    }
    if (!record) return;
    try {
      const r = await this.provider.refund({ providerPaymentId: p.providerPaymentId, amountCents: amount, idempotencyKey: key });
      await this.prisma.paymentRefund.update({ where: { id: record.id }, data: { status: 'succeeded', providerRefundId: r.providerRefundId, attempts: { increment: 1 } } });
      this.logger.log({ msg: 'subscription_late_charge_refunded', paymentId: p.id, refundId: record.id, amountCents: amount });
    } catch (err) {
      const message = (err as Error).message.slice(0, 500);
      if (err instanceof RefundRejectedError) {
        await this.prisma.$transaction(async (tx) => {
          await tx.payment.updateMany({ where: { id: p.id, status: 'refunded', refundedCents: p.amountCents }, data: { status: p.status, refundedCents: p.refundedCents } });
          await tx.paymentRefund.update({ where: { id: record.id }, data: { status: 'needs_review', lastError: message, attempts: { increment: 1 } } });
        });
        this.logger.error({ msg: 'payment_needs_manual_review', paymentId: p.id, refundId: record.id, reason: 'subscription_late_charge_refund_rejected' });
        return;
      }
      await this.prisma.paymentRefund.update({ where: { id: record.id }, data: { status: 'pending', attempts: { increment: 1 }, lastError: message } });
      this.logger.warn({ msg: 'refund_outcome_unknown', paymentId: p.id, refundId: record.id, error: message });
    }
    const updated = await this.prisma.payment.findUnique({ where: { id: p.id } });
    if (updated) this.state.emitUpdated(updated);
  }
}
