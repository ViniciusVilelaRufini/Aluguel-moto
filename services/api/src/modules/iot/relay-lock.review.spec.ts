import type { CommandOutcome } from '../../ports/iot-gateway.port';
import { MemoryRedisStore } from '../../redis/redis-store';
import { FakeClock } from './clock';
import { RelayLockService, type RelaySample } from './relay-lock.service';
import { MemoryRelayLockStore, RedisRelayLockStore, type RelayLockStore } from './relay-lock.store';
import type { DesiredState } from './shadow-transport';

const T = 'moto-0901';
const T0 = Date.parse('2026-10-27T12:00:00Z');

const mk = (
  clock: FakeClock,
  store: RelayLockStore,
  desired: DesiredState[],
  outcomes: CommandOutcome[],
  known: Map<string, number | null>,
  fail = { on: false },
  locked: { on: boolean | null } = { on: null },
) =>
  new RelayLockService(
    clock,
    {
      updateDesired: async (_t, d) => {
        if (fail.on) throw new Error('boom');
        desired.push(d);
      },
    },
    (o) => outcomes.push(o),
    { store, knownSpeed: (t) => known.get(t) ?? null, knownLocked: () => locked.on },
  );

function setup() {
  const clock = new FakeClock(T0);
  const store = new MemoryRelayLockStore();
  const desired: DesiredState[] = [];
  const outcomes: CommandOutcome[] = [];
  const known = new Map<string, number | null>();
  const svc = mk(clock, store, desired, outcomes, known);
  const sample = async (kmh: number, over: Partial<RelaySample> = {}) => {
    const s: RelaySample = { kmh, deviceTs: clock.now(), measuredAt: clock.now(), accepted: true, ...over };
    if (s.accepted) known.set(T, kmh);
    await svc.onSample(T, s);
  };
  const cuts = () => desired.filter((d) => d.travada === true);
  return { clock, store, desired, outcomes, known, svc, sample, cuts };
}

