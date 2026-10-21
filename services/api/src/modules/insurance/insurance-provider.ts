import { randomUUID } from 'node:crypto';
import type { InsuranceCoverage, PlanCode } from '../../common/enums';

/**
 * Parceiro de seguro (seguradora registrada na SUSEP; a Volti só intermedia via API).
 * Implementação: `MockInsuranceProvider` (`INSURANCE_PROVIDER=mock`).
 */
export const INSURANCE_PROVIDER = Symbol('INSURANCE_PROVIDER');

export type PolicyScope =
  | { scope: 'rental'; rentalId: string; customerId: string; coverage: InsuranceCoverage; premiumCents: number }
  | { scope: 'period'; customerId: string; coverage: InsuranceCoverage; premiumCents: number; periodStart: string; periodEnd: string };

export interface InsuranceProvider {
  readonly name: string;
  quote(input: { coverage: InsuranceCoverage; planCode: PlanCode; basePremiumCents: number }): Promise<{ premiumCents: number }>;
  /** Apólice por aluguel ou por período (planos semanal/mensal). */
  issuePolicy(input: PolicyScope): Promise<{ providerPolicyId: string }>;
  cancelPolicy(input: { providerPolicyId: string }): Promise<void>;
  openClaim(input: { providerPolicyId: string; type: string; description: string; occurredAt: string }): Promise<{ providerClaimId: string }>;
  /** Repasse do prêmio arrecadado à seguradora. */
  remit(input: { providerPolicyId: string; amountCents: number }): Promise<{ remittanceId: string }>;
}

/** Mock determinístico: aceita tudo, usa o prêmio configurado e registra as chamadas (para testes). */
export class MockInsuranceProvider implements InsuranceProvider {
  readonly name = 'mock';
  readonly issued: PolicyScope[] = [];
  readonly canceled: string[] = [];
  readonly remitted: Array<{ providerPolicyId: string; amountCents: number }> = [];

  async quote(input: { basePremiumCents: number }) {
    return { premiumCents: input.basePremiumCents };
  }

  async issuePolicy(input: PolicyScope) {
    this.issued.push(input);
    return { providerPolicyId: `mock-pol-${randomUUID()}` };
  }

  async cancelPolicy(input: { providerPolicyId: string }) {
    this.canceled.push(input.providerPolicyId);
  }

  async openClaim(_input: { providerPolicyId: string; type: string; description: string; occurredAt: string }) {
    return { providerClaimId: `mock-claim-${randomUUID()}` };
  }

  async remit(input: { providerPolicyId: string; amountCents: number }) {
    this.remitted.push(input);
    return { remittanceId: `mock-rem-${randomUUID()}` };
  }
}
