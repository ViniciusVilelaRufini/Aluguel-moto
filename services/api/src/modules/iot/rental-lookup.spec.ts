import { PrismaRentalLookup } from './adapters';
import { FakeClock } from './clock';

/** QA-09: o trajeto só é gravado com consentimento de localização vigente do titular do aluguel. */
describe('PrismaRentalLookup (QA-09)', () => {
  const rental = (locationConsent: boolean) => ({ id: 'r1', customer: { locationConsent } });

  it('aluguel aberto com consentimento → trackingRentalId; revogado → aluguel continua, trajeto não', async () => {
    const prisma = { rental: { findFirst: jest.fn().mockResolvedValueOnce(rental(true)).mockResolvedValueOnce(rental(false)) } };
    const lookup = new PrismaRentalLookup(prisma as any, new FakeClock(0));
    expect(await lookup.trackingRentalId('v1')).toBe('r1');
    lookup.invalidate('v1');
    expect(await lookup.openRentalId('v1')).toBe('r1');
    expect(await lookup.trackingRentalId('v1')).toBeUndefined();
  });
});
