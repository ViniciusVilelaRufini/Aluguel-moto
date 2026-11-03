import { ReferralsService } from './referrals.service';
import { newMoneyCents } from './referral-rules';

/** Auditoria run-4: a corrida que qualifica o bônus de quem indicou conta só dinheiro novo (sem carteira e sem estornos). */
describe('ReferralsService.onPaymentUpdated — dinheiro novo', () => {
  const MIN = 1000;
  const setup = (pay: { amountCents: number; walletCents: number; refundedCents: number }) => {
    const prisma = {
      payment: { findUnique: jest.fn().mockResolvedValue({ kind: 'rental', customerId: 'c1', status: 'paid', ...pay }) },
      customer: { findUnique: jest.fn().mockResolvedValue({ status: 'active' }) },
    };
    const svc = new ReferralsService(prisma as any, {} as any, { referralMinRentalCents: MIN } as any);
    const grant = jest.spyOn(svc, 'grantReferrer').mockResolvedValue(true);
    return { svc, grant };
  };

  it('corrida paga inteira com a carteira (amount 1500, wallet 1500) não concede o bônus', async () => {
    const { svc, grant } = setup({ amountCents: 1500, walletCents: 1500, refundedCents: 0 });
    await svc.onPaymentUpdated({ paymentId: 'p1', status: 'paid' } as any);
    expect(grant).not.toHaveBeenCalled();
  });

  it('parte na carteira: só o restante conta (1500 − 600 = 900 < 1000 → não concede)', async () => {
    const { svc, grant } = setup({ amountCents: 1500, walletCents: 600, refundedCents: 0 });
    await svc.onPaymentUpdated({ paymentId: 'p1', status: 'paid' } as any);
    expect(grant).not.toHaveBeenCalled();
  });

  it('dinheiro novo acima do mínimo (1500 − 200 − 100 = 1200) concede', async () => {
    const { svc, grant } = setup({ amountCents: 1500, walletCents: 200, refundedCents: 100 });
    await svc.onPaymentUpdated({ paymentId: 'p1', status: 'paid' } as any);
    expect(grant).toHaveBeenCalledWith('c1');
  });

  it('newMoneyCents nunca é negativo (estorno que já devolveu parte da carteira)', () => {
    expect(newMoneyCents({ amountCents: 2000, walletCents: 500, refundedCents: 1800 })).toBe(0);
    expect(newMoneyCents({ amountCents: 2000, walletCents: 0, refundedCents: 0 })).toBe(2000);
  });
});
