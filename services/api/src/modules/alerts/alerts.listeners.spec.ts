import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV } from '../../common/events';
import { AlertsListeners, parseCreateAlertInput, parseRawDeviceEvent } from './alerts.listeners';

const VEHICLE = '11111111-1111-4111-8111-111111111111';
const RENTAL = '22222222-2222-4222-8222-222222222222';

function setup() {
  const alerts = { create: jest.fn().mockResolvedValue({}) };
  const prisma = {
    vehicle: { findUnique: jest.fn() },
    rental: { findFirst: jest.fn().mockResolvedValue({ id: RENTAL }) },
  };
  let handler: ((m: unknown) => Promise<void>) | undefined;
  const queue = { subscribe: jest.fn((_q: string, h: (m: unknown) => Promise<void>) => (handler = h)), publish: jest.fn() };
  const events = new EventEmitter2();
  const listeners = new AlertsListeners(alerts as never, prisma as never, queue as never, events);
  // Como no Nest: o listener do evento interno gera o alerta.
  events.on(EV.IOT_DEVICE_EVENT, (ev) => listeners.onDeviceEvent(ev));
  listeners.onModuleInit();
  return { alerts, prisma, queue, events, deliver: (m: unknown) => handler!(m) };
}

describe('AlertsListeners — fila `alertas` tolerante aos dois formatos (lacunas T5)', () => {
  it('CreateAlertInput válido → cria o alerta como veio', async () => {
    const { alerts, deliver } = setup();
    await deliver({ type: 'tamper', priority: 'high', message: 'Violação.', vehicleId: VEHICLE, lat: -23.5, lng: -46.6 });
    expect(alerts.create).toHaveBeenCalledWith({ type: 'tamper', priority: 'high', message: 'Violação.', vehicleId: VEHICLE, lat: -23.5, lng: -46.6 });
  });

  it('evento cru do rastreador ({ thingName, tipo, timestamp }) → normalizado: moto pelo thingName, aluguel aberto e posição', async () => {
    const { alerts, prisma, events, deliver } = setup();
    prisma.vehicle.findUnique.mockImplementation(async (args: { where: { thingName?: string; id?: string } }) =>
      args.where.thingName === 'moto-001' ? { id: VEHICLE } : { lat: -23.55, lng: -46.63 },
    );
    const emitted: unknown[] = [];
    events.on(EV.IOT_DEVICE_EVENT, (ev) => emitted.push(ev));
    await deliver({ thingName: 'moto-001', tipo: 'queda', timestamp: '2026-10-24T12:00:00.000Z' });
    expect(emitted).toEqual([{ thingName: 'moto-001', vehicleId: VEHICLE, type: 'queda', ts: '2026-10-24T12:00:00.000Z' }]);
    expect(alerts.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'fall_detected', priority: 'high', vehicleId: VEHICLE, rentalId: RENTAL, lat: -23.55, lng: -46.63 }),
    );
  });

  it('evento cru de moto desconhecida ou mensagem inválida → descarta com aviso, sem lançar (não vira mensagem envenenada)', async () => {
    const { alerts, prisma, deliver } = setup();
    prisma.vehicle.findUnique.mockResolvedValue(null);
    await expect(deliver({ thingName: 'moto-x', tipo: 'violacao', timestamp: '2026-10-24T12:00:00.000Z' })).resolves.toBeUndefined();
    await expect(deliver({ type: 'nao_existe', priority: 'high', message: 'x' })).resolves.toBeUndefined();
    await expect(deliver('texto')).resolves.toBeUndefined();
    expect(alerts.create).not.toHaveBeenCalled();
  });

  it('parsers: campos inválidos recusados', () => {
    expect(parseCreateAlertInput({ type: 'tamper', priority: 'urgente', message: 'x' })).toBeNull();
    expect(parseCreateAlertInput({ type: 'tamper', priority: 'high', message: 'x', vehicleId: 'nao-uuid' })).toBeNull();
    expect(parseCreateAlertInput({ type: 'tamper', priority: 'high', message: '' })).toBeNull();
    expect(parseRawDeviceEvent({ thingName: 'moto-1', tipo: 'explodiu', timestamp: '2026-10-24T12:00:00Z' })).toBeNull();
    expect(parseRawDeviceEvent({ thing: 'moto-1', tipo: 'bateria_critica', timestamp: '2026-10-24T12:00:00Z' })).toEqual({
      thingName: 'moto-1',
      tipo: 'bateria_critica',
      timestamp: '2026-10-24T12:00:00Z',
    });
  });
});
