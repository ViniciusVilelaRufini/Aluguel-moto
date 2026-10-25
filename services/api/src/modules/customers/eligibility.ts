import type { Customer } from '@prisma/client';
import { conflict, forbidden, notFound } from '../../common/problem';
import type { RentalBillingPort } from '../../ports/rental-billing.port';

type CustomerGateFields = Pick<Customer, 'kycStatus' | 'status' | 'delinquent'> &
  Partial<Pick<Customer, 'locationConsent' | 'termsAccepted' | 'termsVersion'>>;

/** Texto do `409 payment-pending` (reserva com dívida em aberto). */
export const PAYMENT_PENDING_MESSAGE = 'Pague o valor pendente para alugar de novo.';

/**
 * Regras comuns para reservar e alugar (ordem fixa): KYC aprovado → sem bloqueio → sem inadimplência
 * → (só para iniciar o aluguel) consentimento de localização → termos aceitos (QA-24; na versão `TERMS_CURRENT_VERSION`,
 * quando definida). Sem slug próprio no contrato: `403 forbidden` (proposta `terms-not-accepted` em docs/decisoes.md).
 */
export async function assertCustomerEligible(
  customer: CustomerGateFields | null,
  customerId: string,
  billing: Pick<RentalBillingPort, 'isDelinquent'>,
  opts: {
    requireLocationConsent: boolean;
    requireTerms?: boolean;
    /** Reservas (R2-01): inadimplência/dívida em aberto vira `409 payment-pending` com o texto do app, em vez de `403`. */
    debtAsConflict?: boolean;
  },
): Promise<void> {
  if (!customer) throw notFound('Cliente não encontrado.');
  if (customer.kycStatus !== 'approved') {
    throw forbidden('Conclua a verificação de identidade para alugar.', 'kyc-not-approved');
  }
  if (customer.status !== 'active') {
    throw forbidden('Sua conta está bloqueada. Fale com o suporte.', 'customer-blocked');
  }
  if (customer.delinquent || (await billing.isDelinquent(customerId))) {
    if (opts.debtAsConflict) throw conflict('payment-pending', PAYMENT_PENDING_MESSAGE);
    throw forbidden('Há um pagamento pendente. Regularize para alugar.', 'customer-delinquent');
  }
  if (opts.requireLocationConsent && !customer.locationConsent) {
    throw forbidden('Autorize o uso da localização durante o aluguel para continuar.', 'location-consent-required');
  }
  if (opts.requireTerms) {
    const current = process.env.TERMS_CURRENT_VERSION?.trim();
    if (!customer.termsAccepted || (current && customer.termsVersion !== current)) {
      throw forbidden('Aceite os termos de uso vigentes para alugar.', 'forbidden');
    }
  }
}
