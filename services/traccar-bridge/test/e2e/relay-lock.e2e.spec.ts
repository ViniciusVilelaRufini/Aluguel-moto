/**
 * e2e em processo (spec GT06 §11), sem Docker: Traccar falso (HTTP + WebSocket reais em 127.0.0.1) → ponte real → broker MQTT
 * em memória → pilha IoT real da API (BaseIotGateway, LiveStateStore, LocalMqttTransport + LocalShadowStore, TelemetryService,
 * RelayLockService) → delta do shadow → ponte → `POST /api/commands/send` no Traccar falso.
 *
 * Um único relógio falso (`FakeClock`) para a API e a ponte; a E/S (WebSocket, REST do Traccar) é real e esperada por
 * `settle()`. O código da API entra por caminho relativo (o ts-jest só transpila; o `tsc` da ponte exclui `test/e2e`).
 */
import { EventEmitter } from 'node:events';
import { Logger } from '../../../api/node_modules/@nestjs/common';
import { EV, type IotCommandUpdatedEvent } from '../../../api/src/common/events';
import type { CommandOutcome, CommandRequest } from '../../../api/src/ports/iot-gateway.port';
import { BaseIotGateway } from '../../../api/src/modules/iot/base-iot-gateway';
import { FakeClock } from '../../../api/src/modules/iot/clock';
import { LiveStateStore } from '../../../api/src/modules/iot/live-state.store';
import { LocalMqttTransport } from '../../../api/src/modules/iot/local-mqtt.transport';
import { LocalShadowStore } from '../../../api/src/modules/iot/local-shadow';
import type { RelaySample } from '../../../api/src/modules/iot/relay-lock.service';
import type { DesiredState, ReportedMeta, ReportedState } from '../../../api/src/modules/iot/shadow-transport';
import { TelemetryService } from '../../../api/src/modules/iot/telemetry.service';
import { MemoryRedisStore } from '../../../api/src/redis/redis-store';
import { Bridge } from '../../src/bridge';
import { silentLogger } from '../../src/log';
import { TraccarRest } from '../../src/traccar/rest';
import { TraccarSocket } from '../../src/traccar/socket';
import type { TraccarPosition } from '../../src/traccar/types';
import { FakeBroker } from '../fake-broker';
import { FakeTraccar, position } from '../fake-traccar';

const IMEI = '860000000000901';
const T = 'moto-0901';
const T0 = Date.parse('2026-10-27T12:00:00Z');
const KNOT = 1.852;

Logger.overrideLogger(false); // logs JSON da API (Nest) fora da saída do jest

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface WorldOpts {
  /** `GET /api/server` do Traccar falso (padrão 6.7.0). */
  version?: string;
  /** Atraso do `fixTime` em relação ao relógio (GPS medido antes da chegada ao servidor). */
  fixLagMs?: number;
}

interface RideOpts {
  blocked?: boolean;
  ignition?: boolean;
  /** Tensão do pack (V); `attributes.power` do decodificador GT06. */
  power?: number;
}

