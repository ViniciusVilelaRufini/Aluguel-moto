import { FIXED_LIMIT_KMH, type DesiredDelta, type ReportedState } from './contract';
import { freshBlocked, type DeviceMemory } from './mapping';

export type BridgeAction = { kind: 'engineStop' } | { kind: 'engineResume' } | { kind: 'report'; reported: ReportedState };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Só os campos do contrato com o tipo certo. `travada: null` (a API limpa o desired) ou ausente = sem ação: o IoT Core
 * apaga chaves null, então isso nem deveria chegar, mas nunca vira engineStop/engineResume.
 */
export function parseDelta(raw: unknown): DesiredDelta {
  if (!isObj(raw)) return {};
  const out: DesiredDelta = {};
  if (typeof raw.travada === 'boolean') out.travada = raw.travada;
  if (typeof raw.limite_kmh === 'number' && Number.isFinite(raw.limite_kmh)) out.limite_kmh = raw.limite_kmh;
  if (typeof raw.modo_roubada === 'boolean') out.modo_roubada = raw.modo_roubada;
  return out;
}

function reportedOf(d: DesiredDelta): ReportedState {
  const reported: ReportedState = {};
  if (d.limite_kmh !== undefined) reported.limite_kmh = FIXED_LIMIT_KMH;
  if (d.modo_roubada !== undefined) reported.modo_roubada = d.modo_roubada;
  return reported;
}

/** Delta do shadow → ações (spec §6.4), sem contexto da moto. `limite_kmh` nunca vira comando: só o reported com o limite fixo. */
function planDelta(d: DesiredDelta): BridgeAction[] {
  const out: BridgeAction[] = [];
  if (d.travada === true) out.push({ kind: 'engineStop' });
  if (d.travada === false) out.push({ kind: 'engineResume' });
  const reported = reportedOf(d);
  if (Object.keys(reported).length) out.push({ kind: 'report', reported });
  return out;
}

/** `get/accepted` da reconexão: só `travada: false` pendente é reaplicado; `true` nunca (a API recomeça o fluxo, §5.7). */
export function planReconnect(d: DesiredDelta | undefined): BridgeAction[] {
  if (!d) return [];
  const { travada, ...rest } = d;
  return planDelta(travada === false ? { ...rest, travada } : rest);
}

export type CutRefusal = 'offline' | 'already_blocked' | 'recently_sent' | 'no_position' | 'stale' | 'moving';
export const CUT_FRESH_MS = 10_000;
export const CUT_RESEND_MS = 30_000;

export interface CutContext {
  online: boolean;
  mem: DeviceMemory;
  now: number;
  lastStopSentAt?: number;
}

/**
 * Segunda guarda (a primeira é a API): `engineStop` só com o dispositivo online no Traccar, sem corte ativo, sem outro
 * `engineStop` nos últimos 30 s e com a posição mais recente de até 10 s abaixo de 3 km/h. `null` = pode cortar.
 * "Corte ativo" usa só o bit atual e fresco (`freshBlocked`, ≤ 90 s): depois de reconectar ou sem status recente, não vale memória velha.
 */
export function cutRefusal(input: CutContext): CutRefusal | null {
  if (!input.online) return 'offline';
  if (freshBlocked(input.mem, input.now) === true) return 'already_blocked';
  if (input.lastStopSentAt !== undefined && input.now - input.lastStopSentAt < CUT_RESEND_MS) return 'recently_sent';
  const last = input.mem.last;
  if (!last) return 'no_position';
  if (input.now - Math.min(last.fixTime, input.now) > CUT_FRESH_MS) return 'stale';
  if (!(last.speedKmh < 3)) return 'moving';
  return null;
}

/**
 * Plano de um delta COM o estado atual da moto (a Task 9 usa para todo delta recebido; `planDelta` é interno de propósito, pois não tem a guarda do corte).
 * - guarda liberou → `engineStop`;
 * - `already_blocked` → eco `report { travada: true }` (a API só confirma o travamento por um reported.travada vindo
 *   depois da graça de reconexão; um lock repetido numa moto já travada depende deste eco). O `true` vem do bit ATUAL
 *   e fresco (`freshBlocked`, ≤ 90 s), nunca de memória anterior à reconexão;
 * - qualquer outra recusa → nada de comando/eco; `refusal` volta para a Task 9 logar (sem IMEI).
 * Os demais campos (limite fixo, modo_roubada) saem sempre no mesmo `report`.
 */
export function planDeltaFor(d: DesiredDelta, ctx: CutContext): { actions: BridgeAction[]; refusal: CutRefusal | null } {
  if (d.travada !== true) return { actions: planDelta(d), refusal: null };
  const refusal = cutRefusal(ctx);
  const reported = reportedOf(d);
  const actions: BridgeAction[] = [];
  if (refusal === null) actions.push({ kind: 'engineStop' });
  else if (refusal === 'already_blocked') reported.travada = true;
  if (Object.keys(reported).length) actions.push({ kind: 'report', reported });
  return { actions, refusal };
}
