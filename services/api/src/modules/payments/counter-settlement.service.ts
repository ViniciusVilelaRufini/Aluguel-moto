import { Injectable, Logger } from '@nestjs/common';
import type { Deposit, Payment, Prisma, Rental } from '@prisma/client';
import { badRequest, conflict, notFound, ProblemException } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import { toDeposit } from '../rentals/rentals.mapper';
import { COUNTER_METHODS, depositAvailableCents, isCounterMethod } from './counter-methods';
import type { CounterRefundDto, CounterSettleDto } from './counter-settlement.dto';
import { DelinquencyService } from './delinquency.service';
import { debtInCollection, isOpenDebt, openDebtWhere } from './open-debt';
import { PaymentStateService } from './payment-state.service';
import { toPayment } from './payments.mapper';
import { RentalBillingService } from './rental-billing.service';

export type PaymentView = ReturnType<typeof toPayment>;
export type DepositView = ReturnType<typeof toDeposit>;

export interface CounterDebtView {
  paymentId: string;
  rentalId?: string;
  kind: Payment['kind'];
  status: Payment['status'];
  method: Payment['method'];
  outstandingCents: number;
  createdAt: string;
}

export interface CounterDepositBalanceView {
  depositId: string;
  rentalId?: string;
  method: Deposit['method'];
  status: Deposit['status'];
  amountCents: number;
  capturedCents: number;
  refundedCents: number;
  availableCents: number;
}

export interface CounterBalanceView {
  rentalId: string;
  customerId: string;
  customerFirstName?: string;
  rentalStatus: string;
  debtTotalCents: number;
  debts: CounterDebtView[];
  deposits: CounterDepositBalanceView[];
}

/** Aluguel ainda não encerrado: a caução dele não pode ser devolvida nem abater dívida. */
const OPEN_RENTAL_STATUSES: Rental['status'][] = ['active', 'paused', 'ending'];

const amountMismatch = (detail: string) => new ProblemException(422, 'counter-amount-mismatch', detail, undefined, 'Valor não confere');
const depositNotFound = () => notFound('Caução não encontrada.');
const notCounterDeposit = () => conflict('conflict', 'Esta caução não é do balcão.');
const depositOfOpenRental = () => conflict('conflict', 'A caução só abate dívidas depois do encerramento do aluguel.');

/**
 * Disponível da caução de balcão para abater ou devolver. Só `held` tem saldo: `captured`/`released` já zeraram
 * (Interpretação 9) e qualquer resto nesses estados nunca é usado.
 */
const available = (d: Deposit): number => (d.status === 'held' ? depositAvailableCents(d) : 0);

/** Status da caução depois de mexer no disponível (Interpretação 9). */
const depositStatusAfter = (d: Pick<Deposit, 'amountCents' | 'capturedCents' | 'refundedCents'>): Deposit['status'] =>
  depositAvailableCents(d) > 0 ? 'held' : (d.capturedCents ?? 0) > 0 ? 'captured' : 'released';

/**
 * Acerto no balcão do galpão (pré-reserva/balcão, Task 7): saldo do cliente, quitação parcial de dívidas (dinheiro,
 * maquininha, Pix do galpão ou abatimento da caução) e devolução da caução. Nada passa pelo gateway.
 *
 * Concorrência: cada operação trava as linhas que altera (`SELECT ... FOR UPDATE`) e relê tudo dentro da transação.
 * Ordem das travas: `Payment` antes de `Deposit` (a devolução só trava a `Deposit`), então não há deadlock.
 *
 * "Quitado" é só `debtSettledAt` (regra única de `open-debt.ts`): a quitação manual do financeiro (`clearManually`)
 * grava `debtSettledAt` e deixa o débito de balcão `pending`; esse débito já não é dívida — some do saldo e o
 * `counter-settle` responde `409 debt-not-payable`. O `status` `pending` restante é só histórico.
 */
@Injectable()
export class CounterSettlementService {
  private readonly logger = new Logger('CounterSettlementService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly delinquency: DelinquencyService,
    private readonly state: PaymentStateService,
    private readonly billing: RentalBillingService,
    private readonly audit: AuditService,
  ) {}

