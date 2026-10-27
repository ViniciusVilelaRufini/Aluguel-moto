import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fc from 'fast-check';
import { MemoryRedisStore } from '../../redis/redis-store';
import { BaseIotGateway } from './base-iot-gateway';
import { FakeClock } from './clock';
import { DEFAULT_OFFLINE_AFTER_MS, DEFAULT_RECONNECT_GAP_MS, DEFAULT_RECONNECT_GRACE_MS, LiveStateStore, PARKED_GAP_FACTOR, PARKED_TELEMETRY_MS, SPEED_FRESH_MS } from './live-state.store';
import { RELAY_STILL_MIN_SAMPLES, RELAY_STILL_MIN_SPAN_MS, RELAY_STOP_TIMEOUT_MS } from './relay-lock.service';
import { MemoryRelayLockStore } from './relay-lock.store';
import type { DesiredState, IotTransport, ReportedState } from './shadow-transport';
import { TelemetryService } from './telemetry.service';

/**
 * Invariante de segurança da trava `relay_only` (spec GT06 §5) por propriedade: sequências aleatórias de telemetria (parada, em
 * movimento, relógio adiantado/atrasado, réplicas velhas da fila offline), `reported` (inclusive velocidade negativa/NaN e
 * `travada`), presença, queda, silêncio e unlock, passando pelo caminho real (`TelemetryService` → `LiveStateStore` →
 * `BaseIotGateway` → `RelayLockService`). O oráculo é independente da implementação: só olha o que foi entregue e quando.
 *
 * Seed fixa: `FC_SEED=<n> pnpm --filter api test -- relay-lock.property` (o fast-check imprime a seed de toda falha); mais
 * execuções: `FC_RUNS=<n>`.
 */

const T = 'moto-0901';
const T0 = Date.parse('2026-10-27T12:00:00Z');
const FC_SEED = process.env.FC_SEED ? Number(process.env.FC_SEED) : undefined;
/** `FC_RUNS=<n>` multiplica a busca (ex.: 5000 numa investigação); o padrão roda em ~1 s. */
const FC_RUNS = process.env.FC_RUNS ? Number(process.env.FC_RUNS) : undefined;
const fcParams = (numRuns: number) => ({ numRuns: FC_RUNS ?? numRuns, ...(FC_SEED !== undefined ? { seed: FC_SEED } : {}) });

type Step =
  | { kind: 'sample'; afterMs: number; kmh: number; skewMs: number }
  /** Moto parada por um tempo: `count` telemetrias < 3 km/h a cada `everyMs` (cadência do J16 ~5 s; > 10 s nunca é consecutiva). */
  | { kind: 'parked'; afterMs: number; count: number; everyMs: number; kmh: number; skewMs: number }
  | { kind: 'replay'; afterMs: number; kmh: number; ageMs: number }
  | { kind: 'reported'; afterMs: number; kmh: number; travada: boolean | null }
  | { kind: 'presence'; afterMs: number }
  | { kind: 'offline'; afterMs: number }
  | { kind: 'unlock'; afterMs: number }
  | { kind: 'silence'; afterMs: number };

