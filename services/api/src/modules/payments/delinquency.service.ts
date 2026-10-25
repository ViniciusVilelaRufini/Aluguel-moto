import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Payment, Prisma } from '@prisma/client';
import { conflict, notFound, ProblemException } from '../../common/problem';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import type { PixCharge } from '../../ports/rental-billing.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import { PaymentStateService } from './payment-state.service';
import { ProviderCustomersService } from './provider-customers.service';
import { scheduleFakePixConfirmation } from './provider/fake-pix-autoconfirm';
import { PAYMENT_PROVIDER, type PaymentProvider, PaymentProviderError } from './provider/payment-provider';
import { BILLING_OPTIONS, type BillingOptions, RentalBillingService } from './rental-billing.service';

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
  ) {}

  /** Saldo devedor de cada pagamento com dívida em aberto (os demais ficam fora do mapa). */
  async outstandingMap(payments: Payment[]): Promise<Map<string, number>> {
    const debts = payments.filter(isOpenDebt);
    const depositIds = [...new Set(debts.map((p) => (p.kind === 'rental' ? p.depositId : null)).filter((x): x is string => !!x))];
    const deposits = depositIds.length ? await this.prisma.deposit.findMany({ where: { id: { in: depositIds } }, select: { id: true, status: true, capturedCents: true } }) : [];
    const captured = new Map(deposits.map((d) => [d.id, d.status === 'captured' ? (d.capturedCents ?? 0) : 0]));
    return new Map(debts.map((p) => [p.id, Math.max(0, p.amountCents - (p.depositId ? (captured.get(p.depositId) ?? 0) : 0))]));
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

  /** Liquidação de aluguel ainda retentando no gateway (recusa com tentativas restantes, nem estacionada nem concluída). */
  private async inCollection(customerId: string): Promise<boolean> {
    const pending = await this.prisma.payment.findMany({ where: { customerId, kind: 'rental', status: 'pending' }, select: { id: true } });
    if (!pending.length) return false;
    const n = await this.prisma.settlementProgress.count({ where: { paymentId: { in: pending.map((p) => p.id) }, attempts: { gt: 0 }, parkedAt: null, finishedAt: null } });
    return n > 0;
  }

  // ───────────────────────── cliente quita ─────────────────────────

  async payDebt(customerId: string, paymentId: string, input: DebtPaymentInput) {
    const debt = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!debt || debt.customerId !== customerId) throw notFound('Pagamento não encontrado.');
    if (!isOpenDebt(debt)) throw conflict('debt-not-payable', 'Este pagamento não tem dívida em aberto.');
    if (await this.inCollection(customerId)) throw conflict('debt-in-collection', 'Ainda estamos tentando cobrar no seu cartão. Aguarde o resultado.');
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
   * Quitação ainda em aberto para a dívida: Pix válido é reaproveitado; Pix vencido é cancelado; cartão sem resposta
   * conclusiva é conferido no gateway pela referência externa (pago → quita; nada lá depois de 10 min → falha).
   */
  private async openAttempt(debtId: string): Promise<Payment | null> {
    const open = await this.prisma.payment.findFirst({ where: { settlesPaymentId: debtId, kind: 'debt_settlement', status: 'pending' }, orderBy: { createdAt: 'desc' } });
    if (!open) return null;
    if (open.method === 'pix') {
      const pix = open.pix as PixCharge | null;
      if (pix && new Date(pix.expiresAt).getTime() > Date.now()) return open;
      if (open.providerPaymentId) await this.provider.cancelPix({ providerPaymentId: open.providerPaymentId, idempotencyKey: `debt-settlement-cancel:${open.id}` }).catch(() => undefined);
      await this.state.transition(open.id, 'failed', { failureReason: 'pix_expired' }).catch(() => undefined);
      return null;
    }
    const found = await this.provider.searchPayments({ externalReference: open.id }).catch(() => []);
    const paid = found.find((p) => p.status === 'paid');
    if (paid) {
      await this.onSettlementPaid(await this.state.transition(open.id, 'paid', { providerPaymentId: paid.providerPaymentId, cardLast4: paid.cardLast4 ?? open.cardLast4 }));
      throw conflict('debt-not-payable', 'Esta dívida já foi paga.');
    }
    if (found.some((p) => p.status === 'pending') || Date.now() - open.createdAt.getTime() < STALE_CARD_SETTLEMENT_MS) return open;
    await this.state.transition(open.id, 'failed', { failureReason: 'gateway_no_result' });
    return null;
  }

  private create(debt: Payment, method: 'card' | 'pix', amountCents: number, cardLast4?: string) {
    // Sem `rentalId`/`subscriptionId`: o vínculo é só `settlesPaymentId` (a liquidação e a assinatura não enxergam esta cobrança).
    return this.state.create({ customerId: debt.customerId, kind: 'debt_settlement', method, amountCents, settlesPaymentId: debt.id, cardLast4 });
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
  }

  // ───────────────────────── financeiro registra ─────────────────────────

  /** Quitação manual: todas as dívidas em aberto viram `manual`, a flag sai e o AuditLog guarda motivo e valor. */
  async clearManually(actor: Principal, customerId: string, reason: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, delinquent: true } });
    if (!customer) throw notFound('Cliente não encontrado.');
    const debts = await this.prisma.payment.findMany({ where: openDebtWhere(customerId) });
    if (!customer.delinquent && debts.length === 0) throw conflict('debt-not-payable', 'Este cliente não está inadimplente.');
    if (await this.inCollection(customerId)) throw conflict('debt-in-collection', 'Há uma cobrança automática em andamento no cartão do cliente. Aguarde o resultado antes de registrar a quitação.');
    const outstanding = await this.outstandingMap(debts);
    const amountCents = [...outstanding.values()].reduce((a, b) => a + b, 0);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      if (debts.length) {
        await tx.payment.updateMany({ where: { id: { in: debts.map((d) => d.id) }, debtSettledAt: null }, data: { debtSettledAt: now, debtSettlement: 'manual' } });
      }
      await tx.customer.update({ where: { id: customerId }, data: { delinquent: false } });
      await this.audit.record(
        { actor, action: 'customer.delinquency_clear', entityType: 'Customer', entityId: customerId, reason, metadata: { paymentIds: debts.map((d) => d.id), amountCents } },
        tx as never,
      );
    });
    this.logger.log({ msg: 'delinquency_cleared_manually', customerId, payments: debts.length, amountCents });
  }
}