/** API real + ponte real, ligadas pelo broker em memória; Traccar falso; relógio falso compartilhado. */
async function world(opts: WorldOpts = {}) {
  const clock = new FakeClock(T0);
  const redis = new MemoryRedisStore();
  const broker = new FakeBroker();
  const events = new EventEmitter();
  const updates: IotCommandUpdatedEvent[] = [];
  events.on(EV.IOT_COMMAND_UPDATED, (e: IotCommandUpdatedEvent) => updates.push(e));

  // ── API ──
  const shadow = new LocalShadowStore(redis, () => clock.now());
  const transport = new LocalMqttTransport(() => broker.client('api') as any, shadow);
  /** Todo desired gravado pela API (o corte só pode sair daqui). */
  const desired: Array<{ at: number; desired: DesiredState }> = [];
  const updateDesired = transport.updateDesired.bind(transport);
  transport.updateDesired = async (t: string, d: DesiredState) => {
    desired.push({ at: clock.now(), desired: { ...d } });
    return updateDesired(t, d);
  };
  /** Amostras e reported que a trava só-relé já processou (instrumentação do teste). */
  const seen = { samples: [] as RelaySample[], reported: [] as ReportedState[] };
  class Gateway extends BaseIotGateway {
    override async onTelemetrySample(thingName: string, sample: RelaySample): Promise<void> {
      await super.onTelemetrySample(thingName, sample);
      seen.samples.push(sample);
    }
    override async onReported(thingName: string, reported: ReportedState, meta?: ReportedMeta): Promise<void> {
      await super.onReported(thingName, reported, meta);
      seen.reported.push(reported);
    }
  }
  const live = new LiveStateStore(redis, clock);
  const gateway = new Gateway(transport, live, clock, events as any, { confirmWaitMs: 3_000, commandTimeoutMs: 30_000 });
  const rentals = { openRentalId: async () => undefined, trackingRentalId: async () => undefined, invalidate: () => undefined };
  const prisma = { vehicle: { findUnique: async () => ({ id: 'veh-0901' }) }, trackPoint: { create: async () => ({}) } };
  const telemetry = new TelemetryService(gateway, { onPosition: async () => undefined }, rentals, prisma as any, events as any, clock, { trackRetentionDays: 90 });
  await transport.start(telemetry);

  // ── Traccar falso + ponte (como o main.ts: onSocketOpen em cada abertura do WebSocket) ──
  const traccar = new FakeTraccar();
  await traccar.start();
  if (opts.version !== undefined) traccar.serverVersion = opts.version;
  traccar.devices = [{ id: 1, name: T, uniqueId: IMEI, status: 'offline' }];
  const rest = new TraccarRest(traccar.url, 'bridge@volti.local', 'secret');
  const bridgeMqtt = broker.client('bridge');
  const bridge = new Bridge(bridgeMqtt, rest, { things: async () => new Map([[IMEI, T]]) }, { iotMode: 'local', battery: '72v', now: () => clock.now(), log: silentLogger });
  await bridge.start();
  /** Mensagens do WebSocket que a ponte terminou de processar (o replay de cada conexão também conta). */
  let processed = 0;
  let pushed = 0;
  const socket = new TraccarSocket(
    traccar.url,
    rest,
    (m) => void bridge.enqueue(m).then(() => processed++),
    silentLogger,
    () => void bridge.onSocketOpen(),
  );
  await socket.connect();

  const chainsIdle = () =>
    (bridge as any).chains.size === 0 && (telemetry as any).chains.size === 0 && (shadow as any).chains.size === 0;
  /**
   * Espera (tempo real) a pilha toda ficar quieta: a ponte processou toda mensagem do WebSocket enviada (push + replays), as filas
   * por moto da ponte, do shadow e da telemetria estão vazias e o broker não recebeu nada por 10 voltas seguidas do loop de eventos.
   */
  const settle = async (timeoutMs = 3_000) => {
    const until = Date.now() + timeoutMs;
    let stable = 0;
    let len = -1;
    while (stable < 10) {
      if (Date.now() > until) throw new Error(`settle: timeout (processed ${processed}/${pushed + traccar.connections})`);
      await new Promise((r) => setImmediate(r)); // cede ao loop de eventos (E/S do WebSocket e da REST incluídas)
      const l = broker.log.length;
      if (processed >= pushed + traccar.connections && chainsIdle() && l === len) stable++;
      else stable = 0;
      len = l;
    }
  };
  /** Mensagem do WebSocket do Traccar (contada para `settle`). */
  const push = async (msg: Parameters<FakeTraccar['push']>[0]) => {
    pushed++;
    traccar.push(msg);
    await settle();
  };
  /** Avança o relógio falso (timers da API) e espera o que isso disparou. */
  const step = async (ms: number) => {
    await clock.advance(ms);
    await settle();
  };

  let seq = 0;
  const iso = (ms: number) => new Date(ms).toISOString();
  let lastFix = T0;
  /** Posição do J16 medida agora (menos o atraso do GPS), como o decodificador GT06 do Traccar entrega: `blocked` e `power` (V). */
  const ride = async (kmh: number, o: RideOpts = {}) => {
    const now = clock.now();
    lastFix = now - (opts.fixLagMs ?? 0);
    await push({
      positions: [
        position({
          id: ++seq,
          deviceId: 1,
          fixTime: iso(lastFix),
          serverTime: iso(now),
          speed: kmh / KNOT,
          attributes: { ignition: o.ignition ?? kmh > 0, blocked: o.blocked ?? false, rssi: 4, power: o.power ?? 72 },
        }),
      ],
    });
  };
  /** Heartbeat/status do GT06: posição `outdated` que repete o último fix, com o bit de corte. */
  const heartbeat = async (blocked: boolean) =>
    push({
      positions: [
        position({ id: ++seq, deviceId: 1, fixTime: iso(lastFix), serverTime: iso(clock.now()), outdated: true, attributes: { blocked, ignition: false, power: 72 } }),
      ],
    });
  const setOnline = (online: boolean) => push({ devices: [{ id: 1, name: T, uniqueId: IMEI, status: online ? 'online' : 'offline' }] });
  const stalePosition = (over: Partial<TraccarPosition> & { fixTime: string }): TraccarPosition => position({ id: ++seq, deviceId: 1, ...over });

  /** Lock `relay_only` pela porta IoT; a chamada responde em até `confirmWaitMs` (3 s). */
  const lock = async (commandId: string): Promise<CommandOutcome> => {
    const req: CommandRequest = { commandId, thingName: T, authority: 'staff', lockOrigin: 'staff', controlMode: 'relay_only' } as CommandRequest;
    let out: CommandOutcome | undefined;
    const p = gateway.lock(req).then((o) => (out = o));
    await settle();
    if (!out) await step(3_000);
    await p;
    return out!;
  };
  const unlock = async (commandId: string): Promise<CommandOutcome> => {
    const req = { commandId, thingName: T, authority: 'staff', controlMode: 'relay_only' } as CommandRequest;
    let out: CommandOutcome | undefined;
    const p = gateway.unlock(req).then((o) => (out = o));
    await settle();
    if (!out) await step(3_000);
    await p;
    return out!;
  };

  const fromBridge = (topic: string) => broker.log.filter((m) => m.from === 'bridge' && m.topic === topic).map((m) => JSON.parse(m.payload));
  /** `reported.travada` publicados pela ponte, em ordem. */
  const reportedTravada = () => fromBridge(`$aws/things/${T}/shadow/update`).filter((u) => u.state.reported.travada !== undefined).map((u) => u.state.reported.travada as boolean);
  const cuts = () => desired.filter((d) => d.desired.travada === true);
  const releases = () => desired.filter((d) => d.desired.travada === false);
  const outcomes = (commandId: string) => updates.filter((u) => u.commandId === commandId);

  const stop = async () => {
    socket.close();
    await traccar.stop();
    await transport.stop();
  };

  return {
    clock, broker, bridgeMqtt, traccar, gateway, telemetry, transport, live, desired, seen, updates,
    settle, push, step, ride, heartbeat, setOnline, stalePosition, lock, unlock,
    fromBridge, reportedTravada, cuts, releases, outcomes, iso, stop,
  };
}
type World = Awaited<ReturnType<typeof world>>;