const anySpeed = fc.oneof(
  fc.double({ min: 0, max: 2.99, noNaN: true }),
  fc.double({ min: 3, max: 45, noNaN: true }),
  fc.constantFrom(0, 2.999, 3),
);
/** `reported` não passa pela validação da telemetria: velocidade negativa/NaN/infinita = desconhecida (em movimento). */
const weirdSpeed = fc.oneof(anySpeed, fc.constantFrom(-1, Number.NaN, Number.POSITIVE_INFINITY));
const step: fc.Arbitrary<Step> = fc.oneof(
  { weight: 10, arbitrary: fc.record({ kind: fc.constant('sample' as const), afterMs: fc.integer({ min: 500, max: 7_000 }), kmh: anySpeed, skewMs: fc.integer({ min: -2_000, max: 2_000 }) }) },
  {
    weight: 4,
    arbitrary: fc.record({
      kind: fc.constant('parked' as const),
      afterMs: fc.integer({ min: 500, max: 7_000 }),
      count: fc.integer({ min: 1, max: 6 }),
      everyMs: fc.integer({ min: 1_000, max: 12_000 }),
      kmh: fc.oneof(fc.double({ min: 0, max: 2.99, noNaN: true }), fc.constantFrom(0, 2.999)),
      skewMs: fc.integer({ min: -2_000, max: 2_000 }),
    }),
  },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant('replay' as const), afterMs: fc.integer({ min: 0, max: 3_000 }), kmh: anySpeed, ageMs: fc.integer({ min: 1_000, max: 60_000 }) }) },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant('reported' as const),
      afterMs: fc.integer({ min: 0, max: 3_000 }),
      kmh: weirdSpeed,
      travada: fc.oneof({ weight: 6, arbitrary: fc.constant(null) }, { weight: 1, arbitrary: fc.boolean() }),
    }),
  },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('presence' as const), afterMs: fc.integer({ min: 0, max: 3_000 }) }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('offline' as const), afterMs: fc.integer({ min: 0, max: 3_000 }) }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('unlock' as const), afterMs: fc.integer({ min: 0, max: 3_000 }) }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('silence' as const), afterMs: fc.integer({ min: 10_000, max: 40_000 }) }) },
);

/** Parada de verdade (spec §5): número finito, não negativo e < 3. Qualquer outra coisa = em movimento. */
const still = (kmh: number) => Number.isFinite(kmh) && kmh >= 0 && kmh < 3;

interface Delivered {
  kind: 'telemetry' | 'reported';
  arrival: number;
  /** Hora da medição limitada à chegada (o rastreador adiantado não ganha validade extra); `reported` = chegada. */
  measured: number;
  kmh: number;
}

/**
 * Modelo do mundo visto de fora (o que foi entregue e quando), sem olhar o estado interno da trava. Reconexões conhecidas: presença
 * `connected`, primeira mensagem com a moto offline (queda ou 180 s calada) e lacuna entre mensagens (spec §5.1 "lacuna"). O atraso
 * de fila não é modelado: é uma reconexão a mais na implementação, que só a deixa mais restrita do que o oráculo.
 */
class World {
  readonly log: Delivered[] = [];
  reconnectAt = T0;
  lastCameOnline = T0;
  private heardAt: number | undefined;
  private onlineFlag = false;
  private lastSeen = 0;
  private telemetryCount = 0;
  private everReportedLocked = false;

  constructor(private readonly clock: FakeClock) {}

  private online(): boolean {
    return this.onlineFlag && this.clock.now() - this.lastSeen < DEFAULT_OFFLINE_AFTER_MS;
  }

  /** Lacuna de reconexão: telemetria a cada 5 s (destravada com ignição) → 15 s; senão a cadência de moto parada (150 s). */
  private gapLimit(): number {
    const fast = this.telemetryCount > 0 && !this.everReportedLocked; // em dúvida, o limite maior (oráculo mais brando)
    return fast ? DEFAULT_RECONNECT_GAP_MS : Math.max(DEFAULT_RECONNECT_GAP_MS, PARKED_GAP_FACTOR * PARKED_TELEMETRY_MS);
  }

  private heard(): boolean {
    const now = this.clock.now();
    const gap = this.heardAt !== undefined && now - this.heardAt > this.gapLimit();
    if (this.heardAt === undefined || now > this.heardAt) this.heardAt = now;
    return gap;
  }

  message(d: Delivered): void {
    const now = this.clock.now();
    const wasOnline = this.online();
    const gap = this.heard();
    if (!wasOnline || gap) this.reconnectAt = now;
    if (!wasOnline) this.lastCameOnline = now;
    this.onlineFlag = true;
    this.lastSeen = now;
    if (d.kind === 'telemetry') this.telemetryCount++;
    this.log.push(d);
  }

