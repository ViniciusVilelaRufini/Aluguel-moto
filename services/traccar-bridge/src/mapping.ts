import { isValidTelemetry, MIN_GPS_SATELLITES, type DeviceEventMessage, type DeviceEventType, type TelemetryMessage } from './contract';
import type { TraccarEvent, TraccarPosition } from './traccar/types';
import { knotsToKmh, rssiToSignal, voltageToPct, type BatteryModel } from './units';

/** Estado por moto mantido pela ponte (só a moto: nada do cliente). */
export interface DeviceMemory {
  /** Último bit de corte (`attributes.blocked`). Leia SEMPRE por `currentBlocked(mem)`, nunca direto. */
  blocked?: boolean;
  /** min(serverTime do Traccar, relógio de ingestão) (ms) do último status com `attributes.blocked` ou resposta "RELAY n OK". Base de `freshBlocked`. */
  blockedAt?: number;
  ignition?: boolean;
  signal?: number;
  batteryPct?: number;
  /** `true` entre `markReconnected` e o primeiro `attributes.blocked` recebido: o bit de corte é desconhecido. */
  awaitingStatus?: boolean;
  /** `fixTime` (ms) da última telemetria publicada: só sai telemetria mais nova. */
  lastFixTime?: number;
  /** Última posição válida publicada: base da segunda guarda do corte e do `reported.velocidade_kmh`. */
  last?: { fixTime: number; speedKmh: number; lat: number; lng: number };
  /**
   * Cadeia de posições boas com o corte ativo (deslocamento > 20 m travada → `movimento_sem_aluguel`): `lat`/`lng` = âncora
   * (primeira posição boa da cadeia), `prev` = última posição boa. Some com o corte não confirmado, posição fraca, posição sem
   * fix e heartbeat com o GPS desligado; posição boa a mais de `LOCK_ANCHOR_MAX_GAP_MS` da anterior reancora (comparando com
   * `lastGoodLocked` a `LOCK_REANCHOR_ALARM_M`).
   */
  lockAnchor?: { lat: number; lng: number; prev: { lat: number; lng: number; fixTime: number } };
  /**
   * Última posição BOA vista com o corte ativo (revisão de segurança, 2026-11-04). Não some em lacuna, posição fraca, sem fix,
   * GPS desligado, reconexão nem comando: só com status dizendo corte solto (`currentBlocked === false`). Depois de uma quebra da
   * cadeia, a primeira boa e toda fraca comparam com ela a `LOCK_REANCHOR_ALARM_M` — a moto levada com o GPS fora ainda alarma.
   */
  lastGoodLocked?: { lat: number; lng: number };
  /** Posição fraca do último alarme por posição fraca: outra fraca só alarma a mais de `LOCK_REANCHOR_ALARM_M` dela. */
  weakAlarmAt?: { lat: number; lng: number };
  /**
   * Byte terminal info do último status GT06 (`attributes.status` cru do Traccar): hora (min(serverTime, ingestão)), bit 6
   * (rastreamento GPS ligado) e bit 1 (ACC). Base de `gpsSleepOf`.
   */
  gpsStatus?: { at: number; tracking: boolean; ignition: boolean };
  /**
   * Relógio da ponte (ms) do último `engineStop`/`engineResume` aceito pelo Traccar (`markCommandSent`). Enquanto houver
   * `pendingCommand`, só vale status recebido depois da resposta do aparelho (`commandAckAt`) ou, sem resposta, depois de
   * `commandSentAt + COMMAND_ACK_GRACE_MS`.
   */
  commandSentAt?: number;
  /** Comando de motor enviado e ainda sem status aceito depois dele. Limpo no primeiro status aceito. */
  pendingCommand?: 'stop' | 'resume';
  /** Hora (min(serverTime, ingestão)) da resposta do aparelho ao comando pendente (`attributes.result` do Traccar). */
  commandAckAt?: number;
  /**
   * Última resposta "RELAY n OK" aceita: hora (min(serverTime, ingestão)) e o estado do relé que ela disse. Status contrário
   * recebido até `at + RELAY_REPLY_SETTLE_MS` ainda traz o bit antigo (bancada) e não vale. Limpa em comando novo e reconexão.
   */
  relayReply?: { at: number; blocked: boolean };
}

