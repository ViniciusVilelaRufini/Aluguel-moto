import type { Customer } from '@prisma/client';
import { maskPixKey } from '../../common/pix-key';
import { compact, iso, maskCpf } from '../../common/util';

export interface CustomerStats {
  rentalsCount: number;
  totalSpentCents: number;
  openDisputes: number;
  lastRentalAt?: string;
}

/** Assinatura semanal/mensal aberta (ativa ou pausada), para `activePlanCode`/`activeSubscriptionId`. */
export interface ActiveSubscriptionRef {
  id: string;
  planCode: string;
}

/**
 * Prisma → `Customer`. CPF completo só para admin (ou o próprio titular). Chave Pix de estorno completa para o titular,
 * `admin` e `financeiro` (`fullPixKey`, padrão = `fullCpf`); mascarada para os demais.
 */
export function toCustomer(
  c: Customer,
  opts: {
    fullCpf: boolean;
    restricted?: boolean;
    stats?: CustomerStats;
    fullPixKey?: boolean;
    activeSubscription?: ActiveSubscriptionRef | null;
    /** Task 14: só `admin`/`financeiro`, no detalhe. */
    money?: { walletBalanceCents: number; debtCents: number };
  },
) {
  const pixFull = opts.fullPixKey ?? opts.fullCpf;
  return compact({
    id: c.id,
    name: c.name ?? undefined,
    email: c.email,
    phone: c.phone ?? undefined,
    cpf: maskCpf(c.cpf, opts.fullCpf),
    birthDate: c.birthDate ? c.birthDate.toISOString().slice(0, 10) : undefined,
    kycStatus: c.kycStatus,
    status: c.status,
    delinquent: c.delinquent,
    restricted: opts.restricted ?? false,
    blockedReason: c.blockedReason ?? undefined,
    blockedAt: iso(c.blockedAt),
    locationConsent: c.locationConsent,
    emergencyContactName: c.emergencyContactName ?? undefined,
    emergencyContactPhone: c.emergencyContactPhone ?? undefined,
    pixRefundKeyType: c.pixRefundKey ? (c.pixRefundKeyType ?? undefined) : undefined,
    pixRefundKey: c.pixRefundKey && c.pixRefundKeyType ? (pixFull ? c.pixRefundKey : maskPixKey(c.pixRefundKeyType, c.pixRefundKey)) : undefined,
    activePlanCode: opts.activeSubscription ? (opts.activeSubscription.planCode as 'weekly' | 'monthly') : undefined,
    activeSubscriptionId: opts.activeSubscription?.id,
    stats: opts.stats,
    walletBalanceCents: opts.money?.walletBalanceCents,
    debtCents: opts.money?.debtCents,
    createdAt: c.createdAt.toISOString(),
  });
}

export function toConsents(c: Customer) {
  return compact({
    termsVersion: c.termsVersion ?? undefined,
    termsAccepted: c.termsAccepted,
    termsAcceptedAt: iso(c.termsAcceptedAt),
    locationTracking: c.locationConsent,
    locationTrackingUpdatedAt: iso(c.locationConsentUpdatedAt),
    marketing: c.marketingConsent,
    updatedAt: iso(c.consentsUpdatedAt),
  });
}
