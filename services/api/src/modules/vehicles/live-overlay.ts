import type { RedisStore } from '../../redis/redis-store';

interface LiveFields {
  thingName: string;
  lat: number;
  lng: number;
  speedKmh: number | null;
  batteryPct: number;
  locked: boolean;
  ignition: boolean;
  signal: number | null;
  lastSeenAt: Date | null;
}

const num = (v: string | undefined) => (v === undefined || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v));

/**
 * QA-20: sobrepõe às linhas do Postgres (gravadas a cada 30 s por moto) o estado ao vivo do módulo IoT no Redis
 * (`iot:live:{thingName}`), quando ele é mais novo. Sem estado ao vivo ou com o Redis fora, vale o banco.
 * Conectividade/status continuam do banco (a vigia de inatividade é quem decide offline).
 */
export async function withLiveState<T extends LiveFields>(redis: Pick<RedisStore, 'hgetall'>, rows: T[]): Promise<T[]> {
  return Promise.all(
    rows.map(async (v) => {
      const h = await redis.hgetall(`iot:live:${v.thingName}`).catch(() => ({}) as Record<string, string>);
      const seen = h?.lastSeenAt ? Date.parse(h.lastSeenAt) : NaN;
      if (!Number.isFinite(seen) || (v.lastSeenAt && seen <= v.lastSeenAt.getTime())) return v;
      const lat = num(h.lat);
      const lng = num(h.lng);
      if (lat === undefined || lng === undefined || (lat === 0 && lng === 0)) return v;
      const battery = num(h.batteryPct);
      return {
        ...v,
        lat,
        lng,
        speedKmh: num(h.speedKmh) ?? v.speedKmh,
        batteryPct: battery === undefined ? v.batteryPct : Math.round(battery),
        locked: h.locked === undefined ? v.locked : h.locked === 'true',
        ignition: h.ignition === undefined ? v.ignition : h.ignition === 'true',
        signal: num(h.signal) ?? v.signal,
        lastSeenAt: new Date(seen),
      };
    }),
  );
}
