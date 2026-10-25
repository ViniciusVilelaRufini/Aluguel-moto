import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Payment, Prisma } from '@prisma/client';
import { conflict, notFound, ProblemException } from '../../common/problem';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import type { PixCharge } from '../../ports/rental-billing.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import { isUniqueViolation, PaymentStateService } from './payment-state.service';
import { ProviderCustomersService } from './provider-customers.service';
import { scheduleFakePixConfirmation } from './provider/fake-pix-autoconfirm';
import { PAYMENT_PROVIDER, type PaymentProvider, PaymentProviderError } from './provider/payment-provider';
import { BILLING_OPTIONS, type BillingOptions, RentalBillingService } from './rental-billing.service';
import { ReceiptService } from './receipts/receipt.service';

/** Pagamentos que geram dívida quando terminam `failed` (decisão #7: recarga recusada não gera dívida). */
export const DEBT_KINDS = ['rental', 'subscription'] as const;
/** Quitação no cartão sem resposta conclusiva há mais que isto: o gateway é consultado e, sem cobrança, a tentativa morre. */
const STALE_CARD_SETTLEMENT_MS = 10 * 60_000;

export const openDebtWhere = (customerId: string): Prisma.PaymentWhereInput => ({ customerId, kind: { in: [...DEBT_KINDS] }, status: 'failed', debtSettledAt: null });

export const isOpenDebt = (p: Pick<Payment, 'kind' | 'status' | 'debtSettledAt'>): boolean =>
  (DEBT_KINDS as readonly string[]).includes(p.kind) && p.status === 'failed' && !p.debtSettledAt;

export interface DebtPaymentInput {
  method: 'card' | 'pix';
  cardId?: string;
}

/**
 * Inadimplência (Task 14 das lacunas; proposta #5 de docs/decisoes.md):
 * - **saldo devedor** de um pagamento `failed` de aluguel/assinatura = valor − caução capturada como garantia;
 * - **quitação pelo cliente** (`POST /payments/{id}/retry`): novo `Payment` `debt_settlement` com `settlesPaymentId`,
 *   cartão na hora ou Pix (webhook); pago → a dívida ganha `debtSettledAt` e a flag sai se não sobrar outra;
 * - **quitação manual** (`POST /customers/{id}/delinquency/clear`): financeiro, com motivo no AuditLog.
 * Cobrança ainda em retentativa automática (liquidação `pending` com recusa) bloqueia as duas (`debt-in-collection`),
 * para nunca cobrar duas vezes a mesma dívida.
 */
