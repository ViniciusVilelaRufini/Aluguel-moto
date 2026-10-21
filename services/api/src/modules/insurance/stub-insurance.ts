import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { InsuranceCoverage, PlanCode } from '../../common/enums';
import type { InsurancePort } from '../../ports/insurance.port';
import { PrismaService } from '../../prisma/prisma.service';

/** Prêmios da tabela do seed (por aluguel). */
export const SEED_PREMIUMS: Record<InsuranceCoverage, number> = { basic: 200, full: 600 };

/**
 * Stub da Task 3 (substituído pela Task 5 por `InsuranceService`): usa os prêmios configurados
 * (`InsuranceCoverageConfig`, seed: basic 200 / full 600) e grava a `InsurancePolicy`.
 */
@Injectable()
export class StubInsurance implements InsurancePort {
  constructor(private readonly prisma: PrismaService) {}

  private async premium(coverage: InsuranceCoverage): Promise<number> {
    const cfg = await this.prisma.insuranceCoverageConfig.findUnique({ where: { coverage } });
    return cfg?.active ? cfg.premiumCents : SEED_PREMIUMS[coverage];
  }

  async quote(input: { coverage: InsuranceCoverage; planCode: PlanCode }): Promise<{ premiumCents: number }> {
    return { premiumCents: await this.premium(input.coverage) };
  }

  async issueForRental(input: { rentalId: string; customerId: string; coverage: InsuranceCoverage }) {
    const premiumCents = await this.premium(input.coverage);
    const policy = await this.prisma.insurancePolicy.create({
      data: { rentalId: input.rentalId, customerId: input.customerId, coverage: input.coverage, premiumCents, providerPolicyId: `stub-${randomUUID()}` },
    });
    return { policyId: policy.id, premiumCents };
  }

  async cancel(policyId: string): Promise<void> {
    await this.prisma.insurancePolicy.updateMany({ where: { id: policyId, status: 'active' }, data: { status: 'canceled', canceledAt: new Date() } });
  }
}
