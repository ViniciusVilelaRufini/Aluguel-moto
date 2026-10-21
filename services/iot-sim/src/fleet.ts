import { connect } from 'mqtt';
import { thingNameOf, type SimConfig } from './config';
import { SimDevice, topics, type SimMqttClient } from './device';
import { prng } from './geo';
import { VirtualMoto, type DeviceEventType } from './model';
import { ROUTES } from './routes';

export type Logger = (entry: Record<string, unknown>) => void;

export const jsonLog: Logger = (entry) => process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), service: 'iot-sim', ...entry })}\n`);

/** Frota simulada: N motos, cada uma com sua conexão MQTT (clientId = thingName, LWT de presença), num relógio comum. */
export class Fleet {
  readonly devices: SimDevice[] = [];
  private readonly clients: SimMqttClient[] = [];
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

  start(): void {
    for (let i = 0; i < this.cfg.vehicles; i++) {
      const n = this.cfg.firstVehicle + i;
      const thingName = thingNameOf(n);
      const route = ROUTES[n % ROUTES.length];
      const riding = this.rng() < this.cfg.ridingRatio;
      const moto = new VirtualMoto({
        thingName,
        route,
        startIndex: Math.floor(this.rng() * route.points.length),
        startFraction: this.rng(),
        cruiseKmh: Math.round(this.cfg.cruiseMinKmh + this.rng() * (this.cfg.cruiseMaxKmh - this.cfg.cruiseMinKmh)),
        riding,
        locked: !riding,
        rideOnUnlock: this.cfg.rideOnUnlock,
        batteryPct: 40 + Math.round(this.rng() * 60),
        signal: 3 + Math.floor(this.rng() * 3),
      });
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
    }
    this.timer = setInterval(() => this.tick(), this.cfg.tickMs);
    this.log({ msg: 'sim_started', vehicles: this.cfg.vehicles, first: thingNameOf(this.cfg.firstVehicle), riding: this.devices.filter((d) => d.moto.state.riding).length });
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
