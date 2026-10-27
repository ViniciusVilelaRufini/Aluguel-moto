import { EventEmitter } from 'node:events';
import { loadConfig } from './config';
import type { SimMqttClient } from './device';
import { Fleet } from './fleet';
import { rowsToFleet, rowToVehicle, type FleetRow, type FleetVehicle } from './fleet-source';
import { distanceM } from './geo';
import { SAFE_LOCK_SPEED_KMH } from './model';

class FakeClient extends EventEmitter implements SimMqttClient {
  published: Array<{ topic: string; payload: any }> = [];
  connected = true;
  constructor(readonly thingName: string) {
    super();
  }
  publish(topic: string, payload: string) {
    this.published.push({ topic, payload: JSON.parse(payload) });
    return this;
  }
  subscribe() {
    return this;
  }
  ended = false;
  endForce: boolean | undefined;
  end(force?: boolean, _opts?: object, cb?: () => void) {
    this.ended = true;
    this.endForce = force;
    cb?.();
    this.connected = false;
    return this;
  }
  deliver(topic: string, payload: unknown) {
    this.emit('message', topic, Buffer.from(JSON.stringify(payload)));
  }
  telemetry() {
    return this.published.filter((p) => p.topic.endsWith('/telemetria')).map((p) => p.payload);
  }
  reported() {
    return this.published.filter((p) => p.topic.endsWith('/shadow/update')).map((p) => p.payload.state.reported);
  }
}

const CATANDUVA: [number, number] = [-21.1378, -48.9729];
const PINHEIROS: [number, number] = [-23.5654, -46.6847];

const row = (over: Partial<FleetRow> = {}): FleetRow => ({
  thingName: 'moto-0011', status: 'free', lat: PINHEIROS[0], lng: PINHEIROS[1], locked: true, speedLimitKmh: 32, batteryPct: 87,
  depotLat: CATANDUVA[0], depotLng: CATANDUVA[1], ...over,
});

function setup(env: Record<string, string> = {}) {
  const cfg = loadConfig({ SIM_FLEET_SOURCE: 'postgres', DATABASE_URL: 'postgresql://x@y/z', SIM_RIDE_ON_UNLOCK: 'false', SIM_TICK_MS: '1000', ...env });
  const clients = new Map<string, FakeClient>();
  const fleet = new Fleet(cfg, () => undefined, (t) => {
    const c = new FakeClient(t);
    clients.set(t, c);
    return c;
  });
  const connect = () => clients.forEach((c) => c.emit('connect'));
  const tick = (n: number) => {
    for (let i = 0; i < n; i++) fleet.tick();
  };
  return { fleet, clients, connect, tick };
}

describe('frota do banco (rowToVehicle)', () => {
  it('moto livre ou em manutenção no galpão fica na posição do galpão, mesmo com lat/lng antigos de outro lugar', () => {
    expect(rowToVehicle(row())!.position).toEqual(CATANDUVA);
    expect(rowToVehicle(row({ status: 'maintenance' }))!.position).toEqual(CATANDUVA);
  });

  it('moto em aluguel (ou fora do galpão) fica na última posição gravada', () => {
    expect(rowToVehicle(row({ status: 'rented', locked: false }))).toMatchObject({ position: PINHEIROS, locked: false });
    expect(rowToVehicle(row({ depotLat: null, depotLng: null }))!.position).toEqual(PINHEIROS);
  });

  it('limite nunca acima de 32 km/h; sem posição ou thingName estranho → fora da simulação', () => {
    expect(rowToVehicle(row({ speedLimitKmh: 45 }))!.limitKmh).toBe(32);
    expect(rowToVehicle(row({ speedLimitKmh: 20 }))!.limitKmh).toBe(20);
    expect(rowToVehicle(row({ lat: 0, lng: 0, depotLat: null, depotLng: null }))).toBeNull();
    expect(rowToVehicle(row({ thingName: 'moto/#' }))).toBeNull();
    expect(rowsToFleet([row(), row({ thingName: 'a b' })])).toHaveLength(1);
  });
});

