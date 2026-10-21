import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV } from '../../common/events';
import { MemoryRedisStore } from '../../redis/redis-store';
import { AwsIotTransport } from './aws-iot.transport';
import { BaseIotGateway } from './base-iot-gateway';
import { FakeClock } from './clock';
import { loadIotConfig } from './iot-config';
import { LiveStateStore } from './live-state.store';
import { SafeLockService } from './safe-lock.service';
import type { DesiredState, IotTransport } from './shadow-transport';
import { TelemetryService } from './telemetry.service';

/**
 * Regressões da revisão (fix round 1): o invariante "nunca publicar travada:true com a moto podendo estar a ≥ 3 km/h"
 * precisa valer com velocidade velha, desconhecida ou replayed pelo polling do shadow.
 */
class GW extends BaseIotGateway {}
const T = 'moto-0001';
const T0 = Date.parse('2026-10-21T15:00:00Z');
const telemetry = (speed: number, ts = '2026-10-21T15:00:00Z') => ({ lat: -23.5, lng: -46.6, velocidade_kmh: speed, bateria_pct: 80, travada: false, ignicao: true, sinal: 4, timestamp: ts });
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
};

/** Cliente IoT Data Plane falso: o UpdateThingShadow do servidor muda a versão; o reported do rastreador é antigo (metadata). */
function awsClient(clock: FakeClock, reportedAtSec: number, reported: Record<string, unknown> = { travada: false, limite_kmh: 32, velocidade_kmh: 0 }) {
  let version = 10;
  const published: DesiredState[] = [];
  const meta: Record<string, { timestamp: number }> = {};
  for (const k of Object.keys(reported)) meta[k] = { timestamp: reportedAtSec };
  const client = {
    send: async (cmd: any) => {
      const n = cmd.constructor.name;
      if (n === 'UpdateThingShadowCommand') {
        version++;
        published.push(JSON.parse(new TextDecoder().decode(cmd.input.payload)).state.desired);
        return {};
      }
      if (n === 'GetThingShadowCommand') {
        return { payload: new TextEncoder().encode(JSON.stringify({ state: { reported }, metadata: { reported: meta }, version, timestamp: Math.floor(clock.now() / 1000) })) };
      }
      return {};
    },
  };
  return { client, published };
}

class FakeTransport implements IotTransport {
  desired: DesiredState[] = [];
  async updateDesired(_t: string, d: DesiredState) {
    this.desired.push(d);
  }
  async publishCommand() {}
  async start() {}
  async stop() {}
  locked() {
    return this.desired.some((d) => d.travada === true);
  }
  limits() {
    return this.desired.filter((d) => d.limite_kmh !== undefined).map((d) => d.limite_kmh);
  }
}

function localSetup(opts: { graceMs?: number } = {}) {
  const clock = new FakeClock(T0);
  const transport = new FakeTransport();
  const events = new EventEmitter2();
  const live = new LiveStateStore(new MemoryRedisStore(), clock, undefined, opts.graceMs);
  const gw = new GW(transport, live, clock, events, { confirmWaitMs: 1000, commandTimeoutMs: 30_000 });
  const tel = new TelemetryService(
    gw,
    { onPosition: async () => {} },
    { openRentalId: async () => undefined, invalidate: () => {} },
    { vehicle: { findUnique: async () => ({ id: 'v1' }) }, trackPoint: { create: async () => ({}) } } as any,
    events,
    clock,
    { trackRetentionDays: 90 },
  );
  return { clock, transport, events, live, gw, tel };
}

/**
 * Caminho aws real: telemetria pela fila SQS `telemetria` (regra IoT com `thingName`/`ingestedAt`), reported pelo polling do
 * shadow (`GetThingShadow` com metadata) e **nenhum** evento de presença (eles vão para o EventBridge).
 */
async function awsSetup(opts: { gapMs?: number } = {}) {
  const clock = new FakeClock(T0);
  let reported: Record<string, unknown> = {};
  let at = 0;
  let version = 0;
  const published: DesiredState[] = [];
  const client = {
    send: async (cmd: any) => {
      if (cmd.constructor.name === 'UpdateThingShadowCommand') {
        published.push(JSON.parse(new TextDecoder().decode(cmd.input.payload)).state.desired);
        return {};
      }
      if (cmd.constructor.name !== 'GetThingShadowCommand') return {};
      const meta: Record<string, { timestamp: number }> = {};
      for (const k of Object.keys(reported)) meta[k] = { timestamp: at };
      return { payload: new TextEncoder().encode(JSON.stringify({ state: { reported }, metadata: { reported: meta }, version })) };
    },
  };
  let handler!: (m: unknown) => Promise<void>;
  const queue = { publish: async () => undefined, subscribe: (_q: string, h: (m: unknown) => Promise<void>) => (handler = h) };
  const transport = new AwsIotTransport(client as any, queue as any, { pollMs: 0 });
  const events = new EventEmitter2();
  const live = new LiveStateStore(new MemoryRedisStore(), clock);
  const gw = new GW(transport, live, clock, events, { confirmWaitMs: 100, commandTimeoutMs: 30_000 });
  const telOpts = { trackRetentionDays: 90, ...(opts.gapMs !== undefined ? { reconnectGapMs: opts.gapMs } : {}) };
  const tel = new TelemetryService(gw, { onPosition: async () => {} }, { openRentalId: async () => undefined, invalidate: () => {} }, { vehicle: { findUnique: async () => ({ id: 'v1' }) }, trackPoint: { create: async () => ({}) } } as any, events, clock, telOpts);
  await transport.start(tel);
  /** Uma mensagem da fila SQS `telemetria`. */
  const sqs = (body: object) => handler({ ...body, thingName: T, ingestedAt: clock.now() });
  /** O rastreador escreve no shadow agora (metadata em segundos). */
  const shadow = (r: Record<string, unknown>) => {
    reported = r;
    at = Math.floor(clock.now() / 1000);
    version++;
  };
  /** Andando (telemetria a cada 5 s, relógio do rastreador `ahead` ms adiantado) até passar a graça; termina 5 s depois da última. */
  const ride = async (kmh: number, ahead = 0) => {
    for (let i = 0; i < 4; i++) {
      await sqs(telemetry(kmh, new Date(clock.now() + ahead).toISOString()));
      await clock.advance(5_000);
    }
  };
  return { clock, published, gw, tel, transport, sqs, shadow, ride, locked: () => published.some((d) => d.travada === true) };
}

