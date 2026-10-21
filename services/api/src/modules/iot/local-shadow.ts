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

  constructor(
    private readonly redis: RedisStore,
    private readonly now: () => number = Date.now,
  ) {}

  private key(thingName: string): string {
    return `iot:shadow:${thingName}`;
  }

  async load(thingName: string): Promise<ShadowDocument> {
    const cached = this.docs.get(thingName);
    if (cached) return cached;
    let doc: ShadowDocument = { desired: {}, reported: {}, version: 0 };
    const raw = await this.redis.get(this.key(thingName)).catch(() => null);
    if (raw) {
      try {
        doc = JSON.parse(raw) as ShadowDocument;
      } catch {
        /* documento corrompido: recomeça */
      }
    }
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

  async applyDesired(thingName: string, desired: DesiredState): Promise<OutboundMessage[]> {
    const prev = await this.load(thingName);
    const doc: ShadowDocument = { desired: { ...prev.desired, ...desired }, reported: { ...prev.reported }, version: prev.version + 1 };
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

  async applyReported(thingName: string, reported: ReportedState): Promise<OutboundMessage[]> {
    const prev = await this.load(thingName);
    const doc: ShadowDocument = { desired: { ...prev.desired }, reported: { ...prev.reported, ...reported }, version: prev.version + 1 };
    await this.save(thingName, doc);
    const timestamp = this.ts();
    return [
      { topic: TOPICS.shadowAccepted(thingName), payload: { state: { reported }, version: doc.version, timestamp } },
      { topic: TOPICS.shadowDocuments(thingName), payload: { previous: this.snapshot(prev), current: this.snapshot(doc), timestamp } },
    ];
  }

  async get(thingName: string): Promise<OutboundMessage[]> {
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
