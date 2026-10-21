import type { Customer } from '@prisma/client';
import { compact, iso, maskCpf } from '../../common/util';

export interface CustomerStats {
  rentalsCount: number;
  totalSpentCents: number;
  openDisputes: number;
  lastRentalAt?: string;
}

/** Prisma → `Customer`. CPF completo só para admin (ou o próprio titular). */
export function toCustomer(c: Customer, opts: { fullCpf: boolean; restricted?: boolean; stats?: CustomerStats }) {
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
    stats: opts.stats,
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
