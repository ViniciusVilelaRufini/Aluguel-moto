import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound, ProblemException, unprocessable } from '../../common/problem';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { isStaff, type Principal } from '../auth/principal';
import { toDeposit } from '../rentals/rentals.mapper';
import { appendWalletEntry } from '../wallet/wallet-ledger';
import { canTransition } from './payment-state';
import { PaymentStateService } from './payment-state.service';
import type { ListDepositsQuery, ListPaymentsQuery, MercadoPagoWebhookDto, PaymentCardCreateDto, RefundDto, SubscriptionCreateDto } from './payments.dto';
import { toPayment, toPaymentCard } from './payments.mapper';
import { ProviderCustomersService } from './provider-customers.service';
import type { WebhookQueueMessage } from './provider/fake-pix-autoconfirm';
import { CardDeclinedError, PAYMENT_PROVIDER, type PaymentProvider } from './provider/payment-provider';
import { SubscriptionsService } from './subscriptions.service';

const range = (from?: string, to?: string) =>
  from || to ? { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(to) } : {}) } : undefined;

/** Endpoints de pagamento do contrato sobre o `PaymentProvider` (Task 5). */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(QUEUE_BUS) private readonly queue: QueueBus,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly customers: ProviderCustomersService,
    private readonly state: PaymentStateService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  // ── cartões (só token do gateway) ──
  async listCards(customerId: string) {
    const cards = await this.prisma.paymentCard.findMany({ where: { customerId, deletedAt: null }, orderBy: { createdAt: 'asc' } });
    return { items: cards.map(toPaymentCard) };
  }

  async addCard(customerId: string, dto: PaymentCardCreateDto) {
    try {
      return toPaymentCard(await this.customers.addCard(customerId, dto.cardToken, dto.setDefault));
    } catch (err) {
      if (err instanceof CardDeclinedError) throw new ProblemException(402, 'payment-failed', 'Cartão recusado pelo emissor.');
      throw err;
    }
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
  listSubscriptions(customerId: string) {
    return this.subscriptions.list(customerId);
  }

  createSubscription(customerId: string, dto: SubscriptionCreateDto) {
    return this.subscriptions.create(customerId, dto);
  }

  cancelSubscription(customerId: string, id: string) {
    return this.subscriptions.cancel(customerId, id);
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

  /** Estorno total ou parcial: no gateway (cartão/Pix) ou de volta à carteira (pagamento pela carteira). */
  /**
   * Estorno total ou parcial, seguro contra concorrência: primeiro reserva o valor (update condicional por status e
   * `refundedCents` lidos, na mesma transação do lançamento da carteira), só depois chama o gateway, com chave estável
   * por pedido (`refund:<paymentId>:<Idempotency-Key>`). Se o gateway falhar, a reserva é desfeita.
   * Teto: valor capturado (caução capturada parcialmente) ou valor do pagamento.
   */
  async refund(actor: Principal, id: string, dto: RefundDto, idempotencyKey?: string) {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p) throw notFound('Pagamento não encontrado.');
    if (!canTransition(p.status, 'partially_refunded') && !canTransition(p.status, 'refunded')) {
      throw unprocessable('validation-error', 'Só é possível estornar pagamentos pagos ou capturados.');
    }
    const captured = await this.prisma.paymentCapture.findUnique({ where: { paymentId: p.id } });
    const base = captured?.capturedCents ?? p.amountCents;
    const remaining = base - p.refundedCents;
    const amount = dto.amountCents ?? remaining;
    if (amount <= 0 || amount > remaining) throw unprocessable('validation-error', `Valor acima do disponível para estorno (${remaining}).`);
    const refundedCents = p.refundedCents + amount;
    const to = refundedCents >= base ? 'refunded' : 'partially_refunded';
    const viaWallet = p.method === 'wallet';
    if (!viaWallet && !p.providerPaymentId) throw unprocessable('validation-error', 'Pagamento sem registro no gateway para estornar.');

    const claimed = await this.prisma.$transaction(async (tx) => {
      if (!(await this.state.claimRefund(tx, p, to, refundedCents))) return false;
      if (viaWallet) {
        await appendWalletEntry(tx, { customerId: p.customerId, type: 'refund', amountCents: amount, description: `Estorno: ${dto.reason}`, paymentId: p.id, rentalId: p.rentalId, createdById: actor.userId });
      }
      return true;
    });
    if (!claimed) throw conflict('conflict', 'Outro estorno deste pagamento foi registrado ao mesmo tempo. Atualize e tente de novo.');

    if (!viaWallet) {
      try {
        await this.provider.refund({ providerPaymentId: p.providerPaymentId!, amountCents: amount, idempotencyKey: `refund:${p.id}:${idempotencyKey ?? refundedCents}` });
      } catch (err) {
        // Desfaz a reserva (só se ninguém mexeu depois) para o estorno poder ser pedido de novo.
        await this.prisma.payment.updateMany({ where: { id: p.id, status: to, refundedCents }, data: { status: p.status, refundedCents: p.refundedCents } });
        this.logger.error({ msg: 'refund_gateway_failed', paymentId: p.id, error: (err as Error).message });
        throw conflict('conflict', 'O gateway não confirmou o estorno. Tente de novo.');
      }
    }
    const updated = (await this.prisma.payment.findUnique({ where: { id } }))!;
    this.state.emitUpdated(updated);
    await this.audit.record({ actor, action: 'payment.refund', entityType: 'Payment', entityId: id, reason: dto.reason, metadata: { amountCents: amount } });
    return toPayment(updated);
  }

  // ── webhook ──
  async receiveWebhook(dto: MercadoPagoWebhookDto, headers: { signature?: string; requestId?: string }) {
    if (!this.provider.verifyWebhook({ signature: headers.signature, requestId: headers.requestId, dataId: dto.data.id })) {
      this.logger.warn({ msg: 'webhook_signature_invalid', type: dto.type });
      throw new ProblemException(401, 'webhook-signature-invalid', 'Assinatura do webhook inválida.');
    }
    const eventId = dto.id !== undefined ? String(dto.id) : `${dto.type}:${dto.action ?? ''}:${dto.data.id}`;
    const msg: WebhookQueueMessage = { provider: this.provider.name, eventId, type: dto.type, action: dto.action, dataId: dto.data.id };
    await this.queue.publish('pagamentos-webhook', msg, { dedupId: eventId });
    return { received: true };
  }
}
