import jestOpenAPI from 'jest-openapi';
import { loadSpecAs30 } from '../test/contract/openapi-30';
import { STATION_SWAP_STATUSES } from './modules/station-swaps/station-swaps.dto';
import { toStationSwap } from './modules/station-swaps/station-swaps.mapper';

jestOpenAPI(loadSpecAs30() as any);

/** Troca de bateria na estação via QR (2026-10-22): schemas aditivos e mapeador conforme o contrato. */
describe('contrato da troca de bateria na estação', () => {
  const c = loadSpecAs30() as any;
  const s = c.components.schemas;
  const now = new Date('2026-10-22T15:00:00Z');
  const base = {
    id: '5b0e7c1a-1111-4111-8111-111111111111', stationId: 'd0000000-0000-4000-8000-000000000001', rentalId: '88888888-8888-4888-8888-888888888888',
    customerId: '11111111-1111-4111-8111-111111111111', vehicleId: '33333333-3333-4333-8333-333333333333', status: 'opening_slot', endReason: null,
    slotNumber: null, feeCents: 500, distanceM: 12, returnedSerial: null, returnedPct: null, releasedSerial: null, expiresAt: now,
    idempotencyKey: 'k', completedAt: null, createdAt: now, updatedAt: now,
  } as any;

  it('StationSwapStatus tem exatamente os status do Prisma/DTO', () => {
    expect(s.StationSwapStatus.enum).toEqual([...STATION_SWAP_STATUSES]);
  });

  it('mapeador: cliente (sem distância nem customerId) e staff, inclusive troca concluída', () => {
    const client = toStationSwap(base, { staff: false });
    expect(client).toSatisfySchemaInApiSpec('StationSwap');
    expect(client).not.toHaveProperty('distanceM');
    expect(client).not.toHaveProperty('customerId');
    const done = toStationSwap({ ...base, status: 'completed', slotNumber: 3, returnedSerial: 'BAT-00001', returnedPct: 12, releasedSerial: 'BT-S1001', completedAt: now }, { staff: true });
    expect(done).toSatisfySchemaInApiSpec('StationSwap');
    expect(done).toEqual(expect.objectContaining({ distanceM: 12, customerId: base.customerId, releasedSerial: 'BT-S1001' }));
    expect(toStationSwap({ ...base, status: 'canceled', endReason: 'return_timeout' }, { staff: false })).toSatisfySchemaInApiSpec('StationSwap');
  });

  it('o QR da estação nunca sai em SwapStation', () => {
    expect(Object.keys(s.SwapStation.properties)).not.toContain('stationCode');
  });
});