describe('Bloqueio seguro — regressões da revisão', () => {
  it('aws: polling que devolve reported.velocidade_kmh antigo (0) não trava moto andando a 25 km/h (repro do revisor)', async () => {
    const clock = new FakeClock(T0);
    // reported do rastreador é de 1 min atrás; a telemetria de agora diz 25 km/h.
    const { client, published } = awsClient(clock, Math.floor(T0 / 1000) - 60);
    const transport = new AwsIotTransport(client as any, { subscribe: () => undefined } as any, { pollMs: 0 });
    const live = new LiveStateStore(new MemoryRedisStore(), clock);
    const gw = new GW(transport, live, clock, new EventEmitter2(), { confirmWaitMs: 3000, commandTimeoutMs: 30000 });
    await transport.start({ telemetry: async () => {}, deviceEvent: async () => {}, presence: async () => {}, reported: (t: string, r: any, m: any) => gw.onReported(t, r, m) } as any);
    await live.applyTelemetry(T, telemetry(25));
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await flush();
    await transport.pollOnce();
    await transport.pollOnce();
    await clock.advance(5000);
    await p;
    expect(published).toEqual([{ limite_kmh: 15 }]);
    expect(live.get(T)!.speedKmh).toBe(25);
  });

  it('aws: lock de moto offline — o polling não marca online, não emite iot.connectivity e não trava (repro do revisor)', async () => {
    const clock = new FakeClock(T0);
    const { client, published } = awsClient(clock, Math.floor(T0 / 1000) - 600);
    const transport = new AwsIotTransport(client as any, { subscribe: () => undefined } as any, { pollMs: 0 });
    const live = new LiveStateStore(new MemoryRedisStore(), clock);
    const events = new EventEmitter2();
    const conn: unknown[] = [];
    events.on(EV.IOT_CONNECTIVITY, (e) => conn.push(e));
    const gw = new GW(transport, live, clock, events, { confirmWaitMs: 3000, commandTimeoutMs: 30000 });
    const tel = new TelemetryService(gw, { onPosition: async () => {} }, { openRentalId: async () => undefined, invalidate: () => {} }, { vehicle: { findUnique: async () => ({ id: 'v1' }) } } as any, events, clock, { trackRetentionDays: 90 });
    await transport.start(tel);
    await live.applyTelemetry(T, telemetry(0));
    await live.setOnline(T, false);
    const r = await gw.lock({ commandId: 'c1', thingName: T });
    await transport.pollOnce();
    expect(r).toEqual({ commandId: 'c1', status: 'pending', reason: 'offline' });
    expect(published).toEqual([]);
    expect(conn).toEqual([]);
    expect(gw.live.isOnline(T)).toBe(false);
  });

  it('aws: reported novo do rastreador (metadata mais recente) é aceito — velocidade 1 trava, limite confirma degrau', async () => {
    const clock = new FakeClock(T0);
    let reported: Record<string, unknown> = { limite_kmh: 32, velocidade_kmh: 25 };
    let at = Math.floor(T0 / 1000);
    const published: DesiredState[] = [];
    const client = {
      send: async (cmd: any) => {
        if (cmd.constructor.name === 'UpdateThingShadowCommand') {
          published.push(JSON.parse(new TextDecoder().decode(cmd.input.payload)).state.desired);
          return {};
        }
        const meta: Record<string, { timestamp: number }> = {};
        for (const k of Object.keys(reported)) meta[k] = { timestamp: at };
        return { payload: new TextEncoder().encode(JSON.stringify({ state: { reported }, metadata: { reported: meta }, version: at })) };
      },
    };
    const transport = new AwsIotTransport(client as any, { subscribe: () => undefined } as any, { pollMs: 0 });
    const live = new LiveStateStore(new MemoryRedisStore(), clock);
    const gw = new GW(transport, live, clock, new EventEmitter2(), { confirmWaitMs: 100, commandTimeoutMs: 30000 });
    await transport.start({ telemetry: async () => {}, deviceEvent: async () => {}, presence: async () => {}, reported: (t: string, r: any, m: any) => gw.onReported(t, r, m) } as any);
    await live.applyTelemetry(T, telemetry(25));
    await clock.advance(10_000); // graça pós-reconexão (revisão 5): a primeira amostra abre a conexão
    await live.applyTelemetry(T, telemetry(25, new Date(clock.now()).toISOString()));
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(100);
    await p;
    await clock.advance(2000);
    at = Math.floor(clock.now() / 1000);
    reported = { limite_kmh: 15, velocidade_kmh: 1 };
    await transport.pollOnce();
    expect(published).toEqual([{ limite_kmh: 15 }, { travada: true }]);
  });

  it('presença chega antes do reported: não trava com a velocidade de antes da desconexão; reported 25 não trava; amostra nova < 3 trava', async () => {
    const { transport, tel, gw, clock } = localSetup();
    await tel.telemetry(T, telemetry(0)); // estava parada
    await tel.presence(T, false);
    const r = await gw.lock({ commandId: 'c1', thingName: T });
    expect(r.status).toBe('pending');
    await tel.presence(T, true); // reconecta (pode ter sido levada: roubada)
    expect(transport.locked()).toBe(false);
    expect(transport.limits()).toEqual([15]); // velocidade desconhecida = tratada como em movimento
    await clock.advance(10_000); // graça pós-reconexão (revisão 5)
    await tel.reported(T, { limite_kmh: 15, velocidade_kmh: 25 });
    expect(transport.locked()).toBe(false);
    await tel.reported(T, { velocidade_kmh: 2 });
    expect(transport.locked()).toBe(true);
  });

  it('sem estado ao vivo nenhum → lock não trava na hora (pending/offline)', async () => {
    const { transport, gw } = localSetup();
    const r = await gw.lock({ commandId: 'c1', thingName: 'moto-0042' });
    expect(r).toEqual({ commandId: 'c1', status: 'pending', reason: 'offline' });
    expect(transport.desired).toEqual([]);
  });

  it('velocidade 0 mas velha (> 10 s) com a moto online → rampa, não trava direto', async () => {
    const { transport, tel, gw, clock, live } = localSetup();
    // Parada (ignição desligada, telemetria a cada 60 s). Aquecimento além da graça: a amostra 0 vale enquanto fresca.
    const parked = (ms: number) => ({ ...telemetry(0, new Date(ms).toISOString()), ignicao: false });
    await tel.telemetry(T, parked(clock.now()));
    await clock.advance(60_000);
    await tel.telemetry(T, parked(clock.now()));
    expect(live.knownSpeed(T)).toBe(0); // aceita: o que segue testa só o frescor
    await clock.advance(30_000);
    expect(live.knownSpeed(T)).toBeNull();
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(1000);
    await p;
    expect(transport.locked()).toBe(false);
    expect(transport.limits()).toEqual([15]);
    await tel.reported(T, { limite_kmh: 15, velocidade_kmh: 0 }); // F4: o rastreador reporta a velocidade com o delta
    expect(transport.locked()).toBe(true);
  });

  it('did_not_stop mantém o limite em 0: setSpeedLimit (zona) recusado até um unlock explícito, mesmo depois de reiniciar', async () => {
    const { transport, tel, gw, clock, live } = localSetup();
    await tel.telemetry(T, telemetry(25));
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(1000);
    await p;
    await clock.advance(120_000);
    expect(transport.limits()[transport.limits().length - 1]).toBe(0);
    const before = transport.desired.length;
    expect((await gw.setSpeedLimit({ commandId: 'c2', thingName: T }, 32)).status).toBe('failed');
    expect(transport.desired.length).toBe(before);
    // "Reinício": novo gateway sobre o mesmo Redis continua segurando.
    const redisLive = new LiveStateStore((live as any).redis, clock);
    const gw2 = new GW(transport, redisLive, clock, new EventEmitter2(), { confirmWaitMs: 1000, commandTimeoutMs: 30_000 });
    expect((await gw2.setSpeedLimit({ commandId: 'c3', thingName: T }, 20)).status).toBe('failed');
    const u = gw.unlock({ commandId: 'c4', thingName: T });
    await tel.reported(T, { travada: false, limite_kmh: 32 });
    await u;
    const s = gw.setSpeedLimit({ commandId: 'c5', thingName: T }, 20);
    await tel.reported(T, { limite_kmh: 20 });
    expect((await s).status).toBe('confirmed');
  });
});

