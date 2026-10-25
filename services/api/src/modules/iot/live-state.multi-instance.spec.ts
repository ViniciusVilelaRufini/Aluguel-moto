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

  it('teto do desired gravado por uma instância é lido pela outra', async () => {
    const redis = new MemoryRedisStore();
    const clock = new FakeClock(0);
    await new LiveStateStore(redis, clock).setDesiredLimit(T, 6);
    expect(await new LiveStateStore(redis, clock).desiredLimit(T)).toBe(6);
    expect(await new LiveStateStore(redis, clock).desiredLimit('outra')).toBeNull();
  });
});