@Injectable()
export class DelinquencyService {
  private readonly logger = new Logger('DelinquencyService');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly state: PaymentStateService,
    private readonly customers: ProviderCustomersService,
    private readonly billing: RentalBillingService,
    private readonly audit: AuditService,
    @Inject(QUEUE_BUS) private readonly queue: QueueBus,
    @Inject(BILLING_OPTIONS) private readonly opts: BillingOptions,
    @Optional() private readonly receipts?: ReceiptService,
  ) {}

  /** Saldo devedor de cada pagamento com dívida em aberto (os demais ficam fora do mapa). */
  async outstandingMap(payments: Payment[]): Promise<Map<string, number>> {
    const debts = payments.filter(isOpenDebt);
    const depositIds = [...new Set(debts.map((p) => (p.kind === 'rental' ? p.depositId : null)).filter((x): x is string => !!x))];
    const deposits = depositIds.length ? await this.prisma.deposit.findMany({ where: { id: { in: depositIds } }, select: { id: true, status: true, capturedCents: true } }) : [];
    const captured = new Map(deposits.map((d) => [d.id, d.status === 'captured' ? (d.capturedCents ?? 0) : 0]));
    // Task 16: o pagamento registra o bruto; a parte da carteira (`walletCents`) já foi paga no fechamento.
    return new Map(debts.map((p) => [p.id, Math.max(0, p.amountCents - (p.walletCents ?? 0) - (p.depositId ? (captured.get(p.depositId) ?? 0) : 0))]));
  }

  async outstanding(p: Payment): Promise<number | undefined> {
    return (await this.outstandingMap([p])).get(p.id);
  }

  /** Soma do saldo devedor das dívidas em aberto do cliente. */
  async debtCents(customerId: string): Promise<number> {
    const debts = await this.prisma.payment.findMany({ where: openDebtWhere(customerId) });
    let total = 0;
    for (const v of (await this.outstandingMap(debts)).values()) total += v;
    return total;
  }

  /**
   * Cobrança automática ainda em curso no gateway para a dívida:
   * - aluguel: liquidação `pending` com recusa e tentativas restantes (nem estacionada nem concluída);
   * - assinatura (fix round 1, I-2): a assinatura da dívida em `past_due` (o gateway ainda retenta a recorrência) ou fechada
   *   com o cancelamento no gateway ainda não confirmado (`gatewayCancelPendingAt`). Pagar por fora agora cobraria o mesmo
   *   ciclo duas vezes.
   */
  private async inCollection(customerId: string, debt: Pick<Payment, 'kind' | 'subscriptionId'>): Promise<boolean> {
    if (debt.kind === 'subscription') return this.subscriptionInCollection(customerId, debt.subscriptionId);
    return this.rentalInCollection(customerId);
  }

  /** Liquidação de aluguel `pending` com recusa e tentativas restantes (nem estacionada nem concluída). */
  private async rentalInCollection(customerId: string): Promise<boolean> {
    const pending = await this.prisma.payment.findMany({ where: { customerId, kind: 'rental', status: 'pending' }, select: { id: true } });
    if (!pending.length) return false;
    const n = await this.prisma.settlementProgress.count({ where: { paymentId: { in: pending.map((p) => p.id) }, attempts: { gt: 0 }, parkedAt: null, finishedAt: null } });
    return n > 0;
  }

  /**
   * A assinatura **ligada à dívida** ainda é cobrada pelo gateway (`past_due` ou cancelamento não confirmado). Uma outra
   * assinatura do cliente em `past_due` não bloqueia a quitação desta dívida (Task 16, menor da re-revisão da Task 14).
   */
  private async subscriptionInCollection(customerId: string, subscriptionId: string | null): Promise<boolean> {
    if (!subscriptionId) return false;
    const n = await this.prisma.subscription.count({
      where: { customerId, id: subscriptionId, OR: [{ status: 'past_due' }, { gatewayCancelPendingAt: { not: null } }] },
    });
    return n > 0;
  }

  /** R2-01: dívida de aluguel quitada → o recibo (PDF + NFS-e) do aluguel fica pronto. Falha não derruba a quitação. */
  private async issueReceipts(paymentIds: string[]): Promise<void> {
    if (!this.receipts || !paymentIds.length) return;
    const rentals = await this.prisma.payment.findMany({ where: { id: { in: paymentIds }, kind: 'rental' }, select: { id: true } });
    for (const p of rentals) {
      await this.receipts.issueForPayment(p.id).catch((err) => this.logger.error({ msg: 'receipt_failed', paymentId: p.id, error: (err as Error).message }));
    }
  }

  private gatewayUnavailable(): ProblemException {
    return new ProblemException(503, 'gateway-unavailable', 'Não conseguimos confirmar o pagamento anterior agora. Tente de novo em instantes.');
  }

  // ───────────────────────── cliente quita ─────────────────────────

  async payDebt(customerId: string, paymentId: string, input: DebtPaymentInput) {
    const debt = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!debt || debt.customerId !== customerId) throw notFound('Pagamento não encontrado.');
    if (!isOpenDebt(debt)) throw conflict('debt-not-payable', 'Este pagamento não tem dívida em aberto.');
    if (await this.inCollection(customerId, debt)) throw conflict('debt-in-collection', 'Ainda estamos tentando cobrar no seu cartão. Aguarde o resultado.');
    const amountCents = (await this.outstanding(debt)) ?? 0;
    if (amountCents <= 0) throw conflict('debt-not-payable', 'Este pagamento não tem saldo devedor.');

    const reuse = await this.openAttempt(debt.id);
    if (reuse) {
      if (reuse.method === 'pix' && input.method === 'pix') return reuse;
      throw conflict('conflict', 'Já existe um pagamento desta dívida em andamento.');
    }
    return input.method === 'pix' ? this.payWithPix(debt, amountCents) : this.payWithCard(debt, amountCents, input.cardId);
  }

  /**
   * Quitação ainda em aberto para a dívida: Pix válido é reaproveitado; cartão sem resposta conclusiva é conferido no
   * gateway pela referência externa. Fix round 1 (I-1): a tentativa só vira `failed` com a recusa/cancelamento confirmado
   * pelo gateway. Erro de consulta nunca conta como "nada lá": a tentativa fica `pending` e o cliente recebe 503.
   */
  private async openAttempt(debtId: string): Promise<Payment | null> {
    const open = await this.prisma.payment.findFirst({ where: { settlesPaymentId: debtId, kind: 'debt_settlement', status: 'pending' }, orderBy: { createdAt: 'desc' } });
    if (!open) return null;
    const paidNow = async (providerPaymentId: string, cardLast4?: string | null): Promise<never> => {
      await this.onSettlementPaid(await this.state.transition(open.id, 'paid', { providerPaymentId, cardLast4: cardLast4 ?? open.cardLast4 }));
      throw conflict('debt-not-payable', 'Esta dívida já foi paga.');
    };
    if (open.method === 'pix') {
      const pix = open.pix as PixCharge | null;
      if (pix && new Date(pix.expiresAt).getTime() > Date.now()) return open;
      if (!open.providerPaymentId) {
        // O Pix nem chegou a ser criado no gateway: nada a cobrar.
        await this.state.transition(open.id, 'failed', { failureReason: 'pix_not_created' });
        return null;
      }
      const ppid = open.providerPaymentId;
      let status: string | undefined;
      try {
        status = (await this.provider.cancelPix({ providerPaymentId: ppid, idempotencyKey: `debt-settlement-cancel:${open.id}` })).status;
      } catch {
        status = undefined;
      }
      if (status !== 'failed' && status !== 'canceled') {
        // Cancelamento não confirmado (pode já ter sido pago): o estado no gateway decide.
        let seen;
        try {
          seen = await this.provider.getPayment(ppid);
        } catch {
          throw this.gatewayUnavailable();
        }
        if (seen.status === 'paid') return paidNow(seen.providerPaymentId);
        status = seen.status;
      }
      if (status === 'failed' || status === 'canceled') {
        await this.state.transition(open.id, 'failed', { failureReason: 'pix_expired' });
        return null;
      }
      throw this.gatewayUnavailable();
    }
    let found;
    try {
      found = await this.provider.searchPayments({ externalReference: open.id });
    } catch {
      throw this.gatewayUnavailable();
    }
    const paid = found.find((p) => p.status === 'paid');
    if (paid) return paidNow(paid.providerPaymentId, paid.cardLast4);
    if (found.some((p) => p.status === 'pending') || Date.now() - open.createdAt.getTime() < STALE_CARD_SETTLEMENT_MS) return open;
    await this.state.transition(open.id, 'failed', { failureReason: 'gateway_no_result' });
    return null;
  }

  /**
   * Fix round 1 (I-1): o gateway confirmou como pago uma quitação que já estava `failed` localmente (Pix pago no limite,
   * cobrança que apareceu depois da busca). O dinheiro entrou: a dívida é quitada (idempotente) e o financeiro é avisado
   * (o registro local continua `failed` e precisa de conciliação; se a dívida já estava quitada, há valor a devolver).
   */
  async onLatePaid(pay: Payment, providerPaymentId: string): Promise<void> {
    if (pay.kind !== 'debt_settlement' || !pay.settlesPaymentId) return;
    // Idempotente por pagamento (Task 16): notificações repetidas do Mercado Pago (eventos diferentes do mesmo pagamento)
    // não abrem um segundo alerta (`debt_settlement_after_settled` falso). Já tratado → só conclui uma quitação que tenha
    // ficado pela metade (queda entre a anotação e a quitação); nada de alerta novo.
    const repeated = pay.failureReason === 'paid_after_failed';
    if (!repeated) await this.state.annotate(pay.id, { providerPaymentId: pay.providerPaymentId ?? providerPaymentId, failureReason: 'paid_after_failed' });
    const res = await this.prisma.payment.updateMany({
      where: { id: pay.settlesPaymentId, customerId: pay.customerId, status: 'failed', debtSettledAt: null },
      data: { debtSettledAt: new Date(), debtSettlement: 'payment' },
    });
    if (repeated && res.count === 0) return;
    if (res.count === 1) {
      this.logger.warn({ msg: 'debt_settled_by_late_payment', paymentId: pay.settlesPaymentId, settlementPaymentId: pay.id });
      await this.billing.clearDelinquencyIfSettled(pay.customerId);
      this.state.needsReview({ paymentId: pay.id, reason: 'debt_settlement_paid_after_failed' });
      await this.issueReceipts([pay.settlesPaymentId]);
    } else {
      this.state.needsReview({ paymentId: pay.id, reason: 'debt_settlement_after_settled' });
    }
  }

  /**
   * Uma tentativa `pending` por dívida (índice parcial `Payment_one_pending_debt_settlement`): duas chamadas simultâneas →
   * a segunda recebe 409 em vez de cobrar de novo. A dívida é relida logo antes (quitada no meio → 409). Se ainda assim uma
   * segunda quitação for paga, `onSettlementPaid` pede revisão manual para devolver.
   */
  private async create(debt: Payment, method: 'card' | 'pix', amountCents: number, cardLast4?: string) {
    const fresh = await this.prisma.payment.findUnique({ where: { id: debt.id } });
    if (!fresh || !isOpenDebt(fresh)) throw conflict('debt-not-payable', 'Esta dívida já foi quitada.');
    try {
      // Sem `rentalId`/`subscriptionId`: o vínculo é só `settlesPaymentId` (a liquidação e a assinatura não enxergam esta cobrança).
      return await this.state.create({ customerId: debt.customerId, kind: 'debt_settlement', method, amountCents, settlesPaymentId: debt.id, cardLast4 });
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict('conflict', 'Já existe um pagamento desta dívida em andamento.');
      throw err;
    }
  }

  private async payWithCard(debt: Payment, amountCents: number, cardId?: string) {
    const card = await this.customers.card(debt.customerId, cardId);
    if (!card) throw new ProblemException(402, 'card-not-found', 'Cadastre um cartão para pagar.');
    const pay = await this.create(debt, 'card', amountCents, card.last4);
    const providerCustomerId = await this.customers.ensureCustomer(debt.customerId);
    let res;
    try {
      const { cardToken } = await this.provider.createCardToken({ providerCustomerId, providerCardId: card.providerCardId });
      res = await this.provider.charge({
        providerCustomerId, providerCardId: card.providerCardId, cardToken, amountCents, description: 'Quitação de pendência Volti',
        idempotencyKey: `debt-settlement:${pay.id}`, externalReference: pay.id,
      });
    } catch (err) {
      if (!(err instanceof PaymentProviderError)) throw err;
      // Resultado desconhecido: a tentativa fica `pending` (o webhook ou a próxima tentativa confere no gateway).
      this.logger.warn({ msg: 'debt_settlement_outcome_unknown', paymentId: pay.id, error: err.message });
      throw new ProblemException(503, 'gateway-unavailable', 'Não conseguimos confirmar o pagamento agora. Confira em instantes antes de tentar de novo.');
    }
    if (res.status === 'paid') {
      const paid = await this.state.transition(pay.id, 'paid', { providerPaymentId: res.providerPaymentId, cardLast4: res.cardLast4 ?? card.last4 });
      await this.onSettlementPaid(paid);
      return (await this.prisma.payment.findUnique({ where: { id: pay.id } }))!;
    }
    if (res.status === 'pending') {
      // Em análise no gateway: quita quando o webhook confirmar.
      return this.state.annotate(pay.id, { providerPaymentId: res.providerPaymentId });
    }
    await this.state.transition(pay.id, 'failed', { failureReason: res.failureReason ?? 'charge_failed', providerPaymentId: res.providerPaymentId || null });
    throw new ProblemException(402, 'payment-failed', 'Pagamento recusado. Tente outro cartão ou Pix.');
  }

  private async payWithPix(debt: Payment, amountCents: number) {
    const pay = await this.create(debt, 'pix', amountCents);
    const res = await this.provider.createPix({
      amountCents, description: 'Quitação de pendência Volti (Pix)', expiresAt: new Date(Date.now() + this.opts.pixExpirationMinutes * 60_000),
      payerEmail: await this.customers.payerEmail(debt.customerId), idempotencyKey: `debt-settlement:${pay.id}`, externalReference: pay.id,
    });
    const updated = await this.state.annotate(pay.id, { providerPaymentId: res.providerPaymentId, pix: res.pix as unknown as Prisma.InputJsonValue });
    scheduleFakePixConfirmation(this.provider, this.queue, res.providerPaymentId, this.opts.fakePixAutoConfirmSeconds);
    return updated;
  }

  /**
   * Quitação paga (cartão na hora ou webhook do Pix/análise): marca a dívida quitada e tira a flag se não sobrar outra.
   * Dívida já quitada antes (ex.: quitação manual no meio) → revisão manual, para o financeiro devolver o valor.
   */
  async onSettlementPaid(pay: Payment): Promise<void> {
    if (pay.kind !== 'debt_settlement' || !pay.settlesPaymentId) return;
    const res = await this.prisma.payment.updateMany({
      where: { id: pay.settlesPaymentId, customerId: pay.customerId, status: 'failed', debtSettledAt: null },
      data: { debtSettledAt: new Date(), debtSettlement: 'payment' },
    });
    if (res.count === 0) {
      this.state.needsReview({ paymentId: pay.id, reason: 'debt_settlement_after_settled' });
      return;
    }
    this.logger.log({ msg: 'debt_settled', paymentId: pay.settlesPaymentId, settlementPaymentId: pay.id });
    await this.billing.clearDelinquencyIfSettled(pay.customerId);
    await this.issueReceipts([pay.settlesPaymentId]);
  }

  // ───────────────────────── financeiro registra ─────────────────────────

  /** Quitação manual: todas as dívidas em aberto viram `manual`, a flag sai e o AuditLog guarda motivo e valor. */
  async clearManually(actor: Principal, customerId: string, reason: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, delinquent: true } });
    if (!customer) throw notFound('Cliente não encontrado.');
    const debts = await this.prisma.payment.findMany({ where: openDebtWhere(customerId) });
    if (!customer.delinquent && debts.length === 0) throw conflict('debt-not-payable', 'Este cliente não está inadimplente.');
    // Só bloqueia o que ainda é cobrado automaticamente: liquidação de aluguel em retentativa ou a assinatura ligada a uma das dívidas.
    const subscriptionBusy = async () => {
      for (const id of new Set(debts.map((d) => (d.kind === 'subscription' ? d.subscriptionId : null)).filter((x): x is string => !!x))) {
        if (await this.subscriptionInCollection(customerId, id)) return true;
      }
      return false;
    };
    if ((await this.rentalInCollection(customerId)) || (await subscriptionBusy())) throw conflict('debt-in-collection', 'Há uma cobrança automática em andamento no cartão do cliente. Aguarde o resultado antes de registrar a quitação.');
    const outstanding = await this.outstandingMap(debts);
    const now = new Date();
    let settled: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      // Fix round 1 (M1): o log registra só o que esta transação quitou (uma quitação paga no meio fica fora).
      if (debts.length) {
        const still = await tx.payment.findMany({ where: { id: { in: debts.map((d) => d.id) }, debtSettledAt: null }, select: { id: true } });
        settled = still.map((d) => d.id);
        if (settled.length) await tx.payment.updateMany({ where: { id: { in: settled }, debtSettledAt: null }, data: { debtSettledAt: now, debtSettlement: 'manual' } });
      }
      await tx.customer.update({ where: { id: customerId }, data: { delinquent: false } });
      const amountCents = settled.reduce((a, id) => a + (outstanding.get(id) ?? 0), 0);
      await this.audit.record(
        { actor, action: 'customer.delinquency_clear', entityType: 'Customer', entityId: customerId, reason, metadata: { paymentIds: settled, amountCents } },
        tx as never,
      );
    });
    this.logger.log({ msg: 'delinquency_cleared_manually', customerId, payments: settled.length });
    await this.issueReceipts(settled);
  }
}
