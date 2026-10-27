import type { CommandOutcome } from '../../ports/iot-gateway.port';
import { FakeClock } from './clock';
import { RelayLockService, stillConfirmed, type RelaySample } from './relay-lock.service';
import { MemoryRedisStore } from '../../redis/redis-store';
import { MemoryRelayLockStore, RedisRelayLockStore } from './relay-lock.store';
import type { DesiredState } from './shadow-transport';

const T = 'moto-0901';
const T0 = Date.parse('2026-10-27T12:00:00Z');

function setup(opts: { online?: boolean; knownLocked?: () => boolean | null } = {}) {
  const clock = new FakeClock(T0);
  const desired: Array<{ at: number; desired: DesiredState }> = [];
  const outcomes: CommandOutcome[] = [];
  const known = new Map<string, number | null>();
  const transport = { updateDesired: async (_t: string, d: DesiredState) => void desired.push({ at: clock.now(), desired: d }) };
  const store = new MemoryRelayLockStore();
  const svc = new RelayLockService(clock, transport, (o) => outcomes.push(o), { store, knownSpeed: (t) => known.get(t) ?? null, knownLocked: opts.knownLocked });
  const state = { online: opts.online ?? true };
  /** Telemetria aceita pelo LiveStateStore medida agora (o gateway só manda `accepted: true` quando ela é fresca e fora da graça). */
  const sample = async (kmh: number, over: Partial<RelaySample> = {}) => {
    const s: RelaySample = { kmh, deviceTs: clock.now(), measuredAt: clock.now(), accepted: true, ...over };
    if (s.accepted) known.set(T, kmh);
    await svc.onSample(T, s);
  };
  const cuts = () => desired.filter((d) => d.desired.travada === true);
  return { clock, desired, outcomes, known, svc, store, state, sample, cuts };
}

describe('stillConfirmed', () => {
  it('exige 2 amostras, 10 s entre a primeira e a última e a última fresca (≤ 10 s)', () => {
    expect(stillConfirmed(undefined, 0)).toBe(false);
    expect(stillConfirmed({ firstAt: 0, lastAt: 10_000, count: 1 }, 10_000)).toBe(false);
    expect(stillConfirmed({ firstAt: 0, lastAt: 9_999, count: 3 }, 9_999)).toBe(false);
    expect(stillConfirmed({ firstAt: 0, lastAt: 10_000, count: 2 }, 10_000)).toBe(true);
    expect(stillConfirmed({ firstAt: 0, lastAt: 10_000, count: 2 }, 20_000)).toBe(true);
    expect(stillConfirmed({ firstAt: 0, lastAt: 10_000, count: 2 }, 20_001)).toBe(false);
  });
});

