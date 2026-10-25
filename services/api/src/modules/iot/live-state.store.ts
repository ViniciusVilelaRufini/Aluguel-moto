import { MAX_SPEED_KMH } from '../../common/enums';
import type { VehicleLiveState } from '../../ports/iot-gateway.port';
import type { RedisStore } from '../../redis/redis-store';
import type { Clock } from './clock';
import type { TelemetryMessage } from './mqtt-contract';
import type { ReportedState } from './shadow-transport';

/** Sem telemetria por mais que isto → offline (3 × o intervalo de 60 s da moto parada). */
export const DEFAULT_OFFLINE_AFTER_MS = 180_000;
/** Amostra de velocidade mais velha que isto não serve para decidir a trava (é tratada como desconhecida = em movimento). */
export const SPEED_FRESH_MS = 10_000;
/**
 * `timestamp` do rastreador mais que isto à frente do servidor = não confiável (RTC ruim, rollover do GPS): não ordena a exibição,
 * não ordena as amostras e nunca vale para travar. O mesmo limite vale, para trás ou para a frente, na hora gravada no trajeto.
 */
export const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;
/**
 * Depois de qualquer reconexão (ou da primeira amostra vista por este processo), nenhuma amostra de velocidade, de nenhuma origem
 * (telemetria, reported via MQTT, polling do shadow), vale para travar nos primeiros `reconnectGraceMs`: é a janela em que o
 * cliente MQTT do rastreador esvazia a fila offline, e nem `min(timestamp, agora)` (relógio adiantado) nem a hora de chegada
 * (reported, metadata do shadow) distinguem uma amostra guardada antes da queda de uma ao vivo. Configurável por
 * `IOT_RECONNECT_GRACE_MS`.
 */
export const DEFAULT_RECONNECT_GRACE_MS = 10_000;
/**
 * Lacuna entre mensagens do rastreador (qualquer canal; hora de chegada no servidor) maior que isto = reconexão, mesmo sem evento
 * de presença (o modo aws não recebe presença: ela vai para o EventBridge; e uma queda mais curta que `offlineAfterMs` nunca passa
 * pela vigia). Padrão 15 s = 3 × a telemetria de 5 s (destravada com ignição ou em modo roubada). Configurável por
 * `IOT_RECONNECT_GAP_MS`.
 */
export const DEFAULT_RECONNECT_GAP_MS = 15_000;
/** Cadência da telemetria com a moto parada/travada (contrato: 60 s); a lacuna de reconexão nesse estado é 2,5 × isto. */
export const PARKED_TELEMETRY_MS = 60_000;
export const PARKED_GAP_FACTOR = 2.5;
/**
 * Fila offline detectada pelo atraso, independente da cadência: para cada telemetria,
 * `atraso = (chegada − chegada anterior) − (timestamp − timestamp anterior)` (o desvio do relógio do rastreador se cancela).
 * Amostra ao vivo: atraso ≈ jitter. Amostra que esperou na fila offline: atraso ≈ duração da queda. Atraso maior que isto =
 * reconexão (a própria amostra cai na graça). Configurável por `IOT_QUEUE_LAG_MS`.
 */
export const DEFAULT_QUEUE_LAG_MS = 5_000;
/** Relógio do rastreador que volta mais que isto entre duas telemetrias = salto (GPS/NTP, RTC zerado): reconexão uma vez e nova referência. */
export const CLOCK_JUMP_BACK_MS = 30_000;

/**
 * Estado ao vivo por rastreador (thingName): telemetria + reported do shadow + conectividade.
 * Memória com write-through no Redis (`iot:live:{thingName}`), para sobreviver a reinícios.
 * Não guarda nenhum dado do cliente: só o estado da moto.
 */