/** J16 conecta no Traccar (presença) e anda: telemetria a cada 5 s, `n` amostras (as dos primeiros 10 s caem na graça). */
async function connectAndRide(w: World, n: number, kmh = 20, o: RideOpts = {}) {
  await w.setOnline(true);
  expect(w.broker.log.some((m) => m.topic === `$aws/events/presence/connected/${T}`)).toBe(true);
  for (let i = 0; i < n; i++) {
    await w.ride(kmh, o);
    await w.step(5_000);
  }
}

describe('e2e em processo: J16 (Traccar falso) → ponte → MQTT → API → ponte → engineStop', () => {
  let w: World;
  afterEach(async () => w?.stop());

  it('(1) lock relay_only fica in_progress andando e com 2 paradas em 5 s; corta só com 2+ paradas cobrindo 10 s; confirma pelo bit de corte do status seguinte', async () => {
    w = await world();
    await connectAndRide(w, 4); // t = 0, 5, 10, 15 s (as duas primeiras na graça); agora t = 20 s
    expect(await w.lock('c1')).toEqual({ commandId: 'c1', status: 'in_progress' }); // t = 23 s
    await w.ride(20);
    await w.step(5_000);
    await w.ride(0);
    await w.step(5_000);
    await w.ride(0); // 2 paradas cobrindo 5 s
    expect(w.seen.samples.filter((s) => s.kmh === 0 && s.accepted)).toHaveLength(2);
    expect(w.cuts()).toEqual([]);
    expect(w.traccar.commands).toEqual([]);
    expect(w.broker.log.filter((m) => m.topic === `$aws/things/${T}/shadow/update/delta`)).toEqual([]);
    await w.step(5_000);
    await w.ride(0); // 3 paradas cobrindo 10 s → corte
    expect(w.cuts()).toHaveLength(1);
    expect(w.traccar.commands).toEqual([{ deviceId: 1, type: 'engineStop' }]);
    expect(w.traccar.commandBodies[0]).toMatchObject({ attributes: { noQueue: true } });
    // O corte saiu depois da 3ª telemetria parada, nunca com a moto andando.
    const tele = w.fromBridge(`motos/${T}/telemetria`);
    expect(tele.slice(-3).map((t) => t.velocidade_kmh)).toEqual([0, 0, 0]);
    // Aceite do comando não confirma.
    expect(w.outcomes('c1')).toEqual([]);
    expect(w.reportedTravada()).not.toContain(true);
    // Heartbeat do J16 depois do comando, com o bit de corte → reported.travada = true → confirmed.
    await w.step(1_000);
    await w.heartbeat(true);
    expect(w.reportedTravada().at(-1)).toBe(true);
    await w.step(1_000);
    expect(w.outcomes('c1')).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
    expect(w.cuts()).toHaveLength(1);
    expect(w.releases()).toEqual([]);
    expect(w.traccar.commands).toEqual([{ deviceId: 1, type: 'engineStop' }]);
  });

  it('(2) andando o tempo todo: nenhum engineStop, 120 s → did_not_stop, nunca grava travada (nem false)', async () => {
    w = await world();
    await connectAndRide(w, 3);
    expect(await w.lock('c2')).toEqual({ commandId: 'c2', status: 'in_progress' });
    for (let i = 0; i < 25; i++) {
      await w.ride(15 + (i % 3)); // sempre ≥ 3 km/h
      await w.step(5_000);
    }
    expect(w.outcomes('c2')).toEqual([{ commandId: 'c2', status: 'failed', reason: 'did_not_stop' }]);
    expect(w.traccar.commands).toEqual([]);
    expect(w.desired.filter((d) => d.desired.travada !== undefined)).toEqual([]);
    expect(w.broker.log.filter((m) => m.topic === `$aws/things/${T}/shadow/update/delta`)).toEqual([]);
  });

  it('(2b) para menos de 10 s e volta a andar, sempre: nenhum corte; 120 s → did_not_stop', async () => {
    w = await world();
    await connectAndRide(w, 3);
    await w.lock('c2b');
    for (let i = 0; i < 25; i++) {
      await w.ride(i % 3 === 2 ? 12 : 0); // 2 paradas (5 s) e anda de novo
      await w.step(5_000);
    }
    expect(w.outcomes('c2b')).toEqual([{ commandId: 'c2b', status: 'failed', reason: 'did_not_stop' }]);
    expect(w.traccar.commands).toEqual([]);
    expect(w.cuts()).toEqual([]);
    expect(w.releases()).toEqual([]);
  });

  it('(2c) segunda guarda: desired travada:true escrito por fora com a moto andando → a ponte não corta', async () => {
    w = await world();
    await connectAndRide(w, 1, 25);
    await w.ride(25);
    await w.transport.updateDesired(T, { travada: true });
    await w.settle();
    expect(w.broker.log.some((m) => m.topic === `$aws/things/${T}/shadow/update/delta`)).toBe(true);
    expect(w.traccar.commands).toEqual([]);
  });

  it('(3) moto já travada (bit de corte em status fresco): lock confirma sem engineStop e sem nunca gravar travada (nem false)', async () => {
    w = await world();
    await connectAndRide(w, 4, 0, { blocked: true, ignition: false }); // t = 20 s
    expect(w.reportedTravada()).toEqual([true]);
    expect(await w.lock('c3')).toEqual({ commandId: 'c3', status: 'confirmed' });
    expect(w.traccar.commands).toEqual([]);
    expect(w.desired.filter((d) => d.desired.travada !== undefined)).toEqual([]);
  });

  it('(3b) lock na graça logo depois de conectar, moto já travada: in_progress; confirma pelo status fresco depois da graça, sem engineStop e sem travada:false', async () => {
    w = await world();
    await w.setOnline(true);
    await w.ride(0, { blocked: true, ignition: false }); // t = 0: status com o bit, na graça
    await w.step(2_000);
    expect(await w.lock('c3b')).toEqual({ commandId: 'c3b', status: 'in_progress' }); // t = 5 s
    for (let i = 0; i < 5; i++) {
      await w.ride(0, { blocked: true, ignition: false });
      if (w.outcomes('c3b').length) break;
      await w.step(5_000);
    }
    await w.step(1_000);
    expect(w.outcomes('c3b')).toEqual([{ commandId: 'c3b', status: 'confirmed' }]);
    expect(w.traccar.commands).toEqual([]);
    expect(w.desired.filter((d) => d.desired.travada !== undefined)).toEqual([]);
    // Nada fica pendente: 120 s depois, nenhum prazo solta a moto.
    await w.step(130_000);
    expect(w.releases()).toEqual([]);
    expect(w.traccar.commands).toEqual([]);
  });

  it('(4) ordem de publicação da ponte (telemetria antes do reported com a velocidade): o reported da própria posição não zera a sequência; um reported fora de banda zera uma vez só e a parada ainda completa', async () => {
    // GPS 1,5 s atrás do servidor: o reported (a API data a velocidade dele pela chegada) é mais novo que o fix da telemetria.
    w = await world({ fixLagMs: 1_500 });
    await connectAndRide(w, 9); // t = 0..40 s; o 1º reported.travada saiu em t = 0
    expect(await w.lock('c4')).toEqual({ commandId: 'c4', status: 'in_progress' }); // t = 48 s
    await w.step(2_000); // t = 50
    await w.ride(20);
    await w.step(5_000); // t = 55
    await w.ride(20);
    await w.step(5_000); // t = 60: a repetição de 1/min do reported.travada cai na 1ª parada
    const before = w.broker.log.length;
    await w.ride(0);
    // Mesma posição: telemetria primeiro, depois o reported com a velocidade dela.
    const pub = w.broker.log.slice(before).filter((m) => m.from === 'bridge');
    expect(pub.map((m) => m.topic)).toEqual([`motos/${T}/telemetria`, `$aws/things/${T}/shadow/update`]);
    expect(JSON.parse(pub[1].payload)).toEqual({ state: { reported: { travada: false, velocidade_kmh: 0 } } });
    await w.step(5_000); // t = 65
    await w.ride(0);
    // O reported (chegada t = 60) veio depois da telemetria t = 58,5 e antes da t = 63,5: nenhuma amostra rejeitada.
    expect(w.seen.samples.slice(-2).map((s) => [s.kmh, s.accepted])).toEqual([[0, true], [0, true]]);
    expect(w.cuts()).toEqual([]); // 2 paradas cobrindo 5 s
    await w.step(5_000); // t = 70
    // Fora de banda: o MQTT da ponte cai e volta e ela republica o reported (velocidade fresca 0) ANTES da próxima telemetria.
    w.bridgeMqtt.disconnect();
    w.bridgeMqtt.reconnect();
    await w.settle();
    expect(w.fromBridge(`$aws/things/${T}/shadow/update`).at(-1)).toEqual({ state: { reported: { travada: false, velocidade_kmh: 0 } } });
    await w.ride(0);
    // Sem o reported fora de banda esta (fix 68,5 s) fecharia 10 s e cortaria. Com ele (chegada 70 s), ela é "mais velha" que a
    // última amostra aceita: rejeitada = em movimento, a sequência recomeça (falha segura) — uma vez só.
    expect(w.seen.samples.at(-1)).toMatchObject({ kmh: 0, accepted: false });
    expect(w.cuts()).toEqual([]);
    for (let i = 0; i < 3; i++) {
      await w.step(5_000); // t = 75, 80, 85
      await w.ride(0);
      expect(w.seen.samples.at(-1)).toMatchObject({ kmh: 0, accepted: true });
      if (i < 2) expect(w.cuts()).toEqual([]);
    }
    expect(w.cuts()).toHaveLength(1); // t = 85: paradas 73,5 → 83,5 s
    expect(w.traccar.commands).toEqual([{ deviceId: 1, type: 'engineStop' }]);
    await w.step(1_000);
    await w.heartbeat(true);
    await w.step(1_000);
    expect(w.outcomes('c4')).toEqual([{ commandId: 'c4', status: 'confirmed' }]);
  });

  it('(5) Traccar 6.5 (sem noQueue): o corte nunca vai ao Traccar; o lock falha seguro (timeout) e o destravar também não envia nada', async () => {
    w = await world({ version: '6.5.0' });
    await connectAndRide(w, 4);
    expect(await w.lock('c5')).toEqual({ commandId: 'c5', status: 'in_progress' });
    for (let i = 0; i < 3; i++) {
      await w.ride(0);
      await w.step(5_000);
    }
    expect(w.cuts()).toHaveLength(1); // a API não conhece a versão: grava o corte...
    const calls = w.traccar.serverCalls;
    expect(calls).toBeGreaterThanOrEqual(2); // ... a ponte relê /api/server antes de recusar
    expect(w.traccar.commands).toEqual([]); // ... e nada chega ao Traccar
    await w.step(120_000);
    expect(w.outcomes('c5')).toEqual([{ commandId: 'c5', status: 'failed', reason: 'timeout' }]);
    // travada:false do prazo: o reported já é false (o relé nunca abriu), então nem há delta para a ponte.
    expect(w.releases()).toHaveLength(1);
    expect(w.traccar.commands).toEqual([]);
    expect(w.traccar.queued).toEqual([]);
  });

  it('(5b) Traccar 6.5 com a moto travada: unlock não envia engineResume e termina failed/timeout; a moto segue travada', async () => {
    w = await world({ version: '6.5.0' });
    await connectAndRide(w, 4, 0, { blocked: true, ignition: false });
    const u = await w.unlock('u5');
    expect(u).toEqual({ commandId: 'u5', status: 'in_progress' });
    expect(w.releases()).toHaveLength(1);
    expect(w.broker.log.some((m) => m.topic === `$aws/things/${T}/shadow/update/delta` && JSON.parse(m.payload).state.travada === false)).toBe(true);
    expect(w.traccar.commands).toEqual([]);
    for (let i = 0; i < 6; i++) {
      await w.ride(0, { blocked: true, ignition: false });
      await w.step(5_000);
    }
    expect(w.outcomes('u5')).toEqual([{ commandId: 'u5', status: 'failed', reason: 'timeout' }]);
    expect(w.traccar.commands).toEqual([]);
    expect(w.reportedTravada()).not.toContain(false);
    expect((await w.gateway.getLiveState(T))?.locked).toBe(true);
  });

  it('(6) WebSocket do Traccar reconecta no meio do lock com bit de corte velho no replay: nada confirma; o prazo termina timeout', async () => {
    w = await world();
    await connectAndRide(w, 4);
    expect(await w.lock('c6')).toEqual({ commandId: 'c6', status: 'in_progress' });
    for (let i = 0; i < 3; i++) {
      await w.ride(0);
      if (i < 2) await w.step(5_000);
    }
    expect(w.traccar.commands).toEqual([{ deviceId: 1, type: 'engineStop' }]);
    const reportsBefore = w.reportedTravada().length;
    // O Traccar guarda como "última posição" um status com blocked:true (anterior a uma reinicialização do J16, relé aberto).
    w.traccar.latest = [w.stalePosition({ fixTime: w.iso(w.clock.now() - 60_000), speed: 0, attributes: { blocked: true, ignition: false, power: 72 } })];
    w.traccar.dropSockets(); // reconexão real do TraccarSocket (backoff de 1 s) → onSocketOpen → replay
    const until = Date.now() + 5_000;
    while (w.traccar.connections < 2) {
      if (Date.now() > until) throw new Error('socket não reconectou');
      await sleep(10);
    }
    await w.settle();
    expect(w.reportedTravada().slice(reportsBefore)).not.toContain(true);
    await w.step(1_000);
    expect(w.outcomes('c6')).toEqual([]);
    // J16 de volta, relé aberto: status com blocked:false (a telemetria volta a sair só depois dele).
    for (let i = 0; i < 4; i++) {
      await w.ride(0);
      await w.step(5_000);
    }
    expect(w.reportedTravada().slice(reportsBefore)).toEqual([false]);
    expect(w.outcomes('c6')).toEqual([]);
    await w.step(120_000);
    expect(w.outcomes('c6')).toEqual([{ commandId: 'c6', status: 'failed', reason: 'timeout' }]);
    // travada:false do prazo; o reported já é false (relé aberto), então não há delta nem engineResume.
    expect(w.releases()).toHaveLength(1);
    expect(w.broker.log.filter((m) => m.topic === `$aws/things/${T}/shadow/update/delta` && JSON.parse(m.payload).state.travada === false)).toEqual([]);
    expect(w.traccar.commands).toEqual([{ deviceId: 1, type: 'engineStop' }]);
    expect(w.updates.some((u) => u.commandId === 'c6' && u.status === 'confirmed')).toBe(false);
  });

  it('(7) moto cai no meio da espera: pending/offline; ao voltar, in_progress e só corta com amostras novas fora da graça', async () => {
    w = await world();
    await connectAndRide(w, 4);
    expect(await w.lock('c7')).toEqual({ commandId: 'c7', status: 'in_progress' });
    await w.ride(0);
    await w.step(5_000);
    await w.setOnline(false);
    await w.step(1_000);
    expect(w.outcomes('c7')).toEqual([{ commandId: 'c7', status: 'pending', reason: 'offline' }]);
    await w.step(4_000);
    await w.setOnline(true);
    await w.step(1_000);
    expect(w.outcomes('c7').at(-1)).toEqual({ commandId: 'c7', status: 'in_progress' });
    await w.step(1_000);
    // Parada desde a reconexão: r+2 s e r+7 s na graça, r+12 s inicia a sequência, r+22 s completa 10 s.
    for (let i = 0; i < 4; i++) {
      await w.ride(0);
      expect(w.cuts()).toEqual([]);
      await w.step(5_000);
    }
    await w.ride(0);
    expect(w.cuts()).toHaveLength(1);
    expect(w.traccar.commands).toEqual([{ deviceId: 1, type: 'engineStop' }]);
    await w.heartbeat(true);
    await w.step(1_000);
    expect(w.outcomes('c7').at(-1)).toEqual({ commandId: 'c7', status: 'confirmed' });
  });
});