describe('RelayLockService — correções da revisão (fix 1)', () => {
  it('F1: trava confirmada entre o hgetall e o exists da varredura de outra instância não vira órfã', async () => {
    const clock = new FakeClock(T0);
    const redis = new MemoryRedisStore();
    const store = new RedisRelayLockStore(redis);
    const desired: DesiredState[] = [];
    const outcomes: CommandOutcome[] = [];
    const known = new Map<string, number | null>();
    const locked = { on: null as boolean | null };
    const a = mk(clock, store, desired, outcomes, known, undefined, locked);
    const b = mk(clock, store, desired, outcomes, known);
    await a.start({ commandId: 'c1', thingName: T }, { online: true });
    known.set(T, 0);
    await a.onSample(T, { kmh: 0, deviceTs: clock.now(), measuredAt: clock.now(), accepted: true });
    await clock.advance(5_000);
    await a.onSample(T, { kmh: 0, deviceTs: clock.now(), measuredAt: clock.now(), accepted: true });
    await clock.advance(5_000);
    await a.onSample(T, { kmh: 0, deviceTs: clock.now(), measuredAt: clock.now(), accepted: true });
    const orig = redis.exists.bind(redis);
    let hooked = false;
    redis.exists = async (k: string) => {
      if (!hooked) {
        hooked = true;
        locked.on = true; // fix 5: o reported depois do corte confirma só com a trava confirmada pelo estado ao vivo
        await a.onReported(T, { travada: true });
      }
      return orig(k);
    };
    await b.sweep();
    expect(outcomes).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
    expect(desired).toEqual([{ travada: true }]);
  });

  it('F2: passado o prazo de parada, amostras paradas (timer não rodou) não cortam → did_not_stop', async () => {
    const clock = new FakeClock(T0);
    const store = new MemoryRelayLockStore();
    const desired: DesiredState[] = [];
    const outcomes: CommandOutcome[] = [];
    const known = new Map<string, number | null>([[T, 0]]);
    const s1 = mk(clock, store, desired, outcomes, known);
    await s1.start({ commandId: 'c1', thingName: T }, { online: true });
    (s1 as unknown as { forget(t: string): void }).forget(T); // processo morreu: sem timer
    const s2 = mk(clock, store, desired, outcomes, known);
    await clock.advance(125_000);
    await s2.onSample(T, { kmh: 0, deviceTs: clock.now() - 10_000, measuredAt: clock.now() - 10_000, accepted: true });
    await s2.onSample(T, { kmh: 0, deviceTs: clock.now(), measuredAt: clock.now(), accepted: true });
    expect(desired).toEqual([]);
    expect(outcomes).toEqual([{ commandId: 'c1', status: 'failed', reason: 'did_not_stop' }]);
  });

  it('F3: intervalo entre paradas > 10 s reinicia a sequência', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, { online: true });
    await s.sample(0);
    await s.clock.advance(70_000);
    await s.sample(2);
    expect(s.cuts()).toEqual([]);
    await s.clock.advance(5_000);
    await s.sample(1);
    expect(s.cuts()).toEqual([]);
    await s.clock.advance(5_000);
    await s.sample(1);
    expect(s.cuts()).toHaveLength(1);
  });

  it('F4: amostra rejeitada com relógio no futuro não fixa newestDeviceTs; as paradas reais seguintes cortam', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, { online: true });
    await s.sample(0, { deviceTs: s.clock.now() + 3_600_000, accepted: false });
    await s.sample(0);
    await s.clock.advance(10_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('F5: offline durante waiting_stop → pending/offline, sem prazo; ao reconectar, janela nova de 120 s', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, { online: true });
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.svc.onConnectivity(T, false, { online: false });
    expect(s.outcomes).toEqual([{ commandId: 'c1', status: 'pending', reason: 'offline' }]);
    await s.clock.advance(200_000);
    expect(s.outcomes).toHaveLength(1); // sem did_not_stop enquanto offline
    await s.sample(0); // espera da moto: não conta
    await s.svc.onConnectivity(T, true, { online: true });
    await s.clock.advance(100_000); // < 120 s da reconexão
    // Reconectada: só o `in_progress` da espera retomada (Task 4 fix 1, L1); nenhum did_not_stop.
    expect(s.outcomes).toEqual([
      { commandId: 'c1', status: 'pending', reason: 'offline' },
      { commandId: 'c1', status: 'in_progress' },
    ]);
    await s.sample(0);
    await s.clock.advance(10_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('F6: varredura não esquece uma trava criada depois do scan', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, { online: true });
    const realScan = s.store.scan.bind(s.store);
    jest.spyOn(s.store, 'scan').mockImplementationOnce(async () => {
      const r = await realScan();
      return { ...r, active: [] }; // o scan "viu" a moto sem trava; ela existe quando a varredura age
    });
    await s.svc.sweep();
    expect(await s.store.get(T)).not.toBeNull();
    expect(s.svc.isActive(T)).toBe(true);
  });

  it('F7: se travada:null do prazo falhou, um lock novo não entra na trava expirada nem manda travada:true', async () => {
    const clock = new FakeClock(T0);
    const store = new MemoryRelayLockStore();
    const desired: DesiredState[] = [];
    const outcomes: CommandOutcome[] = [];
    const known = new Map<string, number | null>([[T, 0]]);
    const fail = { on: false };
    const svc = mk(clock, store, desired, outcomes, known, fail);
    await svc.start({ commandId: 'c1', thingName: T }, { online: true });
    await svc.onSample(T, { kmh: 0, deviceTs: clock.now(), measuredAt: clock.now(), accepted: true });
    await clock.advance(10_000);
    await svc.onSample(T, { kmh: 0, deviceTs: clock.now(), measuredAt: clock.now(), accepted: true });
    expect(desired).toEqual([{ travada: true }]);
    fail.on = true;
    await clock.advance(121_000);
    expect(outcomes).toEqual([{ commandId: 'c1', status: 'failed', reason: 'timeout' }]);
    expect(await svc.start({ commandId: 'c2', thingName: T }, { online: true })).toEqual({ commandId: 'c2', status: 'failed', reason: 'timeout' });
    expect(desired).toEqual([{ travada: true }]);
    fail.on = false;
    expect(await svc.start({ commandId: 'c3', thingName: T }, { online: true })).toEqual({ commandId: 'c3', status: 'in_progress' });
    expect(desired).toEqual([{ travada: true }, { travada: null }]);
    expect(outcomes).toHaveLength(1);
  });

  it('F8: velocidade negativa ou NaN conta como desconhecida (em movimento), não como parada', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, { online: true });
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(-1);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
    await s.clock.advance(5_000);
    await s.sample(NaN);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
    await s.svc.onReported(T, { velocidade_kmh: -5 });
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toEqual([]); // reported negativo zerou a sequência
    s.known.set(T, -1);
    await s.clock.advance(5_000);
    await s.svc.onSample(T, { kmh: 0, deviceTs: s.clock.now(), measuredAt: s.clock.now(), accepted: true });
    expect(s.cuts()).toEqual([]);
  });

  it('F8: erro numa moto não aborta a varredura das outras', async () => {
    const clock = new FakeClock(T0);
    const store = new MemoryRelayLockStore();
    const desired: DesiredState[] = [];
    const outcomes: CommandOutcome[] = [];
    const errors: Array<Record<string, unknown>> = [];
    const svc = new RelayLockService(clock, { updateDesired: async (_t, d) => void desired.push(d) }, (o) => outcomes.push(o), { store, knownSpeed: () => null, onError: (e) => errors.push(e) });
    await store.put({ id: 'a', thingName: 'moto-A', commandIds: ['ca'], phase: 'waiting_stop', deadlineAt: T0 - 1 });
    await store.put({ id: 'b', thingName: 'moto-B', commandIds: ['cb'], phase: 'waiting_stop', deadlineAt: T0 - 1 });
    const realLock = store.withLock.bind(store);
    jest.spyOn(store, 'withLock').mockImplementation(async (t, fn) => {
      if (t === 'moto-A') throw new Error('lock busy');
      return realLock(t, fn);
    });
    await svc.sweep();
    expect(outcomes).toEqual([{ commandId: 'cb', status: 'failed', reason: 'did_not_stop' }]);
    expect(errors.some((e) => e.msg === 'relay_lock_sweep_failed')).toBe(true);
  });

  it('N1: offline com o prazo de parada já vencido (timer perdido) → did_not_stop, não waiting_online', async () => {
    const clock = new FakeClock(T0);
    const store = new MemoryRelayLockStore();
    const desired: DesiredState[] = [];
    const outcomes: CommandOutcome[] = [];
    const known = new Map<string, number | null>([[T, 0]]);
    const s1 = mk(clock, store, desired, outcomes, known);
    await s1.start({ commandId: 'c1', thingName: T }, { online: true });
    (s1 as unknown as { forget(t: string): void }).forget(T); // sem timer
    const s2 = mk(clock, store, desired, outcomes, known);
    await clock.advance(125_000);
    await s2.onConnectivity(T, false, { online: false });
    expect(outcomes).toEqual([{ commandId: 'c1', status: 'failed', reason: 'did_not_stop' }]);
    expect(desired).toEqual([]);
    expect(await store.get(T)).toBeNull();
  });

  it('F9: Redis/lock indisponível → nada é enviado', async () => {
    const clock = new FakeClock(T0);
    const store = new MemoryRelayLockStore();
    const desired: DesiredState[] = [];
    const outcomes: CommandOutcome[] = [];
    const known = new Map<string, number | null>([[T, 0]]);
    const svc = mk(clock, store, desired, outcomes, known);
    await svc.start({ commandId: 'c1', thingName: T }, { online: true });
    await svc.onSample(T, { kmh: 0, deviceTs: clock.now(), measuredAt: clock.now(), accepted: true });
    await clock.advance(10_000);
    const put = jest.spyOn(store, 'put').mockRejectedValue(new Error('redis down'));
    await expect(svc.onSample(T, { kmh: 0, deviceTs: clock.now(), measuredAt: clock.now(), accepted: true })).rejects.toThrow();
    expect(desired).toEqual([]);
    put.mockRestore();
    jest.spyOn(store, 'withLock').mockRejectedValue(new Error('lock unavailable'));
    await expect(svc.onSample(T, { kmh: 0, deviceTs: clock.now(), measuredAt: clock.now(), accepted: true })).rejects.toThrow();
    expect(desired).toEqual([]);
  });
});

