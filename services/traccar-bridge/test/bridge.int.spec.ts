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
const T = 'moto-0901';
const T0 = Date.parse('2026-10-27T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();
const schema = (name: string) => JSON.parse(readFileSync(join(__dirname, '../../../packages/contracts/schemas', name), 'utf8'));
const ajv = addFormats(new Ajv2020({ strict: false }));
for (const name of ['shadow-desired.schema.json', 'shadow-reported.schema.json']) ajv.addSchema(schema(name)); // $ref do shadow-update
const validTelemetry = ajv.compile(schema('telemetria.schema.json'));
const validEvent = ajv.compile(schema('eventos.schema.json'));
const validUpdate = ajv.compile(schema('shadow-update.schema.json'));

interface Ctx { traccar: FakeTraccar; broker: FakeBroker; api: FakeMqttClient; socket: TraccarSocket; now: { value: number }; logs: Array<Record<string, unknown>> }

async function start(iotMode: 'local' | 'aws' = 'local'): Promise<Ctx> {
  const traccar = new FakeTraccar();
  await traccar.start();
  traccar.devices = [{ id: 1, name: T, uniqueId: IMEI, status: 'online' }, { id: 2, name: 'outro', uniqueId: OTHER_IMEI, status: 'online' }];
  const broker = new FakeBroker();
  const api = broker.client('api'); // faz o papel da API e do shadow: vê tudo o que a ponte publica
  await api.subscribeAsync(['#']);
  const now = { value: T0 };
  const logs: Array<Record<string, unknown>> = [];
  const log: Logger = { info: (e) => void logs.push({ level: 'info', ...e }), warn: (e) => void logs.push({ level: 'warn', ...e }), error: (e) => void logs.push({ level: 'error', ...e }) };
  const rest = new TraccarRest(traccar.url, 'bridge@volti.local', 'secret');
  const bridge = new Bridge(broker.client('bridge'), rest, { things: async () => new Map([[IMEI, T]]) }, { iotMode, battery: '72v', now: () => now.value, log });
  await bridge.start();
  const socket = new TraccarSocket(traccar.url, rest, (m) => void bridge.enqueue(m), silentLogger, () => void bridge.onSocketOpen());
  await socket.connect();
  return { traccar, broker, api, socket, now, logs };
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

describe('Bridge (Traccar falso + broker em memória)', () => {
  let c: Ctx;
  afterEach(async () => {
    c.socket.close();
    await c.traccar.stop();
    expect(JSON.stringify(c.logs)).not.toContain(IMEI); // IMEI nunca completo nos logs
    expect(JSON.stringify(c.logs)).not.toContain(OTHER_IMEI);
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

  it('alarmes: powerCut → violacao, lowPower → bateria_critica; desconhecido descartado com log', async () => {
    c = await start();
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
    c = await start();
    setStatus(c, 'offline');
    await waitFor(() => out(c, `$aws/events/presence/disconnected/${T}`).length === 1);
    c.traccar.push({ events: [{ id: 5, type: 'deviceOnline', deviceId: 1, eventTime: iso(T0), attributes: {} }] });
    await waitFor(() => out(c, `$aws/things/${T}/shadow/get`).length === 1);
    expect(out(c, `$aws/events/presence/connected/${T}`)).toHaveLength(1);
    expect(updates(c)).toContainEqual({ state: { reported: { limite_kmh: 32, modo_roubada: false, firmware: 'gt06' } } });
    await c.api.publishAsync(`$aws/things/${T}/shadow/get/accepted`, JSON.stringify({ state: { desired: { travada: true }, reported: {}, delta: { travada: true } }, version: 3 }));
    await sleep(50);
    expect(c.traccar.commands).toEqual([]);
    setStatus(c, 'offline');
    setStatus(c, 'online');
    await waitFor(() => out(c, `$aws/things/${T}/shadow/get`).length === 2);
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
    setStatus(c, 'offline');
    setStatus(c, 'online');
    await waitFor(() => out(c, `$aws/things/${T}/shadow/get`).length === 1);
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
    setStatus(c, 'offline');
    setStatus(c, 'online');
    await waitFor(() => out(c, `$aws/things/${T}/shadow/get`).length === 1);
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
  it('cada heartbeat com blocked republica reported.travada; lock numa moto já travada → eco travada:true sem comando', async () => {
    c = await start();
    c.traccar.push({ positions: [heartbeat(70, T0, true)] });
    await waitFor(() => reportedTravada(c).length === 1);
    c.traccar.push({ positions: [heartbeat(71, T0 + 1_000, true)] });
    await waitFor(() => reportedTravada(c).length === 2);
    expect(reportedTravada(c)).toEqual([true, true]);
    await sendDelta(c, { travada: true });
    await waitFor(() => reportedTravada(c).length === 3);
    expect(reportedTravada(c)).toEqual([true, true, true]);
    expect(c.traccar.commands).toEqual([]);
    expect(c.logs.some((l) => l.msg === 'engine_stop_refused')).toBe(false);
  });

  it('depois de reconectar, memória velha não vale: sem eco travada:true até um status novo', async () => {
    c = await start();
    c.traccar.push({ positions: [heartbeat(80, T0, true)] });
    await waitFor(() => reportedTravada(c).length === 1);
    setStatus(c, 'offline');
    setStatus(c, 'online');
    await waitFor(() => out(c, `$aws/things/${T}/shadow/get`).length === 1);
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
});
