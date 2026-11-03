import { assertCustomerEligible } from './eligibility';

/** QA-24: alugar exige o aceite dos termos (na versão vigente, quando `TERMS_CURRENT_VERSION` está definida). */
describe('assertCustomerEligible (termos, QA-24)', () => {
  const billing = { isDelinquent: jest.fn().mockResolvedValue(false), isCpfRestricted: jest.fn().mockResolvedValue(false) };
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

  it('Task 16 (R2-01): dívida em aberto → 409 payment-pending na reserva; no início do aluguel continua 403 customer-delinquent', async () => {
    const owing = { isDelinquent: jest.fn().mockResolvedValue(true), isCpfRestricted: jest.fn().mockResolvedValue(false) };
    await expect(assertCustomerEligible(ok, 'c1', owing, { requireLocationConsent: false, debtAsConflict: true }))
      .rejects.toMatchObject({ status: 409, slug: 'payment-pending', detail: 'Pague o valor pendente para alugar de novo.' });
    await expect(assertCustomerEligible({ ...ok, delinquent: true }, 'c1', billing, { requireLocationConsent: false, debtAsConflict: true }))
      .rejects.toMatchObject({ status: 409, slug: 'payment-pending' });
    await expect(assertCustomerEligible(ok, 'c1', owing, { requireLocationConsent: true })).rejects.toMatchObject({ status: 403, slug: 'customer-delinquent' });
  });

  it('auditoria run-4: CPF na lista de restrição → 403 customer-blocked mesmo com a conta ativa (antes da dívida)', async () => {
    const restricted = { isDelinquent: jest.fn().mockResolvedValue(true), isCpfRestricted: jest.fn().mockResolvedValue(true) };
    await expect(assertCustomerEligible({ ...ok, cpf: '52998224725' }, 'c1', restricted, { requireLocationConsent: false, debtAsConflict: true }))
      .rejects.toMatchObject({ status: 403, slug: 'customer-blocked' });
    expect(restricted.isCpfRestricted).toHaveBeenCalledWith('52998224725');
  });

  it('auditoria run-4: sem CPF (KYC aprovado sem CPF não existe, mas por garantia) não consulta a lista', async () => {
    const deps = { isDelinquent: jest.fn().mockResolvedValue(false), isCpfRestricted: jest.fn().mockResolvedValue(true) };
    await expect(assertCustomerEligible({ ...ok, cpf: null }, 'c1', deps, { requireLocationConsent: false })).resolves.toBeUndefined();
    expect(deps.isCpfRestricted).not.toHaveBeenCalled();
  });
});