describe('RelayLockService (spec GT06 §5)', () => {
  it('online e andando → in_progress e nada publicado; só corta com 2 amostras paradas cobrindo 10 s, uma única vez', async () => {
    const s = setup();
    expect(await s.svc.start({ commandId: 'c1', thingName: T }, s.state)).toEqual({ commandId: 'c1', status: 'in_progress' });
    await s.sample(18);
    await s.clock.advance(5_000);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(1.5);
    expect(s.desired).toEqual([]); // 2 amostras, mas só 5 s entre elas
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
    expect(s.desired).toEqual([{ at: T0 + 15_000, desired: { travada: true } }]); // nunca limite_kmh (sem rampa)
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('amostra ≥ 3 no meio zera a janela', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(3); // exatamente 3 = em movimento
    await s.clock.advance(5_000);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('amostra mais nova rejeitada (graça, velha, relógio no futuro) zera; amostra mais velha é ignorada', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(0, { accepted: false }); // ex.: dentro da graça
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
    await s.sample(0, { deviceTs: s.clock.now() - 60_000, measuredAt: s.clock.now() - 60_000, accepted: false }); // parada reordenada: ignorada
    await s.clock.advance(10_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('amostra em movimento fora de ordem (medida entre as paradas, chegou atrasada) também zera a sequência', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(12, { deviceTs: s.clock.now() - 3_000, measuredAt: s.clock.now() - 3_000, accepted: false });
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
  });

  it('reconexão entre as amostras zera a janela', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.svc.onReconnected(T);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
  });

  it('velocidade conhecida desconhecida ou ≥ 3 no instante da decisão → não corta', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(10_000);
    s.known.set(T, null);
    await s.svc.onSample(T, { kmh: 0, deviceTs: s.clock.now(), measuredAt: s.clock.now(), accepted: true });
    expect(s.cuts()).toEqual([]);
    s.known.set(T, 4);
    await s.clock.advance(1_000);
    await s.svc.onSample(T, { kmh: 0, deviceTs: s.clock.now(), measuredAt: s.clock.now(), accepted: true });
    expect(s.cuts()).toEqual([]);
  });

  it('reported.velocidade_kmh ≥ 3 zera; reported < 3 não conta como amostra parada', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.svc.onReported(T, { velocidade_kmh: 12 });
    await s.clock.advance(5_000);
    await s.sample(0);
    await s.svc.onReported(T, { velocidade_kmh: 0 });
    expect(s.cuts()).toEqual([]);
  });

  it('120 s sem parar → failed/did_not_stop e nenhum corte enviado', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    for (let i = 0; i < 24; i++) {
      await s.sample(15);
      await s.clock.advance(5_000);
    }
    await s.clock.advance(1_000);
    expect(s.outcomes).toEqual([{ commandId: 'c1', status: 'failed', reason: 'did_not_stop' }]);
    expect(s.desired).toEqual([]);
    expect(s.svc.isActive(T)).toBe(false);
  });

  it('corte confirmado por reported.travada = true não mais antigo que o corte (e trava confirmada pelo estado ao vivo)', async () => {
    let locked: boolean | null = null;
    const s = setup({ knownLocked: () => locked });
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(10_000);
    await s.sample(0);
    const cutAt = s.clock.now();
    locked = true;
    await s.svc.onReported(T, { travada: true }, { travada: cutAt - 5_000 }); // anterior ao corte: não vale
    expect(s.outcomes).toEqual([]);
    await s.clock.advance(2_000);
    locked = null; // fix 5: posterior ao corte, mas sem a trava confirmada (ex.: tick da reconexão na graça) → espera
    await s.svc.onReported(T, { travada: true });
    expect(s.outcomes).toEqual([]);
    locked = true;
    await s.svc.onReported(T, { travada: true });
    expect(s.outcomes).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
  });

  it('corte sem confirmação em 120 s → failed/timeout e desired travada:false', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    await s.sample(0);
    await s.clock.advance(10_000);
    await s.sample(0);
    await s.clock.advance(120_000);
    expect(s.outcomes).toEqual([{ commandId: 'c1', status: 'failed', reason: 'timeout' }]);
    expect(s.desired.map((d) => d.desired)).toEqual([{ travada: true }, { travada: false }]);
  });

  it('offline → pending/offline e nada publicado; ao reconectar recomeça e exige amostras novas', async () => {
    const s = setup({ online: false });
    expect(await s.svc.start({ commandId: 'c1', thingName: T }, s.state)).toEqual({ commandId: 'c1', status: 'pending', reason: 'offline' });
    await s.sample(0); // amostra com a trava ainda esperando a moto: não conta
    await s.clock.advance(10_000);
    await s.svc.onConnectivity(T, true, { online: true });
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
    await s.clock.advance(10_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('nunca confirma pelo estado ao vivo: espera; reported.travada = true da ponte (moto já cortada) confirma sem publicar', async () => {
    let locked: boolean | null = null;
    const s = setup({ knownLocked: () => locked });
    expect(await s.svc.start({ commandId: 'c1', thingName: T }, s.state)).toEqual({ commandId: 'c1', status: 'in_progress' });
    await s.clock.advance(1_000);
    // Fix 4 (N1): antes do corte, o reported sozinho não basta (pode ser o da memória da ponte no tick da reconexão).
    await s.svc.onReported(T, { travada: true });
    expect(s.outcomes).toEqual([]);
    locked = true; // estado ao vivo: travada confirmada depois da graça
    await s.svc.onReported(T, { travada: true });
    expect(s.outcomes).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
    expect(s.desired).toEqual([]);
  });

  it('segundo lock entra na mesma trava; cancel encerra os dois como failed sem publicar', async () => {
    const s = setup();
    await s.svc.start({ commandId: 'c1', thingName: T }, s.state);
    expect(await s.svc.start({ commandId: 'c2', thingName: T }, s.state)).toEqual({ commandId: 'c2', status: 'in_progress' });
    await s.svc.cancel(T);
    expect(s.outcomes).toEqual([{ commandId: 'c1', status: 'failed' }, { commandId: 'c2', status: 'failed' }]);
    expect(s.desired).toEqual([]);
  });

  it('órfã na fase de corte (estado perdido) → desired travada:false e comandos failed/timeout', async () => {
    const clock = new FakeClock(T0);
    const desired: DesiredState[] = [];
    const outcomes: CommandOutcome[] = [];
    const redis = new MemoryRedisStore();
    const store = new RedisRelayLockStore(redis);
    await store.put({ id: 'l1', thingName: T, commandIds: ['c1'], phase: 'cutting' });
    await redis.del(`iot:relay-lock:${T}`); // estado perdido, índice ficou
    const svc = new RelayLockService(clock, { updateDesired: async (_t, d) => void desired.push(d) }, (o) => outcomes.push(o), { store, knownSpeed: () => null });
    await svc.sweep();
    expect(desired).toEqual([{ travada: false }]);
    expect(outcomes).toEqual([{ commandId: 'c1', status: 'failed', reason: 'timeout' }]);
  });
});