  reportedLocked(): void {
    this.everReportedLocked = true;
  }

  presence(online: boolean): void {
    const now = this.clock.now();
    const wasOnline = this.online();
    if (online) {
      this.heard();
      this.reconnectAt = now;
      if (!wasOnline) this.lastCameOnline = now;
      this.onlineFlag = true;
      this.lastSeen = now;
    } else if (wasOnline) {
      this.onlineFlag = false;
    }
  }
}

/**
 * Oráculo (spec §5.1 com as regras endurecidas do log de decisões): no instante em que `travada: true` é gravado,
 * - a gravação sai durante a entrega de uma telemetria parada, fresca (≤ 10 s) e fora da graça da última reconexão;
 * - a última velocidade conhecida desde a reconexão (maior hora de medição, telemetria ou `reported`) é parada;
 * - existe uma sequência parada: a partir da gravação, para trás, sem nenhuma mensagem em movimento/desconhecida nem mensagem na
 *   graça no meio, com ≥ 2 telemetrias frescas, medidas depois da reconexão, cobrindo ≥ 10 s e sem intervalo > 10 s entre elas.
 */
function stoppedRunViolation(w: World, at: number): string | null {
  const d = w.log[w.log.length - 1];
  if (!d || d.kind !== 'telemetry' || d.arrival !== at) return 'corte fora da entrega de uma telemetria';
  if (!still(d.kmh)) return `corte com a amostra em ${d.kmh} km/h`;
  if (at - d.measured > SPEED_FRESH_MS) return 'corte com amostra velha';
  const graceEnd = w.reconnectAt + DEFAULT_RECONNECT_GRACE_MS;
  if (at < graceEnd) return 'corte dentro da graça da reconexão';
  const sinceReconnect = w.log.filter((s) => s.arrival >= w.reconnectAt);
  const newerMoving = sinceReconnect.find((s) => !still(s.kmh) && s.measured >= d.measured);
  if (newerMoving) return `última velocidade conhecida ${newerMoving.kmh} km/h`;
  const members: number[] = [];
  for (let i = w.log.length - 1; i >= 0; i--) {
    const s = w.log[i];
    if (!still(s.kmh) || s.arrival < graceEnd) break;
    if (s.kind === 'telemetry' && s.arrival - s.measured <= SPEED_FRESH_MS && s.measured >= w.reconnectAt && s.measured <= d.measured) members.push(s.measured);
  }
  members.sort((a, b) => b - a); // do mais novo (d) para trás
  let first = d.measured;
  let count = 0;
  for (const m of members) {
    if (first - m > SPEED_FRESH_MS) break;
    first = m;
    count++;
  }
  if (count < RELAY_STILL_MIN_SAMPLES) return `${count} telemetria(s) parada(s) consecutiva(s)`;
  if (d.measured - first < RELAY_STILL_MIN_SPAN_MS) return `sequência parada de ${d.measured - first} ms`;
  return null;
}

interface ScenarioResult {
  violations: string[];
  cuts: number;
  /** `travada: null` (lock apaga desired pendente) e `travada: false` (prazo/unlock): nunca contam como corte. */
  nonCutTravadaWrites: number;
}