export class LiveStateStore {
  private readonly states = new Map<string, VehicleLiveState>();
  /**
   * Última amostra de velocidade válida para decidir a trava (`at` = horário da medição, limitado a "agora").
   * Ausente = desconhecida. Não persiste: depois de um reinício, desconhecida (= em movimento).
   */
  private readonly sample = new Map<string, { kmh: number; at: number }>();
  /** Horário da amostra mais nova já aceita (nunca volta): amostras mais antigas que ela, fora de ordem, são descartadas. */
  private readonly lastSampleAt = new Map<string, number>();
  /**
   * `timestamp` da telemetria mais nova aplicada à exibição (posição): telemetria fora de ordem não volta a moto no mapa.
   * Um `timestamp` não confiável (> agora + `MAX_CLOCK_SKEW_MS`) entra limitado a "agora", para não congelar a exibição.
   * Zerado na reconexão (o rastreador pode ter reiniciado e acertado o relógio para trás).
   */
  private readonly lastTelemetryAt = new Map<string, number>();
  /**
   * Maior `timestamp` **bruto** (relógio do rastreador, sem limitar a agora) visto pela telemetria desde a reconexão — de toda
   * mensagem em ordem, aceita ou rejeitada pela graça (a fila offline esvaziada). A ordem entre mensagens do rastreador é
   * decidida neste relógio: com o relógio adiantado, todas as amostras seriam limitadas a "agora" e uma mensagem enfileirada
   * mais velha pareceria mais nova. Um `timestamp` não confiável nunca entra aqui. Zerado na reconexão.
   */
  private readonly lastDeviceTs = new Map<string, number>();
  /** Início da conexão atual (ou da primeira amostra vista por este processo): amostras anteriores a ela não valem, e a graça conta a partir dela. */
  private readonly reconnectAt = new Map<string, number>();
  /** Última mensagem do rastreador, de qualquer canal (hora de chegada; no polling, a metadata do shadow). Só em memória. */
  private readonly heardAt = new Map<string, number>();
  /** Chegada e `timestamp` bruto da telemetria mais nova (no relógio do rastreador), para o atraso da fila offline. Só em memória. */
  private readonly lastTelemetryPair = new Map<string, { arrival: number; deviceTs: number }>();
  /**
   * Candidata a nova referência depois de um salto para trás > `CLOCK_JUMP_BACK_MS`: só vira referência quando a amostra seguinte
   * confirma a nova linha do tempo (também atrás da referência, mais nova que a candidata e com atraso pequeno contra ela).
   * Uma única mensagem velha reordenada nunca troca a referência.
   */
  private readonly jumpCandidate = new Map<string, { arrival: number; deviceTs: number }>();
  /** Hold gravado por esta instância cuja escrita no Redis falhou (vale até gravar ou um unlock). */
  private readonly heldUnpersisted = new Set<string>();
  /** Carimbo (`_at`) da última versão do hash no Redis que esta instância gravou ou leu: versão mais nova = outra instância. */
  private readonly syncedAt = new Map<string, number>();

  constructor(
    private readonly redis: RedisStore,
    private readonly clock: Clock,
    private readonly offlineAfterMs = DEFAULT_OFFLINE_AFTER_MS,
    private readonly reconnectGraceMs = DEFAULT_RECONNECT_GRACE_MS,
  ) {}

  private key(thingName: string): string {
    return `iot:live:${thingName}`;
  }

  private blank(thingName: string): VehicleLiveState {
    return {
      thingName,
      lat: 0,
      lng: 0,
      speedKmh: 0,
      batteryPct: 0,
      locked: true,
      ignition: false,
      signal: 0,
      speedLimitKmh: MAX_SPEED_KMH,
      stolenMode: false,
      online: false,
      lastSeenAt: new Date(0).toISOString(),
    };
  }

  get(thingName: string): VehicleLiveState | null {
    return this.states.get(thingName) ?? null;
  }

  /**
   * Estado da moto. Lê o hash do Redis e, se ele for mais novo que a cópia em memória (outra instância processou uma mensagem
   * desta moto — com várias tasks, a fila de telemetria distribui as mensagens entre elas), atualiza a memória. Redis fora do
   * ar → a memória.
   */
  async load(thingName: string): Promise<VehicleLiveState | null> {
    return this.refresh(thingName);
  }

  /** Relê o Redis agora (varreduras: inatividade, rampa pendente). */
  /** Última leitura do Redis desta moto falhou (a cópia em memória pode estar velha). */
  private readonly refreshFailed = new Set<string>();

  /** A cópia devolvida por `load`/`refresh` veio de uma leitura do Redis que funcionou? */
  isConfirmed(thingName: string): boolean {
    return !this.refreshFailed.has(thingName);
  }

