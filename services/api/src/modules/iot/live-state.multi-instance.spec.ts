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

  it('final fix wave: reconnectAt sempre gravado no hash (vazio = desconhecido)', async () => {
    const redis = new MemoryRedisStore();
    const clock = new FakeClock(Date.parse('2026-10-24T12:00:00Z'));
    const a = new LiveStateStore(redis, clock);
    await a.setOnline(T, true);
    expect((await redis.hgetall(`iot:live:${T}`)).reconnectAt).toBe('');
    await a.markReconnected(T);
    expect((await redis.hgetall(`iot:live:${T}`)).reconnectAt).toBe(String(clock.now()));
  });

  it('teto do desired gravado por uma instância é lido pela outra', async () => {
    const redis = new MemoryRedisStore();
    const clock = new FakeClock(0);
    await new LiveStateStore(redis, clock).setDesiredLimit(T, 6);
    expect(await new LiveStateStore(redis, clock).desiredLimit(T)).toBe(6);
    expect(await new LiveStateStore(redis, clock).desiredLimit('outra')).toBeNull();
  });
});
