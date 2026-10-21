import type { Customer } from '@prisma/client';
import { forbidden, notFound } from '../../common/problem';
import type { RentalBillingPort } from '../../ports/rental-billing.port';

type CustomerGateFields = Pick<Customer, 'kycStatus' | 'status' | 'delinquent'> & Partial<Pick<Customer, 'locationConsent'>>;

/**
 * Regras comuns para reservar e alugar (ordem fixa): KYC aprovado → sem bloqueio → sem inadimplência
 * → (só para iniciar o aluguel) consentimento de localização.
 */
export async function assertCustomerEligible(
  customer: CustomerGateFields | null,
  customerId: string,
  billing: Pick<RentalBillingPort, 'isDelinquent'>,
  opts: { requireLocationConsent: boolean },
): Promise<void> {
  if (!customer) throw notFound('Cliente não encontrado.');
  if (customer.kycStatus !== 'approved') {
    throw forbidden('Conclua a verificação de identidade para alugar.', 'kyc-not-approved');
  }
  if (customer.status !== 'active') {
    throw forbidden('Sua conta está bloqueada. Fale com o suporte.', 'customer-blocked');
  }
  if (customer.delinquent || (await billing.isDelinquent(customerId))) {
    throw forbidden('Há um pagamento pendente. Regularize para alugar.', 'customer-delinquent');
  }
  if (opts.requireLocationConsent && !customer.locationConsent) {
    throw forbidden('Autorize o uso da localização durante o aluguel para continuar.', 'location-consent-required');
  }
}
