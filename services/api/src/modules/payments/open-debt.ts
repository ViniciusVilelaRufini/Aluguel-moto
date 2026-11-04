import type { Payment, Prisma, PrismaClient } from '@prisma/client';
import { COUNTER_METHODS, isCounterMethod } from './counter-methods';

/**
 * Definição única de "dívida em aberto" (revisão final, I1). Usada pela inadimplência (quitação pelo cliente e manual),
 * pela saída automática da flag `delinquent` e pelo bloqueio da exclusão de conta (LGPD). Sem dependências de DI, para
 * que qualquer módulo (LGPD, cobrança) use a mesma regra sem ciclo de imports.
 */

/** Pagamentos que geram dívida quando terminam `failed` (decisão #7: recarga recusada não gera dívida). */
export const DEBT_KINDS = ['rental', 'subscription'] as const;

type DebtDb = Pick<PrismaClient, 'payment' | 'settlementProgress' | 'subscription'> | Prisma.TransactionClient;

/**
 * Primeiro pagamento de uma assinatura recusada pelo gateway na criação (Task 8.2): a assinatura nunca começou e foi
 * cancelada, então o pagamento não é dívida (nem pode ser reenviado por `POST /payments/{id}/retry`).
 */
export const SUBSCRIPTION_CREATION_DECLINED = 'subscription_creation_declined';

/** Dívida do gateway: pagamento de aluguel/assinatura que terminou `failed` e ainda não foi quitado. */
const failedDebtWhere = (customerId: string): Prisma.PaymentWhereInput => ({
  customerId,
  kind: { in: [...DEBT_KINDS] },
  status: 'failed',
  debtSettledAt: null,
  // `OR` com null: no SQL, `<> 'x'` descartaria as linhas sem motivo.
  OR: [{ failureReason: null }, { failureReason: { not: SUBSCRIPTION_CREATION_DECLINED } }],
});

/**
 * Pré-reserva/balcão (Task 6): excedente do aluguel do balcão — `Payment` `rental` `pending` com método de balcão, acertado
 * no galpão (nunca cobrado pelo gateway). Já é dívida em aberto enquanto não for quitado.
 */
export const counterDebtWhere = (customerId: string): Prisma.PaymentWhereInput => ({
  customerId,
  kind: 'rental',
  status: 'pending',
  method: { in: [...COUNTER_METHODS] },
  debtSettledAt: null,
});

export const openDebtWhere = (customerId: string): Prisma.PaymentWhereInput => ({
  OR: [failedDebtWhere(customerId), counterDebtWhere(customerId)],
});

type DebtFields = Pick<Payment, 'kind' | 'status' | 'debtSettledAt' | 'failureReason' | 'method'>;

const isFailedDebt = (p: DebtFields): boolean =>
  (DEBT_KINDS as readonly string[]).includes(p.kind) && p.status === 'failed' && !p.debtSettledAt && p.failureReason !== SUBSCRIPTION_CREATION_DECLINED;

const isCounterDebt = (p: DebtFields): boolean => p.kind === 'rental' && p.status === 'pending' && isCounterMethod(p.method) && !p.debtSettledAt;

export const isOpenDebt = (p: DebtFields): boolean => isFailedDebt(p) || isCounterDebt(p);

/** Há ao menos uma dívida em aberto: `failed` de aluguel/assinatura ou excedente do balcão, ainda não quitada. */
export async function hasOpenDebt(db: DebtDb, customerId: string): Promise<boolean> {
  return (await db.payment.count({ where: openDebtWhere(customerId) })) > 0;
}

/** Há excedente do balcão ainda não acertado no galpão. */
export async function hasCounterDebt(db: DebtDb, customerId: string): Promise<boolean> {
  return (await db.payment.count({ where: counterDebtWhere(customerId) })) > 0;
}

/**
 * Cobrança automática ainda em curso no gateway para a dívida (ou, sem `debt`, para qualquer dívida do cliente):
 * - aluguel: liquidação `pending` com recusa e tentativas restantes (nem estacionada nem concluída);
 * - assinatura: `past_due` (o gateway ainda retenta a recorrência) ou fechada com o cancelamento no gateway ainda não
 *   confirmado (`gatewayCancelPendingAt`).
 */
export async function debtInCollection(db: DebtDb, customerId: string, debt?: Pick<Payment, 'kind' | 'subscriptionId'>): Promise<boolean> {
  if (!debt || debt.kind === 'rental') {
    if (await rentalSettlementRetrying(db, customerId, { onlyLive: true })) return true;
  }
  if (!debt || debt.kind === 'subscription') {
    const n = await db.subscription.count({
      where: { customerId, ...(debt?.subscriptionId ? { id: debt.subscriptionId } : {}), OR: [{ status: 'past_due' }, { gatewayCancelPendingAt: { not: null } }] },
    });
    if (n > 0) return true;
  }
  return false;
}

/**
 * Liquidação de aluguel `pending` que já teve recusa (`attempts > 0`). Com `onlyLive`, ignora as estacionadas e as
 * concluídas (critério do `debt-in-collection`); sem ele, qualquer uma conta (critério para manter a flag `delinquent`).
 */
export async function rentalSettlementRetrying(db: DebtDb, customerId: string, opts: { onlyLive: boolean }): Promise<boolean> {
  const pending = await db.payment.findMany({ where: { customerId, kind: 'rental', status: 'pending', method: { notIn: [...COUNTER_METHODS] } }, select: { id: true } });
  if (!pending.length) return false;
  const n = await db.settlementProgress.count({
    where: { paymentId: { in: pending.map((p) => p.id) }, attempts: { gt: 0 }, ...(opts.onlyLive ? { parkedAt: null, finishedAt: null } : {}) },
  });
  return n > 0;
}

/**
 * Bloqueio da exclusão de conta (LGPD): dívida em aberto, cobrança automática em curso (aluguel ou assinatura) ou
 * cobrança de aluguel ainda `pending` (liquidação sem resultado). Excluir a conta nesses casos apagaria cliente e cartões
 * no gateway e deixaria a dívida sem titular.
 */
export async function blocksAccountDeletion(db: DebtDb, customerId: string): Promise<boolean> {
  if (await hasOpenDebt(db, customerId)) return true;
  // Qualquer liquidação de aluguel `pending` no gateway bloqueia (cobre também a retentativa automática do aluguel). Os
  // `pending` de balcão não são liquidação: o excedente em aberto já entrou por `hasOpenDebt` (quitado, não bloqueia).
  if ((await db.payment.count({ where: { customerId, kind: 'rental', status: 'pending', method: { notIn: [...COUNTER_METHODS] } } })) > 0) return true;
  return debtInCollection(db, customerId, { kind: 'subscription', subscriptionId: null });
}
