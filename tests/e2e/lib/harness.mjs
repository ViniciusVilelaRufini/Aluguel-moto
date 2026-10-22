// Utilitários dos testes e2e de caixa-preta (agente 8). Falam com a API no ar (HTTP + Socket.IO), com o Mosquitto
// (rastreador emulado) e com o Postgres (só leitura para asserções que a API não expõe).
// As dependências vêm do services/api (mqtt, socket.io-client, @prisma/client) para não criar um pacote novo.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const root = resolve(here, '../../..');
const apiDir = resolve(root, 'services/api');
export const requireApi = createRequire(resolve(apiDir, 'package.json'));

// Lê services/api/.env (DATABASE_URL, REDIS_URL, MQTT_URL, PORT) sem sobrescrever o que já veio do ambiente.
try {
  for (const line of readFileSync(resolve(apiDir, '.env'), 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch {
  /* sem .env: usa só o ambiente */
}

export const API = process.env.E2E_API_URL ?? `http://localhost:${process.env.PORT ?? 3005}`;
export const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://localhost:1883';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function until(fn, timeoutMs, what) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > deadline) throw new Error(`Tempo esgotado esperando: ${what}`);
    await sleep(250);
  }
}

/** Requisição JSON à API. Devolve { status, body, headers }. */
export async function http(method, path, { token, body, headers = {}, idem } = {}) {
  const h = { ...headers };
  if (token) h.authorization = `Bearer ${token}`;
  if (body !== undefined) h['content-type'] = 'application/json';
  if (idem) h['idempotency-key'] = idem === true ? randomUUID() : idem;
  const res = await fetch(API + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed, headers: res.headers };
}

export async function devToken({ sub, email, groups = [], pool }) {
  const r = await http('POST', '/dev/token', { body: { sub, email, groups, pool } });
  if (r.status !== 200) throw new Error(`dev token ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.accessToken;
}

export const adminToken = () => devToken({ sub: 'dev-admin', email: 'admin@volti.dev', groups: ['admin'], pool: 'staff' });

export function prisma() {
  const { PrismaClient } = requireApi('@prisma/client');
  return new PrismaClient();
}

export async function mqttClient(clientId) {
  const { connect } = requireApi('mqtt');
  const c = connect(MQTT_URL, { clientId: clientId ?? `e2e-${randomUUID().slice(0, 8)}`, reconnectPeriod: 0 });
  await new Promise((ok, fail) => {
    c.once('connect', () => ok());
    c.once('error', fail);
  });
  return c;
}

/** Cliente Socket.IO no namespace /realtime; guarda todos os eventos recebidos em `events`. */
export async function realtime(token) {
  const { io } = requireApi('socket.io-client');
  const socket = io(`${API}/realtime`, { auth: { token }, transports: ['websocket'], reconnection: false });
  const events = [];
  socket.onAny((name, payload) => events.push({ name, payload, at: Date.now() }));
  await new Promise((ok, fail) => {
    socket.once('connect', ok);
    socket.once('connect_error', fail);
  });
  return { socket, events };
}

/**
 * Rastreador emulado que obedece ao contrato MQTT como o firmware deve obedecer (docs/firmware-bloqueio-seguro.md):
 * aplica `limite_kmh` 0..32, só trava abaixo de 3 km/h, publica `reported` e telemetria. A posição e a velocidade
 * "pedida pelo piloto" são controladas pelo teste.
 */
export class EmulatedTracker {
  constructor(thingName) {
    this.thing = thingName;
    this.state = { travada: true, limite_kmh: 32, modo_roubada: false, firmware: 'e2e-1.0.0', velocidade_kmh: 0 };
    this.pos = { lat: 0, lng: 0 };
    this.wanted = 0; // velocidade que o "piloto" tenta manter
    this.battery = 80;
    this.deltas = [];
    this.reported = [];
    this.lockPendingSince = null;
  }

  topic(leaf) {
    return `$aws/things/${this.thing}/shadow/${leaf}`;
  }

  async connect() {
    const { connect } = requireApi('mqtt');
    this.client = connect(MQTT_URL, {
      clientId: this.thing,
      reconnectPeriod: 0,
      will: { topic: `$aws/events/presence/disconnected/${this.thing}`, payload: JSON.stringify({ clientId: this.thing, eventType: 'disconnected' }), qos: 1 },
    });
    await new Promise((ok, fail) => {
      this.client.once('connect', () => ok());
      this.client.once('error', fail);
    });
    this.client.on('message', (topic, payload) => this.onMessage(topic, JSON.parse(payload.toString())));
    await this.client.subscribeAsync([this.topic('update/delta'), this.topic('get/accepted'), `motos/${this.thing}/comandos`], { qos: 1 });
    this.client.publish(`$aws/events/presence/connected/${this.thing}`, JSON.stringify({ clientId: this.thing, eventType: 'connected', timestamp: Date.now() }), { qos: 1 });
    this.publishReported({ ...this.state });
    this.client.publish(this.topic('get'), '{}', { qos: 1 });
    this.telemetry();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  /** Queda abrupta (sem last will imediato: simula perda de sinal, o broker publica o will). */
  disconnect() {
    clearInterval(this.timer);
    if (!this.client) return;
    // Derruba o socket sem DISCONNECT (perda de sinal): o broker publica o last will.
    this.client.options.reconnectPeriod = 0;
    this.client.stream?.destroy();
    this.client.end(true);
  }

  async goOfflineGracefully() {
    clearInterval(this.timer);
    this.client.publish(`$aws/events/presence/disconnected/${this.thing}`, JSON.stringify({ clientId: this.thing, eventType: 'disconnected' }), { qos: 1 });
    await new Promise((r) => this.client.end(false, {}, r));
  }

  onMessage(topic, body) {
    if (topic.endsWith('/update/delta')) {
      this.deltas.push({ at: Date.now(), state: body.state, speedAtDelta: this.state.velocidade_kmh });
      this.applyDesired(body.state ?? {});
    } else if (topic.endsWith('/get/accepted')) {
      const delta = body?.state?.delta;
      if (delta) {
        this.deltas.push({ at: Date.now(), state: delta, speedAtDelta: this.state.velocidade_kmh, fromGet: true });
        this.applyDesired(delta);
      }
    }
  }

  applyDesired(d) {
    const changes = {};
    if (d.limite_kmh !== undefined) {
      if (Number.isInteger(d.limite_kmh) && d.limite_kmh >= 0 && d.limite_kmh <= 32) {
        this.state.limite_kmh = d.limite_kmh;
        changes.limite_kmh = d.limite_kmh;
      }
    }
    if (d.modo_roubada !== undefined) {
      this.state.modo_roubada = !!d.modo_roubada;
      changes.modo_roubada = this.state.modo_roubada;
    }
    if (d.travada === false) {
      this.state.travada = false;
      this.lockPendingSince = null;
      changes.travada = false;
    }
    if (d.travada === true) {
      if (this.state.velocidade_kmh < 3) {
        this.state.travada = true;
        this.wanted = 0;
        changes.travada = true;
      } else {
        this.lockPendingSince = Date.now(); // firmware: trava fica pendente com a moto andando
      }
    }
    if (Object.keys(changes).length) this.publishReported(changes);
  }

  publishReported(changes) {
    const reported = { ...changes, velocidade_kmh: Math.round(this.state.velocidade_kmh * 10) / 10 };
    this.reported.push({ at: Date.now(), reported });
    this.client.publish(this.topic('update'), JSON.stringify({ state: { reported } }), { qos: 1 });
  }

  telemetry() {
    const s = this.state;
    this.client.publish(
      `motos/${this.thing}/telemetria`,
      JSON.stringify({
        lat: this.pos.lat, lng: this.pos.lng, velocidade_kmh: Math.round(s.velocidade_kmh * 10) / 10, bateria_pct: this.battery,
        travada: s.travada, ignicao: !s.travada, sinal: 4, timestamp: new Date().toISOString(),
      }),
    );
  }

  /** Move a moto e publica telemetria na hora (o teste controla a posição). */
  moveTo(lat, lng) {
    this.pos = { lat, lng };
    this.telemetry();
  }

  tick() {
    const s = this.state;
    const cap = s.travada ? 0 : Math.min(this.wanted, s.limite_kmh, 32);
    const before = s.velocidade_kmh;
    if (s.velocidade_kmh > cap) s.velocidade_kmh = Math.max(cap, s.velocidade_kmh - 4);
    else if (s.velocidade_kmh < cap) s.velocidade_kmh = Math.min(cap, s.velocidade_kmh + 4);
    if (this.lockPendingSince && s.velocidade_kmh < 3) {
      s.travada = true;
      this.wanted = 0;
      this.lockPendingSince = null;
      this.publishReported({ travada: true });
    } else if (before !== s.velocidade_kmh) {
      this.publishReported({});
    }
    this.telemetry();
  }
}