/**
 * Bancada do J16 (2026-11-03): o status recebido ~1 s DEPOIS da resposta "RELAY 0 OK" ainda trazia `blocked: true` (o bit
 * antigo); o seguinte (60 s) já trazia o novo. Status cujo bit contraria a resposta aceita e recebido até isto depois dela é
 * ignorado para o bit (log `stale_status_after_reply`); depois, vale normalmente (relé que não mudou aparece no heartbeat).
 */
export const RELAY_REPLY_SETTLE_MS = 5_000;

/**
 * Sem resposta do aparelho ao comando (`attributes.result`), status recebido até o envio + isto pode ter sido emitido antes de o
 * J16 executar o `Relay` (heartbeat em trânsito) e não vale como bit de corte (P2).
 */
export const COMMAND_ACK_GRACE_MS = 5_000;

export const MOVED_WHILE_LOCKED_M = 20;

/**
 * Limiar do alarme de movimento travada fora da cadeia contínua: primeira posição boa depois de uma lacuna/quebra (GPS dormindo,
 * sem fix, fraca) e posição fraca, ambas contra `lastGoodLocked`. Maior que os 20 m porque o primeiro fix depois de uma lacuna
 * (e o fix fraco) erra dezenas de metros com a moto parada (bancada do J16: ~40 m); menor que o deslocamento de um furto.
 */
export const LOCK_REANCHOR_ALARM_M = 150;

/**
 * Bancada do J16 (2026-11-04): ao voltar de um período sem fix (modo de economia, `Slp:1`), a primeira posição salta dezenas de
 * metros da âncora tirada antes, com a moto parada, e disparava `movimento_sem_aluguel` falso. Posição boa a mais que isto da
 * posição boa anterior (hora do fix) não é comparada: reancora.
 */
export const LOCK_ANCHOR_MAX_GAP_MS = 60_000;

/** Heartbeat do J16 a cada ~60 s: byte de status recebido há mais que isto é desconhecido para `gpsSleepOf`. */
export const GPS_STATUS_FRESH_MS = 180_000;

/** Byte terminal info do GT06 (heartbeat 0x13; Traccar `attributes.status`): bit 1 = ACC, bit 6 = rastreamento GPS ligado. */
const GT06_STATUS_ACC = 1 << 1;
const GT06_STATUS_GPS_TRACKING = 1 << 6;

/**
 * Modo de economia do GPS: `true` = o último status (≤ 3 min) disse rastreamento GPS desligado com a ACC desligada (o J16 com
 * `Slp:1` liga o GPS por ~5 min e desliga por 10–70 min com a ignição desligada); `false` = GPS ligado ou ACC ligada;
 * `undefined` = sem status fresco (o Traccar não entregou o byte, ou heartbeat velho).
 */
export function gpsSleepOf(mem: DeviceMemory, now: number): boolean | undefined {
  const s = mem.gpsStatus;
  if (!s || now - s.at > GPS_STATUS_FRESH_MS) return undefined;
  return !s.tracking && !s.ignition;
}

/** `attributes.sat` do Traccar (satélites do fix GT06); fora de inteiro 0..255 = desconhecido. */
function satellitesOf(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 255 ? v : undefined;
}

/**
 * Bit de corte ATUAL: `undefined` enquanto aguarda o primeiro status depois de uma (re)conexão.
 * Único jeito permitido de montar `reported.travada` / decidir `already_blocked` (nada de memória velha).
 */
export function currentBlocked(mem: DeviceMemory): boolean | undefined {
  return mem.awaitingStatus ? undefined : mem.blocked;
}

/**
 * A Task 9 chama quando o dispositivo (re)conecta no Traccar (`deviceOnline`/socket reaberto): esquece o bit de corte e
 * a âncora. Só um `attributes.blocked` recebido depois (heartbeat ou posição) volta a valer. Não muta a entrada.
 */
export function markReconnected(mem: DeviceMemory): DeviceMemory {
  return { ...mem, blocked: undefined, blockedAt: undefined, lockAnchor: undefined, awaitingStatus: true, relayReply: undefined };
}