  async refresh(thingName: string): Promise<VehicleLiveState | null> {
    const mem = this.states.get(thingName);
    let h: Record<string, string>;
    try {
      h = await this.redis.hgetall(this.key(thingName));
      this.refreshFailed.delete(thingName);
    } catch {
      this.refreshFailed.add(thingName);
      return mem ?? null;
    }
    if (!h || !h.lastSeenAt) return mem ?? null;
    const at = Number(h._at) || 0;
    if (mem && at <= (this.syncedAt.get(thingName) ?? 0)) return mem;
    const fromRedis: VehicleLiveState = {
      thingName,
      lat: Number(h.lat),
      lng: Number(h.lng),
      speedKmh: Number(h.speedKmh),
      batteryPct: Number(h.batteryPct),
      locked: h.locked === 'true',
      ignition: h.ignition === 'true',
      signal: Number(h.signal),
      speedLimitKmh: Number(h.speedLimitKmh ?? MAX_SPEED_KMH),
      stolenMode: h.stolenMode === 'true',
      online: h.online === 'true',
      lastSeenAt: h.lastSeenAt,
    };
    this.syncedAt.set(thingName, at);
    if (mem) {
      Object.assign(mem, fromRedis);
      return mem;
    }
    this.states.set(thingName, fromRedis);
    return fromRedis;
  }

  /** Último `limite_kmh` gravado no desired por qualquer instância (teto da rampa). Erro de leitura → desconhecido. */
  async desiredLimit(thingName: string): Promise<number | null> {
    const v = await this.readDesiredLimit(thingName);
    return v ?? null;
  }

  /** `number` = gravado; `null` = nunca gravado; `undefined` = Redis ilegível. */
  async readDesiredLimit(thingName: string): Promise<number | null | undefined> {
    let raw: string | null;
    try {
      raw = await this.redis.get(`iot:desired-limit:${thingName}`);
    } catch {
      return undefined;
    }
    const n = raw === null ? NaN : Number(raw);
    return Number.isInteger(n) && n >= 0 && n <= MAX_SPEED_KMH ? n : null;
  }

  async setDesiredLimit(thingName: string, kmh: number): Promise<void> {
    await this.redis.set(`iot:desired-limit:${thingName}`, String(kmh));
  }

  /** Online = marcado online e visto há menos de `offlineAfterMs`. */
  isOnline(thingName: string): boolean {
    const s = this.states.get(thingName);
    if (!s || !s.online) return false;
    return this.clock.now() - Date.parse(s.lastSeenAt) < this.offlineAfterMs;
  }

  /** Rastreadores marcados online mas sem notícia há mais que o limite (vigia de inatividade). */
  stale(): string[] {
    const now = this.clock.now();
    return [...this.states.values()].filter((s) => s.online && now - Date.parse(s.lastSeenAt) >= this.offlineAfterMs).map((s) => s.thingName);
  }

  /** Velocidade conhecida e fresca, ou `null` (desconhecida, velha, anterior à reconexão ou dentro da graça) — nunca 0 por padrão. */
  knownSpeed(thingName: string): number | null {
    const smp = this.sample.get(thingName);
    if (!smp) return null;
    if (this.clock.now() - smp.at > SPEED_FRESH_MS) return null;
    return smp.kmh;
  }