describe('RelayLockService — moto já travada (Task 4, fix 3)', () => {
  it('tryCut com a moto já travada (knownLocked) → confirmed sem gravar travada:true', async () => {
    const clock = new FakeClock(T0);
    const desired: DesiredState[] = [];
    const outcomes: CommandOutcome[] = [];
    const known = new Map<string, number | null>();
    let locked = false;
    const svc = new RelayLockService(clock, { updateDesired: async (_t, d) => void desired.push(d) }, (o) => outcomes.push(o), {
      knownSpeed: (t) => known.get(t) ?? null,
      knownLocked: () => locked,
    });
    await svc.start({ commandId: 'c1', thingName: T }, { online: true });
    const sample = async () => {
      known.set(T, 0);
      await svc.onSample(T, { kmh: 0, deviceTs: clock.now(), measuredAt: clock.now(), accepted: true });
    };
    await sample();
    locked = true; // travou por outro caminho durante a espera
    await clock.advance(10_000);
    await sample();
    expect(desired).toEqual([]);
    expect(outcomes).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
    expect(svc.isActive(T)).toBe(false);
    await clock.advance(300_000);
    await svc.sweep();
    expect(desired).toEqual([]);
  });

  it('órfã na fase de corte com a moto travada (knownLocked) → confirmed, órfã limpa, sem travada:false', async () => {
    const clock = new FakeClock(T0);
    const desired: DesiredState[] = [];
    const outcomes: CommandOutcome[] = [];
    const redis = new MemoryRedisStore();
    const store = new RedisRelayLockStore(redis);
    await store.put({ id: 'l1', thingName: T, commandIds: ['c1'], phase: 'cutting' });
    await redis.del(`iot:relay-lock:${T}`);
    const svc = new RelayLockService(clock, { updateDesired: async (_t, d) => void desired.push(d) }, (o) => outcomes.push(o), {
      store,
      knownSpeed: () => null,
      knownLocked: () => true,
    });
    await svc.sweep();
    expect(desired).toEqual([]);
    expect(outcomes).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
    expect((await store.scan()).orphans).toEqual([]);
    await svc.sweep();
    expect(outcomes).toHaveLength(1);
  });

  it('órfã na fase de corte com travada desconhecida (null) → travada:null (apaga o corte, nunca false) + failed/timeout', async () => {
    const clock = new FakeClock(T0);
    const desired: DesiredState[] = [];
    const outcomes: CommandOutcome[] = [];
    const redis = new MemoryRedisStore();
    const store = new RedisRelayLockStore(redis);
    await store.put({ id: 'l1', thingName: T, commandIds: ['c1'], phase: 'cutting' });
    await redis.del(`iot:relay-lock:${T}`);
    const svc = new RelayLockService(clock, { updateDesired: async (_t, d) => void desired.push(d) }, (o) => outcomes.push(o), {
      store,
      knownSpeed: () => null,
      knownLocked: () => null,
    });
    await svc.sweep();
    expect(desired).toEqual([{ travada: null }]);
    expect(outcomes).toEqual([{ commandId: 'c1', status: 'failed', reason: 'timeout' }]);
  });
});
