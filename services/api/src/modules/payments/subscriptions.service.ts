import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Subscription } from '@prisma/client';
import { conflict, forbidden, notFound, ProblemException } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { canTransition } from './payment-state';
import { isUniqueViolation, PaymentStateService } from './payment-state.service';
import { toSubscription } from './payments.mapper';
import { ProviderCustomersService } from './provider-customers.service';
import { PAYMENT_PROVIDER, type PaymentProvider, type ProviderPayment } from './provider/payment-provider';
import { RentalBillingService } from './rental-billing.service';

const DAY_MS = 86_400_000;
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
  ) {}

  async list(customerId: string) {
    const subs = await this.prisma.subscription.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } });
    return { items: subs.map(toSubscription) };
  }

  async create(customerId: string, dto: { planCode: 'weekly' | 'monthly'; cardId?: string }) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.kycStatus !== 'approved') throw forbidden('Conclua a verificação de identidade.', 'kyc-not-approved');
    if (customer.status !== 'active') throw forbidden('Sua conta está bloqueada.', 'customer-blocked');
    if (customer.delinquent) throw forbidden('Há um pagamento pendente. Regularize para assinar.', 'customer-delinquent');
    const active = await this.prisma.subscription.findFirst({ where: { customerId, status: 'active', currentPeriodEnd: { gt: new Date() } } });
    if (active) throw conflict('conflict', 'Você já tem uma assinatura ativa.');
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
    return toSubscription(sub);
  }

  async cancel(customerId: string, id: string) {
    const s = await this.prisma.subscription.findUnique({ where: { id } });
    if (!s || s.customerId !== customerId) throw notFound('Assinatura não encontrada.');
    if (s.status !== 'active' || s.cancelAtPeriodEnd) throw conflict('conflict', 'A assinatura já foi cancelada.');
    const providerId = await this.customers.providerRef('subscription', id);
    if (providerId) await this.provider.cancelSubscription({ providerSubscriptionId: providerId });
    const updated = await this.prisma.subscription.update({ where: { id }, data: { cancelAtPeriodEnd: true, canceledAt: new Date() } });
    return toSubscription(updated);
  }

  /** Cobrança da assinatura avisada por webhook (primeira do Mercado Pago ou renovação). */
  async onRecurringPayment(pp: ProviderPayment): Promise<void> {
    const subId = pp.externalReference?.slice('subscription:'.length);
    const sub = subId ? await this.prisma.subscription.findUnique({ where: { id: subId } }) : null;
    if (!sub) return;
    const first = await this.prisma.payment.findFirst({ where: { subscriptionId: sub.id, status: 'pending', providerPaymentId: null } });
    let paymentId = first?.id;
    if (!paymentId) {
      try {
        paymentId = (await this.state.create({ customerId: sub.customerId, subscriptionId: sub.id, kind: 'subscription', method: 'card', amountCents: pp.amountCents || sub.priceCents, idempotencyKey: `subscription-charge:${pp.providerPaymentId}` })).id;
      } catch (err) {
        if (isUniqueViolation(err)) return;
        throw err;
      }
    }
    if (!canTransition('pending', pp.status)) return;
    await this.state.transition(paymentId, pp.status, { providerPaymentId: pp.providerPaymentId, ...(pp.failureReason && pp.status === 'failed' ? { failureReason: pp.failureReason } : {}) });
    if (pp.status === 'paid' && !first) await this.renew(sub);
    if (pp.status === 'failed') {
      await this.prisma.subscription.update({ where: { id: sub.id }, data: { status: 'past_due' } });
      await this.billing.markDelinquent(sub.customerId, paymentId, pp.failureReason ?? 'subscription_charge_failed');
    }
  }

  private async renew(sub: Subscription): Promise<void> {
    const start = sub.currentPeriodEnd;
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'active', currentPeriodStart: start, currentPeriodEnd: new Date(start.getTime() + periodMs(sub.planCode)) },
    });
  }
}
