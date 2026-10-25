import type { InsurancePolicy, Payment, PaymentCard, Subscription, TopUp, WalletEntry } from '@prisma/client';
import { compact, iso } from '../../common/util';
import type { PixCharge } from '../../ports/rental-billing.port';
import { nextCharge, pausePolicy, pausesRemaining } from './subscription-rules';

/** Campos calculados na leitura (Task 14): nome do cliente (só staff) e saldo devedor da dívida em aberto. */
export interface PaymentExtras {
  customerName?: string;
  outstandingCents?: number;
}

/** `receiptUrl`: link assinado gerado na leitura (QA-11); o valor gravado em `Payment.receiptUrl` é legado e ignorado. */
export function toPayment(p: Payment, receiptUrl?: string, extras: PaymentExtras = {}) {
  return compact({
    id: p.id,
    customerId: p.customerId,
    rentalId: p.rentalId ?? undefined,
    depositId: p.depositId ?? undefined,
    subscriptionId: p.subscriptionId ?? undefined,
    kind: p.kind,
    method: p.method,
    status: p.status,
    amountCents: p.amountCents,
    refundedCents: p.refundedCents,
    cardLast4: p.cardLast4 ?? undefined,
    failureReason: p.failureReason ?? undefined,
    providerPaymentId: p.providerPaymentId ?? undefined,
    receiptUrl,
    customerName: extras.customerName,
    outstandingCents: extras.outstandingCents,
    debtSettledAt: iso(p.debtSettledAt),
    debtSettlement: p.debtSettlement ?? undefined,
    settlesPaymentId: p.settlesPaymentId ?? undefined,
    // Pix da quitação só enquanto aguarda pagamento (o QR não serve depois).
    pix: p.kind === 'debt_settlement' && p.status === 'pending' && p.pix ? (p.pix as unknown as PixCharge) : undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  });
}

export function toPaymentCard(c: PaymentCard) {
  return { id: c.id, brand: c.brand, last4: c.last4, expMonth: c.expMonth, expYear: c.expYear, isDefault: c.isDefault, createdAt: c.createdAt.toISOString() };
}

/** Dados extras da assinatura (contrato v2): cartão da recorrência, última cobrança e moto fixa. */
export interface SubscriptionExtras {
  card?: Pick<PaymentCard, 'brand' | 'last4'> | null;
  lastPayment?: Pick<Payment, 'status' | 'createdAt'> | null;
  assignedVehicle?: Record<string, unknown> | null;
}

export function toSubscription(s: Subscription, extras: SubscriptionExtras = {}) {
  const next = nextCharge(s);
  return compact({
    id: s.id,
    planCode: s.planCode as 'weekly' | 'monthly',
    status: s.status,
    cardId: s.cardId ?? undefined,
    priceCents: s.priceCents,
    currentPeriodStart: s.currentPeriodStart.toISOString(),
    currentPeriodEnd: s.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    canceledAt: iso(s.canceledAt),
    nextChargeAt: iso(next.nextChargeAt),
    nextChargeCents: next.nextChargeCents,
    cardBrand: extras.card?.brand,
    cardLast4: extras.card?.last4,
    lastPaymentStatus: extras.lastPayment?.status,
    lastPaymentAt: iso(extras.lastPayment?.createdAt),
    pausedAt: iso(s.pausedAt),
    pauseEndsAt: iso(s.pauseEndsAt),
    maxPauseDays: pausePolicy(s.planCode).maxDaysPerPause,
    pausesRemainingInPeriod: pausesRemaining(s),
    assignedVehicleId: s.assignedVehicleId ?? undefined,
    assignedVehicle: extras.assignedVehicle ?? undefined,
    createdAt: s.createdAt.toISOString(),
  });
}

export function toWalletEntry(e: WalletEntry) {
  return compact({
    id: e.id,
    type: e.type,
    amountCents: e.amountCents,
    minutes: e.minutes ?? undefined,
    balanceAfterCents: e.balanceAfterCents,
    description: e.description,
    rentalId: e.rentalId ?? undefined,
    paymentId: e.paymentId ?? undefined,
    createdById: e.createdById ?? undefined,
    createdAt: e.createdAt.toISOString(),
  });
}

export function toTopUp(t: TopUp) {
  return compact({
    id: t.id,
    status: t.status,
    method: t.method,
    amountCents: t.amountCents,
    packageId: t.packageId ?? undefined,
    minutes: t.minutes ?? undefined,
    pix: (t.pix as PixCharge | null) ?? undefined,
    paymentId: t.paymentId ?? undefined,
    createdAt: t.createdAt.toISOString(),
  });
}

export function toInsurancePolicy(p: InsurancePolicy) {
  return compact({
    id: p.id,
    rentalId: p.rentalId,
    customerId: p.customerId,
    coverage: p.coverage,
    premiumCents: p.premiumCents,
    payoutCents: p.payoutCents ?? undefined,
    status: p.status,
    providerPolicyId: p.providerPolicyId ?? undefined,
    issuedAt: p.issuedAt.toISOString(),
    canceledAt: iso(p.canceledAt),
  });
}
