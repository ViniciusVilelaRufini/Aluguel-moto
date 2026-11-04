import { timeAgo } from './format';
import type { RealtimeEvents, S } from './types';

type Vehicle = S<'Vehicle'>;
type StateEvent = RealtimeEvents['vehicle.state'];
type PositionEvent = RealtimeEvents['vehicle.position'];

const ms = (iso: string | undefined | null): number => (iso ? Date.parse(iso) : NaN);

/**
 * Evento mais velho que o dado já carregado? Compara a hora do servidor do evento com o último sinal da moto:
 * um GET /vehicles/{id} (ou a frota) carregado depois já traz esse estado, e aplicar o evento voltaria no tempo.
 * Sem horário comparável, vale o evento.
 */
export function isOlderThanLoaded(loadedLastSeenAt: string | undefined, eventAt: string): boolean {
  const loaded = ms(loadedLastSeenAt);
  const event = ms(eventAt);
  return !Number.isNaN(loaded) && !Number.isNaN(event) && event < loaded;
}

/** Campos de `vehicle.state` (mesmos nomes e significados de `Vehicle` no REST). */
export function statePatch(e: StateEvent): Pick<Vehicle, 'locked' | 'online' | 'lastSeenAt' | 'batteryKnown'> {
  return { locked: e.locked, online: e.online, lastSeenAt: e.lastSeenAt, batteryKnown: e.batteryKnown };
}

/** O mais novo de dois horários ISO (o inválido/ausente perde). */
export function laterIso(a: string | undefined, b: string | undefined): string | undefined {
  const ta = ms(a);
  const tb = ms(b);
  if (Number.isNaN(ta)) return b;
  if (Number.isNaN(tb)) return a;
  return tb > ta ? b : a;
}

/**
 * `vehicle.state` fora de ordem? A ordem é só pelo `ts` do evento (hora da fonte da mudança, realtime.md), contra o último
 * aplicado da mesma moto — nunca pelo `lastSeenAt`: o do evento vem do banco (gravado a cada 15 s) e o carregado pode ser o da
 * posição ao vivo, mais novo; comparar os dois descartava a trava e a bateria desconhecida com a ficha aberta (revisão final).
 */
export function isStaleStateEvent(lastAppliedTs: string | undefined, ts: string): boolean {
  return isOlderThanLoaded(lastAppliedTs, ts);
}

/** Aplica `vehicle.state` (a ordem já foi conferida por `isStaleStateEvent`); o último sinal nunca volta no tempo. */
export function applyVehicleState(v: Vehicle, e: StateEvent): Vehicle {
  return { ...v, ...statePatch(e), lastSeenAt: laterIso(v.lastSeenAt, e.lastSeenAt) };
}

/**
 * Campos de `vehicle.position`. `batteryKnown` do evento quando vem (servidor novo); sem ele (servidor antigo), leitura de
 * bateria > 0 é leitura real e a bateria volta a ser conhecida. `ts` é a hora da medição: vira `positionAt` (e o último sinal;
 * quem aplica não deixa o último sinal voltar no tempo, ver `applyVehiclePosition`).
 */
export function positionPatch(p: PositionEvent): Partial<Vehicle> {
  const known = p.batteryKnown !== undefined ? { batteryKnown: p.batteryKnown } : p.batteryPct > 0 ? { batteryKnown: true } : {};
  return {
    lat: p.lat, lng: p.lng, speedKmh: p.speedKmh, batteryPct: p.batteryPct, status: p.status, speedLimitKmh: p.speedLimitKmh, lastSeenAt: p.ts, positionAt: p.ts,
    ...known,
  };
}

/**
 * Aplica `vehicle.position`; devolve o mesmo objeto se for mais velha que a posição carregada. A ordem é pela hora da posição
 * (`positionAt`), não pelo último sinal: o heartbeat avança `lastSeenAt` sem posição nova e a posição seria descartada (P3).
 * O último sinal nunca volta no tempo; `locked`/`online` ficam como estão.
 */