  /** `GET /rentals/{id}/counter-balance`: dívidas em aberto do cliente com saldo e cauções de balcão com disponível. */
  async balance(rentalId: string): Promise<CounterBalanceView> {
    const rental = await this.prisma.rental.findUnique({ where: { id: rentalId }, select: { id: true, customerId: true, status: true } });
    if (!rental) throw notFound('Aluguel não encontrado.');
    const customerId = rental.customerId;
    const [customer, open, deposits] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: customerId }, select: { name: true } }),
      this.prisma.payment.findMany({ where: openDebtWhere(customerId), orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      this.prisma.deposit.findMany({ where: { customerId, status: 'held', method: { in: [...COUNTER_METHODS] } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
    ]);
    const outstanding = await this.delinquency.outstandingMap(open);
    // A caução do aluguel ainda aberto (inclusive deste) garante esse aluguel: não entra no saldo para abater.
    const depositRentalIds = [...new Set(deposits.map((d) => d.rentalId).filter((x): x is string => !!x))];
    const openRentals = depositRentalIds.length
      ? await this.prisma.rental.findMany({ where: { id: { in: depositRentalIds }, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } })
      : [];
    const openRentalIds = new Set(openRentals.map((r) => r.id));
    const debts: CounterDebtView[] = open
      .filter((p) => (outstanding.get(p.id) ?? 0) > 0)
      .map((p) => ({
        paymentId: p.id,
        ...(p.rentalId ? { rentalId: p.rentalId } : {}),
        kind: p.kind,
        status: p.status,
        method: p.method,
        outstandingCents: outstanding.get(p.id)!,
        createdAt: p.createdAt.toISOString(),
      }));
    const firstName = customer?.name?.trim().split(/\s+/)[0];
    return {
      rentalId: rental.id,
      customerId,
      ...(firstName ? { customerFirstName: firstName } : {}),
      rentalStatus: rental.status,
      debtTotalCents: debts.reduce((a, d) => a + d.outstandingCents, 0),
      debts,
      deposits: deposits
        .filter((d) => available(d) > 0 && !(d.rentalId && openRentalIds.has(d.rentalId)))
        .map((d) => ({
          depositId: d.id,
          ...(d.rentalId ? { rentalId: d.rentalId } : {}),
          method: d.method,
          status: d.status,
          amountCents: d.amountCents,
          capturedCents: d.capturedCents ?? 0,
          refundedCents: d.refundedCents,
          availableCents: available(d),
        })),
    };
  }

  /**
   * `POST /payments/{id}/counter-settle`: quitação (total ou parcial) de uma dívida em aberto no balcão. Cada parte vira um
   * `debt_settlement` `paid`; saldo zerado → o débito ganha `debtSettledAt` (o de balcão também vira `paid`).
   */
  async settle(actor: Principal, paymentId: string, dto: CounterSettleDto): Promise<PaymentView> {
    if (!!dto.method === !!dto.fromDepositId) {
      throw badRequest('Informe a forma de pagamento ou a caução, nunca os dois.', [{ field: 'method', message: 'Informe exatamente um entre method e fromDepositId.' }]);
    }
    const existing = await this.prisma.payment.findUnique({ where: { id: paymentId }, select: { id: true } });
    if (!existing) throw notFound('Pagamento não encontrado.');

    const now = new Date();
    const out = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${paymentId}::uuid FOR UPDATE`;
      const debt = (await tx.payment.findUnique({ where: { id: paymentId } }))!;
      if (!isOpenDebt(debt)) throw conflict('debt-not-payable', 'Este pagamento não tem dívida em aberto.');
      // Assinatura `past_due` (ou cancelamento no gateway pendente): o gateway ainda retenta a recorrência e quitar no
      // balcão cobraria duas vezes. Débito de aluguel `failed` é terminal (o gateway não o retenta): sempre quita.
      if (debt.kind === 'subscription' && (await debtInCollection(tx, debt.customerId, debt))) {
        throw conflict('debt-in-collection', 'Há uma cobrança automática em andamento no cartão do cliente. Aguarde o resultado antes de registrar a quitação.');
      }
      const before = (await this.delinquency.outstandingMap([debt], tx)).get(debt.id) ?? 0;
      if (dto.amountCents > before) throw amountMismatch(`O valor passa do saldo do débito (${before}).`);

      let deposit: Deposit | null = null;
      if (dto.fromDepositId) {
        await tx.$queryRaw`SELECT "id" FROM "Deposit" WHERE "id" = ${dto.fromDepositId}::uuid FOR UPDATE`;
        deposit = await tx.deposit.findUnique({ where: { id: dto.fromDepositId } });
        if (!deposit || deposit.customerId !== debt.customerId) throw depositNotFound();
        if (!isCounterMethod(deposit.method)) throw notCounterDeposit();
        if (deposit.rentalId) {
          const owner = await tx.rental.findUnique({ where: { id: deposit.rentalId }, select: { status: true } });
          if (owner && OPEN_RENTAL_STATUSES.includes(owner.status)) throw depositOfOpenRental();
        }
        const left = available(deposit);
        if (dto.amountCents > left) throw amountMismatch(`O valor passa do disponível da caução (${left}).`);
        const next = { amountCents: deposit.amountCents, capturedCents: (deposit.capturedCents ?? 0) + dto.amountCents, refundedCents: deposit.refundedCents };
        await tx.deposit.update({ where: { id: deposit.id }, data: { capturedCents: next.capturedCents, status: depositStatusAfter(next) } });
      }

      const method = (dto.method ?? deposit!.method) as Payment['method'];
      const part = await tx.payment.create({
        data: {
          customerId: debt.customerId,
          kind: 'debt_settlement',
          method,
          status: 'paid',
          amountCents: dto.amountCents,
          settlesPaymentId: debt.id,
          depositId: deposit?.id ?? null,
          reference: dto.reference ?? null,
          recordedById: actor.userId,
        },
      });

      const remaining = before - dto.amountCents;
      let updated = debt;
      if (remaining === 0) {
        const settledData = { debtSettledAt: now, debtSettlement: 'payment' as const };
        updated =
          debt.status === 'pending' && isCounterMethod(debt.method)
            ? await this.state.transitionTx(tx, debt.id, 'paid', settledData)
            : await tx.payment.update({ where: { id: debt.id }, data: settledData });
      }
      await this.audit.record(
        {
          actor,
          action: 'payment.counter_settle',
          entityType: 'Payment',
          entityId: debt.id,
          metadata: { settlementPaymentId: part.id, amountCents: dto.amountCents, method, depositId: deposit?.id ?? null, outstandingCents: remaining },
        },
        tx as never,
      );
      return { debt: updated, part, remaining, statusChanged: updated.status !== debt.status };
    });

    this.logger.log({ msg: 'counter_debt_settled', paymentId, settlementPaymentId: out.part.id, amountCents: dto.amountCents, outstandingCents: out.remaining, fromDeposit: !!dto.fromDepositId });
    // Quitado (mesmo `failed` que só ganha `debtSettledAt`, sem mudar de status): o painel e o app precisam do saldo novo.
    if (out.statusChanged || out.remaining === 0) this.state.emitUpdated(out.debt);
    if (out.remaining === 0) {
      await this.billing
        .clearDelinquencyIfSettled(out.debt.customerId)
        .catch((err) => this.logger.error({ msg: 'counter_settle_delinquency_clear_failed', paymentId, error: (err as Error).message }));
    }
    return toPayment(out.debt, undefined, { outstandingCents: out.remaining, staff: true });
  }

  /** `POST /payments/deposits/{id}/counter-refund`: devolução (total ou parcial) da caução do balcão, só com o aluguel encerrado. */
  async refund(actor: Principal, depositId: string, dto: CounterRefundDto): Promise<DepositView> {
    const found = await this.prisma.deposit.findUnique({ where: { id: depositId } });
    if (!found) throw depositNotFound();
    if (!isCounterMethod(found.method)) throw notCounterDeposit();
    if (found.rentalId) {
      const rental = await this.prisma.rental.findUnique({ where: { id: found.rentalId }, select: { status: true } });
      if (rental && OPEN_RENTAL_STATUSES.includes(rental.status)) throw conflict('conflict', 'A caução só é devolvida depois do encerramento do aluguel.');
    }

    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`SELECT "id" FROM "Deposit" WHERE "id" = ${depositId}::uuid FOR UPDATE`;
      const d = (await tx.deposit.findUnique({ where: { id: depositId } }))!;
      const left = available(d);
      if (dto.amountCents > left) throw amountMismatch(`O valor passa do disponível da caução (${left}).`);
      const next = { amountCents: d.amountCents, capturedCents: d.capturedCents, refundedCents: d.refundedCents + dto.amountCents };
      const row = await tx.deposit.update({ where: { id: depositId }, data: { refundedCents: next.refundedCents, status: depositStatusAfter(next) } });
      await this.audit.record(
        {
          actor,
          action: 'deposit.counter_refund',
          entityType: 'Deposit',
          entityId: depositId,
          metadata: { amountCents: dto.amountCents, refundedCents: row.refundedCents, availableCents: depositAvailableCents(row), status: row.status, reference: dto.reference ?? null },
        },
        tx as never,
      );
      return row;
    });
    this.logger.log({ msg: 'counter_deposit_refunded', depositId, amountCents: dto.amountCents, status: updated.status });
    return toDeposit(updated);
  }
}
