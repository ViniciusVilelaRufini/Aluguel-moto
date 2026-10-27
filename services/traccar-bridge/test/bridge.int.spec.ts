import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BATTERY_UNKNOWN_CAP_MS, Bridge } from '../src/bridge';
import { silentLogger, type Logger } from '../src/log';
import { TraccarRest } from '../src/traccar/rest';
import { TraccarSocket } from '../src/traccar/socket';
import type { TraccarPosition } from '../src/traccar/types';
import { FakeBroker, type FakeMqttClient } from './fake-broker';
import { FakeTraccar, position } from './fake-traccar';
import { waitFor } from './wait';

const IMEI = '860000000000901';
const OTHER_IMEI = '860000000000999';
const NEW_IMEI = '860000000000777';
const T = 'moto-0901';
const T0 = Date.parse('2026-10-27T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();
const schema = (name: string) => JSON.parse(readFileSync(join(__dirname, '../../../packages/contracts/schemas', name), 'utf8'));
const ajv = addFormats(new Ajv2020({ strict: false }));
for (const name of ['shadow-desired.schema.json', 'shadow-reported.schema.json']) ajv.addSchema(schema(name)); // $ref do shadow-update
const validTelemetry = ajv.compile(schema('telemetria.schema.json'));
const validEvent = ajv.compile(schema('eventos.schema.json'));
const validUpdate = ajv.compile(schema('shadow-update.schema.json'));

interface Ctx {
  traccar: FakeTraccar;
  broker: FakeBroker;
  api: FakeMqttClient;
  /** Cliente MQTT da ponte (para simular queda/travamento). */
  mqtt: FakeMqttClient;
  bridge: Bridge;
  socket: TraccarSocket;
  now: { value: number };
  logs: Array<Record<string, unknown>>;
  /** Registro IMEI → thingName que a ponte lê (mutável para M4). */
  registry: Map<string, string>;
  /** `hang: true` = a próxima leitura do registro nunca responde (banco travado); `calls` = leituras feitas. */
  registryCtl: { hang: boolean; calls: number };
}

interface StartOpts { iotMode?: 'local' | 'aws'; version?: string | undefined; notifications?: boolean; publishTimeoutMs?: number; subscribeTimeoutMs?: number; serverStatus?: number }

async function start(opts: StartOpts | 'local' | 'aws' = {}): Promise<Ctx> {
  const o: StartOpts = typeof opts === 'string' ? { iotMode: opts } : opts;
  const traccar = new FakeTraccar();
  await traccar.start();
  if ('version' in o) traccar.serverVersion = o.version;
  if (o.serverStatus) traccar.serverStatus = o.serverStatus;
  traccar.notifications = o.notifications ?? false;
  traccar.devices = [
    { id: 1, name: T, uniqueId: IMEI, status: 'online' },
    { id: 2, name: 'outro', uniqueId: OTHER_IMEI, status: 'online' },
    { id: 3, name: 'novo', uniqueId: NEW_IMEI, status: 'online' },
  ];
  const broker = new FakeBroker();
  const api = broker.client('api'); // faz o papel da API e do shadow: vê tudo o que a ponte publica
  await api.subscribeAsync(['#']);
  const now = { value: T0 };
  const logs: Array<Record<string, unknown>> = [];
  const log: Logger = { info: (e) => void logs.push({ level: 'info', ...e }), warn: (e) => void logs.push({ level: 'warn', ...e }), error: (e) => void logs.push({ level: 'error', ...e }) };
  const rest = new TraccarRest(traccar.url, 'bridge@volti.local', 'secret');
  const registry = new Map([[IMEI, T]]);
  const registryCtl = { hang: false, calls: 0 };
  const things = () => {
    registryCtl.calls++;
    return registryCtl.hang ? new Promise<Map<string, string>>(() => undefined) : Promise.resolve(new Map(registry));
  };
  const mqtt = broker.client('bridge');
  const bridge = new Bridge(mqtt, rest, { things }, { iotMode: o.iotMode ?? 'local', battery: '72v', now: () => now.value, log, publishTimeoutMs: o.publishTimeoutMs, subscribeTimeoutMs: o.subscribeTimeoutMs });
  await bridge.start();
  const socket = new TraccarSocket(traccar.url, rest, (m) => void bridge.enqueue(m), silentLogger, () => void bridge.onSocketOpen());
  await socket.connect();
  return { traccar, broker, api, mqtt, bridge, socket, now, logs, registry, registryCtl };
}

const out = (c: Ctx, topic: string) => c.broker.log.filter((m) => m.from === 'bridge' && m.topic === topic).map((m) => JSON.parse(m.payload));
const updates = (c: Ctx) => out(c, `$aws/things/${T}/shadow/update`);
const reportedTravada = (c: Ctx) => updates(c).filter((u) => u.state.reported.travada !== undefined).map((u) => u.state.reported.travada);
const sendDelta = (c: Ctx, state: Record<string, unknown>) => c.api.publishAsync(`$aws/things/${T}/shadow/update/delta`, JSON.stringify({ state, version: 1, timestamp: 1 }));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Heartbeat/status do GT06 no Traccar: posição `outdated` repetida, com o bit de corte. */
const heartbeat = (id: number, at: number, blocked: boolean): TraccarPosition =>
  position({ id, deviceId: 1, fixTime: iso(T0 - 60_000), serverTime: iso(at), outdated: true, attributes: { blocked, ignition: false } });
const setStatus = (c: Ctx, status: 'online' | 'offline') => c.traccar.push({ devices: [{ id: 1, name: T, uniqueId: IMEI, status }] });
const gets = (c: Ctx) => out(c, `$aws/things/${T}/shadow/get`).length;
const getAccepted = (c: Ctx, delta: Record<string, unknown>, version = 1) =>
  c.api.publishAsync(`$aws/things/${T}/shadow/get/accepted`, JSON.stringify({ state: { desired: delta, reported: {}, delta }, version }));

describe('Bridge (Traccar falso + broker em memória)', () => {
  let c: Ctx;
  afterEach(async () => {
    c.socket.close();
    await c.traccar.stop();
    expect(JSON.stringify(c.logs)).not.toContain(IMEI); // IMEI nunca completo nos logs
    expect(JSON.stringify(c.logs)).not.toContain(OTHER_IMEI);
    expect(JSON.stringify(c.logs)).not.toContain(NEW_IMEI);
  });

  it('posição → motos/{t}/telemetria no schema do contrato (nós × 1,852, timestamp = fixTime)', async () => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 10, deviceId: 1, fixTime: iso(T0 - 1_000), serverTime: iso(T0), speed: 10.79914 })] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    const [t] = out(c, `motos/${T}/telemetria`);
    expect(t).toEqual({ lat: -23.5614, lng: -46.6914, velocidade_kmh: 20, bateria_pct: 50, travada: false, ignicao: true, sinal: 5, timestamp: iso(T0 - 1_000) });
    expect(validTelemetry(t)).toBe(true);
  });

  it('inválida/outdated não vira telemetria; dispositivo fora do registro é descartado e o log não tem o IMEI completo', async () => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 11, deviceId: 1, fixTime: iso(T0), valid: false }), position({ id: 12, deviceId: 1, fixTime: iso(T0 + 1), outdated: true }), position({ id: 13, deviceId: 2, fixTime: iso(T0) })] });
    await waitFor(() => c.logs.some((l) => l.msg === 'traccar_unknown_device'));
    expect(out(c, `motos/${T}/telemetria`)).toEqual([]);
    expect(c.logs.find((l) => l.msg === 'traccar_unknown_device')).toMatchObject({ imei: '***********0999' });
  });

  it('alarmes (Notification configurada → events): powerCut → violacao, lowPower → bateria_critica; desconhecido descartado com log', async () => {
    c = await start({ notifications: true });
    c.traccar.push({
      events: [
        { id: 1, type: 'alarm', deviceId: 1, eventTime: iso(T0), attributes: { alarm: 'powerCut' } },
        { id: 2, type: 'alarm', deviceId: 1, eventTime: iso(T0 + 1_000), attributes: { alarm: 'lowPower' } },
        { id: 3, type: 'alarm', deviceId: 1, eventTime: iso(T0 + 2_000), attributes: { alarm: 'sos' } },
      ],
    });
    await waitFor(() => out(c, `motos/${T}/eventos`).length === 2 && c.logs.some((l) => l.msg === 'alarm_ignored'));
    expect(out(c, `motos/${T}/eventos`)).toEqual([{ tipo: 'violacao', timestamp: iso(T0) }, { tipo: 'bateria_critica', timestamp: iso(T0 + 1_000) }]);
    for (const e of out(c, `motos/${T}/eventos`)) expect(validEvent(e)).toBe(true);
  });

  it('delta travada:true com posição fresca parada → engineStop uma vez (noQueue); reported true só com o bit blocked de status seguinte', async () => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 20, deviceId: 1, fixTime: iso(T0 - 2_000), serverTime: iso(T0 - 1_000), speed: 0 })] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    const reportedBefore = updates(c).length;
    await sendDelta(c, { travada: true });
    await waitFor(() => c.traccar.commands.length === 1);
    expect(c.traccar.commands).toEqual([{ deviceId: 1, type: 'engineStop' }]);
    expect(c.traccar.commandBodies[0]).toEqual({ deviceId: 1, type: 'engineStop', attributes: { noQueue: true } });
    await sendDelta(c, { travada: true, modo_roubada: false }); // delta repetido (outro campo): não reenvia em 30 s
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'recently_sent'));
    expect(c.traccar.commands).toHaveLength(1);
    expect(reportedTravada(c)).not.toContain(true); // aceite ≠ corte
    c.now.value = T0 + 3_000;
    c.traccar.push({ positions: [position({ id: 21, deviceId: 1, fixTime: iso(T0 - 2_000), serverTime: iso(T0 + 3_000), outdated: true, attributes: { blocked: true, ignition: true } })] });
    await waitFor(() => reportedTravada(c).includes(true));
    const last = updates(c).pop();
    expect(last).toEqual({ state: { reported: { travada: true, velocidade_kmh: 0 } } });
    expect(validUpdate(last)).toBe(true);
    expect(updates(c).length).toBeGreaterThan(reportedBefore);
  });

  it.each([
    ['andando (15 km/h)', 8.1, T0 - 1_000, 'moving'],
    ['com posição velha (11 s)', 0, T0 - 11_000, 'stale'],
  ])('delta travada:true %s → recusa da segunda guarda e nenhum comando', async (_name, knots, fixTime, reason) => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 30, deviceId: 1, fixTime: iso(fixTime), serverTime: iso(T0), speed: knots })] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === reason));
    expect(c.traccar.commands).toEqual([]);
  });

  it('dispositivo offline no Traccar → presença disconnected e corte recusado (offline)', async () => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 40, deviceId: 1, fixTime: iso(T0 - 1_000), speed: 0 })] });
    setStatus(c, 'offline');
    await waitFor(() => out(c, `$aws/events/presence/disconnected/${T}`).length === 1);
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'offline'));
    expect(c.traccar.commands).toEqual([]);
  });

  it('delta limite_kmh → nenhum comando, reported 32; travada:false → engineResume (noQueue); modo_roubada ecoado', async () => {
    c = await start();
    await sendDelta(c, { travada: false, limite_kmh: 6, modo_roubada: true });
    await waitFor(() => c.traccar.commands.length === 1 && updates(c).length >= 1);
    expect(c.traccar.commands).toEqual([{ deviceId: 1, type: 'engineResume' }]);
    expect(c.traccar.commandBodies[0]).toMatchObject({ attributes: { noQueue: true } });
    expect(updates(c)).toContainEqual({ state: { reported: { limite_kmh: 32, modo_roubada: true } } });
    expect(reportedTravada(c)).toEqual([]); // bit de corte desconhecido: nada de travada no reported
  });

  it('reconexão: presença connected, reported sem travada (bit desconhecido) e get; do get só travada:false é reaplicado', async () => {
    c = await start({ notifications: true }); // deviceOnline só chega como event com Notification configurada
    const g0 = gets(c);
    setStatus(c, 'offline');
    await waitFor(() => out(c, `$aws/events/presence/disconnected/${T}`).length === 1);
    c.traccar.push({ events: [{ id: 5, type: 'deviceOnline', deviceId: 1, eventTime: iso(T0), attributes: {} }] });
    await waitFor(() => gets(c) === g0 + 1);
    expect(out(c, `$aws/events/presence/connected/${T}`)).toHaveLength(1);
    expect(updates(c)).toContainEqual({ state: { reported: { limite_kmh: 32, modo_roubada: false, firmware: 'gt06' } } });
    await c.api.publishAsync(`$aws/things/${T}/shadow/get/accepted`, JSON.stringify({ state: { desired: { travada: true }, reported: {}, delta: { travada: true } }, version: 3 }));
    await sleep(50);
    expect(c.traccar.commands).toEqual([]);
    setStatus(c, 'offline');
    setStatus(c, 'online');
    await waitFor(() => gets(c) === g0 + 2);
    await c.api.publishAsync(`$aws/things/${T}/shadow/get/accepted`, JSON.stringify({ state: { desired: { travada: false }, reported: { travada: true }, delta: { travada: false } }, version: 4 }));
    await waitFor(() => c.traccar.commands.length === 1);
    expect(c.traccar.commands).toEqual([{ deviceId: 1, type: 'engineResume' }]);
  });

  it('buzina em motos/{t}/comandos é ignorada com log', async () => {
    c = await start();
    await c.api.publishAsync(`motos/${T}/comandos`, JSON.stringify({ comando_id: 'h1', acao: 'buzina' }));
    await waitFor(() => c.logs.some((l) => l.msg === 'command_ignored_no_horn'));
    expect(c.traccar.commands).toEqual([]);
  });

  it('modo aws: sem tópicos de presença (o IoT Core gera os eventos de ciclo de vida)', async () => {
    c = await start('aws');
    const g0 = gets(c);
    setStatus(c, 'offline');
    setStatus(c, 'online');
    await waitFor(() => gets(c) === g0 + 1);
    expect(c.broker.log.filter((m) => m.topic.startsWith('$aws/events/presence/'))).toEqual([]);
  });

  // ---- Decisão 1: desired.travada null/ausente não vira comando
  it.each([
    ['travada: null', { travada: null }],
    ['sem travada', { outro: 1 }],
    ['travada não booleana', { travada: 'true' }],
  ])('delta com %s → nenhum comando e nenhum reported', async (_name, state) => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 50, deviceId: 1, fixTime: iso(T0 - 1_000), serverTime: iso(T0), speed: 0 })] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1); // parada e fresca: a guarda deixaria cortar
    const before = updates(c).length;
    await sendDelta(c, state);
    await sleep(50);
    expect(c.traccar.commands).toEqual([]);
    expect(updates(c)).toHaveLength(before);
  });

  // ---- Decisão 2: travada:true pendente nunca é reaplicado na reconexão
  it('reconexão com travada:true pendente e moto parada/fresca → nenhum engineStop (a API recomeça o fluxo)', async () => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 60, deviceId: 1, fixTime: iso(T0 - 1_000), serverTime: iso(T0), speed: 0 })] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    const g0 = gets(c);
    setStatus(c, 'offline');
    setStatus(c, 'online');
    await waitFor(() => gets(c) === g0 + 1);
    await c.api.publishAsync(`$aws/things/${T}/shadow/get/accepted`, JSON.stringify({ state: { desired: { travada: true, modo_roubada: true }, delta: { travada: true, modo_roubada: true } }, version: 7 }));
    await waitFor(() => updates(c).some((u) => u.state.reported.modo_roubada === true));
    await sleep(30);
    expect(c.traccar.commands).toEqual([]);
    // get/accepted sem reconexão pendente é ignorado
    await c.api.publishAsync(`$aws/things/${T}/shadow/get/accepted`, JSON.stringify({ state: { delta: { travada: false } }, version: 8 }));
    await sleep(30);
    expect(c.traccar.commands).toEqual([]);
  });

  // ---- Decisão 3: reported.travada a cada status com blocked; eco de lock em moto travada
  it('M5: reported.travada na mudança ou no máximo 1/min se igual; o eco do lock numa moto travada sai sempre', async () => {
    c = await start();
    c.traccar.push({ positions: [heartbeat(70, T0, true)] });
    await waitFor(() => reportedTravada(c).length === 1);
    c.now.value = T0 + 1_000;
    c.traccar.push({ positions: [heartbeat(71, T0 + 1_000, true)] });
    await sleep(40);
    expect(reportedTravada(c)).toEqual([true]); // igual e há menos de 60 s
    c.now.value = T0 + 60_000;
    c.traccar.push({ positions: [heartbeat(72, T0 + 60_000, true)] });
    await waitFor(() => reportedTravada(c).length === 2);
    c.now.value = T0 + 61_000;
    c.traccar.push({ positions: [heartbeat(73, T0 + 61_000, false)] });
    await waitFor(() => reportedTravada(c).length === 3); // mudou: sai na hora
    c.now.value = T0 + 62_000;
    c.traccar.push({ positions: [heartbeat(74, T0 + 62_000, true)] });
    await waitFor(() => reportedTravada(c).length === 4);
    await sendDelta(c, { travada: true });
    await waitFor(() => reportedTravada(c).length === 5);
    await sendDelta(c, { travada: true });
    await waitFor(() => reportedTravada(c).length === 6);
    expect(reportedTravada(c)).toEqual([true, true, false, true, true, true]);
    expect(c.traccar.commands).toEqual([]);
    expect(c.logs.some((l) => l.msg === 'engine_stop_refused')).toBe(false);
  });

  it('depois de reconectar, memória velha não vale: sem eco travada:true até um status novo', async () => {
    c = await start();
    c.traccar.push({ positions: [heartbeat(80, T0, true)] });
    await waitFor(() => reportedTravada(c).length === 1);
    const g0 = gets(c);
    setStatus(c, 'offline');
    setStatus(c, 'online');
    await waitFor(() => gets(c) === g0 + 1);
    expect(reportedTravada(c)).toEqual([true]); // o reported completo da reconexão não traz travada
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'no_position'));
    expect(reportedTravada(c)).toEqual([true]);
    expect(c.traccar.commands).toEqual([]);
    c.traccar.push({ positions: [heartbeat(81, T0 + 2_000, true)] });
    await waitFor(() => reportedTravada(c).length === 2);
  });

  it('WebSocket reaberto: esquece o bit de corte e ignora o blocked do replay de últimas posições', async () => {
    c = await start();
    c.traccar.push({ positions: [heartbeat(90, T0, true)] });
    await waitFor(() => reportedTravada(c).length === 1);
    c.traccar.latest = [heartbeat(90, T0, true)]; // o Traccar reenvia a última posição conhecida ao reconectar
    c.traccar.dropSockets();
    await waitFor(() => c.traccar.connections === 2, 5_000);
    await waitFor(() => c.logs.some((l) => l.msg === 'traccar_replay_status_ignored'));
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused'));
    expect(reportedTravada(c)).toEqual([true]);
    c.traccar.push({ positions: [heartbeat(91, T0 + 5_000, true)] });
    await waitFor(() => reportedTravada(c).length === 2);
  });

  // ---- Decisão 4: retenção com log limitado e teto de 5 min para bateria desconhecida
  it('sem bit de corte: telemetria retida, um log telemetry_held (limitado) com thingName', async () => {
    c = await start();
    const noStatus = (id: number, at: number) => position({ id, deviceId: 1, fixTime: iso(at), attributes: { ignition: true, rssi: 4, power: 72 } });
    c.traccar.push({ positions: [noStatus(100, T0 - 2_000), noStatus(101, T0 - 1_000)] });
    await waitFor(() => c.logs.some((l) => l.msg === 'telemetry_held'));
    await sleep(30);
    expect(c.logs.filter((l) => l.msg === 'telemetry_held')).toEqual([{ level: 'info', msg: 'telemetry_held', thingName: T, reason: 'awaiting_status' }]);
    expect(out(c, `motos/${T}/telemetria`)).toEqual([]);
  });

  it('bateria desconhecida com corte conhecido: retida até 5 min, depois sai com bateria_pct 0 e log battery_unknown', async () => {
    c = await start();
    const dcdc = (id: number, at: number) => position({ id, deviceId: 1, fixTime: iso(at - 500), serverTime: iso(at), attributes: { blocked: false, ignition: false, rssi: 4, power: 12 } });
    c.traccar.push({ positions: [dcdc(110, T0)] });
    await waitFor(() => c.logs.some((l) => l.msg === 'telemetry_held' && l.reason === 'awaiting_battery'));
    c.now.value = T0 + 30_000;
    c.traccar.push({ positions: [dcdc(111, T0 + 30_000)] });
    await sleep(50);
    c.now.value = T0 + BATTERY_UNKNOWN_CAP_MS - 1_000;
    c.traccar.push({ positions: [dcdc(112, T0 + BATTERY_UNKNOWN_CAP_MS - 1_000)] });
    await sleep(50);
    expect(out(c, `motos/${T}/telemetria`)).toEqual([]);
    c.now.value = T0 + BATTERY_UNKNOWN_CAP_MS;
    c.traccar.push({ positions: [dcdc(113, T0 + BATTERY_UNKNOWN_CAP_MS), dcdc(114, T0 + BATTERY_UNKNOWN_CAP_MS + 5_000)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 2);
    const [t] = out(c, `motos/${T}/telemetria`);
    expect(t).toMatchObject({ bateria_pct: 0, travada: false, timestamp: iso(T0 + BATTERY_UNKNOWN_CAP_MS - 500) });
    expect(validTelemetry(t)).toBe(true);
    expect(c.logs.filter((l) => l.msg === 'battery_unknown')).toEqual([{ level: 'warn', msg: 'battery_unknown', thingName: T }]);
  });

  it('log telemetry_held limitado: no máximo um por minuto por moto e motivo', async () => {
    c = await start();
    const dcdc = (id: number, at: number) => position({ id, deviceId: 1, fixTime: iso(at - 500), serverTime: iso(at), attributes: { blocked: false, power: 12 } });
    c.traccar.push({ positions: [dcdc(120, T0), dcdc(121, T0 + 1_000)] });
    await waitFor(() => c.logs.some((l) => l.msg === 'telemetry_held'));
    c.now.value = T0 + 30_000;
    c.traccar.push({ positions: [dcdc(122, T0 + 30_000)] });
    await sleep(50);
    expect(c.logs.filter((l) => l.msg === 'telemetry_held')).toHaveLength(1);
    c.now.value = T0 + 61_000;
    c.traccar.push({ positions: [dcdc(123, T0 + 61_000)] });
    await waitFor(() => c.logs.filter((l) => l.msg === 'telemetry_held').length === 2);
    await sleep(30);
    expect(c.logs.filter((l) => l.msg === 'telemetry_held')).toHaveLength(2);
  });

  it('movimento travada com telemetria retida (bateria desconhecida) ainda gera movimento_sem_aluguel', async () => {
    c = await start();
    const locked = (id: number, lat: number, at: number) => position({ id, deviceId: 1, fixTime: iso(at), serverTime: iso(at), latitude: lat, attributes: { blocked: true, power: 12 } });
    c.traccar.push({ positions: [locked(130, -23.5614, T0 - 2_000), locked(131, -23.5617, T0 - 1_000)] });
    await waitFor(() => out(c, `motos/${T}/eventos`).length === 1);
    expect(out(c, `motos/${T}/eventos`)).toEqual([{ tipo: 'movimento_sem_aluguel', timestamp: iso(T0 - 1_000) }]);
    expect(out(c, `motos/${T}/telemetria`)).toEqual([]);
  });

  // ---- Decisão 5: nenhum comando fica enfileirado no Traccar
  it('dispositivo sem sessão no Traccar no instante do envio: engineStop vai com noQueue e não fica enfileirado', async () => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 140, deviceId: 1, fixTime: iso(T0 - 1_000), serverTime: iso(T0), speed: 0 })] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    c.traccar.queueCommands = true;
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_not_sent'));
    expect(c.traccar.commandBodies).toEqual([{ deviceId: 1, type: 'engineStop', attributes: { noQueue: true } }]);
    expect(c.traccar.queued).toEqual([]);
    expect(c.logs.find((l) => l.msg === 'engine_stop_not_sent')).toMatchObject({ level: 'error', thingName: T });
    // não enviado ≠ enviado: a próxima tentativa não é barrada por recently_sent
    c.traccar.queueCommands = false;
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_sent'));
  });

  it('Traccar que ignora noQueue e responde 202: engine_stop_queued (erro) para alerta', async () => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 150, deviceId: 1, fixTime: iso(T0 - 1_000), serverTime: iso(T0), speed: 0 })] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    c.traccar.queueCommands = true;
    c.traccar.honorNoQueue = false;
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_queued'));
    expect(c.logs.find((l) => l.msg === 'engine_stop_queued')).toMatchObject({ level: 'error', thingName: T });
  });

  it('engineResume com o dispositivo sem sessão: não enfileira; o get da reconexão reaplica', async () => {
    c = await start();
    c.traccar.queueCommands = true;
    await sendDelta(c, { travada: false });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_resume_not_sent'));
    expect(c.traccar.queued).toEqual([]);
  });
  // ---- C1: Traccar sem noQueue (< 6.7.0) → nenhum comando de motor
  const stoppedFresh = (id: number) => position({ id, deviceId: 1, fixTime: iso(T0 - 1_000), serverTime: iso(T0), speed: 0 });
  it.each([
    ['6.5', '6.5'],
    ['sem campo version', undefined],
  ])('C1: Traccar %s → engineStop e engineResume recusados (traccar_no_noqueue), sem chamada REST', async (_name, version) => {
    c = await start({ version });
    c.traccar.push({ positions: [stoppedFresh(300)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'traccar_no_noqueue'));
    await sendDelta(c, { travada: false });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_resume_refused' && l.reason === 'traccar_no_noqueue'));
    expect(c.traccar.commands).toEqual([]);
  });

  it('C1: /api/server com erro → versão desconhecida → recusa', async () => {
    c = await start();
    c.traccar.serverStatus = 500;
    await c.bridge.refreshDevices();
    c.traccar.push({ positions: [stoppedFresh(301)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'traccar_no_noqueue'));
    expect(c.traccar.commands).toEqual([]);
  });

  it.each(['6.7.0', '6.16.0'])('C1: Traccar %s → engineStop enviado', async (version) => {
    c = await start({ version });
    c.traccar.push({ positions: [stoppedFresh(302)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    await sendDelta(c, { travada: true });
    await waitFor(() => c.traccar.commands.length === 1);
    expect(c.traccar.commands).toEqual([{ deviceId: 1, type: 'engineStop' }]);
  });

  it('C1: versão relida a cada refresh de dispositivos (atualização do Traccar sem reiniciar a ponte)', async () => {
    c = await start({ version: '6.5' });
    c.traccar.serverVersion = '6.7.0';
    await c.bridge.refreshDevices();
    c.traccar.push({ positions: [stoppedFresh(303)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_sent'));
  });

  it('N1: falha passageira do /api/server não trava comandos: relê a versão antes de recusar (no máximo 1 leitura a cada 10 s)', async () => {
    c = await start({ serverStatus: 500 }); // leituras do início falham (T0): start() e abertura do socket
    await waitFor(() => c.traccar.serverCalls === 2);
    c.traccar.serverStatus = 200;
    const fresh = (id: number, at: number) => position({ id, deviceId: 1, fixTime: iso(at - 500), serverTime: iso(at), speed: 0 });
    c.now.value = T0 + 5_000;
    c.traccar.push({ positions: [fresh(310, T0 + 5_000)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'traccar_no_noqueue')); // < 10 s da última leitura
    expect(c.traccar.commands).toEqual([]);
    c.now.value = T0 + 10_000;
    c.traccar.push({ positions: [fresh(311, T0 + 10_000)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 2);
    await sendDelta(c, { travada: true });
    await waitFor(() => c.traccar.commands.length === 1);
    expect(c.traccar.commands).toEqual([{ deviceId: 1, type: 'engineStop' }]);
  });

  it('N3: recusa traccar_no_noqueue limitada a 1/min por moto (nível erro)', async () => {
    c = await start({ version: '6.5' });
    const refusals = () => c.logs.filter((l) => l.msg === 'engine_stop_refused' && l.reason === 'traccar_no_noqueue');
    c.traccar.push({ positions: [stoppedFresh(320)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    await sendDelta(c, { travada: true });
    await waitFor(() => refusals().length === 1);
    await sendDelta(c, { travada: true });
    await sleep(50);
    expect(refusals()).toEqual([{ level: 'error', msg: 'engine_stop_refused', thingName: T, reason: 'traccar_no_noqueue' }]);
    expect(c.traccar.commands).toEqual([]);
  });

  // ---- I1: alarmes de position.attributes.alarm (sem Notification no Traccar) e deduplicação
  const eventos = (ctx: Ctx) => out(ctx, `motos/${T}/eventos`);
  it('I1: sem Notification, alarme vem em position.attributes.alarm → evento; a mesma posição repetida não duplica', async () => {
    c = await start();
    const p = position({ id: 200, deviceId: 1, fixTime: iso(T0 - 1_000), serverTime: iso(T0), attributes: { blocked: false, power: 72, alarm: 'powerCut' } });
    c.traccar.push({ positions: [p], events: [{ id: 9, type: 'alarm', deviceId: 1, eventTime: iso(T0), positionId: 200, attributes: { alarm: 'powerCut' } }] });
    await waitFor(() => eventos(c).length === 1);
    c.traccar.push({ positions: [p] });
    c.traccar.push({ positions: [position({ id: 201, deviceId: 1, fixTime: iso(T0 - 60_000), serverTime: iso(T0 + 1_000), outdated: true, attributes: { blocked: false, alarm: 'lowPower' } })] });
    await waitFor(() => eventos(c).length === 2);
    await sleep(30);
    expect(eventos(c)).toEqual([{ tipo: 'violacao', timestamp: iso(T0 - 1_000) }, { tipo: 'bateria_critica', timestamp: iso(T0 + 1_000) }]); // heartbeat: hora do servidor
    for (const e of eventos(c)) expect(validEvent(e)).toBe(true);
  });

  it('I1: com Notification, o mesmo alarme por position e por events (mesmo positionId) sai uma vez, em qualquer ordem', async () => {
    c = await start({ notifications: true });
    const alarmEvent = (id: number, positionId: number) => ({ id, type: 'alarm', deviceId: 1, eventTime: iso(T0), positionId, attributes: { alarm: 'lowPower' } });
    c.traccar.push({ positions: [position({ id: 210, deviceId: 1, fixTime: iso(T0 - 2_000), attributes: { blocked: false, alarm: 'lowPower' } })], events: [alarmEvent(1, 210)] });
    c.traccar.push({ events: [alarmEvent(2, 211)] });
    c.traccar.push({ positions: [position({ id: 211, deviceId: 1, fixTime: iso(T0 - 1_000), attributes: { blocked: false, alarm: 'lowPower' } })] });
    await waitFor(() => eventos(c).length === 2);
    await sleep(40);
    expect(eventos(c).map((e) => e.tipo)).toEqual(['bateria_critica', 'bateria_critica']);
  });

  it('I1: vibration na posição com o corte ativo → movimento_sem_aluguel; alarme do replay de conexão é ignorado', async () => {
    c = await start();
    c.traccar.push({ positions: [position({ id: 220, deviceId: 1, fixTime: iso(T0 - 1_000), attributes: { blocked: true, alarm: 'vibration' } })] });
    await waitFor(() => eventos(c).length === 1);
    expect(eventos(c)).toEqual([{ tipo: 'movimento_sem_aluguel', timestamp: iso(T0 - 1_000) }]);
    c.traccar.latest = [position({ id: 221, deviceId: 1, fixTime: iso(T0 - 500), attributes: { blocked: true, alarm: 'powerCut' } })];
    c.traccar.dropSockets();
    await waitFor(() => c.traccar.connections === 2, 5_000);
    await waitFor(() => c.logs.some((l) => l.msg === 'traccar_replay_status_ignored'));
    await sleep(30);
    expect(eventos(c)).toHaveLength(1);
  });

  // ---- I2: bit de corte com mais de 90 s não vale para already_blocked nem para o eco
  it('I2: bit de corte de mais de 90 s → sem eco travada:true; corte liberado com a moto parada e fresca', async () => {
    c = await start();
    c.traccar.push({ positions: [heartbeat(230, T0, true)] });
    await waitFor(() => reportedTravada(c).length === 1);
    c.now.value = T0 + 91_000;
    c.traccar.push({ positions: [position({ id: 231, deviceId: 1, fixTime: iso(T0 + 90_000), serverTime: iso(T0 + 91_000), speed: 0, attributes: { ignition: false, power: 72 } })] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    await sendDelta(c, { travada: true });
    await waitFor(() => c.traccar.commands.length === 1);
    expect(c.traccar.commands).toEqual([{ deviceId: 1, type: 'engineStop' }]);
    expect(reportedTravada(c)).toEqual([true]);
  });

  // ---- M3: MQTT fora / publicação travada
  it('M3: MQTT fora: telemetria QoS0 descartada, reported não vai para a fila; na volta republica a travada atual', async () => {
    c = await start();
    c.traccar.push({ positions: [heartbeat(240, T0, true)] });
    await waitFor(() => reportedTravada(c).length === 1);
    c.mqtt.disconnect();
    c.traccar.push({ positions: [position({ id: 241, deviceId: 1, fixTime: iso(T0), serverTime: iso(T0), attributes: { blocked: false, power: 72 } })] });
    await waitFor(() => c.logs.some((l) => l.msg === 'telemetry_skipped_mqtt_down'));
    await sleep(30);
    c.mqtt.reconnect();
    await waitFor(() => reportedTravada(c).length === 2);
    await sleep(40);
    expect(reportedTravada(c)).toEqual([true, false]); // só o estado atual, nada velho da fila
    expect(out(c, `motos/${T}/telemetria`)).toEqual([]);
  });

  it('M3: QoS1 sem PUBACK não trava a fila de entrada (timeout com log)', async () => {
    c = await start({ publishTimeoutMs: 50 });
    c.mqtt.stallQos1 = true;
    c.traccar.push({ positions: [position({ id: 250, deviceId: 1, fixTime: iso(T0 - 2_000), attributes: { blocked: false, power: 72, alarm: 'powerCut' } })] });
    c.traccar.push({ positions: [position({ id: 251, deviceId: 1, fixTime: iso(T0 - 1_000), attributes: { blocked: true, power: 72 } })] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 2);
    expect(c.logs.some((l) => l.msg === 'mqtt_publish_timeout')).toBe(true);
  });

  // ---- M4: troca no registro e log de IMEI desconhecido limitado
  it('M4: IMEI do thing trocado no registro → memória, envio recente e modo_roubada zerados', async () => {
    c = await start();
    c.traccar.push({ positions: [heartbeat(260, T0, true)] });
    await waitFor(() => reportedTravada(c).length === 1);
    await sendDelta(c, { modo_roubada: true });
    await waitFor(() => updates(c).some((u) => u.state.reported.modo_roubada === true));
    c.registry.clear();
    c.registry.set(NEW_IMEI, T);
    await c.bridge.refreshRegistry();
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'no_position'));
    expect(reportedTravada(c)).toEqual([true]); // sem eco do bit do aparelho antigo
    const g0 = gets(c);
    c.traccar.push({ devices: [{ id: 3, name: 'novo', uniqueId: NEW_IMEI, status: 'offline' }] });
    c.traccar.push({ devices: [{ id: 3, name: 'novo', uniqueId: NEW_IMEI, status: 'online' }] });
    await waitFor(() => gets(c) === g0 + 1);
    expect(updates(c)).toContainEqual({ state: { reported: { limite_kmh: 32, modo_roubada: false, firmware: 'gt06' } } });
  });

  it('M4: thing removido e devolvido ao registro volta sem memória', async () => {
    c = await start();
    c.traccar.push({ positions: [heartbeat(270, T0, true)] });
    await waitFor(() => reportedTravada(c).length === 1);
    c.registry.clear();
    await c.bridge.refreshRegistry();
    c.registry.set(IMEI, T);
    await c.bridge.refreshRegistry();
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'no_position'));
    expect(reportedTravada(c)).toEqual([true]);
  });

  it('M4: traccar_unknown_device limitado a 1/min por IMEI mascarado', async () => {
    c = await start();
    const unknownCount = () => c.logs.filter((l) => l.msg === 'traccar_unknown_device').length;
    c.traccar.push({ positions: [position({ id: 280, deviceId: 2, fixTime: iso(T0) }), position({ id: 281, deviceId: 2, fixTime: iso(T0 + 1) })] });
    await waitFor(() => unknownCount() === 1);
    c.traccar.push({ positions: [position({ id: 282, deviceId: 2, fixTime: iso(T0 + 2) })] });
    await sleep(40);
    expect(unknownCount()).toBe(1);
    c.now.value = T0 + 61_000;
    c.traccar.push({ positions: [position({ id: 283, deviceId: 2, fixTime: iso(T0 + 3) })] });
    await waitFor(() => unknownCount() === 2);
  });
  // ---- Onda final B
  const freshAt = (id: number, at: number, deviceId = 1) => position({ id, deviceId, fixTime: iso(at - 500), serverTime: iso(at), speed: 0 });

  it('B-I2: a guarda é reavaliada logo antes do engineStop — releitura lenta da versão envelhece a posição → nada enviado', async () => {
    c = await start({ serverStatus: 500 }); // versão desconhecida: o execute relê /api/server antes do envio
    await waitFor(() => c.traccar.serverCalls === 2);
    c.traccar.serverStatus = 200;
    c.now.value = T0 + 10_000;
    c.traccar.push({ positions: [freshAt(400, T0 + 10_000)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    c.traccar.serverDelayMs = 50;
    c.traccar.onServer = () => void (c.now.value = T0 + 21_000); // 11 s se passam durante a leitura
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'stale'));
    await sleep(80);
    expect(c.traccar.commands).toEqual([]);
  });

  it('N3: sessão expirada no engineStop → 401 sem novo login nem reenvio (engine_stop_not_sent; a API expira com segurança)', async () => {
    c = await start();
    c.now.value = T0 + 10_000;
    c.traccar.push({ positions: [freshAt(402, T0 + 10_000)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    const logins = c.traccar.logins;
    c.traccar.expireSessions();
    c.traccar.onSession = () => void (c.now.value = T0 + 21_000); // um re-login + reenvio sairia com a posição velha
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_not_sent'));
    await sleep(80);
    expect(c.traccar.commands).toEqual([]);
    expect(c.traccar.logins).toBe(logins);
  });

  it('N3: sem sessão, o login do engineStop acontece ANTES da guarda — login lento envelhece a posição → recusa stale', async () => {
    c = await start();
    c.now.value = T0 + 10_000;
    c.traccar.push({ positions: [freshAt(403, T0 + 10_000)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    c.traccar.expireSessions();
    await sendDelta(c, { travada: true }); // 401: a sessão velha é esquecida, nada enviado
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_not_sent'));
    c.now.value = T0 + 10_400;
    c.traccar.push({ positions: [freshAt(404, T0 + 10_400)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 2);
    c.traccar.sessionDelayMs = 50;
    c.traccar.onSession = () => void (c.now.value = T0 + 21_000); // 11 s se passam durante o login
    await sendDelta(c, { travada: true, modo_roubada: false });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'stale'));
    await sleep(80);
    expect(c.traccar.commands).toEqual([]);
  });

  it('N3: engineResume com a sessão expirada mantém o novo login e o reenvio', async () => {
    c = await start();
    c.traccar.expireSessions();
    await sendDelta(c, { travada: false });
    await waitFor(() => c.traccar.commands.length === 1);
    expect(c.traccar.commands).toEqual([{ deviceId: 1, type: 'engineResume' }]);
  });

  it('B-I2: dispositivo ficou offline durante a releitura da versão → nada enviado (offline)', async () => {
    c = await start({ serverStatus: 500 });
    await waitFor(() => c.traccar.serverCalls === 2);
    c.traccar.serverStatus = 200;
    c.now.value = T0 + 10_000;
    c.traccar.push({ positions: [freshAt(401, T0 + 10_000)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    c.traccar.serverDelayMs = 150;
    c.traccar.onServer = () => setStatus(c, 'offline');
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'offline'));
    expect(c.traccar.commands).toEqual([]);
  });

  it('B-M4: aparelho do thing trocado no registro durante o envio → engineStop recusado (device_changed), nada enviado', async () => {
    c = await start({ serverStatus: 500 });
    await waitFor(() => c.traccar.serverCalls === 2);
    c.traccar.serverStatus = 200;
    c.now.value = T0 + 10_000;
    c.traccar.push({ positions: [freshAt(402, T0 + 10_000)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    c.traccar.serverDelayMs = 150;
    c.traccar.onServer = () => {
      c.registry.clear();
      c.registry.set(NEW_IMEI, T);
      void c.bridge.refreshRegistry();
    };
    await sendDelta(c, { travada: true });
    await waitFor(() => c.logs.some((l) => l.msg === 'engine_stop_refused' && l.reason === 'device_changed'));
    expect(c.traccar.commands).toEqual([]);
  });

  it('B-I3: leitura do registro travada (IMEI desconhecido) não bloqueia a fila de entrada; releitura em voo única', async () => {
    c = await start();
    const calls0 = c.registryCtl.calls;
    c.registryCtl.hang = true;
    c.traccar.push({ positions: [freshAt(410, T0, 3)] }); // IMEI fora do registro → releitura (trava)
    c.traccar.push({ positions: [freshAt(411, T0)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    c.now.value = T0 + 11_000;
    c.traccar.push({ positions: [freshAt(412, T0 + 11_000, 3), freshAt(413, T0 + 11_000)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 2);
    expect(c.registryCtl.calls).toBe(calls0 + 1); // a primeira ainda está em voo: não empilha outra
  });

  it('B-I3: IMEI provisionado há pouco: a primeira posição é descartada e dispara a releitura; as seguintes já saem', async () => {
    c = await start();
    const T2 = 'moto-0777';
    c.registry.set(NEW_IMEI, T2);
    c.traccar.push({ positions: [freshAt(420, T0, 3)] });
    await waitFor(() => c.mqtt.subscribeCalls.some((t) => t.includes(`$aws/things/${T2}/shadow/update/delta`)));
    c.traccar.push({ positions: [freshAt(421, T0 + 1_000, 3)] });
    await waitFor(() => out(c, `motos/${T2}/telemetria`).length === 1);
    expect(out(c, `motos/${T2}/telemetria`)[0]).toMatchObject({ timestamp: iso(T0 + 500) });
  });

  it('B-I3: SUBSCRIBE sem SUBACK tem prazo: refreshRegistry falha (o próximo ciclo tenta de novo) e a reconexão MQTT não trava', async () => {
    c = await start({ subscribeTimeoutMs: 50 });
    c.mqtt.stallSubscribe = true;
    c.registry.set(NEW_IMEI, 'moto-0777');
    await expect(c.bridge.refreshRegistry()).rejects.toThrow('mqtt_subscribe_timeout');
    await c.bridge.onMqttConnect();
    expect(c.logs.some((l) => l.msg === 'mqtt_resubscribe_failed')).toBe(true);
    c.mqtt.stallSubscribe = false;
    await c.bridge.refreshRegistry();
    expect(c.mqtt.subscribeCalls.at(-1)).toContain(`$aws/things/moto-0777/shadow/update/delta`);
  });

  it('B-M7: MQTT fora → presença, eventos e get não esperam o prazo de 10 s (pulados com log limitado), nada sai velho na volta', async () => {
    c = await start(); // prazo padrão de 10 s: esperar por ele estouraria o waitFor
    c.mqtt.disconnect();
    setStatus(c, 'offline');
    c.traccar.push({ positions: [position({ id: 440, deviceId: 1, fixTime: iso(T0 - 1_000), attributes: { blocked: false, power: 72, alarm: 'powerCut' } })] });
    setStatus(c, 'online');
    c.traccar.push({ positions: [position({ id: 441, deviceId: 1, fixTime: iso(T0 - 500), attributes: { blocked: false, power: 72, alarm: 'lowPower' } })] });
    setStatus(c, 'offline'); // marcador: quando o segundo device_offline sai, tudo antes já passou pela fila
    await waitFor(() => c.logs.filter((l) => l.msg === 'device_offline').length === 2, 2_000);
    expect(c.logs.some((l) => l.msg === 'mqtt_publish_timeout')).toBe(false);
    const skipped = c.logs.filter((l) => l.msg === 'mqtt_down_skipped');
    expect(skipped.map((l) => l.kind).sort()).toEqual(['events', 'presence', 'shadow_get']); // limitado: um por moto e tipo
    expect(skipped[0]).toMatchObject({ level: 'warn', thingName: T });
    c.mqtt.reconnect();
    await sleep(50);
    expect(c.broker.log.filter((m) => m.from === 'bridge' && (m.topic.startsWith('$aws/events/presence/') || m.topic === `motos/${T}/eventos`))).toEqual([]);
  });

  it('B-M1: no início, get das motos online; travada:false pendente → engineResume sem esperar o aparelho reconectar', async () => {
    c = await start();
    await waitFor(() => gets(c) >= 1);
    await getAccepted(c, { travada: false });
    await waitFor(() => c.traccar.commands.length === 1);
    expect(c.traccar.commands).toEqual([{ deviceId: 1, type: 'engineResume' }]);
  });

  it('B-M1: reconexão MQTT → get das motos online; travada:true pendente nunca vira engineStop; moto offline não pede get', async () => {
    c = await start();
    c.traccar.push({ positions: [freshAt(450, T0)] });
    await waitFor(() => out(c, `motos/${T}/telemetria`).length === 1);
    await getAccepted(c, { modo_roubada: false }); // consome o get do início
    await waitFor(() => updates(c).some((u) => u.state.reported.modo_roubada === false));
    const g0 = gets(c);
    c.mqtt.disconnect();
    c.mqtt.reconnect();
    await waitFor(() => gets(c) === g0 + 1);
    await getAccepted(c, { travada: true }, 2);
    await sleep(50);
    expect(c.traccar.commands).toEqual([]);
    setStatus(c, 'offline');
    await waitFor(() => out(c, `$aws/events/presence/disconnected/${T}`).length === 1);
    c.mqtt.disconnect();
    c.mqtt.reconnect();
    await sleep(50);
    expect(gets(c)).toBe(g0 + 1);
  });
});
