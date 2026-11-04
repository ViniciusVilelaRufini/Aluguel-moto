import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import type { Payment, PaymentRefund, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound, ProblemException, unprocessable } from '../../common/problem';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import { refundBase } from './refund-base';
import { receiptLinks } from './receipts/receipt-links';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { isStaff, type Principal } from '../auth/principal';
import { toDeposit } from '../rentals/rentals.mapper';
import { appendWalletEntry } from '../wallet/wallet-ledger';
import { reverseTopUpRefund, topUpRefundFits } from '../wallet/top-up-refund';
import { returnRentalPackageMinutes } from '../wallet/rental-minutes-return';
import { canTransition } from './payment-state';
import { PaymentStateService } from './payment-state.service';
import type { DebtPaymentDto, ListDepositsQuery, ListPaymentsQuery, MercadoPagoWebhookDto, PaymentCardCreateDto, RefundDto, SubscriptionCreateDto } from './payments.dto';
import { type PaymentExtras, toPayment, toPaymentCard } from './payments.mapper';
import { ProviderCustomersService } from './provider-customers.service';
import type { WebhookQueueMessage } from './provider/fake-pix-autoconfirm';
import { CardDeclinedError, PAYMENT_PROVIDER, type PaymentProvider, RefundRejectedError } from './provider/payment-provider';
import { SubscriptionsService } from './subscriptions.service';
import { DelinquencyService } from './delinquency.service';
import { ExclusiveJob, jobLockTtl } from '../../common/job-lock';

const REFUND_RACED = 'Outro estorno deste pagamento foi registrado ao mesmo tempo. Atualize e tente de novo.';