  /**
   * Aceita uma amostra de velocidade para a trava só se: medida há no máximo `SPEED_FRESH_MS`, não antes da reconexão atual,
   * fora da graça pós-reconexão e mais nova que a última aceita. `at` é limitado a "agora" (relógio do rastreador adiantado não
   * ganha validade extra). `allowEqual`: amostra com horário de chegada (reported via MQTT) no mesmo ms da anterior.
   *
   * Graça (toda origem): nos primeiros `reconnectGraceMs` depois da reconexão nada vale para travar. Motivo: uma amostra guardada
   * antes da queda e reenviada na reconexão é indistinguível de uma ao vivo quando o relógio do rastreador está adiantado
   * (`min(timestamp, agora)` = agora ≥ reconexão) e sempre que a amostra só tem hora de chegada (reported via MQTT, metadata do
   * shadow no polling). A regra "não antes da reconexão" só pega a fila com o relógio em dia ou atrasado.
   *
   * Telemetria (`deviceTs`, relógio bruto do rastreador): `deviceTs` > agora + `MAX_CLOCK_SKEW_MS` é não confiável (nunca vale,
   * não entra na ordem). O `deviceTs` de toda mensagem em ordem conta para `lastDeviceTs`, inclusive das rejeitadas pela graça;
   * depois da graça só vale `deviceTs` estritamente maior que todos os vistos desde a reconexão (uma amostra da fila que chegue
   * atrasada continua rejeitada).
   */
  private acceptSpeed(thingName: string, kmh: number, measuredAt: number, allowEqual = false, deviceTs?: number): boolean {
    const now = this.clock.now();
    if (deviceTs !== undefined && deviceTs > now + MAX_CLOCK_SKEW_MS) return false;
    const at = Math.min(measuredAt, now); // limitado a agora: só para a janela de frescor
    const last = this.lastSampleAt.get(thingName);
    let since = this.reconnectAt.get(thingName);
    if (since === undefined) {
      // Processo novo, sem reconexão conhecida: a primeira amostra abre a conexão (e a graça) para este rastreador.
      since = now;
      this.reconnectAt.set(thingName, now);
    }
    if (now - at > SPEED_FRESH_MS) return false;
    if (at < since) return false;
    // Ordem no relógio do próprio rastreador (bruto), quando a amostra o traz (telemetria).
    if (deviceTs !== undefined) {
      const lastRaw = this.lastDeviceTs.get(thingName);
      if (lastRaw !== undefined && deviceTs <= lastRaw) return false;
      this.lastDeviceTs.set(thingName, deviceTs); // conta para a ordem mesmo se rejeitada pela graça
    }
    if (now - since < this.reconnectGraceMs) return false;
    if (last !== undefined && (at < last || (at === last && !allowEqual && deviceTs === undefined))) return false;
    this.sample.set(thingName, { kmh, at });
    this.lastSampleAt.set(thingName, at);
    return true;
  }

  /**
   * Presença `connected`, primeira mensagem depois de offline ou lacuna de reconexão (`noteHeard`) ou atraso de fila offline (`noteTelemetry`): a velocidade de antes da desconexão deixa de valer até chegar
   * amostra nova fora da graça, e a ordem (bruta e da exibição) recomeça — o rastreador pode ter reiniciado e acertado o relógio.
   */
  markReconnected(thingName: string, opts: { keepDisplayOrder?: boolean } = {}): void {
    this.sample.delete(thingName);
    this.lastDeviceTs.delete(thingName);
    // Reconexão percebida pela própria telemetria (lacuna/atraso, moto online): a ordem da exibição continua — uma mensagem velha
    // reordenada que abriu a graça não volta a moto no mapa. Presença/volta de offline recomeçam (o rastreador pode ter reiniciado);
    // um salto para trás confirmado (`noteTelemetry`) também.
    if (!opts.keepDisplayOrder) this.lastTelemetryAt.delete(thingName);
    this.reconnectAt.set(thingName, this.clock.now());
  }

  /**
   * Registra uma mensagem do rastreador (qualquer canal) chegando em `at` e diz se a lacuna desde a anterior indica reconexão.
   * Limite: `gapMs` quando a última situação conhecida é de telemetria a cada 5 s (destravada com ignição, ou modo roubada);
   * senão `max(gapMs, 2,5 × 60 s)` (parada/travada: a cadência normal de 60 s não é queda). Sem mensagem anterior neste processo
   * não há lacuna (a primeira amostra já abre a graça). Devolve a lacuna (ms) quando ela indica reconexão; senão `null`.
   * Quem chama decide o que fazer (`markReconnected`).
   */
  noteHeard(thingName: string, at: number, gapMs = DEFAULT_RECONNECT_GAP_MS): number | null {
    const prev = this.heardAt.get(thingName);
    if (prev === undefined || at > prev) this.heardAt.set(thingName, at);
    if (prev === undefined) return null;
    const s = this.states.get(thingName);
    const fast = !!s && ((!s.locked && s.ignition) || s.stolenMode);
    const limit = fast ? gapMs : Math.max(gapMs, PARKED_GAP_FACTOR * PARKED_TELEMETRY_MS);
    const gap = at - prev;
    return gap > limit ? gap : null;
  }