/**
 * A4-1: chamado logo depois de um `engineStop`/`engineResume` aceito pelo Traccar. O bit anterior ao comando não diz mais
 * nada sobre o relé: nem eco `already_blocked`, nem `reported.travada`, nem telemetria `travada: true` podem usá-lo (senão
 * um unlock expirado + relock de rollback "confirmaria" uma trava que não aconteceu). Só status recebido depois da resposta
 * do aparelho (ou de `now + COMMAND_ACK_GRACE_MS`) volta a valer. Telemetria até lá (`applyPosition`): depois de `resume`,
 * retida (um `false` confirmaria o unlock); depois de `stop`, sai com `travada: false` (nunca confirma lock e não abre lacuna
 * na API). Não muta a entrada.
 */
export function markCommandSent(mem: DeviceMemory, now: number, kind: 'stop' | 'resume'): DeviceMemory {
  return {
    ...mem,
    blocked: undefined,
    blockedAt: undefined,
    lockAnchor: undefined,
    awaitingStatus: true,
    commandSentAt: now,
    pendingCommand: kind,
    commandAckAt: undefined,
    relayReply: undefined,
  };
}

/**
 * Um J16 que reconecta numa sessão TCP nova pode não aparecer como offline→online no Traccar. Heartbeat obrigatório ≤ 60 s:
 * bit de corte recebido há mais que isto é desconhecido para decidir `already_blocked` e o eco `travada: true`.
 */
export const BLOCKED_FRESH_MS = 90_000;

/** `currentBlocked` só se o status com o bit chegou há no máximo `BLOCKED_FRESH_MS` (sem hora = desconhecido). */
export function freshBlocked(mem: DeviceMemory, now: number): boolean | undefined {
  if (mem.blockedAt === undefined || now - mem.blockedAt > BLOCKED_FRESH_MS) return undefined;
  return currentBlocked(mem);
}

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/**
 * Tolerância de relógio do rastreador. Mesmo valor de MAX_CLOCK_SKEW_MS em services/api/src/modules/iot/live-state.store.ts
 * (copiado, não importado entre pacotes): fixTime além de agora + isto é não confiável.
 */
export const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;

export type HeldReason = 'awaiting_status' | 'awaiting_battery';

/**
 * Resposta do J16 ao comando de motor com o estado do relé (bancada 2026-11-03): `"Stop engine Succeed\nRELAY 1 OK"` /
 * `"Resume engine Succeed\nRELAY 0 OK"`, entregue pelo Traccar como posição com `attributes.result`.
 */
export const RELAY_REPLY_RE = /\bRELAY\s*([01])\s*OK\b/i;

/** `attributes.result` → estado do relé (`true` = corte ligado); `undefined` se a resposta não traz o estado. */
export function parseRelayReply(result: string): boolean | undefined {
  const m = RELAY_REPLY_RE.exec(result);
  return m ? m[1] === '1' : undefined;
}

/**
 * Com comando pendente, a resposta só vale se recebida pelo Traccar depois do envio E se for a do comando pendente
 * (`stop` → `RELAY 1`, `resume` → `RELAY 0`): uma resposta atrasada do comando anterior não confirma nem vira eco
 * `already_blocked`. Sem comando pendente (reconexão, comando por SMS) é o estado atual do relé.
 */
function relayReplyAccepted(mem: DeviceMemory, at: number, relay: boolean): boolean {
  if (!mem.pendingCommand || mem.commandSentAt === undefined) return true;
  return at > mem.commandSentAt && relay === (mem.pendingCommand === 'stop');
}

