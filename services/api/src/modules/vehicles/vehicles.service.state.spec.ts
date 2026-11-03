import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, type VehicleStateChangedEvent } from '../../common/events';
import { MemoryRedisStore } from '../../redis/redis-store';
import { REPORTED_LOCK_PRECEDENCE_MS, VehiclesService } from './vehicles.service';

/**
 * Bancada do J16 (2026-11-03): a ficha do painel mostrava trava, "visto por último" e online velhos, porque só a telemetria
 * (a cada 30 s) gravava o Postgres e o status/heartbeat do rastreador (`reported`) ficava só no Redis. Agora `locked` (e
 * `batteryKnown`) vão para o banco na hora em que mudam e `lastSeenAt` no máximo a cada 15 s, com `vehicle.state` na sala `fleet`.
 *
 * O banco aqui é uma tabela em memória que avalia o `where` das escritas condicionais (como o Postgres): duas instâncias da API
 * dividem a mesma linha.
 */
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const T = 'moto-0059';
/** Recente: `online` do `vehicle.state` é derivado do último sinal (janela de 180 s), como no REST. */
const T0 = Math.floor(Date.now() / 1000) * 1000 - 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

type Row = Record<string, any>;

/** Subconjunto do `where` do Prisma usado pelo serviço: igualdade, `null`, `{ lt, lte }` e `OR`. */
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, cond]) => {
    if (k === 'OR') return (cond as Row[]).some((c) => matches(row, c));
    const v = row[k];
    if (cond === null) return v === null || v === undefined;
    if (cond instanceof Date) return v instanceof Date && v.getTime() === cond.getTime();
    if (typeof cond === 'object') {
      if (v === null || v === undefined) return false;
      const t = v instanceof Date ? v.getTime() : v;
      if ('lt' in cond && !(t < (cond.lt instanceof Date ? cond.lt.getTime() : cond.lt))) return false;
      if ('lte' in cond && !(t <= (cond.lte instanceof Date ? cond.lte.getTime() : cond.lte))) return false;
      return true;
    }
    return v === cond;
  });
}

function table(initial: Row) {
  const row: Row = { id: VEHICLE_ID, status: 'free', online: true, locked: true, lockedAt: null, lockedFromReport: false, batteryKnown: true, lastSeenAt: new Date(T0 - 60_000), ...initial };
  const calls: Row[] = [];
  const vehicle = {
    updateMany: jest.fn(async (a: Row) => {
      calls.push(a);
      if (!matches(row, a.where)) return { count: 0 };
      for (const [k, v] of Object.entries(a.data)) if (!(v && typeof v === 'object' && 'increment' in (v as Row))) row[k] = v;
      return { count: 1 };
    }),
    update: jest.fn(async (a: Row) => Object.assign(row, a.data)),
    findUnique: jest.fn(async () => ({ ...row })),
  };
  return { row, calls, prisma: { vehicle, battery: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) }, rental: { findFirst: jest.fn().mockResolvedValue(null) }, reservation: { findFirst: jest.fn().mockResolvedValue(null) } } };
}

function instance(db: ReturnType<typeof table>) {
  const events = new EventEmitter2();
  const states: VehicleStateChangedEvent[] = [];
  events.on(EV.VEHICLE_STATE_CHANGED, (e: VehicleStateChangedEvent) => states.push(e));
  const usage = { record: jest.fn().mockResolvedValue(undefined), take: jest.fn().mockResolvedValue({ km: 0, hours: 0 }) };
  const service = new VehiclesService(db.prisma as any, { record: jest.fn() } as any, {} as any, events, new MemoryRedisStore(), { ensure: jest.fn() } as any, usage as any, {} as any);
  return { service, states };
}

const reported = (over: Partial<{ locked: boolean; heard: boolean; ts: string }> = {}) => ({ thingName: T, vehicleId: VEHICLE_ID, heard: true, ts: iso(T0), ...over });
const telemetry = (over: Record<string, unknown> = {}) => ({
  thingName: T, vehicleId: VEHICLE_ID, lat: -23.56, lng: -46.69, speedKmh: 0, batteryPct: 81, batteryKnown: true, locked: true, ignition: false, signal: 4,
  ts: iso(T0 - 2_000), receivedAt: iso(T0), ...over,
});
/** Escritas cujo `data` tem exatamente estas chaves. */
const writes = (db: ReturnType<typeof table>, ...keys: string[]) => db.calls.filter((a) => Object.keys(a.data).sort().join() === [...keys].sort().join());