describe('SafeLockService — menores da revisão', () => {
  class Tx {
    desired: DesiredState[] = [];
    async updateDesired(_t: string, d: DesiredState) {
      this.desired.push(d);
    }
    async publishCommand() {}
  }

  it('timer de degrau antigo não avança uma rampa nova (identidade)', async () => {
    const clock = new FakeClock(T0);
    const tx = new Tx();
    const svc = new SafeLockService(clock, tx, () => undefined);
    await svc.start({ commandId: 'a', thingName: T }, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    await svc.onReported(T, { limite_kmh: 15 }); // agenda o degrau 8 em 2 s
    svc.cancel(T);
    await svc.start({ commandId: 'b', thingName: T }, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true }); // publica 15
    await clock.advance(2000);
    expect(tx.desired).toEqual([{ limite_kmh: 15 }, { limite_kmh: 15 }]); // o timer velho não publicou 8
  });

  it('ack do degrau só aceita reported mais novo que a publicação do degrau', async () => {
    const clock = new FakeClock(T0);
    const tx = new Tx();
    const svc = new SafeLockService(clock, tx, () => undefined);
    await clock.advance(5000);
    await svc.start({ commandId: 'a', thingName: T }, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    await svc.onReported(T, { limite_kmh: 0 }, { limite_kmh: T0 }); // reported antigo (antes do degrau)
    await clock.advance(5000);
    expect(tx.desired).toEqual([{ limite_kmh: 15 }]);
    await svc.onReported(T, { limite_kmh: 15 }, { limite_kmh: clock.now() });
    await clock.advance(2000);
    expect(tx.desired).toEqual([{ limite_kmh: 15 }, { limite_kmh: 8 }]);
  });

  it('velocidade desconhecida (null) = em movimento: rampa', async () => {
    const clock = new FakeClock(T0);
    const tx = new Tx();
    const svc = new SafeLockService(clock, tx, () => undefined);
    await svc.start({ commandId: 'a', thingName: T }, { speedKmh: null, speedLimitKmh: 32, locked: false, online: true });
    expect(tx.desired).toEqual([{ limite_kmh: 15 }]);
  });
});

describe('Bloqueio seguro — regressões da revisão 2', () => {
  const iso = (ms: number) => new Date(ms).toISOString();

  it('telemetria velha (fila offline do cliente MQTT, 3 min) com 0 km/h chegando depois da reconexão não trava', async () => {
    const { transport, tel, gw, clock, live } = localSetup();
    await tel.telemetry(T, telemetry(25, iso(clock.now())));
    await tel.presence(T, false);
    await gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(5 * 60_000);
    await tel.presence(T, true);
    expect(transport.limits()).toEqual([15]);
    // A amostra velha chega depois da graça (e sem lacuna ≥ 15 s): só o frescor / "não antes da reconexão" a rejeitam.
    await clock.advance(10_000);
    const old = await live.applyTelemetry(T, telemetry(0, iso(clock.now() - 3 * 60_000)));
    expect(old.speedAccepted).toBe(false); // direto no store: a regra do atraso (TelemetryService) não entra aqui
    expect(transport.locked()).toBe(false);
    await clock.advance(1_000);
    await tel.telemetry(T, telemetry(1, iso(clock.now())));
    expect(transport.locked()).toBe(true);
  });

  it('telemetria fora de ordem: 0 mais antigo depois de 25 mais novo não trava', async () => {
    const { transport, tel, gw, clock, live } = localSetup();
    await tel.telemetry(T, telemetry(25, iso(clock.now())));
    await clock.advance(10_000); // aquecimento além da graça: o 25 seguinte é aceito
    await tel.telemetry(T, telemetry(25, iso(clock.now())));
    expect(live.knownSpeed(T)).toBe(25);
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(1000);
    await p;
    expect(transport.limits()).toEqual([15]);
    await tel.telemetry(T, telemetry(0, iso(clock.now() - 3000))); // fresca (3 s), fora da graça, mas mais velha que o 25
    expect(transport.locked()).toBe(false);
    expect(live.knownSpeed(T)).toBe(25);
    expect((await gw.getLiveState(T))!.speedKmh).toBe(25); // exibição também não volta
    await tel.telemetry(T, telemetry(1, iso(clock.now())));
    expect(transport.locked()).toBe(true);
  });

  it('velocidade lida do polling com horário no futuro é limitada a agora (não bloqueia amostras seguintes)', async () => {
    const clock = new FakeClock(T0);
    const live = new LiveStateStore(new MemoryRedisStore(), clock);
    live.markReconnected(T);
    await clock.advance(10_000); // graça pós-reconexão (revisão 5)
    const r = await live.applyReported(T, { velocidade_kmh: 0 }, { fromPoll: true, speedAt: clock.now() + 60_000 });
    expect(r.speedAccepted).toBe(true);
    await clock.advance(1000);
    const t = await live.applyTelemetry(T, telemetry(25, iso(clock.now())));
    expect(t.speedAccepted).toBe(true);
    expect(live.knownSpeed(T)).toBe(25);
  });

  it('isHeld falha fechada: erro no Redis recusa mudar o limite e não fica em cache', async () => {
    const clock = new FakeClock(T0);
    const redis = new MemoryRedisStore();
    const realGet = redis.get.bind(redis);
    let broken = true;
    redis.get = async (k: string) => {
      if (broken && k.startsWith('iot:held:')) throw new Error('redis fora');
      return realGet(k);
    };
    const transport = new FakeTransport();
    const live = new LiveStateStore(redis, clock);
    const gw = new GW(transport, live, clock, new EventEmitter2(), { confirmWaitMs: 100, commandTimeoutMs: 30_000 });
    await live.applyTelemetry(T, telemetry(0, iso(clock.now())));
    expect((await gw.setSpeedLimit({ commandId: 'c1', thingName: T }, 20)).status).toBe('failed');
    expect(transport.desired).toEqual([]);
    broken = false;
    const p = gw.setSpeedLimit({ commandId: 'c2', thingName: T }, 20);
    await clock.advance(100);
    expect((await p).status).toBe('in_progress');
    expect(transport.desired).toEqual([{ limite_kmh: 20 }]);
  });

  it('setHeld propaga erro de escrita (unlock não solta em silêncio)', async () => {
    const clock = new FakeClock(T0);
    const redis = new MemoryRedisStore();
    redis.del = async () => {
      throw new Error('redis fora');
    };
    const live = new LiveStateStore(redis, clock);
    await live.setHeld(T, true);
    await expect(live.setHeld(T, false)).rejects.toThrow('redis fora');
    expect(await live.isHeld(T)).toBe(true);
  });

  it('lock que expira em "locking" segura o limite em 0 (setSpeedLimit recusado até unlock)', async () => {
    const { transport, tel, gw, clock } = localSetup();
    await tel.telemetry(T, telemetry(0, iso(clock.now())));
    await clock.advance(10_000); // graça pós-reconexão (revisão 5)
    await tel.telemetry(T, telemetry(0, iso(clock.now())));
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(1000);
    await p;
    expect(transport.desired).toEqual([{ travada: true }]);
    await clock.advance(120_000);
    expect(transport.desired[transport.desired.length - 1]).toEqual({ travada: false, limite_kmh: 0 });
    expect((await gw.setSpeedLimit({ commandId: 'c2', thingName: T }, 32)).status).toBe('failed');
  });

  it('novo lock numa moto segurada em 0 que ainda não reportou 0: o primeiro degrau não sobe acima do desired (0)', async () => {
    const { transport, tel, gw, clock } = localSetup();
    await tel.telemetry(T, telemetry(25, iso(clock.now())));
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(1000);
    await p;
    await clock.advance(120_000); // did_not_stop; o rastreador nunca reportou limite (reported continua 32)
    expect((await gw.getLiveState(T))!.speedLimitKmh).toBe(32);
    const before = transport.desired.length;
    await tel.telemetry(T, telemetry(25, iso(clock.now())));
    const q = gw.lock({ commandId: 'c2', thingName: T });
    await clock.advance(1000);
    await q;
    const after = transport.desired.slice(before);
    expect(after[0]).toEqual({ limite_kmh: 0 });
    expect(after.every((d) => d.limite_kmh === undefined || d.limite_kmh === 0)).toBe(true);
  });

  it('degraus nunca acima do último desired publicado (limite de zona 6 ainda não reportado)', async () => {
    const { transport, tel, gw, clock } = localSetup();
    await tel.telemetry(T, telemetry(5, iso(clock.now())));
    const s = gw.setSpeedLimit({ commandId: 'z', thingName: T }, 6); // reported continua 32
    await clock.advance(1000);
    await s;
    await tel.telemetry(T, telemetry(5, iso(clock.now())));
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(1000);
    await p;
    expect(transport.desired.slice(1)[0]).toEqual({ limite_kmh: 6 });
  });
});

describe('Bloqueio seguro — regressões da revisão 3', () => {
  const iso = (ms: number) => new Date(ms).toISOString();

  it('relógio do rastreador 60 s adiantado: 0 km/h enfileirado (ts T+1) chegando depois de 25 (ts T+2) não trava', async () => {
    const { transport, tel, gw, clock } = localSetup();
    const ahead = 60_000;
    await tel.telemetry(T, telemetry(20, iso(clock.now() + ahead))); // aquece (primeira mensagem = reconexão)
    await clock.advance(15_000); // relógio adiantado: fora da graça de 10 s da reconexão (revisão 4)
    const t = clock.now();
    await tel.telemetry(T, telemetry(25, iso(t + ahead + 2_000)));
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(1000);
    await p;
    expect(transport.limits()).toEqual([15]);
    await clock.advance(500);
    await tel.telemetry(T, telemetry(0, iso(t + ahead + 1_000))); // mais antiga pelo relógio do rastreador
    expect(transport.locked()).toBe(false);
    await clock.advance(1000);
    await tel.telemetry(T, telemetry(1, iso(clock.now() + ahead))); // nova de verdade
    expect(transport.locked()).toBe(true);
  });

  it('reconexão percebida pela telemetria (sem evento de presença) também invalida amostras de antes', async () => {
    // Graça 0: isola a regra "não antes da reconexão" (com a graça, qualquer amostra logo depois da reconexão já seria rejeitada).
    const { transport, tel, gw, clock } = localSetup({ graceMs: 0 });
    await tel.telemetry(T, telemetry(25, iso(clock.now())));
    await clock.advance(1000);
    await tel.telemetry(T, telemetry(25, iso(clock.now())));
    await clock.advance(200_000); // vigia: offline
    await tel.sweepStale();
    expect(gw.live.isOnline(T)).toBe(false);
    await gw.lock({ commandId: 'c1', thingName: T });
    // primeira mensagem depois da queda: amostra enfileirada de 2 s atrás (antes da reconexão) com 0 km/h
    await tel.telemetry(T, telemetry(0, iso(clock.now() - 2_000)));
    expect(transport.locked()).toBe(false);
    expect(transport.limits()).toEqual([15]);
    await clock.advance(500);
    await tel.telemetry(T, telemetry(1, iso(clock.now()))); // posterior à reconexão: vale (graça 0)
    expect(transport.locked()).toBe(true);
  });

  it('desired que falhou ao publicar não vira teto da rampa', async () => {
    const { transport, tel, gw, clock } = localSetup();
    await tel.telemetry(T, telemetry(5, iso(clock.now())));
    await clock.advance(1000);
    await tel.telemetry(T, telemetry(5, iso(clock.now())));
    const z = gw.setSpeedLimit({ commandId: 'z6', thingName: T }, 6); // publicado; reported continua 32
    await clock.advance(1000);
    await z;
    const orig = transport.updateDesired.bind(transport);
    transport.updateDesired = async () => {
      throw new Error('broker fora');
    };
    await expect(gw.setSpeedLimit({ commandId: 'z32', thingName: T }, 32)).rejects.toThrow('broker fora');
    transport.updateDesired = orig;
    // o 32 nunca chegou ao shadow: o teto continua 6
    await tel.telemetry(T, telemetry(5, iso(clock.now())));
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(1000);
    await p;
    expect(transport.desired[1]).toEqual({ limite_kmh: 6 });
  });
});

describe('Bloqueio seguro — regressões da revisão 4 (relógio adiantado × reconexão; timestamp no futuro distante)', () => {
  const iso = (ms: number) => new Date(ms).toISOString();
  const AHEAD = 60_000;

  it('relógio 60 s adiantado, queda de 3 s: o 0 km/h enfileirado antes da queda chega primeiro depois da reconexão e não trava; amostra ao vivo < 3 depois da graça trava', async () => {
    const { transport, tel, gw, clock } = localSetup();
    await tel.telemetry(T, telemetry(25, iso(clock.now() + AHEAD)));
    await clock.advance(20_000);
    await tel.telemetry(T, telemetry(25, iso(clock.now() + AHEAD)));
    await clock.advance(1_000);
    // parou por um instante e o rastreador caiu logo depois; a amostra ficou na fila offline do cliente MQTT
    const queued = telemetry(0, iso(clock.now() + AHEAD));
    await clock.advance(500);
    await tel.presence(T, false);
    expect((await gw.lock({ commandId: 'c1', thingName: T })).status).toBe('pending');
    await clock.advance(3_000); // queda curta: a moto pode estar andando de novo
    await tel.presence(T, true);
    expect(transport.limits()).toEqual([15]); // rampa começa com velocidade desconhecida
    await tel.telemetry(T, queued); // timestamp bruto > agora (relógio adiantado) e ≥ reconexão depois do min(raw, now)
    expect(transport.locked()).toBe(false);
    // amostras ao vivo < 3 ainda dentro da graça: não valem para travar
    await clock.advance(2_000);
    await tel.telemetry(T, telemetry(2, iso(clock.now() + AHEAD)));
    expect(transport.locked()).toBe(false);
    // depois da graça (10 s desde a reconexão), amostra ao vivo < 3 trava
    await clock.advance(9_000);
    await tel.telemetry(T, telemetry(1, iso(clock.now() + AHEAD)));
    expect(transport.locked()).toBe(true);
  });

  it('relógio adiantado: amostra vista na graça é rejeitada mas o timestamp conta; depois da graça só vale timestamp bruto estritamente maior', async () => {
    const clock = new FakeClock(T0);
    const live = new LiveStateStore(new MemoryRedisStore(), clock);
    live.markReconnected(T);
    const flushed = clock.now() + AHEAD; // amostra da fila offline, vista durante a graça
    expect((await live.applyTelemetry(T, telemetry(2, iso(flushed)))).speedAccepted).toBe(false);
    await clock.advance(11_000);
    expect((await live.applyTelemetry(T, telemetry(0, iso(flushed - 1_000)))).speedAccepted).toBe(false); // atrasada: timestamp menor que o já visto
    expect((await live.applyTelemetry(T, telemetry(0, iso(flushed)))).speedAccepted).toBe(false); // igual ao já visto também não
    expect(live.knownSpeed(T)).toBeNull();
    expect((await live.applyTelemetry(T, telemetry(1, iso(clock.now() + AHEAD)))).speedAccepted).toBe(true);
    expect(live.knownSpeed(T)).toBe(1);
  });

  it('exibição: reconexão zera a ordem — relógio corrigido para trás depois do reinício não congela o iot.telemetry', async () => {
    const { tel, gw, clock, events } = localSetup();
    const shown: number[] = [];
    events.on(EV.IOT_TELEMETRY, (e: { speedKmh: number }) => shown.push(e.speedKmh));
    await tel.telemetry(T, telemetry(10, iso(clock.now() + 5 * 60_000))); // relógio 5 min adiantado (dentro da tolerância)
    await clock.advance(5_000);
    await tel.presence(T, false);
    await clock.advance(5_000);
    await tel.presence(T, true); // reiniciou e acertou o relógio
    await tel.telemetry(T, telemetry(11, iso(clock.now())));
    expect(shown).toEqual([10, 11]);
    expect((await gw.getLiveState(T))!.speedKmh).toBe(11);
  });

  it('exibição: um timestamp no futuro distante (RTC ruim) não congela a posição nem o iot.telemetry das mensagens seguintes', async () => {
    const { tel, gw, clock, events } = localSetup();
    const shown: number[] = [];
    events.on(EV.IOT_TELEMETRY, (e: { speedKmh: number }) => shown.push(e.speedKmh));
    await tel.telemetry(T, telemetry(10, iso(clock.now())));
    await clock.advance(5_000);
    await tel.telemetry(T, telemetry(12, iso(clock.now() + 60 * 60_000))); // 1 h no futuro: não ordena
    await clock.advance(5_000);
    await tel.telemetry(T, telemetry(14, iso(clock.now())));
    expect(shown).toEqual([10, 12, 14]);
    expect((await gw.getLiveState(T))!.speedKmh).toBe(14);
  });

  it('trava: timestamp no futuro distante nunca vale para travar e não bloqueia a amostra sã seguinte', async () => {
    const { transport, tel, gw, clock } = localSetup();
    await tel.telemetry(T, telemetry(25, iso(clock.now())));
    await clock.advance(15_000);
    await tel.telemetry(T, telemetry(25, iso(clock.now())));
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(1_000);
    await p;
    expect(transport.limits()).toEqual([15]);
    await tel.telemetry(T, telemetry(0, iso(clock.now() + 60 * 60_000))); // 1 h no futuro: desconhecida = em movimento
    expect(transport.locked()).toBe(false);
    await clock.advance(1_000);
    await tel.telemetry(T, telemetry(1, iso(clock.now()))); // sã, mais nova de verdade
    expect(transport.locked()).toBe(true);
  });

  it('graça configurável: com reconnectGraceMs menor a amostra vale antes', async () => {
    const clock = new FakeClock(T0);
    const live = new LiveStateStore(new MemoryRedisStore(), clock, 180_000, 2_000);
    live.markReconnected(T);
    await clock.advance(1_000);
    expect((await live.applyTelemetry(T, telemetry(1, iso(clock.now() + AHEAD)))).speedAccepted).toBe(false);
    await clock.advance(1_500);
    expect((await live.applyTelemetry(T, telemetry(1, iso(clock.now() + AHEAD)))).speedAccepted).toBe(true);
  });
});

describe('Bloqueio seguro — regressões da revisão 5 (graça incondicional depois de qualquer reconexão, para toda origem)', () => {
  const iso = (ms: number) => new Date(ms).toISOString();
  const AHEAD = 60_000;

  /** Moto andando, online e fora da graça, com uma amostra de 25 km/h aceita. */
  async function riding(tel: TelemetryService, clock: FakeClock) {
    await tel.telemetry(T, telemetry(25, iso(clock.now() + AHEAD)));
    await clock.advance(20_000);
    await tel.telemetry(T, telemetry(25, iso(clock.now() + AHEAD)));
  }

  it('relógio 60 s adiantado, queda de 59,5 s: o 0 da fila chega 100 ms depois da reconexão com timestamp dentro de [reconexão, agora + 1 s] e não trava', async () => {
    const { transport, tel, gw, clock, live } = localSetup();
    await riding(tel, clock);
    await clock.advance(1_000);
    const queued = telemetry(0, iso(clock.now() + AHEAD)); // parou, a amostra ficou na fila e o rastreador caiu
    await tel.presence(T, false);
    expect((await gw.lock({ commandId: 'c1', thingName: T })).status).toBe('pending');
    await clock.advance(59_500);
    await tel.presence(T, true);
    expect(transport.limits()).toEqual([15]);
    await clock.advance(100);
    await tel.telemetry(T, queued); // timestamp bruto = agora + 0,4 s: não "prova" o relógio adiantado, mas foi medida há 59,6 s
    expect(live.knownSpeed(T)).toBeNull();
    expect(transport.locked()).toBe(false);
    await clock.advance(10_000);
    await tel.telemetry(T, telemetry(1, iso(clock.now() + AHEAD)));
    expect(transport.locked()).toBe(true);
  });

  it('reported.velocidade_kmh 0 (MQTT) enfileirado offline e reenviado logo depois da reconexão não trava; depois da graça trava', async () => {
    const { transport, tel, gw, clock } = localSetup();
    await riding(tel, clock);
    await tel.presence(T, false);
    expect((await gw.lock({ commandId: 'c1', thingName: T })).status).toBe('pending');
    await clock.advance(30_000);
    await tel.presence(T, true);
    expect(transport.limits()).toEqual([15]);
    await tel.reported(T, { limite_kmh: 15, velocidade_kmh: 0 }); // hora de chegada = agora, mas pode ser a fila de updates do shadow
    expect(transport.locked()).toBe(false);
    await clock.advance(5_000);
    await tel.reported(T, { velocidade_kmh: 0 });
    expect(transport.locked()).toBe(false);
    await clock.advance(5_000);
    await tel.reported(T, { velocidade_kmh: 1 });
    expect(transport.locked()).toBe(true);
  });

  it('aws: reported.velocidade_kmh 0 lido do shadow (polling, metadata = agora) logo depois de uma queda curta não trava; depois da graça trava', async () => {
    // Caminho aws real: sem eventos de presença; a reconexão é percebida pela lacuna (ver bloco "revisão 4b").
    const s = await awsSetup();
    await s.ride(25);
    const p = s.gw.lock({ commandId: 'c1', thingName: T }); // 25 km/h há 5 s: rampa
    await s.clock.advance(100);
    await p;
    expect(s.published).toEqual([{ limite_kmh: 15 }]);
    await s.clock.advance(30_000); // queda de ~30 s: a vigia (180 s) não percebe
    expect(s.gw.live.isOnline(T)).toBe(true);
    s.shadow({ limite_kmh: 15, velocidade_kmh: 0 }); // F5 ao reconectar (ou um update da fila de shadow)
    await s.transport.pollOnce(); // o limite 15 confirma o degrau; a velocidade 0 não vale (graça aberta pela lacuna)
    expect(s.gw.live.knownSpeed(T)).toBeNull();
    expect(s.published).toEqual([{ limite_kmh: 15 }]);
    await s.clock.advance(10_000); // o degrau 8 sai pelo timer (sem ack, a rampa para nele)
    expect(s.published).toEqual([{ limite_kmh: 15 }, { limite_kmh: 8 }]);
    s.shadow({ limite_kmh: 15, velocidade_kmh: 1 });
    await s.transport.pollOnce();
    expect(s.published).toEqual([{ limite_kmh: 15 }, { limite_kmh: 8 }, { travada: true }]);
  });

  it('processo novo (sem reconexão conhecida): a primeira amostra abre a graça; só depois dela a velocidade vale', async () => {
    const clock = new FakeClock(T0);
    const live = new LiveStateStore(new MemoryRedisStore(), clock);
    expect((await live.applyTelemetry(T, telemetry(0, iso(clock.now())))).speedAccepted).toBe(false);
    expect(live.knownSpeed(T)).toBeNull();
    await clock.advance(5_000);
    expect((await live.applyReported(T, { velocidade_kmh: 0 })).speedAccepted).toBe(false);
    await clock.advance(5_000);
    expect((await live.applyTelemetry(T, telemetry(0, iso(clock.now())))).speedAccepted).toBe(true);
    expect(live.knownSpeed(T)).toBe(0);
  });

  it('durante a graça o timestamp bruto de toda telemetria conta: depois dela, amostra com timestamp igual ou menor continua rejeitada (relógio em dia)', async () => {
    const clock = new FakeClock(T0);
    const live = new LiveStateStore(new MemoryRedisStore(), clock);
    live.markReconnected(T);
    const seen = clock.now();
    expect((await live.applyTelemetry(T, telemetry(2, iso(seen)))).speedAccepted).toBe(false);
    await clock.advance(10_000);
    expect((await live.applyTelemetry(T, telemetry(0, iso(seen)))).speedAccepted).toBe(false);
    expect((await live.applyTelemetry(T, telemetry(1, iso(clock.now())))).speedAccepted).toBe(true);
  });
});

describe('Bloqueio seguro — regressões da revisão 4b (reconexão percebida pela lacuna de telemetria; modo aws sem presença)', () => {
  const iso = (ms: number) => new Date(ms).toISOString();
  const AHEAD = 60_000;

  it('aws (repro): relógio 60 s adiantado, queda de 59,5 s, o 0 da fila chega pelo SQS — não vale; lock faz rampa; amostra ao vivo depois da graça trava', async () => {
    const s = await awsSetup();
    await s.ride(25, AHEAD);
    const queued = telemetry(0, iso(s.clock.now() + AHEAD)); // parou; a amostra ficou na fila offline e o rastreador caiu
    await s.clock.advance(59_500); // < 180 s: a vigia de inatividade não percebe a queda
    expect(s.gw.live.isOnline(T)).toBe(true);
    await s.sqs(queued);
    expect(s.gw.live.knownSpeed(T)).toBeNull();
    const p = s.gw.lock({ commandId: 'c1', thingName: T });
    await s.clock.advance(100);
    await p;
    expect(s.locked()).toBe(false);
    expect(s.published).toEqual([{ limite_kmh: 15 }]);
    await s.clock.advance(5_000);
    await s.sqs(telemetry(1, iso(s.clock.now() + AHEAD))); // ainda na graça
    expect(s.locked()).toBe(false);
    await s.clock.advance(5_000);
    await s.sqs(telemetry(1, iso(s.clock.now() + AHEAD)));
    expect(s.locked()).toBe(true);
  });

  it('aws: lacuna menor que o limite (andando, 5 s) não abre graça — a amostra fresca vale direto', async () => {
    const s = await awsSetup();
    await s.ride(25);
    await s.sqs(telemetry(0, iso(s.clock.now())));
    expect(s.gw.live.knownSpeed(T)).toBe(0);
    const p = s.gw.lock({ commandId: 'c1', thingName: T });
    await s.clock.advance(100);
    await p;
    expect(s.published).toEqual([{ travada: true }]);
  });

  it('aws: lacuna percebida pela metadata do polling (o shadow chega antes da telemetria); a telemetria da fila depois também não vale', async () => {
    const s = await awsSetup();
    await s.ride(25, AHEAD);
    const queued = telemetry(0, iso(s.clock.now() + AHEAD));
    const p = s.gw.lock({ commandId: 'c1', thingName: T });
    await s.clock.advance(100);
    await p;
    expect(s.published).toEqual([{ limite_kmh: 15 }]);
    await s.clock.advance(40_000);
    s.shadow({ velocidade_kmh: 0 });
    await s.transport.pollOnce();
    await s.sqs(queued);
    expect(s.gw.live.knownSpeed(T)).toBeNull();
    expect(s.locked()).toBe(false);
  });

  it('local: o mesmo vale sem evento de presença (last will perdido) — queda de 20 s andando, 0 da fila não vale', async () => {
    const { transport, tel, gw, clock, live } = localSetup();
    await tel.telemetry(T, telemetry(25, iso(clock.now() + AHEAD)));
    await clock.advance(10_000);
    await tel.telemetry(T, telemetry(25, iso(clock.now() + AHEAD)));
    await clock.advance(5_000);
    const queued = telemetry(0, iso(clock.now() + AHEAD));
    await clock.advance(20_000);
    await tel.telemetry(T, queued);
    expect(live.knownSpeed(T)).toBeNull();
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(1_000);
    await p;
    expect(transport.locked()).toBe(false);
    expect(transport.limits()).toEqual([15]);
  });

  it('parada (ignição desligada, telemetria a cada 60 s): a cadência normal não é reconexão; lacuna > 2,5 × 60 s é', async () => {
    const { transport, tel, gw, clock, live } = localSetup();
    const parked = (kmh: number) => ({ ...telemetry(kmh, iso(clock.now())), ignicao: false });
    await tel.telemetry(T, parked(0));
    await clock.advance(60_000);
    await tel.telemetry(T, parked(0));
    await clock.advance(60_000);
    await tel.telemetry(T, parked(0));
    expect(live.knownSpeed(T)).toBe(0);
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(1_000);
    await p;
    expect(transport.desired).toEqual([{ travada: true }]);
    // outra moto: queda de 160 s (< vigia de 180 s) com a moto parada também abre a graça
    const T2 = 'moto-0002';
    await tel.telemetry(T2, parked(0));
    await clock.advance(60_000);
    await tel.telemetry(T2, parked(0));
    expect(live.knownSpeed(T2)).toBe(0);
    await clock.advance(160_000);
    expect(gw.live.isOnline(T2)).toBe(true);
    await tel.telemetry(T2, parked(0));
    expect(live.knownSpeed(T2)).toBeNull();
    const before = transport.desired.length;
    const q = gw.lock({ commandId: 'c2', thingName: T2 });
    await clock.advance(1_000);
    await q;
    expect(transport.desired.slice(before)).toEqual([{ limite_kmh: 15 }]); // rampa, não trava direto
  });

  it('IOT_RECONNECT_GAP_MS configurável: com 5 s, uma lacuna de 6 s andando já abre a graça', async () => {
    const s = await awsSetup({ gapMs: 5_000 });
    for (let i = 0; i < 4; i++) {
      await s.sqs(telemetry(25, iso(s.clock.now())));
      await s.clock.advance(4_000);
    }
    await s.clock.advance(2_000);
    await s.sqs(telemetry(0, iso(s.clock.now())));
    expect(s.gw.live.knownSpeed(T)).toBeNull();
  });

  it('loadIotConfig lê IOT_RECONNECT_GAP_MS (padrão 15000)', () => {
    const saved = process.env.IOT_RECONNECT_GAP_MS;
    try {
      delete process.env.IOT_RECONNECT_GAP_MS;
      expect(loadIotConfig().reconnectGapMs).toBe(15_000);
      process.env.IOT_RECONNECT_GAP_MS = '20000';
      expect(loadIotConfig().reconnectGapMs).toBe(20_000);
    } finally {
      if (saved === undefined) delete process.env.IOT_RECONNECT_GAP_MS;
      else process.env.IOT_RECONNECT_GAP_MS = saved;
    }
  });
});

describe('Bloqueio seguro — regressões da revisão 4b, fix round 1 (fila offline detectada pelo atraso, independente da cadência)', () => {
  const iso = (ms: number) => new Date(ms).toISOString();
  const A = 120_000; // relógio do rastreador ~120 s adiantado
  const parked = (kmh: number, devMs: number) => ({ ...telemetry(kmh, iso(devMs)), ignicao: false });

  it('C1: parada destravada sem ignição, relógio +120 s, queda de 139 s (< 150 s): o 0 da fila (medido em T+60) não trava a moto que já anda', async () => {
    const s = await awsSetup();
    // cadência parada de 60 s, além da graça
    await s.sqs(parked(0, s.clock.now() + A));
    await s.clock.advance(60_000);
    await s.sqs(parked(0, s.clock.now() + A));
    await s.clock.advance(60_000);
    const t = s.clock.now();
    await s.sqs(parked(0, t + A)); // última mensagem antes da queda (t)
    expect(s.gw.live.knownSpeed(T)).toBe(0);
    await s.clock.advance(30_000); // o enlace caiu em t+1; amostra com mais de 10 s → rampa
    const p = s.gw.lock({ commandId: 'c1', thingName: T });
    await s.clock.advance(100);
    await p;
    expect(s.published).toEqual([{ limite_kmh: 15 }]);
    const queued = parked(0, t + 60_000 + A); // guardada offline em t+60; em t+65 o piloto liga a ignição e sai andando
    await s.clock.advance(t + 140_000 - s.clock.now()); // reconecta em t+140: lacuna 140 s < 150 s
    expect(s.gw.live.isOnline(T)).toBe(true);
    await s.sqs(queued); // esvazia primeiro
    expect(s.locked()).toBe(false);
    expect(s.gw.live.knownSpeed(T)).toBeNull();
    await s.sqs({ ...telemetry(25, iso(t + 140_000 + A)), ignicao: true }); // as amostras ao vivo atrás dela
    expect(s.locked()).toBe(false);
  });

  it('parada com 60 s de cadência e jitter de chegada (±2 s), relógio adiantado: nunca abre a graça; o lock trava direto', async () => {
    const s = await awsSetup();
    const dev0 = s.clock.now() + A;
    const jitter = [0, 1_800, -1_500, 2_000, -2_000, 900, -700, 1_200];
    for (let i = 0; i < jitter.length; i++) {
      await s.sqs(parked(0, dev0 + i * 60_000)); // medição exata a cada 60 s; chegada com jitter
      if (i < jitter.length - 1) await s.clock.advance(60_000 + jitter[i + 1] - jitter[i]);
    }
    expect(s.gw.live.knownSpeed(T)).toBe(0);
    const p = s.gw.lock({ commandId: 'c1', thingName: T });
    await s.clock.advance(100);
    await p;
    expect(s.published).toEqual([{ travada: true }]);
  });

  it('andando, telemetria a cada 5 s com jitter: o atraso nunca passa do limite; amostra fresca < 3 trava direto', async () => {
    const s = await awsSetup();
    const dev0 = s.clock.now() + 60_000;
    const jitter = [0, 400, -300, 1_000, -800, 200];
    for (let i = 0; i < jitter.length; i++) {
      await s.sqs(telemetry(i === jitter.length - 1 ? 0 : 25, iso(dev0 + i * 5_000)));
      if (i < jitter.length - 1) await s.clock.advance(5_000 + jitter[i + 1] - jitter[i]);
    }
    expect(s.gw.live.knownSpeed(T)).toBe(0);
  });

  it('IOT_QUEUE_LAG_MS configurável (padrão 5000)', () => {
    const saved = process.env.IOT_QUEUE_LAG_MS;
    try {
      delete process.env.IOT_QUEUE_LAG_MS;
      expect(loadIotConfig().queueLagMs).toBe(5_000);
      process.env.IOT_QUEUE_LAG_MS = '8000';
      expect(loadIotConfig().queueLagMs).toBe(8_000);
    } finally {
      if (saved === undefined) delete process.env.IOT_QUEUE_LAG_MS;
      else process.env.IOT_QUEUE_LAG_MS = saved;
    }
  });
});

describe('Bloqueio seguro — regressões da revisão 4b, fix round 2 (relógio que volta; amostra velha pelo TelemetryService)', () => {
  const iso = (ms: number) => new Date(ms).toISOString();

  it('N1: relógio do rastreador volta 120 s (correção do GPS) — abre a graça uma vez; depois dela uma amostra fresca < 3 trava', async () => {
    const s = await awsSetup();
    await s.ride(25, 120_000); // relógio 120 s adiantado
    await s.sqs(telemetry(25, iso(s.clock.now()))); // corrigido: volta 120 s
    expect(s.gw.live.knownSpeed(T)).toBeNull(); // uma graça
    const p = s.gw.lock({ commandId: 'c1', thingName: T });
    await s.clock.advance(100);
    await p;
    expect(s.published).toEqual([{ limite_kmh: 15 }]);
    await s.clock.advance(4_900);
    await s.sqs(telemetry(25, iso(s.clock.now())));
    await s.clock.advance(5_000);
    await s.sqs(telemetry(25, iso(s.clock.now()))); // 10 s depois: fora da graça, sem reabrir
    expect(s.gw.live.knownSpeed(T)).toBe(25);
    await s.clock.advance(5_000);
    await s.sqs(telemetry(1, iso(s.clock.now())));
    expect(s.locked()).toBe(true);
  });

  it('N2: telemetria de 3 min atrás passando pelo TelemetryService (fila offline) não vale para travar', async () => {
    const { transport, tel, gw, clock, live } = localSetup();
    await tel.telemetry(T, telemetry(25, iso(clock.now())));
    await clock.advance(10_000);
    await tel.telemetry(T, telemetry(25, iso(clock.now())));
    expect(live.knownSpeed(T)).toBe(25);
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(1_000);
    await p;
    expect(transport.limits()).toEqual([15]);
    await clock.advance(2_000);
    await tel.telemetry(T, telemetry(0, iso(clock.now() - 3 * 60_000)));
    expect(transport.locked()).toBe(false);
    expect(live.knownSpeed(T)).not.toBe(0);
  });
});

describe('Bloqueio seguro — regressões da revisão 4b, fix round 3 (mensagem velha reordenada não troca a referência do atraso)', () => {
  const iso = (ms: number) => new Date(ms).toISOString();

  it('L/M/S: uma mensagem reordenada 100 s atrás (M) não esconde a amostra da fila (S) que chega depois; M também não volta a exibição', async () => {
    const s = await awsSetup();
    await s.ride(25); // além da graça; agora = 20 s
    const base = s.clock.now();
    await s.sqs(telemetry(25, iso(base))); // L (chegada 100, ts 100 no exemplo da revisão)
    const p = s.gw.lock({ commandId: 'c1', thingName: T });
    await s.clock.advance(100);
    await p;
    expect(s.published).toEqual([{ limite_kmh: 15 }]);
    await s.clock.advance(900);
    await s.sqs(telemetry(7, iso(base - 100_000))); // M: reordenada no SQS, 100 s atrás → graça até base+11
    expect((await s.gw.getLiveState(T))!.speedKmh).toBe(25); // exibição não volta para M
    const queued = telemetry(0, iso(base + 3_000)); // S: medida em base+3, presa na fila (queda em ~base+2)
    await s.clock.advance(11_000); // chega em base+12: fresca (9 s), lacuna 11 s < 15 s, graça de M já passou
    await s.sqs(queued);
    expect(s.gw.live.knownSpeed(T)).toBeNull(); // atraso contra L = 12 − 3 = 9 s > 5 s
    expect(s.locked()).toBe(false);
  });
});