async function runScenario(steps: Step[], opts: { onlyMoving?: boolean } = {}): Promise<ScenarioResult> {
  const clock = new FakeClock(T0);
  const events = new EventEmitter2();
  const world = new World(clock);
  const relayStore = new MemoryRelayLockStore();
  /** Início de cada trava (id do estado) visto de fora: o instante do `lock` que a criou. */
  const lockStartedAt = new Map<string, number>();
  const cutsPerLock = new Map<string, number>();
  const violations: string[] = [];
  let cuts = 0;
  let nonCutTravadaWrites = 0;
  const shadow: { desired: DesiredState; reported: ReportedState } = { desired: {}, reported: {} };
  const transport: IotTransport = {
    updateDesired: async (_t: string, d: DesiredState) => {
      for (const [k, v] of Object.entries(d) as Array<[keyof DesiredState, unknown]>) {
        if (v === null) delete shadow.desired[k];
        else (shadow.desired as Record<string, unknown>)[k] = v;
      }
      if (!('travada' in d)) return;
      if (d.travada !== true) {
        nonCutTravadaWrites++;
        return;
      }
      cuts++;
      const at = clock.now();
      const v = stoppedRunViolation(world, at);
      if (v) violations.push(v);
      const lock = await relayStore.get(T);
      const started = lock ? lockStartedAt.get(lock.id) : undefined;
      if (!lock || started === undefined) {
        violations.push('corte sem trava em curso');
        return;
      }
      // Prazo de 120 s para parar, desde o início da trava ou a última volta da moto (offline → online), o que for mais tarde.
      const windowStart = Math.max(started, world.lastCameOnline);
      if (at - windowStart >= RELAY_STOP_TIMEOUT_MS) violations.push(`corte ${at - windowStart} ms depois do início da espera`);
      const n = (cutsPerLock.get(lock.id) ?? 0) + 1;
      cutsPerLock.set(lock.id, n);
      if (n > 1) violations.push(`${n} cortes na mesma trava`);
    },
    readShadow: async () => ({ desired: { ...shadow.desired }, reported: { ...shadow.reported } }),
    publishCommand: async () => undefined,
    start: async () => undefined,
    stop: async () => undefined,
  };
  class Gw extends BaseIotGateway {}
  const live = new LiveStateStore(new MemoryRedisStore(), clock);
  const gw = new Gw(transport, live, clock, events, { confirmWaitMs: 3_000, commandTimeoutMs: 30_000, relayLockStore: relayStore });
  const rentals = { openRentalId: async () => undefined, trackingRentalId: async () => undefined, invalidate: () => undefined };
  const prisma = { vehicle: { findUnique: async () => ({ id: 'v1' }) }, trackPoint: { create: async () => ({}) } };
  const svc = new TelemetryService(gw, { onPosition: async () => undefined }, rentals, prisma as any, events, clock, { trackRetentionDays: 90 });
  const settle = async () => {
    for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
  };
  const deliver = async (kmh: number, deviceTs: number) => {
    const arrival = clock.now();
    world.message({ kind: 'telemetry', arrival, measured: Math.min(deviceTs, arrival), kmh });
    await svc.telemetry(T, { lat: -23.56, lng: -46.69, velocidade_kmh: kmh, bateria_pct: 80, travada: false, ignicao: true, sinal: 4, timestamp: new Date(deviceTs).toISOString() });
  };
  let n = 0;
  const relock = async () => {
    if (gw.relayLock.isActive(T) || (await relayStore.get(T)) !== null) return;
    const at = clock.now();
    void gw.lock({ commandId: `c${++n}`, thingName: T, authority: 'staff', lockOrigin: 'staff', controlMode: 'relay_only' }).catch(() => undefined);
    await settle();
    const lock = await relayStore.get(T);
    if (lock && !lockStartedAt.has(lock.id)) lockStartedAt.set(lock.id, at);
  };
  world.presence(true);
  await svc.presence(T, true);
  await relock();
  const moving = (kmh: number) => (opts.onlyMoving && still(kmh) ? 3 + kmh : kmh);
  for (const s of steps) {
    await clock.advance(s.afterMs);
    if (s.kind === 'sample') await deliver(moving(s.kmh), clock.now() + s.skewMs);
    if (s.kind === 'parked') {
      for (let i = 0; i < s.count; i++) {
        if (i > 0) await clock.advance(s.everyMs);
        await deliver(moving(s.kmh), clock.now() + s.skewMs);
      }
    }
    if (s.kind === 'replay') await deliver(moving(s.kmh), clock.now() - s.ageMs);
    if (s.kind === 'reported') {
      const kmh = moving(s.kmh);
      const reported: ReportedState = { velocidade_kmh: kmh, ...(s.travada !== null ? { travada: s.travada } : {}) };
      // A velocidade do reported conta para "a última conhecida" (pela implementação, só vale a aceita; aqui, toda).
      world.message({ kind: 'reported', arrival: clock.now(), measured: clock.now(), kmh });
      if (s.travada === true) world.reportedLocked();
      if (s.travada !== null) shadow.reported.travada = s.travada;
      await svc.reported(T, reported);
    }
    if (s.kind === 'presence') {
      world.presence(true);
      await svc.presence(T, true);
    }
    if (s.kind === 'offline') {
      world.presence(false);
      await svc.presence(T, false);
    }
    if (s.kind === 'unlock') {
      void gw.unlock({ commandId: `u${++n}`, thingName: T, authority: 'staff', controlMode: 'relay_only' }).catch(() => undefined);
      await settle();
    }
    await relock();
  }
  // Deixa os prazos em curso vencerem: nenhum corte depois do prazo (o desfecho não grava `travada: true`).
  await clock.advance(RELAY_STOP_TIMEOUT_MS * 2);
  return { violations, cuts, nonCutTravadaWrites };
}

