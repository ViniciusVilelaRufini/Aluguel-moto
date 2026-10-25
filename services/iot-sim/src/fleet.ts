import { connect } from 'mqtt';
import { thingNameOf, type SimConfig } from './config';
import { SimDevice, topics, type SimMqttClient } from './device';
import type { FleetVehicle } from './fleet-source';
import { distanceM, prng } from './geo';
import { VirtualMoto, type DeviceEventType } from './model';
import { localLoop, ROUTES } from './routes';

/** Abaixo disso a diferença entre o cadastro e o rastreador é ruído (GPS/arredondamento), não uma moto levada. */
export const RELOCATE_MIN_DISTANCE_M = 50;

export type Logger = (entry: Record<string, unknown>) => void;

export const jsonLog: Logger = (entry) => process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), service: 'iot-sim', ...entry })}\n`);

/** Frota simulada: N motos, cada uma com sua conexão MQTT (clientId = thingName, LWT de presença), num relógio comum. */
export class Fleet {
  readonly devices: SimDevice[] = [];
  private readonly clients: SimMqttClient[] = [];
  private readonly byThing = new Map<string, SimDevice>();
  private timer?: NodeJS.Timeout;
  private elapsedSec = 0;
  private readonly rng: () => number;

  constructor(
    private readonly cfg: SimConfig,
    private readonly log: Logger = jsonLog,
    private readonly connectFn: (thingName: string) => SimMqttClient = (thingName) => defaultConnect(cfg.mqttUrl, thingName),
  ) {
    this.rng = prng(cfg.seed);
  }

  /** Modo `routes`: N motos de demonstração (`moto-0001`…) nas rotas de Pinheiros, Vila Madalena e Paulista. */
  start(): void {
    for (let i = 0; i < this.cfg.vehicles; i++) {
      const n = this.cfg.firstVehicle + i;
      const thingName = thingNameOf(n);
      const route = ROUTES[n % ROUTES.length];
      const riding = this.rng() < this.cfg.ridingRatio;
      this.add(
        new VirtualMoto({
          thingName,
          route,
          startIndex: Math.floor(this.rng() * route.points.length),
          startFraction: this.rng(),
          cruiseKmh: this.cruise(),
          riding,
          locked: !riding,
          rideOnUnlock: this.cfg.rideOnUnlock,
          batteryPct: 40 + Math.round(this.rng() * 60),
          signal: 3 + Math.floor(this.rng() * 3),
        }),
      );
    }
    this.startClock();
    this.log({ msg: 'sim_started', source: 'routes', vehicles: this.cfg.vehicles, first: thingNameOf(this.cfg.firstVehicle), riding: this.devices.filter((d) => d.moto.state.riding).length });
  }

  /**
   * Modo `postgres`: alinha a frota simulada com as motos cadastradas. Moto nova → rastreador novo na posição cadastrada,
   * parado (velocidade 0), travado/limite como no banco. Moto já simulada, travada e parada há `relocateAfterSec`, cujo
   * cadastro está a mais de 50 m → foi levada (recolhimento, chegada ao galpão): o rastreador passa a reportar o novo ponto.
   * Motos andando nunca são movidas. Motos removidas do cadastro continuam conectadas até o simulador reiniciar.
   */
  sync(vehicles: FleetVehicle[]): { added: number; relocated: number } {
    let added = 0;
    let relocated = 0;
    for (const v of vehicles) {
      const existing = this.byThing.get(v.thingName);
      if (!existing) {
        this.add(
          new VirtualMoto({
            thingName: v.thingName,
            route: localLoop(v.position),
            cruiseKmh: this.cruise(),
            riding: false,
            locked: v.locked,
            rideOnUnlock: this.cfg.rideOnUnlock,
            batteryPct: v.batteryPct,
            limitKmh: v.limitKmh,
            signal: 4,
          }),
        );
        added++;
        continue;
      }
      const m = existing.moto;
      if (m.parkedSec >= this.cfg.relocateAfterSec && distanceM(m.position(), v.position) > RELOCATE_MIN_DISTANCE_M && existing.relocate(v.position)) {
        relocated++;
        this.log({ msg: 'sim_relocated', thingName: v.thingName });
      }
    }
    this.startClock();
    if (added || relocated) this.log({ msg: 'sim_fleet_synced', source: 'postgres', vehicles: this.devices.length, added, relocated });
    return { added, relocated };
  }

  private cruise(): number {
    return Math.round(this.cfg.cruiseMinKmh + this.rng() * (this.cfg.cruiseMaxKmh - this.cfg.cruiseMinKmh));
  }

  private add(moto: VirtualMoto): void {
    const thingName = moto.state.thingName;
    const client = this.connectFn(thingName);
    client.on('error', (err) => this.log({ level: 'warn', msg: 'mqtt_error', thingName, error: err.message }));
    const device = new SimDevice(moto, client, {
      telemetryRidingMs: this.cfg.telemetryRidingMs,
      telemetryParkedMs: this.cfg.telemetryParkedMs,
      now: () => new Date(),
      log: this.log,
    });
    device.start();
    this.devices.push(device);
    this.clients.push(client);
    this.byThing.set(thingName, device);
  }

  private startClock(): void {
    if (!this.timer) this.timer = setInterval(() => this.tick(), this.cfg.tickMs);
  }

  tick(): void {
    const dt = this.cfg.tickMs / 1000;
    this.elapsedSec += dt;
    for (const d of this.devices) {
      d.tick(dt);
      for (const [type, perHour] of Object.entries(this.cfg.eventRates) as Array<[DeviceEventType, number]>) {
        if (this.rng() < (perHour * dt) / 3600) d.injectEvent(type);
      }
    }
    for (const inj of this.cfg.injections) {
      if (inj.atSec > this.elapsedSec - dt && inj.atSec <= this.elapsedSec) this.devices.find((d) => d.moto.state.thingName === inj.thingName)?.injectEvent(inj.type);
    }
    if (Math.floor(this.elapsedSec) % 30 === 0 && Math.floor(this.elapsedSec - dt) % 30 !== 0) {
      const moving = this.devices.filter((d) => d.moto.state.speedKmh > 0).length;
      const locked = this.devices.filter((d) => d.moto.state.locked).length;
      this.log({ msg: 'sim_status', elapsedSec: Math.round(this.elapsedSec), moving, locked, connected: this.clients.filter((c) => c.connected).length });
    }
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    for (const [i, c] of this.clients.entries()) {
      const t = this.devices[i].moto.state.thingName;
      if (c.connected) c.publish(topics(t).disconnected, JSON.stringify({ clientId: t, eventType: 'disconnected' }), { qos: 0 });
      c.end();
    }
    this.log({ msg: 'sim_stopped' });
  }
}

function defaultConnect(url: string, thingName: string): SimMqttClient {
  return connect(url, {
    clientId: thingName,
    clean: true,
    reconnectPeriod: 2_000,
    keepalive: 30,
    will: { topic: topics(thingName).disconnected, payload: Buffer.from(JSON.stringify({ clientId: thingName, eventType: 'disconnected' })), qos: 1, retain: false },
  }) as unknown as SimMqttClient;
}
