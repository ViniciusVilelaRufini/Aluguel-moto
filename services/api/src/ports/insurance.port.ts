// services/api/src/ports/insurance.port.ts
import type { InsuranceCoverage, PlanCode } from '../common/enums';

export const INSURANCE = Symbol('INSURANCE');

export interface InsurancePort {
  quote(input: { coverage: InsuranceCoverage; planCode: PlanCode }): Promise<{ premiumCents: number }>;
  issueForRental(input: { rentalId: string; customerId: string; coverage: InsuranceCoverage })
    : Promise<{ policyId: string; premiumCents: number }>;
  cancel(policyId: string): Promise<void>;
}
