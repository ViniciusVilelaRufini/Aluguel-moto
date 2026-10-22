import { ProblemException } from '../../common/problem';
import { assertReferralEligible, customerCouponStatus, firstName, makeReferralCode, normalizeReferralCode } from './referral-rules';

describe('regras de indicação e cupons da conta', () => {
  it('código: letras do primeiro nome sem acento + 4 caracteres sem ambíguos', () => {
    const seq = [0, 0.5, 0.99, 0.1];
    let i = 0;
    const code = makeReferralCode('Márcia Souza', () => seq[i++ % seq.length]);
    expect(code).toMatch(/^MARCI[2-9A-HJKMNP-Z]{4}$/);
    expect(makeReferralCode(undefined, () => 0)).toBe('VOLTI2222');
    expect(makeReferralCode('  ', () => 0)).toBe('VOLTI2222');
    for (let n = 0; n < 200; n++) expect(makeReferralCode('Ana')).toMatch(/^ANA[^01IOL]{4}$/);
    expect(normalizeReferralCode(' ana7k2q ')).toBe('ANA7K2Q');
    expect(firstName('Ana Paula Lima')).toBe('Ana');
    expect(firstName(null)).toBe('Amigo');
  });

  const base = { refereeId: 'b', referrerId: 'a', kycApproved: true, rentalsCount: 0, alreadyReferred: false };
  const slug = (over: Partial<typeof base>) => {
    try {
      assertReferralEligible({ ...base, ...over });
      return 'ok';
    } catch (e) {
      return `${(e as ProblemException).getStatus()} ${(e as ProblemException).slug}`;
    }
  };

  it('elegibilidade: próprio código, já indicado, com corrida ou sem KYC → 422 referral-not-eligible', () => {
    expect(slug({})).toBe('ok');
    expect(slug({ referrerId: 'b' })).toBe('422 referral-not-eligible');
    expect(slug({ alreadyReferred: true })).toBe('422 referral-not-eligible');
    expect(slug({ rentalsCount: 1 })).toBe('422 referral-not-eligible');
    expect(slug({ kycApproved: false })).toBe('422 referral-not-eligible');
  });

  it('situação do cupom salvo: available, used (limite por cliente) e expired', () => {
    const now = new Date('2026-10-22T12:00:00Z');
    const c = { active: true, validUntil: null, maxRedemptions: null, redemptions: 0, maxRedemptionsPerCustomer: 3 };
    expect(customerCouponStatus(c, 1, now)).toEqual({ status: 'available', usesRemaining: 2 });
    expect(customerCouponStatus(c, 3, now)).toEqual({ status: 'used', usesRemaining: 0 });
    expect(customerCouponStatus({ ...c, maxRedemptionsPerCustomer: null }, 9, now)).toEqual({ status: 'available', usesRemaining: undefined });
    expect(customerCouponStatus({ ...c, validUntil: new Date('2026-10-01T00:00:00Z') }, 0, now).status).toBe('expired');
    expect(customerCouponStatus({ ...c, active: false }, 0, now).status).toBe('expired');
    expect(customerCouponStatus({ ...c, maxRedemptions: 10, redemptions: 10 }, 0, now).status).toBe('expired');
  });
});