describe('relay_only: invariante de segurança (spec GT06 §5, teste de propriedade)', () => {
  beforeAll(() => Logger.overrideLogger(false));
  afterAll(() => Logger.overrideLogger(['log', 'error', 'warn', 'debug', 'verbose']));

  it('em nenhuma sequência grava travada=true sem parada confirmada (≥ 2 amostras frescas < 3 km/h em ≥ 10 s, fora da graça), depois do prazo de 120 s ou duas vezes na mesma trava', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(step, { minLength: 1, maxLength: 80, size: 'max' }), async (steps) => {
        const { violations } = await runScenario(steps);
        expect(violations).toEqual([]);
      }),
      fcParams(200),
    );
  }, 120_000);

  it('só amostras em movimento (≥ 3 km/h, inclusive réplicas velhas e reported) → nunca corta', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(step, { minLength: 1, maxLength: 80, size: 'max' }), async (steps) => {
        const { cuts } = await runScenario(steps, { onlyMoving: true });
        expect(cuts).toBe(0);
      }),
      fcParams(150),
    );
  }, 120_000);

  it('sanidade do gerador: um cenário parado de verdade corta uma vez (o oráculo não é vazio)', async () => {
    const steps: Step[] = Array.from({ length: 8 }, () => ({ kind: 'sample' as const, afterMs: 5_000, kmh: 0, skewMs: 0 }));
    const { cuts, violations } = await runScenario(steps);
    expect(cuts).toBe(1);
    expect(violations).toEqual([]);
  });

  it('sanidade do oráculo: acusa corte com a sequência curta demais, dentro da graça e com a última amostra em movimento', async () => {
    const clock = new FakeClock(T0);
    const w = new World(clock);
    w.presence(true);
    const tel = (kmh: number) => w.message({ kind: 'telemetry', arrival: clock.now(), measured: clock.now(), kmh });
    tel(0);
    expect(stoppedRunViolation(w, clock.now())).toBe('corte dentro da graça da reconexão');
    await clock.advance(10_000);
    tel(0);
    await clock.advance(5_000);
    tel(0);
    expect(stoppedRunViolation(w, clock.now())).toMatch(/sequência parada de 5000 ms/);
    await clock.advance(5_000);
    tel(0);
    expect(stoppedRunViolation(w, clock.now())).toBeNull();
    w.message({ kind: 'reported', arrival: clock.now(), measured: clock.now(), kmh: 4 });
    tel(0);
    expect(stoppedRunViolation(w, clock.now())).not.toBeNull();
  });
});
