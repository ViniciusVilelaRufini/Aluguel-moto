import { AlertsListeners } from './alerts.listeners';

function setup() {
  let handler: ((m: any) => Promise<void>) | undefined;
  const alerts = { create: jest.fn() };
  const queue = { publish: jest.fn(), subscribe: jest.fn((_q: string, h: any) => (handler = h)) };
  const l = new AlertsListeners(alerts as any, {} as any, queue as any);
  l.onModuleInit();
  return { alerts, deliver: (m: unknown) => handler!(m) };
}

describe('AlertsListeners (fila alertas)', () => {
  it('cria alerta só a partir de campos conhecidos e válidos', async () => {
    const { alerts, deliver } = setup();
    await deliver({ type: 'tamper', priority: 'high', message: 'x', vehicleId: 'v1', lat: 1, lng: 2, status: 'resolved', assigneeId: 'a', id: 'forjado' });
    expect(alerts.create).toHaveBeenCalledWith({ type: 'tamper', priority: 'high', message: 'x', vehicleId: 'v1', lat: 1, lng: 2 });
  });

  it('descarta evento cru de dispositivo (tipo/timestamp/thingName) e mensagens inválidas', async () => {
    const { alerts, deliver } = setup();
    await deliver({ tipo: 'violacao', timestamp: '2026-10-21T15:00:00Z', thingName: 'moto-0001', ingestedAt: 1 });
    await deliver({ type: 'inexistente', priority: 'high', message: 'x' });
    await deliver({ type: 'tamper', priority: 'urgente', message: 'x' });
    await deliver(null);
    expect(alerts.create).not.toHaveBeenCalled();
  });
});