  /**
   * Telemetria chegando em `arrival` com `timestamp` bruto `deviceTs`: devolve o atraso (ms) quando ele indica que a amostra saiu
   * da fila offline (atraso relativo à telemetria anterior > `lagMs`), senão `null`. Não depende da cadência nem do estado
   * conhecido da moto (ignição/trava), nem do desvio do relógio do rastreador. `timestamp` não confiável (> chegada + 10 min) é
   * ignorado. Fora de ordem (timestamp ≤ o mais novo) também mede o atraso contra o mais novo, sem trocar a referência: uma
   * mensagem reordenada ou duplicada muito atrasada abre a graça. Relógio que volta mais de `CLOCK_JUMP_BACK_MS`: abre a graça e
   * a amostra vira **candidata**; a referência só muda quando a amostra seguinte confirma a nova linha do tempo (atrás da
   * referência, mais nova que a candidata, atraso ≤ `lagMs` contra ela). Assim um salto real do relógio abre a graça uma vez (sem
   * isso, toda amostra seguinte a reabriria por ~o tamanho do salto e um lock em curso terminaria `did_not_stop`), e uma única
   * mensagem velha reordenada não esconde uma amostra da fila que chegue depois (ela é medida contra a referência antiga).
   */
  noteTelemetry(thingName: string, arrival: number, deviceTs: number, lagMs = DEFAULT_QUEUE_LAG_MS): number | null {
    if (!Number.isFinite(deviceTs) || deviceTs > arrival + MAX_CLOCK_SKEW_MS) return null;
    const cur = { arrival, deviceTs };
    const lagVs = (ref: { arrival: number; deviceTs: number }) => arrival - ref.arrival - (deviceTs - ref.deviceTs);
    const prev = this.lastTelemetryPair.get(thingName);
    if (!prev) {
      this.lastTelemetryPair.set(thingName, cur);
      return null;
    }
    if (deviceTs > prev.deviceTs) {
      // Linha do tempo da referência continua: descarta a candidata.
      this.lastTelemetryPair.set(thingName, cur);
      this.jumpCandidate.delete(thingName);
      const lag = lagVs(prev);
      return lag > lagMs ? lag : null;
    }
    if (prev.deviceTs - deviceTs > CLOCK_JUMP_BACK_MS) {
      const cand = this.jumpCandidate.get(thingName);
      if (cand && deviceTs > cand.deviceTs && lagVs(cand) <= lagMs) {
        // Salto confirmado por duas amostras seguidas: nova referência; a exibição recomeça na nova linha do tempo.
        this.lastTelemetryPair.set(thingName, cur);
        this.jumpCandidate.delete(thingName);
        this.lastTelemetryAt.delete(thingName);
        return null;
      }
      this.jumpCandidate.set(thingName, cur);
      return lagVs(prev); // grande: abre a graça
    }
    // Fora de ordem dentro de 30 s (ou repetida): mede contra a referência, sem trocá-la.
    const lag = lagVs(prev);
    return lag > lagMs ? lag : null;
  }

  /** "Limite segurado em 0" depois de `did_not_stop`: persiste até um unlock explícito. */
  /** Falha fechada: erro ao ler o Redis = segurado (recusa mudar o limite) e nada vai para o cache. */
  async isHeld(thingName: string): Promise<boolean> {
    const v = await this.heldState(thingName);
    return v ?? true; // ilegível → segurado (falha fechada para subir limite)
  }

  /**
   * Hold confirmado (fix 2): lido do Redis a cada vez (outra instância pode ter soltado com um unlock — a cópia da memória fica
   * velha). Um hold desta instância cuja gravação falhou continua valendo. Ilegível → `null` (desconhecido): para a rampa,
   * desconhecido nunca vira teto 0.
   */
  async heldState(thingName: string): Promise<boolean | null> {
    let raw: string | null;
    try {
      raw = await this.redis.get(`iot:held:${thingName}`);
    } catch {
      return this.heldUnpersisted.has(thingName) ? true : null;
    }
    return raw === '1' || this.heldUnpersisted.has(thingName);
  }

  /**
   * Segurar vale na memória mesmo se a escrita falhar (falha fechada); soltar só depois de apagar no Redis.
   * Erros de escrita são propagados (o unlock falha em vez de soltar em silêncio).
   */
  async setHeld(thingName: string, on: boolean): Promise<void> {
    if (on) {
      this.heldUnpersisted.add(thingName);
      await this.redis.set(`iot:held:${thingName}`, '1');
      this.heldUnpersisted.delete(thingName);
      return;
    }
    await this.redis.del(`iot:held:${thingName}`);
    this.heldUnpersisted.delete(thingName);
  }

