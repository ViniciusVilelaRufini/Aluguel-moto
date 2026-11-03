import type { RedisStore } from '../../redis/redis-store';
import { MAX_CLOCK_SKEW_MS } from '../iot/live-state.store';
import { telemetryLockWins } from './lock-precedence';

interface LiveFields {
  thingName: string;
  lat: number;
  lng: number;
  speedKmh: number | null;
  batteryPct: number;
  batteryKnown?: boolean;
  locked: boolean;
  ignition: boolean;
  signal: number | null;
  online?: boolean;
  lastSeenAt: Date | null;
  /** Origem da trava gravada (lock-precedence.ts). */
  lockedAt?: Date | null;
  lockedFromReport?: boolean | null;
}

const num = (v: string | undefined) => (v === undefined || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v));

/**
 * QA-20: sobrepõe às linhas do Postgres o estado ao vivo do módulo IoT no Redis (`iot:live:{thingName}`). Sem estado ao vivo,
 * com o Redis fora ou com o Redis muito mais velho que o banco (mais que `MAX_CLOCK_SKEW_MS`), vale o banco.
 *
 * Bancada do J16 (2026-11-03): o estado do rastreador (trava, online, último sinal, bateria conhecida) é sobreposto **à parte**
 * da posição: um J16 parado só com status/heartbeat (Redis sem posição, lat/lng 0) ainda mostra a trava e o último sinal reais.
 * E o `lastSeenAt` do banco pode estar à frente do Redis (gravado com o relógio do rastreador adiantado, antes de passar a ser a
 * hora do servidor): até `MAX_CLOCK_SKEW_MS` de diferença o Redis (hora de chegada no servidor) vale. A trava só é sobreposta
 * com origem conhecida (`lockedAt`): o `locked: true` do estado em branco (presença sem mensagem) não vale. O status da moto
 * (`offline`) continua do banco (a vigia de inatividade é quem decide).
 */
export async function withLiveState<T extends LiveFields>(redis: Pick<RedisStore, 'hgetall'>, rows: T[]): Promise<T[]> {
  return Promise.all(
    rows.map(async (v) => {
      const h = await redis.hgetall(`iot:live:${v.thingName}`).catch(() => ({}) as Record<string, string>);
      const seen = h?.lastSeenAt ? Date.parse(h.lastSeenAt) : NaN;
      if (!Number.isFinite(seen) || seen <= 0) return v;
      if (v.lastSeenAt && seen < v.lastSeenAt.getTime() - MAX_CLOCK_SKEW_MS) return v;
      const out: T = { ...v, lastSeenAt: new Date(seen) };
      if (h.online !== undefined) out.online = h.online === 'true';
      // Mesma precedência do banco e do `vehicle.state`: o Redis guarda a última trava de qualquer fonte (inclusive a telemetria
      // conservadora da ponte, `travada: false` com o bit velho) e não desfaz um reported recente gravado no banco.
      const redisLockedAt = num(h.lockedAt);
      if (h.locked !== undefined && redisLockedAt !== undefined && telemetryLockWins(v, redisLockedAt)) out.locked = h.locked === 'true';
      const lat = num(h.lat);
      const lng = num(h.lng);
      if (lat === undefined || lng === undefined || (lat === 0 && lng === 0)) return out;
      const battery = num(h.batteryPct);
      return {
        ...out,
        lat,
        lng,
        speedKmh: num(h.speedKmh) ?? v.speedKmh,
        batteryPct: battery === undefined ? v.batteryPct : Math.round(battery),
        ...(h.batteryKnown === undefined ? {} : { batteryKnown: h.batteryKnown !== 'false' }),
        ignition: h.ignition === undefined ? v.ignition : h.ignition === 'true',
        signal: num(h.signal) ?? v.signal,
      };
    }),
  );
}
