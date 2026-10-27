import { connect as netConnect, type Socket } from 'node:net';
import { maskImei, silentLogger, type Logger } from '../log';
import { alarmPacket, commandText, infoPacket, locationPacket, loginPacket, parseFrames, PROTO, statusPacket, stringReplyPacket, type Gt06Fix, type Gt06Status } from './codec';

export interface EmulatorOptions {
  host: string;
  port: number;
  imei: string;
  intervalMs?: number;
  /** Padrão 30 s; limitado a 60 s: a ponte trata o bit de corte com mais de 90 s como desconhecido. */
  heartbeatMs?: number;
  /** Tensão externa (0x94 → `attributes.power`) usada pela ponte para `bateria_pct`; padrão 52 V (pack 48 V ≈ 83 %). */
  powerVolts?: number;
  start?: { lat: number; lng: number };
  log?: Logger;
}

/**
 * J16 de mentira para testes (spec GT06 §7): login, posição a cada `intervalMs`, heartbeat com o bit de corte, alarmes; responde
 * a `Relay,1#`/`DYD` (corta) e `Relay,0#`/`HFYD` (libera) com `0x15` e um heartbeat novo. Com o corte, a moto não anda (relé).
 * `cuts` registra a velocidade do emulador no instante de cada corte (o e2e do dev single confere que foi < 3 km/h).
 */
export const MAX_HEARTBEAT_MS = 60_000;

export class Gt06Emulator {
  readonly heartbeatMs: number;
  speedKmh = 0;
  blocked = false;
  ignition = false;
  readonly cuts: Array<{ text: string; speedKmhAtCut: number }> = [];
  readonly closed: Promise<void>;
  private resolveClosed!: () => void;
  private socket?: Socket;
  private serial = 0;
  private rest: Buffer = Buffer.alloc(0);
  private readonly timers: NodeJS.Timeout[] = [];
  private position: { lat: number; lng: number };
  private loggedIn?: () => void;
  private readonly log: Logger;

  constructor(
    private readonly opts: EmulatorOptions,
    private readonly connectFn: typeof netConnect = netConnect,
  ) {
    this.position = opts.start ?? { lat: -23.5614, lng: -46.6914 };
    this.log = opts.log ?? silentLogger;
    this.heartbeatMs = Math.min(opts.heartbeatMs ?? 30_000, MAX_HEARTBEAT_MS);
    if (opts.heartbeatMs !== undefined && opts.heartbeatMs > MAX_HEARTBEAT_MS) this.log.warn({ msg: 'gt06_heartbeat_clamped', requestedMs: opts.heartbeatMs, usedMs: this.heartbeatMs });
    this.closed = new Promise((resolve) => (this.resolveClosed = resolve));
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const s = this.connectFn({ host: this.opts.host, port: this.opts.port }, () => resolve());
      this.socket = s;
      s.once('error', reject);
      s.on('error', (err) => this.log.warn({ msg: 'gt06_socket_error', error: err.message }));
      s.on('data', (d) => this.onData(d));
      s.on('close', () => {
        this.clearTimers();
        this.resolveClosed();
      });
    });
    const acked = new Promise<void>((resolve) => (this.loggedIn = resolve));
    this.write(loginPacket(this.opts.imei, this.nextSerial()));
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('gt06_login_timeout')), 10_000);
    });
    try {
      await Promise.race([acked, timeout]);
    } finally {
      clearTimeout(timer); // a promessa do prazo nunca rejeita depois do login
    }
    this.log.info({ msg: 'gt06_logged_in', imei: maskImei(this.opts.imei) });
    // Status (bit de corte) e tensão primeiro: a ponte segura a telemetria até saber os dois depois de cada (re)conexão.
    this.sendStatus();
    this.sendLocation();
    this.timers.push(setInterval(() => this.tick(), this.opts.intervalMs ?? 5_000));
    this.timers.push(setInterval(() => this.sendStatus(), this.heartbeatMs));
  }

  stop(): void {
    this.clearTimers();
    this.socket?.destroy();
  }

  setSpeed(kmh: number): void {
    this.speedKmh = this.blocked ? 0 : Math.max(0, Math.round(kmh));
  }

  setIgnition(on: boolean): void {
    this.ignition = on;
  }

  sendAlarm(kind: 'powerCut' | 'vibration'): void {
    this.write(alarmPacket(this.fix(), this.status(), kind, this.nextSerial()));
  }

  private tick(): void {
    // Anda para leste na velocidade atual (graus aproximados; só para a posição mudar).
    const km = (this.speedKmh * (this.opts.intervalMs ?? 5_000)) / 3_600_000;
    this.position = { lat: this.position.lat, lng: this.position.lng + km / 102 };
    this.sendLocation();
  }

  private fix(): Gt06Fix {
    return { at: new Date(), lat: this.position.lat, lng: this.position.lng, speedKmh: this.speedKmh, courseDeg: 90, satellites: 9, valid: true };
  }

  private status(): Gt06Status {
    return { blocked: this.blocked, ignition: this.ignition, charging: true, voltageLevel: 6, gsmSignal: 4 };
  }

  private sendLocation(): void {
    this.write(locationPacket(this.fix(), this.nextSerial()));
  }

  private sendStatus(): void {
    const s = this.status();
    this.write(statusPacket(s, this.nextSerial()));
    this.write(infoPacket(this.opts.powerVolts ?? 52, this.nextSerial()));
    this.log.info({ msg: 'gt06_status_sent', blocked: s.blocked });
  }

  private onData(d: Buffer): void {
    const parsed = parseFrames(Buffer.concat([this.rest, d]));
    this.rest = parsed.rest;
    for (const f of parsed.frames) {
      if (f.protocol === PROTO.login) this.loggedIn?.();
      const text = commandText(f);
      if (text === null) continue;
      const cut = /relay\s*,\s*1|dyd/i.test(text);
      const resume = /relay\s*,\s*0|hfyd/i.test(text);
      if (cut) {
        this.cuts.push({ text, speedKmhAtCut: this.speedKmh });
        this.log.info({ msg: 'gt06_cut', text, speedKmhAtCut: this.speedKmh });
        this.blocked = true;
        this.speedKmh = 0;
      }
      if (resume) {
        this.log.info({ msg: 'gt06_resume' });
        this.blocked = false;
      }
      this.write(stringReplyPacket(cut ? 'Cut off the fuel supply: Success!' : resume ? 'Restore fuel supply: Success!' : 'Unknown command', f.serial));
      this.sendStatus();
      this.sendLocation();
    }
  }

  private nextSerial(): number {
    this.serial = (this.serial + 1) & 0xffff;
    return this.serial;
  }

  private write(b: Buffer): void {
    if (this.socket && !this.socket.destroyed) this.socket.write(b);
  }

  private clearTimers(): void {
    for (const t of this.timers) clearInterval(t);
    this.timers.length = 0;
  }
}