/**
 * Posição do Traccar → telemetria do contrato (spec §6.2). Todo atributo conhecido atualiza a memória (inclusive de heartbeat);
 * só posição válida, não `outdated` e com `fixTime` mais novo que a última publicada vira telemetria.
 * - `now` (ms) é o relógio de ingestão. `fixTime` > now + MAX_CLOCK_SKEW_MS = `invalid`: não grava `last`/ordem; a
 *   frescura usa min(fixTime, now) (`last.fixTime`).
 * - Posição mais nova e inutilizável (inválida, outdated, relógio ou velocidade fora do contrato) limpa `last`: velocidade
 *   desconhecida = em movimento (`cutRefusal` → no_position/stale).
 * - Retenção: com `engineResume` pendente sem status novo (`telemetryBlocked`) ou sem bateria conhecida, não sai telemetria
 *   (`telemetry: null`, `held`) — um `travada: false` antes do status ou `bateria_pct: 0` por falta de dado enganaria a API.
 *   Bit desconhecido sem comando pendente (reconexão, nunca visto) sai com `travada: false` (A4-6).
 *   A memória (last, ignição, sinal, bateria) atualiza mesmo assim.
 * - Resposta do J16 com o estado do relé (`attributes.result` "RELAY 0/1 OK", `parseRelayReply`) aceita
 *   (`relayReplyAccepted`) = status fresco do próprio aparelho: `blocked`/`blockedAt` (min(serverTime, ingestão)) na hora e
 *   `relayReply: true` (a ponte publica `reported.travada` sem a deduplicação de 1/min). Posição com `attributes.result` nunca
 *   vira telemetria nem renova `last` (é a última localização repetida, não medição); com `fixTime` mais novo que a última
 *   telemetria ou velocidade em movimento, apaga `last`.
 * O `reported.travada` deve usar `currentBlocked` e só ser publicado quando for boolean.
 */