describe('Fleet.sync (um rastreador por moto cadastrada)', () => {
  const fleetOf = (...rows: FleetRow[]): FleetVehicle[] => rowsToFleet(rows);

  it('cria um rastreador por moto, parado na posição do galpão, com telemetria a velocidade 0 e travado', () => {
    const { fleet, clients, connect } = setup();
    expect(fleet.sync(fleetOf(row(), row({ thingName: 'moto-0012' })))).toEqual({ added: 2, relocated: 0, removed: 0 });
    connect();
    const t = clients.get('moto-0011')!.telemetry()[0];
    expect(t).toMatchObject({ lat: CATANDUVA[0], lng: CATANDUVA[1], velocidade_kmh: 0, travada: true });
    expect(fleet.sync(fleetOf(row(), row({ thingName: 'moto-0012' })))).toEqual({ added: 0, relocated: 0, removed: 0 });
    expect(fleet.devices).toHaveLength(2);
    void fleet.stop();
  });

  it('responde ao unlock e ao lock pelo shadow como um rastreador; com SIM_RIDE_ON_UNLOCK=false continua parada', () => {
    const { fleet, clients, connect, tick } = setup();
    fleet.sync(fleetOf(row()));
    connect();
    const c = clients.get('moto-0011')!;
    c.deliver('$aws/things/moto-0011/shadow/update/delta', { state: { travada: false } });
    expect(c.reported().at(-1)).toMatchObject({ travada: false, velocidade_kmh: 0 });
    tick(10);
    expect(fleet.devices[0].moto.state.speedKmh).toBe(0);
    c.deliver('$aws/things/moto-0011/shadow/update/delta', { state: { travada: true, limite_kmh: 6 } });
    expect(c.reported().at(-1)).toMatchObject({ travada: true, limite_kmh: 6 });
    void fleet.stop();
  });

  it('com o piloto simulado: anda perto de onde está, trava só abaixo de 3 km/h e nunca passa de 32', () => {
    const { fleet, clients, connect, tick } = setup({ SIM_RIDE_ON_UNLOCK: 'true', SIM_CRUISE_MIN_KMH: '30', SIM_CRUISE_MAX_KMH: '32' });
    fleet.sync(fleetOf(row()));
    connect();
    const c = clients.get('moto-0011')!;
    const m = fleet.devices[0].moto;
    c.deliver('$aws/things/moto-0011/shadow/update/delta', { state: { travada: false } });
    tick(30);
    expect(m.state.speedKmh).toBeGreaterThan(SAFE_LOCK_SPEED_KMH);
    expect(m.state.speedKmh).toBeLessThanOrEqual(32);
    expect(distanceM(m.position(), CATANDUVA)).toBeLessThan(1000);
    c.deliver('$aws/things/moto-0011/shadow/update/delta', { state: { travada: true } });
    expect(m.state.locked).toBe(false); // em movimento: a trava fica pendente
    void fleet.stop();
  });

  it('moto levada (travada e parada há relocateAfterSec, cadastro a > 50 m) passa a reportar o novo ponto', () => {
    const { fleet, clients, connect, tick } = setup({ SIM_RELOCATE_AFTER_SEC: '60' });
    fleet.sync(fleetOf(row({ status: 'awaiting_pickup', depotLat: null, depotLng: null })));
    connect();
    const c = clients.get('moto-0011')!;
    const atDepot = fleetOf(row({ status: 'free' }));
    tick(30);
    expect(fleet.sync(atDepot).relocated).toBe(0); // parada há pouco tempo: pode ser a gravação atrasada da última posição
    tick(31);
    expect(fleet.sync(atDepot).relocated).toBe(1);
    expect(c.telemetry().at(-1)).toMatchObject({ lat: CATANDUVA[0], lng: CATANDUVA[1], velocidade_kmh: 0 });
    tick(120);
    expect(fleet.sync(atDepot).relocated).toBe(0); // já está lá
    void fleet.stop();
  });

  it('moto que saiu da lista (ex.: reprovisionada como relay_only) é desconectada e nunca mais responde travada', () => {
    const { fleet, clients, connect, tick } = setup();
    fleet.sync(fleetOf(row(), row({ thingName: 'moto-0901' })));
    connect();
    const gt06 = clients.get('moto-0901')!;
    const published = gt06.published.length;
    expect(fleet.sync(fleetOf(row()))).toEqual({ added: 0, relocated: 0, removed: 1 });
    expect(gt06.ended).toBe(true);
    // Desconexão limpa (DISCONNECT): o broker descarta o will e não publica presença `disconnected` pela moto, que agora é
    // do GT06 (a ponte cuida da presença dela).
    expect(gt06.endForce).not.toBe(true);
    expect(gt06.published.slice(published).filter((p) => p.topic.includes('presence/disconnected'))).toEqual([]);
    expect(fleet.devices.map((d) => d.moto.state.thingName)).toEqual(['moto-0011']);
    // Mesmo que uma mensagem atrasada chegue ao cliente antigo, nada é publicado (nenhum reported.travada falso).
    gt06.connected = true;
    gt06.deliver('$aws/things/moto-0901/shadow/update/delta', { state: { travada: true } });
    tick(120);
    expect(gt06.published.slice(published).filter((p) => p.topic.includes('moto-0901') && !p.topic.includes('presence'))).toEqual([]);
    // A que ficou continua normal.
    expect(clients.get('moto-0011')!.ended).toBe(false);
    // Desligar o simulador (SIGTERM) só anuncia `disconnected` pelas motos que ele ainda simula, nunca pela removida.
    void fleet.stop();
    expect(gt06.published.slice(published).filter((p) => p.topic.includes('presence/disconnected'))).toEqual([]);
    expect(clients.get('moto-0011')!.published.some((p) => p.topic === '$aws/events/presence/disconnected/moto-0011')).toBe(true);
  });

  it('stop() (SIGTERM) espera a desconexão limpa de cada cliente (DISCONNECT, sem force: o broker não publica o will)', async () => {
    const { fleet, clients, connect } = setup();
    fleet.sync(fleetOf(row(), row({ thingName: 'moto-0901' })));
    connect();
    await fleet.stop();
    for (const c of clients.values()) {
      expect(c.ended).toBe(true);
      expect(c.endForce).toBe(false);
    }
  });

  it('moto removida e cadastrada de novo como MQTT volta com um rastreador novo', () => {
    const { fleet, clients } = setup();
    fleet.sync(fleetOf(row({ thingName: 'moto-0901' })));
    const first = clients.get('moto-0901')!;
    fleet.sync([]);
    expect(fleet.devices).toEqual([]);
    expect(fleet.sync(fleetOf(row({ thingName: 'moto-0901' })))).toEqual({ added: 1, relocated: 0, removed: 0 });
    expect(clients.get('moto-0901')).not.toBe(first);
    void fleet.stop();
  });

  it('nunca move uma moto destravada (em aluguel), mesmo parada', () => {
    const { fleet, clients, connect, tick } = setup({ SIM_RELOCATE_AFTER_SEC: '30' });
    fleet.sync(fleetOf(row({ status: 'rented', locked: false, depotLat: null, depotLng: null })));
    connect();
    tick(120);
    expect(fleet.sync(fleetOf(row({ status: 'free' }))).relocated).toBe(0);
    expect(clients.get('moto-0011')!.telemetry().at(-1)).toMatchObject({ lat: PINHEIROS[0], lng: PINHEIROS[1] });
    void fleet.stop();
  });
});