/** Repetições de um estorno sem resultado antes de pedir revisão manual. */
export const MAX_REFUND_ATTEMPTS = 10;

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
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Optional() private readonly delinquency?: DelinquencyService,
  ) {}

  /** Task 14: nome do cliente (só staff, QA-17) e saldo devedor das dívidas em aberto. */
  private async extras(user: Principal, rows: Payment[]): Promise<Map<string, PaymentExtras>> {
    const outstanding = (await this.delinquency?.outstandingMap(rows)) ?? new Map<string, number>();
    const names = new Map<string, string>();
    if (isStaff(user) && rows.length) {
      const customers = await this.prisma.customer.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.customerId))] } }, select: { id: true, name: true } });
      for (const c of customers) if (c.name) names.set(c.id, c.name);
    }
    return new Map(rows.map((r) => [r.id, { customerName: names.get(r.customerId), outstandingCents: outstanding.get(r.id), staff: isStaff(user) }]));
  }

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
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentCard.update({ where: { id }, data: { deletedAt: new Date(), isDefault: false } });
      // Task 30 (item 12): removido o padrão, o cartão ativo mais recente vira o padrão (nunca cartões sem padrão).
      if (!card.isDefault) return;
      const next = await tx.paymentCard.findFirst({ where: { customerId, deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      if (next) await tx.paymentCard.update({ where: { id: next.id }, data: { isDefault: true } });
    });
  }

  /** Task 30 (item 12): `PUT /payments/cards/{id}/default` — um padrão por cliente; repetir não muda nada. */
  async setDefaultCard(customerId: string, id: string) {
    const card = await this.prisma.paymentCard.findFirst({ where: { id, customerId, deletedAt: null } });
    if (!card) throw notFound('Cartão não encontrado.');
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.paymentCard.updateMany({ where: { customerId, isDefault: true, id: { not: id } }, data: { isDefault: false } });
      return tx.paymentCard.update({ where: { id }, data: { isDefault: true } });
    });
    return toPaymentCard(updated);
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
    const links = await receiptLinks(this.prisma, this.storage, rows.map((r) => r.id));
    const extras = await this.extras(user, rows);
    return toPage(rows, q, (p: Payment) => toPayment(p, links.get(p.id), extras.get(p.id)));
  }

  async getPayment(user: Principal, id: string) {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p || (!isStaff(user) && p.customerId !== user.customerId)) throw notFound('Pagamento não encontrado.');
    const links = await receiptLinks(this.prisma, this.storage, [p.id]);
    return toPayment(p, links.get(p.id), (await this.extras(user, [p])).get(p.id));
  }

  /** Task 14: o cliente quita a dívida de um pagamento `failed` (cartão na hora ou Pix). */
  async payDebt(user: Principal, id: string, dto: DebtPaymentDto) {
    if (!this.delinquency) throw new Error('DelinquencyService indisponível.');
    const p = await this.delinquency.payDebt(user.customerId!, id, dto);
    return toPayment(p);
  }

  /**
   * Estorno total ou parcial, seguro contra concorrência e contra resultado desconhecido do gateway:
   * 1. reserva o valor (update condicional por status e `refundedCents` lidos) e grava um `PaymentRefund` `claimed`
   *    na mesma transação (pela carteira: o lançamento entra junto e o pedido já nasce `succeeded`);
   * 2. chama o gateway com chave estável por pedido (`refund:<paymentId>:<Idempotency-Key>`);
   * 3. sucesso → `succeeded`; recusa definitiva (`RefundRejectedError`) → desfaz a reserva (`rejected`, 422);
   *    timeout/erro → mantém a reserva (`pending`) e o job `reconcileRefunds` resolve pelo estado no gateway.
   * Teto: valor capturado (caução capturada parcialmente) ou valor do pagamento.
   */
  async refund(actor: Principal, id: string, dto: RefundDto, idempotencyKey?: string) {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p) throw notFound('Pagamento não encontrado.');
    const key = `refund:${p.id}:${idempotencyKey ?? randomUUID()}`;
    // Mesma Idempotency-Key de um pedido já registrado: repete a resposta desse pedido (sem reservar nem chamar o gateway de novo).
    if (idempotencyKey) {
      const same = await this.prisma.paymentRefund.findUnique({ where: { idempotencyKey: key } });
      if (same) return this.replayRefund(actor, same, p, dto);
    }
    if (!canTransition(p.status, 'partially_refunded') && !canTransition(p.status, 'refunded')) {
      throw unprocessable('validation-error', 'Só é possível estornar pagamentos pagos ou capturados.');
    }
    // Task 16 (fix round 1): o pagamento do aluguel registra o bruto, com a parte da carteira em `walletCents`. O estorno
    // devolve primeiro a parte do gateway (cartão/Pix/caução capturada) e depois a da carteira (lançamento `refund` no
    // ledger). Pagamento só da carteira (`method: wallet`) inteiro é carteira.
    const { gatewayBase, base } = await refundBase(this.prisma, p);
    const remaining = base - p.refundedCents;
    const amount = dto.amountCents ?? remaining;
    if (amount <= 0 || amount > remaining) throw unprocessable('validation-error', `Valor acima do disponível para estorno (${remaining}).`);
    // Gateway primeiro: o já estornado conta primeiro contra a parte do gateway.
    const gatewayLeft = Math.max(0, gatewayBase - p.refundedCents);
    const gatewayPart = Math.min(amount, gatewayLeft);
    const walletPart = amount - gatewayPart;
    if (gatewayPart > 0 && !p.providerPaymentId) throw unprocessable('validation-error', 'Pagamento sem registro no gateway para estornar.');

    // Auditoria run-4 onda 2: recarga cujo crédito já foi gasto além do saldo atual não é estornada (o cliente ficaria
    // com o dinheiro de volta e o crédito usado); o financeiro decide (ajuste/cobrança) antes.
    if (p.kind === 'top_up' && !(await topUpRefundFits(this.prisma, p, amount))) {
      throw conflict('conflict', 'O crédito desta recarga já foi usado pelo cliente; o saldo atual não cobre o estorno.');
    }

    // Um estorno em aberto por pagamento: sem isso, a reconciliação (que compara totais acumulados) confundiria pedidos.
    const open = await this.prisma.paymentRefund.findFirst({ where: { paymentId: p.id, status: { in: ['claimed', 'pending'] } } });
    if (open) throw conflict('conflict', 'Há um estorno deste pagamento aguardando confirmação do gateway. Tente de novo depois.');

    const claim = (read: Payment, part: number, viaWallet: boolean, recordKey: string, gatewayRefundedBefore: number | null = null, plannedWallet?: number) =>
      this.claimRefundPart(actor, read, part, viaWallet, recordKey, base, dto.reason, viaWallet ? null : gatewayRefundedBefore, plannedWallet);
    const raced = () => conflict('conflict', REFUND_RACED);

    let current = p;
    let gatewayOutcome: 'succeeded' | 'pending' | undefined;
    if (gatewayPart > 0) {
      // Auditoria run-4 onda 2: linha de base do gateway lida ANTES da chamada (a reconciliação exige before + valor).
      const before = await this.provider.getPayment(current.providerPaymentId!).then((pp) => pp.refundedCents ?? 0, () => null);
      // Auditoria run-4 (revisão): o plano da carteira nasce junto com o pedido do gateway; a repetição completa só ele.
      // Recarga (`top_up`) nunca tem plano: o estorno dela é revertido pelo `reverseTopUp`.
      const record = await claim(current, gatewayPart, false, key, before, walletPart > 0 && p.kind !== 'top_up' ? walletPart : undefined);
      if (!record) throw raced();
      const outcome = await this.callGatewayRefund(record);
      if (outcome === 'rejected') {
        await this.prisma.paymentRefund.updateMany({ where: { idempotencyKey: `${key}:wallet`, status: 'planned' }, data: { status: 'canceled' } });
        throw new ProblemException(422, 'payment-failed', 'O gateway recusou o estorno.');
      }
      gatewayOutcome = outcome;
      current = (await this.prisma.payment.findUnique({ where: { id } }))!;
    }
    if (walletPart > 0) {
      // A chave original fica com o pedido do gateway; a parte da carteira usa uma derivada (mesma repetição → mesma chave).
      const record = await claim(current, walletPart, true, gatewayPart > 0 ? `${key}:wallet` : key);
      if (!record) throw raced();
    }
    const updated = (await this.prisma.payment.findUnique({ where: { id } }))!;
    // Só com o estorno confirmado no gateway (pendente: a reconciliação tira o crédito quando confirmar).
    if (updated.kind === 'top_up' && gatewayOutcome === 'succeeded') await this.reverseTopUp(updated);
    // Revisão onda 2: estorno total confirmado do aluguel devolve os minutos de pacote (a função confere o confirmado).
    if (updated.kind === 'rental') await this.returnPackageMinutes(updated);
    this.state.emitUpdated(updated);
    await this.audit.record({ actor, action: 'payment.refund', entityType: 'Payment', entityId: id, reason: dto.reason, metadata: { amountCents: amount } });
    return toPayment(updated);
  }

  /**
   * Reserva um pedido de estorno (com o lançamento na carteira quando é a parte da carteira). Auditoria run-4: o teto é
   * conferido contra o pagamento lido agora (`read`), nunca contra uma leitura anterior; passou do teto → `null` (409).
   * `plannedWallet` (pedido misto): grava junto o plano da carteira (`<chave>:wallet`, status `planned`, ignorado pela
   * reconciliação e pela regra de um estorno aberto), que guarda a intenção original para a repetição. A parte da carteira
   * conclui o plano, se houver, em vez de criar outro registro.
   */
  private async claimRefundPart(
    actor: Principal, read: Payment, part: number, viaWallet: boolean, recordKey: string, base: number, reason: string,
    gatewayRefundedBefore: number | null, plannedWallet?: number,
  ) {
    const refundedCents = read.refundedCents + part;
    if (refundedCents > base) return null;
    const to = refundedCents >= base ? 'refunded' : 'partially_refunded';
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.state.claimRefund(tx, read, to, refundedCents))) return null;
      const data = {
        paymentId: read.id, idempotencyKey: recordKey, amountCents: part, prevStatus: read.status, prevRefundedCents: read.refundedCents,
        newStatus: to, newRefundedCents: refundedCents, gatewayRefundedBefore: viaWallet ? null : gatewayRefundedBefore, status: viaWallet ? 'succeeded' : 'claimed', createdById: actor.userId,
      };
      if (viaWallet) {
        await appendWalletEntry(tx, { customerId: read.customerId, type: 'refund', amountCents: part, description: `Estorno: ${reason}`, paymentId: read.id, rentalId: read.rentalId, createdById: actor.userId });
        const plan = await tx.paymentRefund.updateMany({ where: { idempotencyKey: recordKey, status: 'planned' }, data });
        if (plan.count === 1) return tx.paymentRefund.findUniqueOrThrow({ where: { idempotencyKey: recordKey } });
      }
      const created = await tx.paymentRefund.create({ data });
      if (plannedWallet) {
        await tx.paymentRefund.create({
          data: {
            paymentId: read.id, idempotencyKey: `${recordKey}:wallet`, amountCents: plannedWallet, prevStatus: to, prevRefundedCents: refundedCents,
            newStatus: refundedCents + plannedWallet >= base ? 'refunded' : 'partially_refunded', newRefundedCents: refundedCents + plannedWallet, status: 'planned', createdById: actor.userId,
          },
        });
      }
      return created;
    });
  }

  /**
   * Repetição com a mesma chave: em aberto (`claimed`/`pending`) ou concluído → 200 com o estado atual do pagamento
   * (a reserva já vale; a reconciliação cuida do gateway); recusado → o mesmo 422; em revisão manual → 409.
   * Auditoria run-4: valor diferente do pedido original (gateway + plano/registro da carteira) → 422; plano da carteira
   * ainda `planned` (queda antes dela) → a repetição o conclui (`completeWalletPart`).
   */
  private async replayRefund(actor: Principal, record: PaymentRefund, p: Payment, dto: RefundDto) {
    if (record.status === 'rejected') throw new ProblemException(422, 'payment-failed', 'O gateway recusou o estorno.');
    if (record.status === 'needs_review') throw conflict('conflict', 'Este estorno está em revisão manual.');
    const wallet = await this.prisma.paymentRefund.findUnique({ where: { idempotencyKey: `${record.idempotencyKey}:wallet` } });
    const original = record.amountCents + (wallet?.amountCents ?? 0);
    if (dto.amountCents !== undefined && dto.amountCents !== original) {
      throw unprocessable('validation-error', `Repetição com valor diferente do pedido original (${original}).`);
    }
    this.logger.log({ msg: 'refund_replayed', paymentId: p.id, refundId: record.id, status: record.status });
    const completed = wallet?.status === 'planned' ? await this.completeWalletPart(actor, record, wallet, dto) : null;
    return toPayment(completed ?? p);
  }

  /**
   * Conclui o plano da carteira de um estorno misto repetido. Só com o pagamento atual: nunca em recarga (`top_up`), só se
   * o pedido do gateway esgotou a parte do gateway e o plano cabe no que resta da carteira (`walletBase` menos o já
   * estornado além do gateway) e no teto; senão 409 + revisão manual, sem crédito.
   */
  private async completeWalletPart(actor: Principal, record: PaymentRefund, plan: PaymentRefund, dto: RefundDto): Promise<Payment | null> {
    const fresh = await this.prisma.payment.findUnique({ where: { id: record.paymentId } });
    if (!fresh || fresh.kind === 'top_up') return null;
    const { gatewayBase, walletBase, base } = await refundBase(this.prisma, fresh);
    const walletLeft = walletBase - Math.max(0, fresh.refundedCents - gatewayBase);
    const gatewayExhausted = record.prevRefundedCents + record.amountCents >= gatewayBase;
    if (!gatewayExhausted || plan.amountCents > walletLeft || fresh.refundedCents + plan.amountCents > base) {
      this.state.needsReview({ paymentId: fresh.id, reason: 'refund_wallet_over_cap' }, { refundId: record.id });
      throw conflict('conflict', 'A parte da carteira deste estorno não cabe no que resta do pagamento. O estorno foi para revisão manual.');
    }
    if (!(await this.claimRefundPart(actor, fresh, plan.amountCents, true, plan.idempotencyKey, base, dto.reason, null))) throw conflict('conflict', REFUND_RACED);
    const updated = (await this.prisma.payment.findUnique({ where: { id: fresh.id } }))!;
    // Como no fluxo normal: estorno total confirmado do aluguel devolve os minutos de pacote.
    if (updated.kind === 'rental') await this.returnPackageMinutes(updated);
    this.state.emitUpdated(updated);
    await this.audit.record({ actor, action: 'payment.refund', entityType: 'Payment', entityId: fresh.id, reason: dto.reason, metadata: { amountCents: plan.amountCents, walletCompletion: true } });
    return updated;
  }

  /** Chama o gateway para um pedido de estorno e grava o resultado. Desfaz a reserva só em recusa definitiva. */
  private async callGatewayRefund(record: PaymentRefund): Promise<'succeeded' | 'rejected' | 'pending'> {
    const p = (await this.prisma.payment.findUnique({ where: { id: record.paymentId } }))!;
    try {
      const r = await this.provider.refund({ providerPaymentId: p.providerPaymentId!, amountCents: record.amountCents, idempotencyKey: record.idempotencyKey });
      await this.prisma.paymentRefund.update({ where: { id: record.id }, data: { status: 'succeeded', providerRefundId: r.providerRefundId, attempts: { increment: 1 } } });
      return 'succeeded';
    } catch (err) {
      if (err instanceof RefundRejectedError) {
        await this.rollbackRefund(record, err.message);
        return 'rejected';
      }
      await this.prisma.paymentRefund.update({ where: { id: record.id }, data: { status: 'pending', attempts: { increment: 1 }, lastError: (err as Error).message.slice(0, 500) } });
      this.logger.warn({ msg: 'refund_outcome_unknown', paymentId: p.id, refundId: record.id, error: (err as Error).message });
      return 'pending';
    }
  }

  /** Desfaz a reserva só se o pagamento ainda estiver exatamente como este pedido deixou; senão, revisão manual. */
  private async rollbackRefund(record: PaymentRefund, reason: string): Promise<void> {
    const undone = await this.prisma.$transaction(async (tx) => {
      const res = await tx.payment.updateMany({
        where: { id: record.paymentId, status: record.newStatus as Payment['status'], refundedCents: record.newRefundedCents },
        data: { status: record.prevStatus as Payment['status'], refundedCents: record.prevRefundedCents },
      });
      await tx.paymentRefund.update({ where: { id: record.id }, data: { status: res.count === 1 ? 'rejected' : 'needs_review', lastError: reason.slice(0, 500) } });
      return res.count === 1;
    });
    if (undone) this.logger.warn({ msg: 'refund_rejected', paymentId: record.paymentId, refundId: record.id });
    else this.state.needsReview({ paymentId: record.paymentId, reason: 'refund_rollback_mismatch' }, { refundId: record.id });
  }

  @Interval('payments-refund-reconcile', 5 * 60_000)
  @ExclusiveJob('payments-refund-reconcile', jobLockTtl(5 * 60_000))
  async refundReconcileJob(): Promise<void> {
    if (process.env.JOBS_ENABLED === 'false') return;
    await this.reconcileRefunds(2 * 60_000).catch((err) => this.logger.error({ msg: 'refund_reconcile_failed', error: (err as Error).message }));
  }

  /**
   * Pedidos de estorno sem resultado (`claimed`: queda antes de chamar o gateway; `pending`: timeout/erro):
   * se o gateway já mostra o valor estornado → `succeeded`; senão repete com a mesma chave (idempotente).
   * Depois de `MAX_REFUND_ATTEMPTS`, `needs_review` (revisão manual).
   */
  async reconcileRefunds(olderThanMs: number): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanMs);
    const open = await this.prisma.paymentRefund.findMany({ where: { status: { in: ['claimed', 'pending'] }, updatedAt: { lte: cutoff } }, take: 50 });
    for (const rec of open) {
      try {
        const p = (await this.prisma.payment.findUnique({ where: { id: rec.paymentId } }))!;
        const pp = await this.provider.getPayment(p.providerPaymentId!);
        if (await this.gatewayShowsRefund(rec, p, pp.refundedCents ?? 0)) {
          await this.prisma.paymentRefund.update({ where: { id: rec.id }, data: { status: 'succeeded' } });
          if (p.kind === 'top_up') await this.reverseTopUp(p);
          if (p.kind === 'rental') await this.returnPackageMinutes(p);
          continue;
        }
        if (rec.attempts >= MAX_REFUND_ATTEMPTS) {
          await this.prisma.paymentRefund.update({ where: { id: rec.id }, data: { status: 'needs_review' } });
          this.state.needsReview({ paymentId: rec.paymentId, reason: 'refund_attempts_exhausted' }, { refundId: rec.id });
          continue;
        }
        // Revisão: estorno refeito e confirmado agora → a recarga perde o crédito também por este caminho.
        if ((await this.callGatewayRefund(rec)) === 'succeeded') {
          const fresh = (await this.prisma.payment.findUnique({ where: { id: p.id } }))!;
          if (fresh.kind === 'top_up') await this.reverseTopUp(fresh);
          if (fresh.kind === 'rental') await this.returnPackageMinutes(fresh);
        }
      } catch (err) {
        this.logger.warn({ msg: 'refund_reconcile_item_failed', refundId: rec.id, error: (err as Error).message });
      }
    }
  }

  /** Revisão onda 2: estorno total do aluguel devolve os minutos de pacote consumidos (idempotente). */
  private async returnPackageMinutes(p: Payment): Promise<void> {
    const back = await this.prisma.$transaction((tx) => returnRentalPackageMinutes(tx, p));
    if (back) this.logger.log({ msg: 'rental_refund_package_minutes_returned', paymentId: p.id, minutes: back });
  }

  /** Auditoria run-4 onda 2: estorno de recarga tira o crédito da carteira (idempotente; falta de saldo → revisão). */
  private async reverseTopUp(p: Payment): Promise<void> {
    const r = await this.prisma.$transaction((tx) => reverseTopUpRefund(tx, p));
    if (r && (r.shortfallCents > 0 || r.shortfallMinutes > 0)) {
      this.state.needsReview({ paymentId: p.id, reason: 'top_up_refund_exceeds_balance' }, { shortfallCents: r.shortfallCents, shortfallMinutes: r.shortfallMinutes });
    }
  }

  /**
   * Auditoria run-4 onda 2: o gateway já mostra ESTE estorno? Com linha de base: `before + amountCents`. Pedido antigo
   * (sem linha de base): o total do gateway só vale se nenhum outro Payment compartilhar o `providerPaymentId` (Pix da
   * caução que pagou o aluguel); senão segue a retentativa idempotente e, esgotada, revisão manual.
   */
  private async gatewayShowsRefund(rec: PaymentRefund, p: Payment, gatewayRefunded: number): Promise<boolean> {
    if (rec.gatewayRefundedBefore !== null && rec.gatewayRefundedBefore !== undefined) return gatewayRefunded >= rec.gatewayRefundedBefore + rec.amountCents;
    const siblings = await this.prisma.payment.count({ where: { providerPaymentId: p.providerPaymentId, id: { not: p.id } } });
    return siblings === 0 && gatewayRefunded >= rec.newRefundedCents;
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
