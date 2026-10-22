import { assertCustomerEligible } from './eligibility';

/** QA-24: alugar exige o aceite dos termos (na versão vigente, quando `TERMS_CURRENT_VERSION` está definida). */
describe('assertCustomerEligible (termos, QA-24)', () => {
  const billing = { isDelinquent: jest.fn().mockResolvedValue(false) };
  const ok = { kycStatus: 'approved', status: 'active', delinquent: false, locationConsent: true, termsAccepted: true, termsVersion: '2026-10' } as const;
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('termos não aceitos → 403 forbidden', async () => {
    await expect(assertCustomerEligible({ ...ok, termsAccepted: false }, 'c1', billing, { requireLocationConsent: true, requireTerms: true }))
      .rejects.toMatchObject({ status: 403, slug: 'forbidden' });
  });

  it('versão aceita diferente da vigente → 403; igual → ok', async () => {
    process.env.TERMS_CURRENT_VERSION = '2026-11';
    await expect(assertCustomerEligible(ok, 'c1', billing, { requireLocationConsent: true, requireTerms: true })).rejects.toMatchObject({ status: 403 });
    process.env.TERMS_CURRENT_VERSION = '2026-10';
    await expect(assertCustomerEligible(ok, 'c1', billing, { requireLocationConsent: true, requireTerms: true })).resolves.toBeUndefined();
  });

  it('sem versão vigente configurada basta o aceite; reservar não exige', async () => {
    delete process.env.TERMS_CURRENT_VERSION;
    await expect(assertCustomerEligible({ ...ok, termsVersion: '1.0' }, 'c1', billing, { requireLocationConsent: true, requireTerms: true })).resolves.toBeUndefined();
    await expect(assertCustomerEligible({ ...ok, termsAccepted: false }, 'c1', billing, { requireLocationConsent: false })).resolves.toBeUndefined();
  });
});
