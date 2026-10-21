import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { INSURANCE_COVERAGES, type InsuranceCoverage, type PlanCode } from '../../common/enums';
import { ProblemException } from '../../common/problem';
import type { InsurancePort } from '../../ports/insurance.port';
import { PrismaService } from '../../prisma/prisma.service';
import { INSURANCE_PROVIDER, type InsuranceProvider } from './insurance-provider';

/** Prêmios do seed (fallback se a configuração sumir). `basic` é obrigatório. */
export const SEED_PREMIUMS: Record<InsuranceCoverage, number> = { basic: 200, full: 600 };

const insuranceRequired = () =>
  new ProblemException(422, 'insurance-required', 'Escolha uma cobertura de seguro. A cobertura básica é obrigatória.');

/**
 * `InsurancePort` sobre o `InsuranceProvider` (Task 5). Cobertura `basic` obrigatória (nunca desativada); `full` opcional
 * e configurável (`InsuranceCoverageConfig`). O prêmio volta para o aluguel, que o soma ao valor; o repasse
 * à seguradora é registrado na liquidação (`registerRemittance`).
 */
@Injectable()
export class InsuranceService implements InsurancePort {
  private readonly logger = new Logger('InsuranceService');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(INSURANCE_PROVIDER) private readonly provider: InsuranceProvider,
  ) {}

  private async premiumFor(coverage: InsuranceCoverage | undefined | null): Promise<number> {
    if (!coverage || !(INSURANCE_COVERAGES as string[]).includes(coverage)) throw insuranceRequired();
    const cfg = await this.prisma.insuranceCoverageConfig.findUnique({ where: { coverage } });
    if (coverage === 'basic') return cfg?.premiumCents ?? SEED_PREMIUMS.basic;
    if (!cfg || !cfg.active) throw insuranceRequired();
    return cfg.premiumCents;
  }

  async quote(input: { coverage: InsuranceCoverage; planCode: PlanCode }): Promise<{ premiumCents: number }> {
    const base = await this.premiumFor(input.coverage);
    return this.provider.quote({ coverage: input.coverage, planCode: input.planCode, basePremiumCents: base });
  }

  async issueForRental(input: { rentalId: string; customerId: string; coverage: InsuranceCoverage }) {
    const premiumCents = await this.premiumFor(input.coverage);
    const { providerPolicyId } = await this.provider.issuePolicy({ scope: 'rental', rentalId: input.rentalId, customerId: input.customerId, coverage: input.coverage, premiumCents });
    const policy = await this.prisma.insurancePolicy.create({
      data: { rentalId: input.rentalId, customerId: input.customerId, coverage: input.coverage, premiumCents, providerPolicyId },
    });
    this.logger.log({ msg: 'insurance_policy_issued', policyId: policy.id, coverage: input.coverage });
    return { policyId: policy.id, premiumCents };
  }

  async cancel(policyId: string): Promise<void> {
    const policy = await this.prisma.insurancePolicy.findUnique({ where: { id: policyId } });
    if (!policy || policy.status !== 'active') return;
    if (policy.providerPolicyId) await this.provider.cancelPolicy({ providerPolicyId: policy.providerPolicyId });
    await this.prisma.insurancePolicy.updateMany({ where: { id: policyId, status: 'active' }, data: { status: 'canceled', canceledAt: new Date() } });
  }

  /** Repasse do prêmio à seguradora depois que o aluguel foi pago (um por apólice). */
  async registerRemittance(policyId: string): Promise<void> {
    const policy = await this.prisma.insurancePolicy.findUnique({ where: { id: policyId } });
    if (!policy || policy.status !== 'active') return;
    if (await this.prisma.insuranceRemittance.findUnique({ where: { policyId } })) return;
    try {
      await this.prisma.insuranceRemittance.create({
        data: { policyId, rentalId: policy.rentalId, insurer: this.provider.name, amountCents: policy.premiumCents, status: 'pending' },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return;
      throw err;
    }
    await this.prisma.insurancePolicy.update({ where: { id: policyId }, data: { payoutCents: policy.premiumCents } });
    try {
      await this.provider.remit({ providerPolicyId: policy.providerPolicyId ?? policyId, amountCents: policy.premiumCents });
      await this.prisma.insuranceRemittance.update({ where: { policyId }, data: { status: 'sent' } });
    } catch (err) {
      this.logger.warn({ msg: 'insurance_remit_failed', policyId, error: (err as Error).message });
    }
  }

  async openClaim(input: { policyId: string; type: string; description: string; occurredAt: string }) {
    const policy = await this.prisma.insurancePolicy.findUnique({ where: { id: input.policyId } });
    if (!policy?.providerPolicyId) throw new ProblemException(404, 'not-found', 'Apólice não encontrada.');
    return this.provider.openClaim({ providerPolicyId: policy.providerPolicyId, type: input.type, description: input.description, occurredAt: input.occurredAt });
  }
}
