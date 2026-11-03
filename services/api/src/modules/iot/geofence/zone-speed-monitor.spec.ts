import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, type SpeedCeilingExceededEvent, type ZoneSpeedExceededEvent } from '../../../common/events';
import { MemoryRedisStore } from '../../../redis/redis-store';
import { SPEED_CEILING_ALERT_KMH, ZoneSpeedMonitor } from './zone-speed-monitor';

const AT0 = Date.parse('2026-10-27T12:00:00Z');

function setup(mode: 'relay_only' | 'speed_control' = 'relay_only', limit = 6) {
  const events = new EventEmitter2();
  const got: ZoneSpeedExceededEvent[] = [];
  events.on(EV.ZONE_SPEED_EXCEEDED, (e: ZoneSpeedExceededEvent) => got.push(e));
  const modes = { byVehicle: jest.fn().mockResolvedValue(mode), invalidate: jest.fn() };
  const limits = { storedLimit: jest.fn().mockResolvedValue(limit as number | null) };
  const rentals = { openRentalId: jest.fn().mockResolvedValue('rent-1') };
  const monitor = new ZoneSpeedMonitor(modes, limits, new MemoryRedisStore(), events, rentals);
  const sample = (kmh: number, sec: number) => monitor.onSample({ vehicleId: 'veh-1', thingName: 'moto-0901', speedKmh: kmh, measuredAt: AT0 + sec * 1000, locked: false });
  return { got, sample, limits };
}

describe('ZoneSpeedMonitor (spec GT06 §10)', () => {
  it('acima do limite por mais de 5 s → um alerta por episódio; voltar ao limite encerra o episódio', async () => {
    const s = setup();
    await s.sample(10, 0);
    await s.sample(11, 3);
    await s.sample(12, 5);
    expect(s.got).toEqual([]);
    await s.sample(12, 6);
    expect(s.got).toEqual([{ vehicleId: 'veh-1', rentalId: 'rent-1', speedLimitKmh: 6, speedKmh: 12, ts: '2026-10-27T12:00:06.000Z' }]);
    await s.sample(14, 12);
    expect(s.got).toHaveLength(1);
    await s.sample(6, 15); // igual ao limite: dentro
    await s.sample(10, 16);
    await s.sample(10, 22);
    expect(s.got).toHaveLength(2);
  });

  it('amostra mais velha que o início do episódio é ignorada', async () => {
    const s = setup();
    await s.sample(10, 10);
    await s.sample(10, 2);
    await s.sample(10, 15);
    expect(s.got).toEqual([]);
    await s.sample(10, 16);
    expect(s.got).toHaveLength(1);
  });

  it('speed_control e fora de zona (limite 32) nunca alertam', async () => {
    const a = setup('speed_control');
    await a.sample(20, 0);
    await a.sample(20, 10);
    expect(a.got).toEqual([]);
    expect(a.limits.storedLimit).not.toHaveBeenCalled();
    const b = setup('relay_only', 32);
    await b.sample(35, 0);
    await b.sample(35, 10);
    expect(b.got).toEqual([]);
  });

  it('sair da zona no meio do episódio (limite 32) encerra: ao voltar, os 5 s recomeçam', async () => {
    const s = setup();
    await s.sample(10, 0);
    s.limits.storedLimit.mockResolvedValue(32);
    await s.sample(10, 3);
    s.limits.storedLimit.mockResolvedValue(6);
    await s.sample(10, 4);
    await s.sample(10, 8);
    expect(s.got).toEqual([]);
    await s.sample(10, 10);
    expect(s.got).toHaveLength(1);
  });

  it('limite 20 → 6 no meio do episódio reinicia o episódio com o limite novo', async () => {
    const s = setup('relay_only', 20);
    await s.sample(25, 0);
    s.limits.storedLimit.mockResolvedValue(6);
    await s.sample(25, 3);
    await s.sample(25, 7);
    expect(s.got).toEqual([]);
    await s.sample(25, 9);
    expect(s.got).toEqual([expect.objectContaining({ speedLimitKmh: 6, speedKmh: 25 })]);
  });

  it('limite desconhecido (motor fora, nada gravado): não alerta', async () => {
    const s = setup('relay_only', null as never);
    await s.sample(30, 0);
    await s.sample(30, 20);
    expect(s.got).toEqual([]);
  });

  it('Redis fora: o erro é engolido e nada alerta', async () => {
    const events = new EventEmitter2();
    const got: unknown[] = [];
    events.on(EV.ZONE_SPEED_EXCEEDED, (e) => got.push(e));
    const boom = jest.fn().mockRejectedValue(new Error('redis fora'));
    const redis = { get: boom, set: boom, del: boom } as never;
    const monitor = new ZoneSpeedMonitor({ byVehicle: async () => 'relay_only', invalidate: jest.fn() }, { storedLimit: async () => 6 }, redis, events, { openRentalId: async () => undefined });
    await expect(monitor.onSample({ vehicleId: 'v', thingName: 't', speedKmh: 12, measuredAt: AT0, locked: false })).resolves.toBeUndefined();
    await expect(monitor.onSample({ vehicleId: 'v', thingName: 't', speedKmh: 12, measuredAt: AT0 + 20_000, locked: false })).resolves.toBeUndefined();
    expect(got).toEqual([]);
  });
});

