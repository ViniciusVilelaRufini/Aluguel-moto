import { toHandover } from './handovers.mapper';

const now = new Date('2026-11-04T12:00:00Z');
const row = {
  id: 'h1', type: 'pickup', status: 'pending_customer', depotId: 'd1', reservationId: null, rentalId: null, vehicleId: 'v1', operatorId: 'o1', checklist: [],
  photoKeys: ['handovers/a.jpg'], contractPhotoKeys: ['contracts/x.jpg'], batteryPct: 90, batterySerial: null, disputeReason: null, lastError: null,
  respondedAt: null, createdAt: now, updatedAt: now,
} as any;

describe('toHandover — fotos do contrato', () => {
  it('só staff vê contractPhotoKeys', () => {
    expect(toHandover(row, { staff: true }).contractPhotoKeys).toEqual(['contracts/x.jpg']);
    expect(toHandover(row)).not.toHaveProperty('contractPhotoKeys');
  });

  it('staff sem fotos de contrato não recebe o campo', () => {
    expect(toHandover({ ...row, contractPhotoKeys: [] }, { staff: true })).not.toHaveProperty('contractPhotoKeys');
  });
});
