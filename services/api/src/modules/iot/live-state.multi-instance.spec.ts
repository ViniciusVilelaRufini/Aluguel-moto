import { MemoryRedisStore } from '../../redis/redis-store';
import { FakeClock } from './clock';
import { LiveStateStore } from './live-state.store';

/** Lacunas T5: a fila de telemetria distribui as mensagens de uma moto entre as instâncias; o estado ao vivo vem do Redis. */
const T = 'moto-0001';
const telemetry = (ts: string, speed = 10) => ({ lat: -23.5, lng: -46.6, velocidade_kmh: speed, bateria_pct: 80, travada: false, ignicao: true, sinal: 4, timestamp: ts });

describe('LiveStateStore com várias instâncias', () => {
  it('B relê o que A gravou (online, última notícia, posição) em vez da cópia velha da memória', async () => {
    const redis = new MemoryRedisStore();
    const clock = new FakeClock(Date.parse('2026-10-24T12:00:00Z'));
    const a = new LiveStateStore(redis, clock);
    const b = new LiveStateStore(redis, clock);
    await b.applyTelemetry(T, telemetry('2026-10-24T12:00:00Z'));
    await clock.advance(170_000);
    await a.applyTelemetry(T, { ...telemetry('2026-10-24T12:02:50Z'), lat: -23.6 });
    await clock.advance(20_000); // B não ouve a moto há 190 s; A ouviu há 20 s
    expect(b.stale()).toEqual([T]); // a cópia da memória de B está velha…
    await b.refresh(T);
    expect(b.stale()).toEqual([]); // …o Redis diz que ela está viva
    expect(b.isOnline(T)).toBe(true);
    expect((await b.load(T))?.lat).toBe(-23.6);
  });

  it('offline gravado por A vale para B (lock em B não fica esperando uma moto que ele acha online)', async () => {
    const redis = new MemoryRedisStore();
    const clock = new FakeClock(Date.parse('2026-10-24T12:00:00Z'));
    const a = new LiveStateStore(redis, clock);
    const b = new LiveStateStore(redis, clock);
    await b.applyTelemetry(T, telemetry('2026-10-24T12:00:00Z'));
    await a.load(T);
    await clock.advance(1_000);
    await a.setOnline(T, false);
    await b.load(T);
    expect(b.isOnline(T)).toBe(false);
  });

  it('final fix wave: reconexão vista por A vale para B — travada:true na graça não confirma em B até passar a graça', async () => {
    const redis = new MemoryRedisStore();
    const clock = new FakeClock(Date.parse('2026-10-24T12:00:00Z'));
    const a = new LiveStateStore(redis, clock);
    const b = new LiveStateStore(redis, clock);
    await b.applyTelemetry(T, telemetry('2026-10-24T12:00:00Z', 0)); // B conhece a moto desde antes (reconexão antiga)
    await clock.advance(60_000);
    await a.load(T);
    await a.markReconnected(T); // presença/lacuna vista só por A
    await clock.advance(1_000);
    await a.applyReported(T, { travada: true }); // reported da memória da ponte no tick da reconexão (na graça)
    await b.load(T);
    expect(b.lockConfirmed(T)).toBe(false);
    await clock.advance(5_000);
    await b.load(T);
    expect(b.lockConfirmed(T)).toBe(false); // a origem continua dentro da graça
    await clock.advance(10_000);
    await a.applyReported(T, { travada: true }); // depois da graça
    await b.load(T);
    expect(b.lockConfirmed(T)).toBe(true);
  });

  it('final fix wave: reconexão só marcada em A (sem outra escrita) já vale para um reported que B processa na graça', async () => {
    const redis = new MemoryRedisStore();
    const clock = new FakeClock(Date.parse('2026-10-24T12:00:00Z'));
    const a = new LiveStateStore(redis, clock);
    const b = new LiveStateStore(redis, clock);
    await b.applyTelemetry(T, telemetry('2026-10-24T12:00:00Z', 0));
    await clock.advance(60_000);
    await a.load(T);
    await a.markReconnected(T);
    await clock.advance(1_000);
    await b.applyReported(T, { travada: true });
    expect(b.lockConfirmed(T)).toBe(false);
    await clock.advance(10_000);
    await b.applyReported(T, { travada: true });
    expect(b.lockConfirmed(T)).toBe(true);
  });

  it('N2: reconnectAt só vai para o hash por máximo atômico (persist não grava desconhecida nem valor velho)', async () => {
    const redis = new MemoryRedisStore();
    const clock = new FakeClock(Date.parse('2026-10-24T12:00:00Z'));
    const a = new LiveStateStore(redis, clock);
    await a.setOnline(T, true);
    expect((await redis.hgetall(`iot:live:${T}`)).reconnectAt).toBeUndefined();
    await a.markReconnected(T);
    expect((await redis.hgetall(`iot:live:${T}`)).reconnectAt).toBe(String(clock.now()));
  });

  it('N2: persist de B (leu o hash antes) depois do markReconnected de A mantém a reconexão mais nova de A', async () => {
    const redis = new MemoryRedisStore();
    const clock = new FakeClock(Date.parse('2026-10-24T12:00:00Z'));
    const a = new LiveStateStore(redis, clock);
    // B lê o hash e só grava depois: a escrita de A cai no meio (leitura → escrita não é atômica).
    let release!: () => void;
    let gated = false;
    const gate = new Promise<void>((r) => (release = r));
    const bRedis = new Proxy(redis, {
      get(target, prop, recv) {
        if (prop === 'hgetall' && gated) {
          return async (key: string) => {
            const h = await target.hgetall(key);
            await gate;
            return h;
          };
        }
        const v = Reflect.get(target, prop, recv);
        return typeof v === 'function' ? v.bind(target) : v;
      },
    });
    const b = new LiveStateStore(bRedis, clock);
    await b.applyTelemetry(T, telemetry('2026-10-24T12:00:00Z', 0)); // B: reconexão antiga (12:00:00) na memória
    await clock.advance(60_000);
    gated = true;
    const bWrite = b.setOnline(T, true); // B lê o hash (sem a reconexão de A)…
    await Promise.resolve();
    await a.load(T);
    await a.markReconnected(T); // …A grava a reconexão (12:01:00)…
    const newer = String(clock.now());
    release();
    await bWrite; // …e B grava o estado com a cópia velha
    expect((await redis.hgetall(`iot:live:${T}`)).reconnectAt).toBe(newer);
    // Uma instância nova trata o reported na graça da reconexão de A como não confirmado.
    await clock.advance(1_000);
    const c = new LiveStateStore(redis, clock);
    await c.load(T);
    await c.applyReported(T, { travada: true });
    expect(c.lockConfirmed(T)).toBe(false);
  });

  it('N2: markReconnected mais velho (relógio atrasado) nunca baixa o reconnectAt do hash', async () => {
    const redis = new MemoryRedisStore();
    const t0 = Date.parse('2026-10-24T12:00:00Z');
    const a = new LiveStateStore(redis, new FakeClock(t0 + 10_000));
    const b = new LiveStateStore(redis, new FakeClock(t0));
    await a.markReconnected(T);
    await b.markReconnected(T);
    expect((await redis.hgetall(`iot:live:${T}`)).reconnectAt).toBe(String(t0 + 10_000));
  });

  it('teto do desired gravado por uma instância é lido pela outra', async () => {
    const redis = new MemoryRedisStore();
    const clock = new FakeClock(0);
    await new LiveStateStore(redis, clock).setDesiredLimit(T, 6);
    expect(await new LiveStateStore(redis, clock).desiredLimit(T)).toBe(6);
    expect(await new LiveStateStore(redis, clock).desiredLimit('outra')).toBeNull();
  });
});