  /**
   * Telemetria. A medição vale pelo `timestamp` do rastreador (limitado a agora): uma mensagem velha (fila offline do cliente
   * MQTT, reordenação no SQS) atualiza a exibição só se for a mais nova recebida e **nunca** vale para a trava se tiver mais de
   * `SPEED_FRESH_MS`, for anterior à reconexão ou mais antiga que a última amostra aceita.
   */
  async applyTelemetry(thingName: string, t: TelemetryMessage): Promise<{ state: VehicleLiveState; speedAccepted: boolean; newest: boolean }> {
    const s = (await this.load(thingName)) ?? this.blank(thingName);
    const now = this.clock.now();
    const deviceTs = Date.parse(t.timestamp);
    const measuredAt = Math.min(deviceTs, now);
    // Exibição também ordenada pelo relógio bruto do rastreador; um `timestamp` não confiável (futuro distante) entra como "agora",
    // para uma única mensagem com RTC ruim não congelar o mapa até lá.
    const orderTs = deviceTs > now + MAX_CLOCK_SKEW_MS ? now : deviceTs;
    const lastShown = this.lastTelemetryAt.get(thingName);
    const newest = lastShown === undefined || orderTs >= lastShown;
    if (newest) {
      this.lastTelemetryAt.set(thingName, orderTs);
      Object.assign(s, { lat: t.lat, lng: t.lng, speedKmh: t.velocidade_kmh, batteryPct: t.bateria_pct, locked: t.travada, ignition: t.ignicao, signal: t.sinal });
    }
    const speedAccepted = this.acceptSpeed(thingName, t.velocidade_kmh, measuredAt, false, deviceTs);
    s.online = true;
    s.lastSeenAt = new Date(now).toISOString();
    this.states.set(thingName, s);
    await this.persist(s);
    return { state: s, speedAccepted, newest };
  }

  /**
   * Aplica um `reported`. Do rastreador (MQTT): marca online e a velocidade vale como amostra de agora.
   * Do polling (`fromPoll`): não mexe na conectividade; a velocidade só é aceita com horário (metadata) mais novo que a última
   * amostra, não anterior à reconexão e fresco. Devolve se a velocidade foi aceita.
   */
  async applyReported(thingName: string, r: ReportedState, opts: { fromPoll?: boolean; speedAt?: number } = {}): Promise<{ state: VehicleLiveState; speedAccepted: boolean }> {
    const s = (await this.load(thingName)) ?? this.blank(thingName);
    const now = this.clock.now();
    if (r.travada !== undefined) s.locked = r.travada;
    if (r.limite_kmh !== undefined) s.speedLimitKmh = r.limite_kmh;
    if (r.modo_roubada !== undefined) s.stolenMode = r.modo_roubada;
    let speedAccepted = false;
    if (r.velocidade_kmh !== undefined) {
      // Polling: horário da metadata (sem ele, não vale). MQTT do rastreador: horário de chegada.
      const sampleAt = opts.fromPoll ? opts.speedAt : (opts.speedAt ?? now);
      if (sampleAt !== undefined && this.acceptSpeed(thingName, r.velocidade_kmh, sampleAt, !opts.fromPoll)) {
        s.speedKmh = r.velocidade_kmh;
        speedAccepted = true;
      }
    }
    if (!opts.fromPoll) {
      s.online = true;
      s.lastSeenAt = new Date(now).toISOString();
    }
    this.states.set(thingName, s);
    await this.persist(s);
    return { state: s, speedAccepted };
  }

  async setOnline(thingName: string, online: boolean): Promise<VehicleLiveState> {
    const s = (await this.load(thingName)) ?? this.blank(thingName);
    s.online = online;
    if (!online) this.sample.delete(thingName);
    if (online) s.lastSeenAt = new Date(this.clock.now()).toISOString();
    this.states.set(thingName, s);
    await this.persist(s);
    return s;
  }

  private async persist(s: VehicleLiveState): Promise<void> {
    const values: Record<string, string> = {};
    for (const [k, v] of Object.entries(s)) values[k] = String(v);
    // Carimbo monotônico desta escrita (para as outras instâncias saberem que a cópia delas ficou velha).
    const at = Math.max(this.clock.now(), (this.syncedAt.get(s.thingName) ?? 0) + 1);
    values._at = String(at);
    this.syncedAt.set(s.thingName, at);
    await this.redis.hset(this.key(s.thingName), values).catch(() => undefined);
  }
}
