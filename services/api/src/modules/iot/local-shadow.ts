import type { RedisStore } from '../../redis/redis-store';
import { TOPICS } from './mqtt-contract';
import type { DesiredState, ReportedState } from './shadow-transport';

export interface ShadowDocument {
  desired: DesiredState;
  reported: ReportedState;
  version: number;
}

export interface OutboundMessage {
  topic: string;
  payload: unknown;
}

const DESIRED_KEYS = ['travada', 'limite_kmh', 'modo_roubada'] as const;

/**
 * Emulação local (IOT_MODE=local) do serviço de device shadow do AWS IoT Core sobre o Mosquitto:
 * guarda desired/reported/versão (Redis `iot:shadow:{thingName}`) e produz as mensagens que o IoT Core publicaria
 * (`/update/accepted`, `/update/documents`, `/update/delta`, `/get/accepted`). O rastreador vê os mesmos tópicos da produção.
 */
export class LocalShadowStore {
  private readonly docs = new Map<string, ShadowDocument>();
  /** Load a frio em curso por thing: leituras concorrentes compartilham a mesma leitura do Redis (QA-23). */
  private readonly loading = new Map<string, Promise<ShadowDocument>>();
  /** Fila por thing: leitura-modificação-gravação nunca se intercala (QA-23: desired perdido na reconexão). */
  private readonly chains = new Map<string, Promise<unknown>>();

  constructor(
    private readonly redis: RedisStore,
    private readonly now: () => number = Date.now,
  ) {}

  private key(thingName: string): string {
    return `iot:shadow:${thingName}`;
  }

  /** Executa `fn` depois das operações anteriores da mesma thing (erros não travam a fila). */
  private serial<T>(thingName: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(thingName) ?? Promise.resolve();
    const next = prev.catch(() => undefined).then(fn);
    this.chains.set(thingName, next);
    void next.catch(() => undefined).then(() => {
      if (this.chains.get(thingName) === next) this.chains.delete(thingName);
    });
    return next;
  }

  async load(thingName: string): Promise<ShadowDocument> {
    const cached = this.docs.get(thingName);
    if (cached) return cached;
    const inflight = this.loading.get(thingName);
    if (inflight) return inflight;
    const p = this.loadFromRedis(thingName).finally(() => this.loading.delete(thingName));
    this.loading.set(thingName, p);
    return p;
  }

  private async loadFromRedis(thingName: string): Promise<ShadowDocument> {
    let doc: ShadowDocument = { desired: {}, reported: {}, version: 0 };
    const raw = await this.redis.get(this.key(thingName)).catch(() => null);
    if (raw) {
      try {
        doc = JSON.parse(raw) as ShadowDocument;
      } catch {
        /* documento corrompido: recomeça */
      }
    }
    // Um save concorrente (não deveria haver, com a fila) ganha do documento lido.
    const current = this.docs.get(thingName);
    if (current) return current;
    this.docs.set(thingName, doc);
    return doc;
  }

  private async save(thingName: string, doc: ShadowDocument): Promise<void> {
    this.docs.set(thingName, doc);
    await this.redis.set(this.key(thingName), JSON.stringify(doc)).catch(() => undefined);
  }

  /** Campos do desired que diferem do reported. */
  delta(thingName: string): Partial<DesiredState> {
    const doc = this.docs.get(thingName);
    return doc ? computeDelta(doc) : {};
  }

  private ts(): number {
    return Math.floor(this.now() / 1000);
  }

  private snapshot(doc: ShadowDocument) {
    return { state: { desired: { ...doc.desired }, reported: { ...doc.reported } }, version: doc.version };
  }

  applyDesired(thingName: string, desired: DesiredState): Promise<OutboundMessage[]> {
    return this.serial(thingName, () => this.doApplyDesired(thingName, desired));
  }

  private async doApplyDesired(thingName: string, desired: DesiredState): Promise<OutboundMessage[]> {
    const prev = await this.load(thingName);
    const merged: Record<string, unknown> = { ...prev.desired, ...desired };
    // Como o IoT Core: `null` no desired apaga o campo (nenhum delta pendente dele).
    for (const k of Object.keys(merged)) if (merged[k] === null) delete merged[k];
    const doc: ShadowDocument = { desired: merged as DesiredState, reported: { ...prev.reported }, version: prev.version + 1 };
    await this.save(thingName, doc);
    const timestamp = this.ts();
    const out: OutboundMessage[] = [
      { topic: TOPICS.shadowAccepted(thingName), payload: { state: { desired }, version: doc.version, timestamp } },
      { topic: TOPICS.shadowDocuments(thingName), payload: { previous: this.snapshot(prev), current: this.snapshot(doc), timestamp } },
    ];
    const delta = computeDelta(doc);
    if (Object.keys(delta).length) out.push({ topic: TOPICS.shadowDelta(thingName), payload: { state: delta, version: doc.version, timestamp } });
    return out;
  }

  applyReported(thingName: string, reported: ReportedState): Promise<OutboundMessage[]> {
    return this.serial(thingName, () => this.doApplyReported(thingName, reported));
  }

  private async doApplyReported(thingName: string, reported: ReportedState): Promise<OutboundMessage[]> {
    const prev = await this.load(thingName);
    const doc: ShadowDocument = { desired: { ...prev.desired }, reported: { ...prev.reported, ...reported }, version: prev.version + 1 };
    await this.save(thingName, doc);
    const timestamp = this.ts();
    return [
      { topic: TOPICS.shadowAccepted(thingName), payload: { state: { reported }, version: doc.version, timestamp } },
      { topic: TOPICS.shadowDocuments(thingName), payload: { previous: this.snapshot(prev), current: this.snapshot(doc), timestamp } },
    ];
  }

  get(thingName: string): Promise<OutboundMessage[]> {
    return this.serial(thingName, () => this.doGet(thingName));
  }

  private async doGet(thingName: string): Promise<OutboundMessage[]> {
    const doc = await this.load(thingName);
    const delta = computeDelta(doc);
    const state: Record<string, unknown> = { desired: { ...doc.desired }, reported: { ...doc.reported } };
    if (Object.keys(delta).length) state.delta = delta;
    return [{ topic: TOPICS.shadowGetAccepted(thingName), payload: { state, version: doc.version, timestamp: this.ts() } }];
  }
}

function computeDelta(doc: ShadowDocument): Partial<DesiredState> {
  const delta: Record<string, unknown> = {};
  for (const k of DESIRED_KEYS) {
    if (doc.desired[k] !== undefined && doc.desired[k] !== doc.reported[k]) delta[k] = doc.desired[k];
  }
  return delta as Partial<DesiredState>;
}
