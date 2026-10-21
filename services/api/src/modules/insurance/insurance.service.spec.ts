import { ProblemException } from '../../common/problem';
import { createInMemoryPrisma, type InMemoryPrisma } from '../payments/testing/in-memory-prisma';
import { MockInsuranceProvider } from './insurance-provider';
import { InsuranceService } from './insurance.service';

const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const RENTAL = '88888888-8888-4888-8888-888888888888';

describe('InsuranceService (InsurancePort)', () => {
  let db: InMemoryPrisma;
  let provider: MockInsuranceProvider;
  let svc: InsuranceService;

  beforeEach(async () => {
    db = createInMemoryPrisma();
    await db.insuranceCoverageConfig.create({ data: { coverage: 'basic', name: 'Básico', description: 'Terceiros', premiumCents: 200, mandatory: true } });
    await db.insuranceCoverageConfig.create({ data: { coverage: 'full', name: 'Completo', description: 'Tudo', premiumCents: 600 } });
    provider = new MockInsuranceProvider();
    svc = new InsuranceService(db as any, provider);
  });

  it('cota pelos prêmios configurados (basic 200, full 600)', async () => {
    expect(await svc.quote({ coverage: 'basic', planCode: 'minute' })).toEqual({ premiumCents: 200 });
    expect(await svc.quote({ coverage: 'full', planCode: 'day' })).toEqual({ premiumCents: 600 });
  });

  it('emite a apólice no parceiro e grava InsurancePolicy com o prêmio', async () => {
    const r = await svc.issueForRental({ rentalId: RENTAL, customerId: CUSTOMER, coverage: 'basic' });
    expect(r.premiumCents).toBe(200);
    const policy = await db.insurancePolicy.findUnique({ where: { id: r.policyId } });
    expect(policy).toMatchObject({ rentalId: RENTAL, customerId: CUSTOMER, coverage: 'basic', premiumCents: 200, status: 'active' });
    expect(policy.providerPolicyId).toMatch(/^mock-pol-/);
  });

  it.each([undefined, null, '', 'none', 'premium'])('aluguel sem cobertura válida (%p) → 422 insurance-required, sem emitir', async (coverage) => {
    const err = await svc.issueForRental({ rentalId: RENTAL, customerId: CUSTOMER, coverage: coverage as any }).catch((e) => e);
    expect(err).toBeInstanceOf(ProblemException);
    expect(err.getStatus()).toBe(422);
    expect(err.slug).toBe('insurance-required');
    expect(await db.insurancePolicy.count()).toBe(0);
    expect(provider.issued).toHaveLength(0);
  });

  it('cobertura opcional desativada → 422; basic é sempre aceita (obrigatória)', async () => {
    await db.insuranceCoverageConfig.update({ where: { coverage: 'full' }, data: { active: false } });
    await db.insuranceCoverageConfig.update({ where: { coverage: 'basic' }, data: { active: false } });
    await expect(svc.issueForRental({ rentalId: RENTAL, customerId: CUSTOMER, coverage: 'full' })).rejects.toMatchObject({ slug: 'insurance-required' });
    await expect(svc.issueForRental({ rentalId: RENTAL, customerId: CUSTOMER, coverage: 'basic' })).resolves.toMatchObject({ premiumCents: 200 });
  });

  it('cancel cancela no parceiro e marca canceled (idempotente)', async () => {
    const r = await svc.issueForRental({ rentalId: RENTAL, customerId: CUSTOMER, coverage: 'full' });
    await svc.cancel(r.policyId);
    await svc.cancel(r.policyId);
    expect((await db.insurancePolicy.findUnique({ where: { id: r.policyId } })).status).toBe('canceled');
    expect(provider.canceled).toHaveLength(1);
  });

  it('repasse: registrado uma vez por apólice, com o prêmio, e payoutCents na apólice', async () => {
    const r = await svc.issueForRental({ rentalId: RENTAL, customerId: CUSTOMER, coverage: 'full' });
    await svc.registerRemittance(r.policyId);
    await svc.registerRemittance(r.policyId);
    const rem = await db.insuranceRemittance.findMany({ where: { policyId: r.policyId } });
    expect(rem).toHaveLength(1);
    expect(rem[0]).toMatchObject({ amountCents: 600, insurer: 'mock', status: 'sent', rentalId: RENTAL });
    expect((await db.insurancePolicy.findUnique({ where: { id: r.policyId } })).payoutCents).toBe(600);
    expect(provider.remitted).toHaveLength(1);
  });

  it('apólice cancelada não gera repasse', async () => {
    const r = await svc.issueForRental({ rentalId: RENTAL, customerId: CUSTOMER, coverage: 'basic' });
    await svc.cancel(r.policyId);
    await svc.registerRemittance(r.policyId);
    expect(await db.insuranceRemittance.count()).toBe(0);
  });

  it('abre sinistro no parceiro', async () => {
    const r = await svc.issueForRental({ rentalId: RENTAL, customerId: CUSTOMER, coverage: 'full' });
    const claim = await svc.openClaim({ policyId: r.policyId, type: 'accident', description: 'Queda', occurredAt: new Date().toISOString() });
    expect(claim.providerClaimId).toMatch(/^mock-claim-/);
  });

  it('MockInsuranceProvider emite apólice por período (planos semanal/mensal)', async () => {
    const p = await provider.issuePolicy({ scope: 'period', customerId: CUSTOMER, coverage: 'basic', premiumCents: 200, periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 7 * 86400000).toISOString() });
    expect(p.providerPolicyId).toMatch(/^mock-pol-/);
  });
});
