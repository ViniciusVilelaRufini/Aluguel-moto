import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, forbidden, notFound, ProblemException, unprocessable } from '../../common/problem';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { isStaff, type Principal } from '../auth/principal';
import { toDeposit } from '../rentals/rentals.mapper';
import type { ListDepositsQuery, ListPaymentsQuery, MercadoPagoWebhookDto, PaymentCardCreateDto, RefundDto, SubscriptionCreateDto } from './payments.dto';
import { toPayment, toPaymentCard, toSubscription } from './payments.mapper';

const range = (from?: string, to?: string) =>
  from || to ? { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(to) } : {}) } : undefined;

/**
 * Endpoints de pagamento sobre o banco — implementação provisória da Task 3.
 * A Task 5 substitui a tokenização/cobrança pelo `PaymentProvider` (fake/Mercado Pago) e o consumidor do webhook.
 */
@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(QUEUE_BUS) private readonly queue: QueueBus,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  onModuleInit(): void {
    this.queue.subscribe<MercadoPagoWebhookDto>('pagamentos-webhook', async (event) => {
      // Processamento real (deduplicação por id do evento, transições de Payment) é da Task 5.
      this.logger.log({ msg: 'mp_webhook_received', type: event.type, action: event.action });
    });
  }

  // ── cartões ──
  async listCards(customerId: string) {
    const cards = await this.prisma.paymentCard.findMany({ where: { customerId, deletedAt: null }, orderBy: { createdAt: 'asc' } });
    return { items: cards.map(toPaymentCard) };
  }

  async addCard(customerId: string, dto: PaymentCardCreateDto) {
    if (dto.cardToken.startsWith('tok_fail')) throw new ProblemException(402, 'payment-failed', 'Cartão recusado pelo emissor.');
    const count = await this.prisma.paymentCard.count({ where: { customerId, deletedAt: null } });
    const makeDefault = dto.setDefault === true || count === 0;
    const digits = dto.cardToken.replace(/\D/g, '');
    const card = await this.prisma.$transaction(async (tx) => {
      if (makeDefault) await tx.paymentCard.updateMany({ where: { customerId }, data: { isDefault: false } });
      return tx.paymentCard.create({
        data: {
          customerId,
          providerCardId: `stub-card-${randomUUID()}`,
          brand: 'visa',
          last4: digits.length >= 4 ? digits.slice(-4) : '4242',
          expMonth: 12,
          expYear: new Date().getUTCFullYear() + 4,
          isDefault: makeDefault,
        },
      });
    });
    return toPaymentCard(card);
  }

  async deleteCard(customerId: string, id: string): Promise<void> {
    const card = await this.prisma.paymentCard.findUnique({ where: { id } });
    if (!card || card.customerId !== customerId || card.deletedAt) throw notFound('Cartão não encontrado.');
    const [held, sub] = await Promise.all([
      this.prisma.deposit.count({ where: { cardId: id, status: 'held' } }),
      this.prisma.subscription.count({ where: { cardId: id, status: 'active' } }),
    ]);
    if (held || sub) throw conflict('conflict', 'Este cartão tem caução retida ou assinatura ativa.');
    await this.prisma.paymentCard.update({ where: { id }, data: { deletedAt: new Date(), isDefault: false } });
  }

  // ── cauções ──
  async listDeposits(q: ListDepositsQuery) {
    const where: Prisma.DepositWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.customerId) where.customerId = q.customerId;
    const rows = await this.prisma.deposit.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    return toPage(rows, q, toDeposit);
  }

  async getDeposit(user: Principal, id: string) {
    const d = await this.prisma.deposit.findUnique({ where: { id } });
    if (!d || (!isStaff(user) && d.customerId !== user.customerId)) throw notFound('Caução não encontrada.');
    return toDeposit(d);
  }

  // ── assinaturas ──
  async listSubscriptions(customerId: string) {
    const subs = await this.prisma.subscription.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } });
    return { items: subs.map(toSubscription) };
  }

  async createSubscription(customerId: string, dto: SubscriptionCreateDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.kycStatus !== 'approved') throw forbidden('Conclua a verificação de identidade.', 'kyc-not-approved');
    if (customer.status !== 'active') throw forbidden('Sua conta está bloqueada.', 'customer-blocked');
    const active = await this.prisma.subscription.findFirst({ where: { customerId, status: 'active', currentPeriodEnd: { gt: new Date() } } });
    if (active) throw conflict('conflict', 'Você já tem uma assinatura ativa.');
    const card = dto.cardId
      ? await this.prisma.paymentCard.findFirst({ where: { id: dto.cardId, customerId, deletedAt: null } })
      : await this.prisma.paymentCard.findFirst({ where: { customerId, isDefault: true, deletedAt: null } });
    if (!card) throw new ProblemException(402, 'card-not-found', 'Cadastre um cartão para assinar.');
    const plan = await this.prisma.pricingPlan.findFirst({ where: { code: dto.planCode, active: true } });
    if (!plan) throw notFound('Plano indisponível.');
    const start = new Date();
    const end = new Date(start.getTime() + (dto.planCode === 'weekly' ? 7 : 30) * 86400000);
    const sub = await this.prisma.$transaction(async (tx) => {
      const s = await tx.subscription.create({
        data: { customerId, planCode: dto.planCode, status: 'active', cardId: card.id, priceCents: plan.unitPriceCents, currentPeriodStart: start, currentPeriodEnd: end },
      });
      await tx.payment.create({
        data: { customerId, subscriptionId: s.id, kind: 'subscription', method: 'card', status: 'paid', amountCents: plan.unitPriceCents, cardLast4: card.last4 },
      });
      return s;
    });
    return toSubscription(sub);
  }

  async cancelSubscription(customerId: string, id: string) {
    const s = await this.prisma.subscription.findUnique({ where: { id } });
    if (!s || s.customerId !== customerId) throw notFound('Assinatura não encontrada.');
    if (s.status !== 'active' || s.cancelAtPeriodEnd) throw conflict('conflict', 'A assinatura já foi cancelada.');
    const updated = await this.prisma.subscription.update({ where: { id }, data: { cancelAtPeriodEnd: true, canceledAt: new Date() } });
    return toSubscription(updated);
  }

  // ── pagamentos ──
  async listPayments(user: Principal, q: ListPaymentsQuery) {
    const where: Prisma.PaymentWhereInput = {};
    if (isStaff(user)) {
      if (q.customerId) where.customerId = q.customerId;
      if (q.rentalId) where.rentalId = q.rentalId;
    } else {
      where.customerId = user.customerId;
    }
    if (q.status) where.status = q.status as Prisma.PaymentWhereInput['status'];
    if (q.kind) where.kind = q.kind as Prisma.PaymentWhereInput['kind'];
    const createdAt = range(q.from, q.to);
    if (createdAt) where.createdAt = createdAt;
    const rows = await this.prisma.payment.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    return toPage(rows, q, toPayment);
  }

  async getPayment(user: Principal, id: string) {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p || (!isStaff(user) && p.customerId !== user.customerId)) throw notFound('Pagamento não encontrado.');
    return toPayment(p);
  }

  async refund(actor: Principal, id: string, dto: RefundDto) {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p) throw notFound('Pagamento não encontrado.');
    if (!['paid', 'captured', 'partially_refunded'].includes(p.status)) {
      throw unprocessable('validation-error', 'Só é possível estornar pagamentos pagos ou capturados.');
    }
    const remaining = p.amountCents - p.refundedCents;
    const amount = dto.amountCents ?? remaining;
    if (amount <= 0 || amount > remaining) throw unprocessable('validation-error', `Valor acima do disponível para estorno (${remaining}).`);
    const refundedCents = p.refundedCents + amount;
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.payment.update({
        where: { id },
        data: { refundedCents, status: refundedCents >= p.amountCents ? 'refunded' : 'partially_refunded' },
      });
      await this.audit.record({ actor, action: 'payment.refund', entityType: 'Payment', entityId: id, reason: dto.reason, metadata: { amountCents: amount } }, tx as any);
      return u;
    });
    return toPayment(updated);
  }

  // ── webhook ──
  verifySignature(headers: { signature?: string; requestId?: string }, dataId: string): boolean {
    const secret = this.cfg.mercadoPagoWebhookSecret;
    if (!secret || !headers.signature || !headers.requestId) return false;
    const parts = Object.fromEntries(headers.signature.split(',').map((kv) => kv.trim().split('=') as [string, string]));
    if (!parts.ts || !parts.v1) return false;
    const manifest = `id:${dataId};request-id:${headers.requestId};ts:${parts.ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(parts.v1);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async receiveWebhook(dto: MercadoPagoWebhookDto, headers: { signature?: string; requestId?: string }) {
    if (!this.verifySignature(headers, dto.data.id)) {
      throw new ProblemException(401, 'webhook-signature-invalid', 'Assinatura do webhook inválida.');
    }
    await this.queue.publish('pagamentos-webhook', dto, { dedupId: String(dto.id ?? `${dto.type}:${dto.data.id}`) });
    return { received: true };
  }
}