describe('VehiclesService: estado do rastreador no banco e vehicle.state', () => {
  it('reported com travada que mudou → Vehicle.locked na hora com a origem (lockedAt, reported) e vehicle.state com a hora da fonte', async () => {
    const db = table({ locked: false });
    const a = instance(db);
    await a.service.onReported(reported({ locked: true }));
    expect(db.row).toMatchObject({ locked: true, lockedAt: new Date(T0), lockedFromReport: true, lastSeenAt: new Date(T0) });
    expect(a.states).toEqual([{ vehicleId: VEHICLE_ID, locked: true, online: true, lastSeenAt: iso(T0), batteryKnown: true, ts: iso(T0) }]);
  });

  it('nada mudou no banco (trava igual, lastSeenAt recente) → nenhum vehicle.state', async () => {
    const db = table({ locked: true, lastSeenAt: new Date(T0 - 5_000) });
    const a = instance(db);
    await a.service.onReported(reported({ locked: true }));
    expect(a.states).toEqual([]);
    expect(db.row).toMatchObject({ lockedAt: new Date(T0), lockedFromReport: true }); // a origem é renovada mesmo sem mudança
  });

  it('lastSeenAt pelo status/heartbeat: no máximo a cada 15 s por moto, condicionado ao banco (lastSeenAt < agora − 15 s)', async () => {
    const db = table({});
    const a = instance(db);
    await a.service.onReported(reported());
    expect(db.row.lastSeenAt).toEqual(new Date(T0));
    expect(a.states.map((s) => s.ts)).toEqual([iso(T0)]);
    await a.service.onReported(reported({ ts: iso(T0 + 10_000) }));
    expect(writes(db, 'lastSeenAt')).toHaveLength(1); // 10 s depois: nem vai ao banco
    await a.service.onReported(reported({ ts: iso(T0 + 15_000) }));
    expect(db.row.lastSeenAt).toEqual(new Date(T0 + 15_000));
    expect(a.states.map((s) => s.ts)).toEqual([iso(T0), iso(T0 + 15_000)]);
  });

  it('reported lido do shadow (polling, heard: false) grava a trava mas nunca o lastSeenAt', async () => {
    const db = table({ locked: true });
    const a = instance(db);
    await a.service.onReported(reported({ locked: false, heard: false }));
    expect(db.row.locked).toBe(false);
    expect(writes(db, 'lastSeenAt')).toEqual([]);
  });

  it('telemetria: lastSeenAt pela hora do servidor (receivedAt); trava que mudou vai na hora, com a hora da medição', async () => {
    const db = table({ locked: true });
    const a = instance(db);
    await a.service.onTelemetry(telemetry({ locked: false }) as any);
    expect(db.row).toMatchObject({ lastSeenAt: new Date(T0), locked: false, lockedAt: new Date(T0 - 2_000), lockedFromReport: false });
    // Gravação de 30 s: posição (com a hora dela) e telemetria, sem lastSeenAt/locked/batteryKnown (donos: o estado do rastreador).
    const full = db.calls.find((c) => 'lat' in c.data)!;
    expect(full.data).not.toHaveProperty('lastSeenAt');
    expect(full.data).not.toHaveProperty('locked');
    expect(full.data).not.toHaveProperty('batteryKnown');
    expect(full.data).toMatchObject({ batteryPct: 81, positionAt: new Date(T0 - 2_000) });
  });

  it('relógio do rastreador adiantado: positionAt e lockedAt nunca passam da hora de chegada', async () => {
    const db = table({ locked: true });
    const a = instance(db);
    await a.service.onTelemetry(telemetry({ locked: false, ts: iso(T0 + 120_000) }) as any);
    expect(db.row.lockedAt).toEqual(new Date(T0));
    expect(db.calls.find((c) => 'lat' in c.data)!.data.positionAt).toEqual(new Date(T0));
  });

  it('bateria desconhecida (bateria_conhecida: false) → batteryKnown false no banco na hora, batteryPct 0 e a bateria instalada não vira 0%', async () => {
    const db = table({});
    const a = instance(db);
    await a.service.onTelemetry(telemetry({ batteryPct: 0, batteryKnown: false }) as any);
    expect(db.row.batteryKnown).toBe(false);
    expect(db.calls.find((c) => 'lat' in c.data)!.data).toMatchObject({ batteryPct: 0 });
    expect(db.prisma.battery.updateMany).not.toHaveBeenCalled();
    expect(a.states.at(-1)).toMatchObject({ batteryKnown: false });
  });

  it('duas instâncias: nenhum cache por instância esconde uma mudança gravada pela outra (trava e bateria)', async () => {
    const db = table({ locked: false, batteryKnown: true });
    const a = instance(db);
    const b = instance(db);
    await a.service.onTelemetry(telemetry({ locked: true, batteryKnown: false, ts: iso(T0), receivedAt: iso(T0) }) as any);
    expect(db.row).toMatchObject({ locked: true, batteryKnown: false });
    await b.service.onTelemetry(telemetry({ locked: false, batteryKnown: true, ts: iso(T0 + 5_000), receivedAt: iso(T0 + 5_000) }) as any);
    expect(db.row).toMatchObject({ locked: false, batteryKnown: true });
    // A vê de novo o que já tinha visto: antes o cache de A pulava a escrita e o banco ficava com o valor de B.
    await a.service.onTelemetry(telemetry({ locked: true, batteryKnown: false, ts: iso(T0 + 10_000), receivedAt: iso(T0 + 10_000) }) as any);
    expect(db.row).toMatchObject({ locked: true, batteryKnown: false });
    expect(a.states.at(-1)).toMatchObject({ locked: true, batteryKnown: false, ts: iso(T0 + 10_000) });
  });

  describe('corrida: telemetria conservadora (travada:false com o bit velho/desconhecido) × reported do rastreador', () => {
    it('reported travada:true e depois telemetria travada:false dentro da precedência → banco e WS continuam travados', async () => {
      const db = table({ locked: false });
      const a = instance(db);
      await a.service.onReported(reported({ locked: true, ts: iso(T0) })); // resposta do J16 ao corte
      await a.service.onTelemetry(telemetry({ locked: false, ts: iso(T0 + 8_000), receivedAt: iso(T0 + 10_000) }) as any);
      expect(db.row).toMatchObject({ locked: true, lockedAt: new Date(T0), lockedFromReport: true });
      expect(a.states.some((s) => s.locked === false)).toBe(false);
    });

    it('telemetria medida antes do reported que chega depois dele (atraso do GPS) também não desfaz', async () => {
      const db = table({ locked: false });
      const a = instance(db);
      await a.service.onReported(reported({ locked: true, ts: iso(T0) }));
      await a.service.onTelemetry(telemetry({ locked: false, ts: iso(T0 - 1_500), receivedAt: iso(T0 + 500) }) as any);
      expect(db.row.locked).toBe(true);
    });

    it('sem reported novo por mais que a precedência, a telemetria volta a valer', async () => {
      const db = table({ locked: false });
      const a = instance(db);
      await a.service.onReported(reported({ locked: true, ts: iso(T0) }));
      const at = T0 + REPORTED_LOCK_PRECEDENCE_MS + 1_000;
      await a.service.onTelemetry(telemetry({ locked: false, ts: iso(at), receivedAt: iso(at) }) as any);
      expect(db.row).toMatchObject({ locked: false, lockedAt: new Date(at), lockedFromReport: false });
      expect(a.states.at(-1)).toMatchObject({ locked: false, ts: iso(at) });
    });

    it('reported mais novo sempre vence a telemetria; reported mais velho que a trava gravada não volta atrás', async () => {
      const db = table({ locked: true });
      const a = instance(db);
      await a.service.onTelemetry(telemetry({ locked: true, ts: iso(T0), receivedAt: iso(T0) }) as any);
      await a.service.onReported(reported({ locked: false, ts: iso(T0 + 1_000) })); // RELAY 0 OK
      expect(db.row.locked).toBe(false);
      await a.service.onReported(reported({ locked: true, ts: iso(T0 + 500), heard: false })); // polling atrasado
      expect(db.row.locked).toBe(false);
    });
  });

  it('online/offline: vehicle.state na transição, com a hora do evento', async () => {
    const db = table({ lastSeenAt: new Date(T0) });
    const a = instance(db);
    await a.service.onConnectivity({ thingName: T, vehicleId: VEHICLE_ID, online: false, ts: iso(T0 + 180_000) });
    expect(a.states).toEqual([{ vehicleId: VEHICLE_ID, locked: true, online: false, lastSeenAt: iso(T0), batteryKnown: true, ts: iso(T0 + 180_000) }]);
  });

  it('offline não avança o lastSeenAt (a vigia marca offline 180 s depois do último sinal)', async () => {
    const db = table({ lastSeenAt: new Date(T0) });
    const a = instance(db);
    await a.service.onConnectivity({ thingName: T, vehicleId: VEHICLE_ID, online: false, ts: iso(T0 + 180_000) });
    expect(db.prisma.vehicle.update.mock.calls[0][0].data).not.toHaveProperty('lastSeenAt');
  });
});