export function applyPosition(
  p: TraccarPosition,
  mem: DeviceMemory,
  battery: BatteryModel,
  now: number = Date.now(),
  opts: { consolePending?: boolean } = {},
): {
  telemetry: TelemetryMessage | null;
  invalid: boolean;
  movedWhileLocked: boolean;
  held?: HeldReason;
  relayReply: boolean;
  /** Status com o bit contrário à resposta "RELAY n OK" aceita há até `RELAY_REPLY_SETTLE_MS`: o bit foi ignorado. */
  staleAfterReply: boolean;
  memory: DeviceMemory;
} {
  const next: DeviceMemory = { ...mem };
  const a = p.attributes ?? {};
  // Hora do Traccar ao receber a mensagem, limitada a agora: um heartbeat parado numa fila (WebSocket, inbound) não é fresco.
  const serverAt = Date.parse(p.serverTime);
  const at = Number.isFinite(serverAt) ? Math.min(serverAt, now) : now;
  const result = typeof a.result === 'string' ? a.result : undefined;
  const relay = result === undefined ? undefined : parseRelayReply(result);
  // P2: resposta do aparelho ao comando pendente (o Traccar a entrega como posição com `attributes.result`). Resposta com o
  // estado do relé que não é a do comando pendente não conta como ack. I2: com comando de console pendente
  // (`opts.consolePending`), resposta sem o estado do relé pode ser do console e também não conta.
  if (
    next.pendingCommand && result !== undefined && next.commandSentAt !== undefined && at > next.commandSentAt && next.commandAckAt === undefined &&
    (relay === undefined ? !opts.consolePending : relayReplyAccepted(next, at, relay))
  ) {
    next.commandAckAt = at;
  }
  const relayReply = relay !== undefined && relayReplyAccepted(next, at, relay);
  // Bancada: status logo depois da resposta ainda traz o bit antigo. Só o bit é ignorado (nem blockedAt); o resto vale.
  const staleAfterReply =
    !relayReply && typeof a.blocked === 'boolean' && next.relayReply !== undefined && a.blocked !== next.relayReply.blocked && at - next.relayReply.at <= RELAY_REPLY_SETTLE_MS;
  if (relayReply) {
    next.blocked = relay === true;
    next.blockedAt = at;
    next.awaitingStatus = false;
    next.pendingCommand = undefined;
    next.commandAckAt = undefined;
    next.relayReply = { at, blocked: relay === true };
  } else if (staleAfterReply) {
    // nada: o bit e a hora continuam os da resposta
  } else if (typeof a.blocked === 'boolean' && statusAccepted(next, at)) {
    next.blocked = a.blocked;
    next.blockedAt = at;
    next.awaitingStatus = false;
    next.pendingCommand = undefined;
    next.commandAckAt = undefined;
  }
  if (typeof a.ignition === 'boolean') next.ignition = a.ignition;
  if (typeof a.status === 'number' && Number.isInteger(a.status) && a.status >= 0 && a.status <= 255) {
    // Byte cru do status GT06 (decoder do Traccar: `Position.KEY_STATUS`). GPS desligado = sem posição nova até voltar: a cadeia
    // de posições do alerta de movimento travada recomeça.
    next.gpsStatus = { at, tracking: (a.status & GT06_STATUS_GPS_TRACKING) !== 0, ignition: (a.status & GT06_STATUS_ACC) !== 0 };
    if (!next.gpsStatus.tracking) next.lockAnchor = undefined;
  }
  if (typeof a.rssi === 'number') next.signal = rssiToSignal(a.rssi);
  if (typeof a.power === 'number') {
    const pct = voltageToPct(a.power, battery);
    if (pct !== null) next.batteryPct = pct;
  }
  const blocked = telemetryBlocked(next, now);
  if (blocked !== true) next.lockAnchor = undefined;
  if (currentBlocked(next) === false) {
    // Corte solto dito pelo aparelho (status ou "RELAY 0 OK"): a referência do furto acaba.
    next.lastGoodLocked = undefined;
    next.weakAlarmAt = undefined;
  }
  const none = { telemetry: null, invalid: false, movedWhileLocked: false, relayReply, staleAfterReply, memory: next };
  const fixTime = Date.parse(p.fixTime);
  const newer = !Number.isFinite(fixTime) || next.lastFixTime === undefined || fixTime > next.lastFixTime;
  if (result !== undefined) {
    // Resposta a comando: não é medição (o Traccar repete a última localização). Nunca renova `last`; mais nova que a última
    // telemetria (inutilizável, como as outras) ou com velocidade em movimento, apaga a amostra parada guardada.
    const replySpeed = knotsToKmh(p.speed);
    if (newer || !(replySpeed < 3) || !Number.isFinite(replySpeed)) next.last = undefined;
    return none;
  }
  if (!p.valid || p.outdated || !Number.isFinite(fixTime)) {
    if (newer) next.last = undefined;
    // Posição nova sem fix: a âncora do movimento travada é de antes do período sem GPS.
    if (newer && !p.outdated) next.lockAnchor = undefined;
    return none;
  }
  if (fixTime > now + MAX_CLOCK_SKEW_MS) {
    next.last = undefined;
    return { ...none, invalid: true };
  }
  const speedKmh = knotsToKmh(p.speed);
  const satellites = satellitesOf(a.sat);
  const weak = satellites !== undefined && satellites < MIN_GPS_SATELLITES;
  if (!newer) {
    // Não publica (ordem), mas velocidade em movimento ou fora do contrato vence a amostra parada guardada.
    if (!(speedKmh < 3) || !Number.isFinite(speedKmh)) next.last = undefined;
    return none;
  }
  const telemetry: TelemetryMessage = {
    lat: p.latitude,
    lng: p.longitude,
    velocidade_kmh: speedKmh,
    bateria_pct: next.batteryPct ?? 0,
    travada: blocked ?? false,
    ignicao: next.ignition ?? false,
    sinal: next.signal ?? 0,
    timestamp: new Date(fixTime).toISOString(),
    ...(satellites === undefined ? {} : { satelites: satellites }),
  };
  if (!isValidTelemetry(telemetry)) {
    next.last = undefined;
    return { ...none, invalid: true };
  }
  next.lastFixTime = fixTime;
  // Posição fraca parada não é amostra parada (desconhecida = em movimento para a segunda guarda: só dificulta o corte); fraca em
  // movimento vale (também só dificulta).
  next.last = weak && speedKmh < 3 ? undefined : { fixTime: Math.min(fixTime, now), speedKmh, lat: p.latitude, lng: p.longitude };
  let movedWhileLocked = false;
  const farFrom = (ref: { lat: number; lng: number } | undefined, m: number) => ref !== undefined && haversineM(ref, { lat: p.latitude, lng: p.longitude }) > m;
  if (blocked === true && weak) {
    // Posição fraca quebra a cadeia (não entra nos 20 m), mas nunca suprime: deslocamento grande da última boa travada alarma
    // (uma vez a cada `LOCK_REANCHOR_ALARM_M`: moto numa van com o GPS ruim).
    next.lockAnchor = undefined;
    if (farFrom(next.lastGoodLocked, LOCK_REANCHOR_ALARM_M) && (next.weakAlarmAt === undefined || farFrom(next.weakAlarmAt, LOCK_REANCHOR_ALARM_M))) {
      movedWhileLocked = true;
      next.weakAlarmAt = { lat: p.latitude, lng: p.longitude };
    }
  } else if (blocked === true) {
    const here = { lat: p.latitude, lng: p.longitude, fixTime };
    const chain = next.lockAnchor;
    if (!chain || fixTime - chain.prev.fixTime > LOCK_ANCHOR_MAX_GAP_MS) {
      // Primeira posição boa da cadeia (corte recém-visto, ou depois de um período sem fix, fraco ou com o GPS desligado): reancora,
      // mas compara com a última boa travada a 150 m (erro do primeiro fix depois da lacuna; o furto com o GPS fora alarma).
      if (farFrom(next.lastGoodLocked, LOCK_REANCHOR_ALARM_M)) movedWhileLocked = true;
      next.lockAnchor = { lat: here.lat, lng: here.lng, prev: here };
    } else if (haversineM(chain.prev, here) > MOVED_WHILE_LOCKED_M || haversineM(chain, here) > MOVED_WHILE_LOCKED_M) {
      // Duas posições boas seguidas a mais de 20 m, ou o acumulado desde a âncora na mesma cadeia (arrasto lento).
      movedWhileLocked = true;
      next.lockAnchor = { lat: here.lat, lng: here.lng, prev: here };
    } else {
      next.lockAnchor = { ...chain, prev: here };
    }
    next.lastGoodLocked = { lat: here.lat, lng: here.lng };
    next.weakAlarmAt = undefined;
  }
  if (blocked === undefined) return { ...none, held: 'awaiting_status', memory: next };
  if (next.batteryPct === undefined) return { ...none, movedWhileLocked, held: 'awaiting_battery', memory: next };
  return { telemetry, invalid: false, movedWhileLocked, relayReply, staleAfterReply, memory: next };
}

