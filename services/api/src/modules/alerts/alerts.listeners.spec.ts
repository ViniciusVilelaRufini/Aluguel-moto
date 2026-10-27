import { AlertsListeners, parseCreateAlertInput } from './alerts.listeners';

const VEHICLE = '11111111-1111-4111-8111-111111111111';

function setup() {
  let handler: ((m: unknown) => Promise<void>) | undefined;
  const alerts = { create: jest.fn().mockResolvedValue({}) };
  const prisma = { vehicle: { findUnique: jest.fn() }, rental: { findFirst: jest.fn() } };
  const queue = { publish: jest.fn(), subscribe: jest.fn((_q: string, h: (m: unknown) => Promise<void>) => (handler = h)) };
  const l = new AlertsListeners(alerts as never, prisma as never, queue as never);
  l.onModuleInit();
  return { alerts, prisma, deliver: (m: unknown) => handler!(m) };
}

describe('AlertsListeners (fila alertas)', () => {
  it('cria alerta só a partir de campos conhecidos e válidos', async () => {
    const { alerts, deliver } = setup();
    await deliver({ type: 'tamper', priority: 'high', message: 'x', vehicleId: VEHICLE, lat: 1, lng: 2, status: 'resolved', assigneeId: 'a', id: 'forjado' });
    expect(alerts.create).toHaveBeenCalledWith({ type: 'tamper', priority: 'high', message: 'x', vehicleId: VEHICLE, lat: 1, lng: 2 });
  });

  it('descarta evento cru de dispositivo (identidade do corpo não vale: só a fila de telemetria, pelo tópico) e mensagens inválidas, sem lançar', async () => {
    const { alerts, prisma, deliver } = setup();
    prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE });
    await expect(deliver({ tipo: 'violacao', timestamp: '2026-10-21T15:00:00Z', thingName: 'moto-0001', ingestedAt: 1 })).resolves.toBeUndefined();
    await expect(deliver({ thing: 'moto-0001', tipo: 'queda', timestamp: '2026-10-21T15:00:00Z' })).resolves.toBeUndefined();
    await deliver({ type: 'inexistente', priority: 'high', message: 'x' });
    await deliver({ type: 'tamper', priority: 'urgente', message: 'x' });
    await deliver(null);
    await deliver('texto');
    expect(alerts.create).not.toHaveBeenCalled();
    expect(prisma.vehicle.findUnique).not.toHaveBeenCalled();
  });

  it('parsers: campos inválidos recusados', () => {
    expect(parseCreateAlertInput({ type: 'tamper', priority: 'urgente', message: 'x' })).toBeNull();
    expect(parseCreateAlertInput({ type: 'tamper', priority: 'high', message: 'x', vehicleId: 'nao-uuid' })).toBeNull();
    expect(parseCreateAlertInput({ type: 'tamper', priority: 'high', message: '' })).toBeNull();
    expect(parseCreateAlertInput({ type: 'tamper', priority: 'high', message: 'x', lat: 200 })).toBeNull();
  });
});

describe('zone_speed_exceeded (spec GT06 §10)', () => {
  it('alerta high em zona de 6 km/h e medium em 20, com aluguel e posição da moto', async () => {
    const alerts = { create: jest.fn().mockResolvedValue({}) };
    const prisma = { vehicle: { findUnique: jest.fn().mockResolvedValue({ lat: -23.5, lng: -46.6 }) }, rental: { findFirst: jest.fn() } };
    const l = new AlertsListeners(alerts as never, prisma as never, { publish: jest.fn(), subscribe: jest.fn() } as never);
    await l.onZoneSpeedExceeded({ vehicleId: VEHICLE, rentalId: 'r1', speedLimitKmh: 6, speedKmh: 14.2, ts: '2026-10-27T12:00:06.000Z' });
    await l.onZoneSpeedExceeded({ vehicleId: VEHICLE, speedLimitKmh: 20, speedKmh: 26, ts: '2026-10-27T12:01:00.000Z' });
    expect(alerts.create).toHaveBeenNthCalledWith(1, {
      type: 'zone_speed_exceeded', priority: 'high', message: 'Acima do limite da zona (6 km/h): o rastreador só relé não reduz a velocidade.', vehicleId: VEHICLE, rentalId: 'r1', lat: -23.5, lng: -46.6,
    });
    expect(alerts.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'zone_speed_exceeded', priority: 'medium', rentalId: undefined }));
  });
});