describe('ZoneSpeedMonitor — teto legal de 32 km/h (auditoria 4, item 3; contrato telemetria: acima de 32 alerta)', () => {
  function ceiling(mode: 'relay_only' | 'speed_control' | 'fail' = 'relay_only', limit: number | null = 32, rental: string | null = 'rent-1', locked = false) {
    const events = new EventEmitter2();
    const zone: ZoneSpeedExceededEvent[] = [];
    const over: SpeedCeilingExceededEvent[] = [];
    events.on(EV.ZONE_SPEED_EXCEEDED, (e: ZoneSpeedExceededEvent) => zone.push(e));
    events.on(EV.SPEED_CEILING_EXCEEDED, (e: SpeedCeilingExceededEvent) => over.push(e));
    const modes = { byVehicle: mode === 'fail' ? jest.fn().mockRejectedValue(new Error('banco fora')) : jest.fn().mockResolvedValue(mode), invalidate: jest.fn() };
    const limits = { storedLimit: jest.fn().mockResolvedValue(limit) };
    const monitor = new ZoneSpeedMonitor(modes, limits, new MemoryRedisStore(), events, { openRentalId: jest.fn().mockResolvedValue(rental ?? undefined) });
    const sample = (kmh: number, sec: number) => monitor.onSample({ vehicleId: 'veh-1', thingName: 'moto-0901', speedKmh: kmh, measuredAt: AT0 + sec * 1000, locked });
    return { zone, over, sample, limits };
  }

  it('fora de zona (limite 32): acima de 35 km/h (32 + 3 de tolerância do GPS) por mais de 5 s → um alerta por episódio', async () => {
    expect(SPEED_CEILING_ALERT_KMH).toBe(35);
    const s = ceiling();
    await s.sample(40, 0);
    await s.sample(41, 5);
    expect(s.over).toEqual([]);
    await s.sample(40.04, 6);
    expect(s.over).toEqual([{ vehicleId: 'veh-1', rentalId: 'rent-1', speedKmh: 40, ts: '2026-10-27T12:00:06.000Z' }]);
    await s.sample(45, 12);
    expect(s.over).toHaveLength(1);
    await s.sample(35, 13); // na tolerância: fim do episódio
    await s.sample(36, 14);
    await s.sample(36, 20);
    expect(s.over).toHaveLength(2);
    expect(s.zone).toEqual([]); // não é alerta de zona
  });

  it('35 km/h (na tolerância) não alerta; amostra isolada acima também não', async () => {
    const s = ceiling();
    await s.sample(35, 0);
    await s.sample(35, 10);
    await s.sample(50, 11);
    await s.sample(30, 12);
    await s.sample(50, 13);
    expect(s.over).toEqual([]);
  });

  it('limite desconhecido (nada gravado) e falha ao ler o tipo do rastreador: o teto legal vale mesmo assim', async () => {
    for (const s of [ceiling('relay_only', null), ceiling('fail', 6)]) {
      await s.sample(40, 0);
      await s.sample(40, 6);
      expect(s.over).toHaveLength(1);
      expect(s.zone).toEqual([]);
    }
  });

  it('speed_control acima de 35 km/h também: o limitador está fora da norma', async () => {
    const s = ceiling('speed_control', 20);
    await s.sample(40, 0);
    await s.sample(40, 6);
    expect(s.over).toHaveLength(1);
    expect(s.zone).toEqual([]);
    expect(s.limits.storedLimit).not.toHaveBeenCalled();
  });

  it('P5: moto travada e sem aluguel (transportada na van) acima de 35 km/h → nenhum alerta do teto', async () => {
    const s = ceiling('relay_only', 32, null, true);
    for (let sec = 0; sec <= 30; sec += 5) await s.sample(80, sec);
    expect(s.over).toEqual([]);
  });

  it('P5: travada mas com aluguel aberto → alerta; destravada sem aluguel → alerta (sem rentalId)', async () => {
    const a = ceiling('relay_only', 32, 'rent-1', true);
    await a.sample(40, 0);
    await a.sample(40, 6);
    expect(a.over).toEqual([expect.objectContaining({ rentalId: 'rent-1' })]);
    const b = ceiling('relay_only', 32, null, false);
    await b.sample(40, 0);
    await b.sample(40, 6);
    expect(b.over).toEqual([{ vehicleId: 'veh-1', speedKmh: 40, ts: '2026-10-27T12:00:06.000Z' }]);
  });

  it('zona de 6 km/h a 40 km/h: alerta de zona e do teto, cada um com o seu episódio', async () => {
    const s = ceiling('relay_only', 6);
    await s.sample(40, 0);
    await s.sample(40, 6);
    expect(s.zone).toHaveLength(1);
    expect(s.over).toHaveLength(1);
    await s.sample(20, 7); // abaixo do teto, acima da zona: só o episódio do teto termina
    await s.sample(20, 12);
    expect(s.zone).toHaveLength(1);
    expect(s.over).toHaveLength(1);
  });
});
