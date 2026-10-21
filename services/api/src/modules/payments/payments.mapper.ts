import type { InsurancePolicy, Payment, PaymentCard, Subscription, TopUp, WalletEntry } from '@prisma/client';
import { compact, iso } from '../../common/util';
import type { PixCharge } from '../../ports/rental-billing.port';

export function toPayment(p: Payment) {
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
    receiptUrl: p.receiptUrl ?? undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  });
}

export function toPaymentCard(c: PaymentCard) {
  return { id: c.id, brand: c.brand, last4: c.last4, expMonth: c.expMonth, expYear: c.expYear, isDefault: c.isDefault, createdAt: c.createdAt.toISOString() };
}

export function toSubscription(s: Subscription) {
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
