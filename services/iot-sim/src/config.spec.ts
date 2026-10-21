import { loadConfig, thingNameOf } from './config';

describe('config do simulador', () => {
  it('padrões: 50 motos a partir de moto-0001', () => {
    const c = loadConfig({});
    expect(c.vehicles).toBe(50);
    expect(c.firstVehicle).toBe(1);
    expect(c.mqttUrl).toBe('mqtt://localhost:1883');
    expect(c.telemetryRidingMs).toBe(5000);
    expect(c.telemetryParkedMs).toBe(60000);
    expect(thingNameOf(1)).toBe('moto-0001');
    expect(thingNameOf(60)).toBe('moto-0060');
  });

  it('SIM_EVENTS: taxa por moto por hora; tipos desconhecidos são rejeitados', () => {
    const c = loadConfig({ SIM_EVENTS: 'queda=0.5, violacao=0.1' });
    expect(c.eventRates).toEqual({ queda: 0.5, violacao: 0.1 });
    expect(() => loadConfig({ SIM_EVENTS: 'explosao=1' })).toThrow(/explosao/);
  });

  it('SIM_INJECT: eventos programados por moto', () => {
    const c = loadConfig({ SIM_INJECT: 'moto-0003:queda@30,moto-0007:movimento_sem_aluguel@90' });
    expect(c.injections).toEqual([
      { thingName: 'moto-0003', type: 'queda', atSec: 30 },
      { thingName: 'moto-0007', type: 'movimento_sem_aluguel', atSec: 90 },
    ]);
    expect(() => loadConfig({ SIM_INJECT: 'moto-0003:queda' })).toThrow();
  });

  it('cruzeiro configurado acima de 32 é rejeitado (nunca truncar em silêncio)', () => {
    expect(() => loadConfig({ SIM_CRUISE_MAX_KMH: '40' })).toThrow(/32/);
    expect(loadConfig({ SIM_CRUISE_MAX_KMH: '28' }).cruiseMaxKmh).toBe(28);
  });

  it('SIM_VEHICLES inválido é rejeitado', () => {
    expect(() => loadConfig({ SIM_VEHICLES: '0' })).toThrow();
    expect(() => loadConfig({ SIM_VEHICLES: 'muitas' })).toThrow();
  });
});