/**
 * A4-1: com comando de motor pendente, status recebido até a resposta do aparelho (ou, sem resposta, até o envio +
 * `COMMAND_ACK_GRACE_MS`) pode ser de antes de o J16 executar o `Relay` — não vale.
 */
function statusAccepted(mem: DeviceMemory, at: number): boolean {
  if (!mem.pendingCommand || mem.commandSentAt === undefined) return true;
  return at > (mem.commandAckAt ?? mem.commandSentAt + COMMAND_ACK_GRACE_MS);
}

/**
 * `travada` da telemetria (e base da âncora). Bit atual e fresco (≤ 90 s) quando há; senão:
 * - `engineResume` pendente → indefinido = retida (defesa em profundidade: a API não confirma unlock só relé pela telemetria
 *   — só por `reported.travada: false` posterior ao release, A4-6 —, mas um `false` aqui ainda enganaria o mapa até o status);
 * - qualquer outro caso sem bit fresco (`engineStop` pendente, bit velho > 90 s, reconexão sem status novo ou bit nunca visto)
 *   → `false`: conservador, nunca confirma lock, e a telemetria não some (cercas/zonas, trajeto e a guarda da API seguem vendo
 *   a moto; P1/P4/A4-6).
 * O eco `already_blocked` e o `reported.travada` continuam só com o bit atual e fresco.
 */
function telemetryBlocked(mem: DeviceMemory, now: number): boolean | undefined {
  const fresh = freshBlocked(mem, now);
  if (fresh !== undefined) return fresh;
  if (mem.pendingCommand === 'resume') return undefined;
  return false;
}

const ALARMS: Record<string, DeviceEventType> = {
  powerCut: 'violacao',
  lowBattery: 'bateria_critica',
  lowPower: 'bateria_critica',
  vibration: 'movimento_sem_aluguel',
};

/** Alarme do Traccar → eventos do contrato (spec §6.3). `vibration` só com o corte ativo; sem correspondência → nada. */
export function toDeviceEvents(e: TraccarEvent, mem: DeviceMemory, now: number): DeviceEventMessage[] {
  if (e.type !== 'alarm') return [];
  const at = Date.parse(e.eventTime);
  const timestamp = new Date(Number.isFinite(at) ? at : now).toISOString();
  const tipos = new Set<DeviceEventType>();
  for (const alarm of String(e.attributes?.alarm ?? '').split(',')) {
    const tipo = ALARMS[alarm.trim()];
    if (!tipo || (tipo === 'movimento_sem_aluguel' && currentBlocked(mem) !== true)) continue;
    tipos.add(tipo);
  }
  return [...tipos].map((tipo) => ({ tipo, timestamp }));
}
