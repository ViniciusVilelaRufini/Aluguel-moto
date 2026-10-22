import { toDepot, toDepotPickup } from './depots.mapper';

const DEPOT_ID = '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c';
const created = new Date('2026-10-22T13:00:00Z');

const depot = {
  id: DEPOT_ID,
  name: 'Galpão Volti Pinheiros',
  address: 'R. Fradique Coutinho, 1500',
  district: null,
  lat: -23.56,
  lng: -46.69,
  timezone: 'America/Sao_Paulo',
  openingHours: [{ weekday: 1, opensAt: '08:00', closesAt: '20:00' }],
  pickupNowWindowMinutes: 120,
  maxScheduleDays: 7,
  scheduledGraceMinutes: 30,
  swapStationId: null,
  active: true,
  createdAt: created,
  updatedAt: created,
};

const reservation = {
  id: '55555555-5555-4555-8555-555555555555',
  customerId: '11111111-1111-4111-8111-111111111111',
  vehicleId: '33333333-3333-4333-8333-333333333333',
  status: 'active',
  depositId: null,
  expiresAt: new Date('2026-10-22T15:00:00Z'),
  endedAt: null,
  depotId: DEPOT_ID,
  pickupMode: 'now',
  pickupAt: null,
  planCode: 'day',
  coverage: 'basic',
  depositMethod: 'card',
  cardId: '66666666-6666-4666-8666-666666666666',
  couponCode: 'BEMVINDO',
  reminderSentAt: null,
  createdAt: created,
  updatedAt: created,
  customer: { name: 'Ana Maria Souza' },
  vehicle: { id: '33333333-3333-4333-8333-333333333333', code: 'VLT-0001', model: 'Volti S1', status: 'reserved', lat: -23.56, lng: -46.69, batteryPct: 90 },
  handovers: [{ id: '77777777-7777-4777-8777-777777777777' }],
};

describe('depots.mapper', () => {
  it('toDepot: datas ISO, sem nulos, contagem e distância arredondada', () => {
    const d = toDepot(depot as any, { availableVehicleCount: 3, distanceM: 1234.6 });
    expect(d).toMatchObject({ id: DEPOT_ID, availableVehicleCount: 3, distanceM: 1235, createdAt: '2026-10-22T13:00:00.000Z', active: true });
    expect(d).not.toHaveProperty('district');
    expect(d).not.toHaveProperty('swapStationId');
    expect(toDepot(depot as any, { availableVehicleCount: 0 })).not.toHaveProperty('distanceM');
  });

  it('toDepotPickup: só o primeiro nome do cliente e nunca pickupCode', () => {
    const item = toDepotPickup({ ...reservation, pickupCode: 'v1.segredo', customer: { name: 'Ana Maria Souza', email: 'ana@example.com', cpf: '12345678900' } } as any);
    expect(item).toMatchObject({ customerFirstName: 'Ana', depotId: DEPOT_ID, pickupMode: 'now', handoverId: '77777777-7777-4777-8777-777777777777', expiresAt: '2026-10-22T15:00:00.000Z' });
    expect(item.vehicle).toMatchObject({ code: 'VLT-0001' });
    expect(item).not.toHaveProperty('pickupCode');
    const json = JSON.stringify(item);
    for (const leaked of ['pickupCode', 'v1.segredo', 'Maria', 'Souza', 'ana@example.com', '12345678900', 'customerId', 'cardId', 'couponCode']) expect(json).not.toContain(leaked);
  });

  it('toDepotPickup: cliente sem nome não leva customerFirstName', () => {
    expect(toDepotPickup({ ...reservation, customer: { name: null }, handovers: [] } as any)).not.toHaveProperty('customerFirstName');
  });
});
