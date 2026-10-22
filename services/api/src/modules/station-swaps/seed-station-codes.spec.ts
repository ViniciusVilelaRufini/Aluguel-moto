import { seedStationCode } from '../../../prisma/seed-station-codes';
import { signStationCode, verifyStationCode } from './station-code';

describe('QR das estações no seed', () => {
  it('o seed assina igual à API (mesmo segredo → mesmo código, verificável)', () => {
    for (const id of ['d0000000-0000-4000-8000-000000000001', 'D0000000-0000-4000-8000-000000000005']) {
      expect(seedStationCode(id, 's')).toBe(signStationCode(id, 's'));
      expect(verifyStationCode(seedStationCode(id, 's'), 's')).toEqual({ stationId: id.toLowerCase() });
    }
  });
});