export function applyVehiclePosition(v: Vehicle, p: PositionEvent): Vehicle {
  if (isOlderThanLoaded(v.positionAt, p.ts)) return v;
  return { ...v, ...positionPatch(p), lastSeenAt: laterIso(v.lastSeenAt, p.ts) };
}

/** Posição com mais de 30 s não é a posição atual (J16 sem GPS válido: o heartbeat mantém o último sinal fresco). */
export const STALE_POSITION_MS = 30_000;

/**
 * P1-3: a posição e a velocidade exibidas. Posição velha (> 30 s) → aviso "Posição de há X min (sem GPS)" e velocidade "—"
 * (a velocidade daquela posição não é a atual). Sem `positionAt` (API antiga), não marca como velha.
 */
export function positionView(v: Pick<Vehicle, 'positionAt' | 'speedKmh'>, now = Date.now()): { stale: boolean; note: string | undefined; speedText: string } {
  const at = ms(v.positionAt);
  const stale = !Number.isNaN(at) && now - at > STALE_POSITION_MS;
  const speedText = stale || v.speedKmh == null ? '— km/h' : `${Math.round(v.speedKmh)} km/h`;
  return { stale, note: stale ? `Posição de ${timeAgo(v.positionAt, now)} (sem GPS)` : undefined, speedText };
}

export interface BatteryView { known: boolean; pctText: string; rangeText: string }

/** Bateria para exibir: sem leitura (`batteryKnown === false`) nunca vira "0%" nem "~0 km". */
export function batteryView(v: Pick<Vehicle, 'batteryPct' | 'estimatedRangeKm' | 'batteryKnown'>): BatteryView {
  if (v.batteryKnown === false) return { known: false, pctText: 'Bateria desconhecida', rangeText: '—' };
  return { known: true, pctText: `${v.batteryPct}%`, rangeText: `~${Math.round(v.estimatedRangeKm)} km` };
}

/**
 * Chip de limite da ficha: o rastreador só relé não controla velocidade, então não há limite a mostrar. Tipo do rastreador
 * desconhecido (cópia sem o campo) → "Limite —" (L4: nunca "Limite 32 km/h" por padrão).
 */
export function speedLimitChip(v: Pick<Vehicle, 'trackerControlMode' | 'speedLimitKmh'>): string {
  if (v.trackerControlMode === undefined) return 'Limite —';
  return v.trackerControlMode === 'relay_only' ? 'Sem controle de velocidade' : `Limite ${v.speedLimitKmh} km/h`;
}

/** Endereço da posição atual: `null` = sem endereço geocodificado (sem "atualizado há…"); ausente = API antiga. */
export function addressView(v: Pick<Vehicle, 'address' | 'addressUpdatedAt'>): { text: string; updatedAt: string | undefined } {
  if (v.address === null) return { text: 'Sem endereço', updatedAt: undefined };
  if (!v.address) return { text: '—', updatedAt: undefined };
  return { text: v.address, updatedAt: v.addressUpdatedAt ?? undefined };
}

/**
 * Ficha: o GET /vehicles/{id} vence em todo campo, exceto os de `vehicle.position` quando a cópia ao vivo da frota tem uma
 * posição mais nova (evento que chegou com o GET ainda em voo: o `setQueryData` não tinha onde gravar e o GET trazia a velha).
 */
export function sheetVehicle(detail: Vehicle | undefined, live: Vehicle | undefined): Vehicle | undefined {
  if (!detail || !live?.positionAt) return detail ?? live;
  if (detail.positionAt && !isOlderThanLoaded(live.positionAt, detail.positionAt)) return detail;
  const { lat, lng, speedKmh, positionAt, batteryPct, batteryKnown, status, speedLimitKmh } = live;
  return { ...detail, lat, lng, speedKmh, positionAt, batteryPct, batteryKnown, status, speedLimitKmh, lastSeenAt: laterIso(detail.lastSeenAt, live.lastSeenAt) };
}
