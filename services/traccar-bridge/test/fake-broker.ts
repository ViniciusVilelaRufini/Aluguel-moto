/** Broker MQTT em memória (curingas + e #), na ordem de publicação. Serve à ponte e ao LocalMqttTransport da API. */
export function topicMatches(filter: string, topic: string): boolean {
  const f = filter.split('/');
  const t = topic.split('/');
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true;
    if (i >= t.length || (f[i] !== '+' && f[i] !== t[i])) return false;
  }
  return f.length === t.length;
}

export class FakeMqttClient {
  connected = true;
  /** M3: QoS 1 que nunca recebe PUBACK (publicação travada). */
  stallQos1 = false;
  /** Como o mqtt.js: publicação feita desconectado fica na fila offline e sai na reconexão. */
  private readonly offline: Array<{ topic: string; payload: string; done: () => void }> = [];
  private readonly filters = new Set<string>();
  private readonly handlers: Record<string, Array<(...args: any[]) => void>> = {};

  constructor(
    private readonly broker: FakeBroker,
    readonly id: string,
  ) {}

  on(event: string, cb: (...args: any[]) => void): this {
    (this.handlers[event] ??= []).push(cb);
    return this;
  }
  emit(event: string, ...args: unknown[]): void {
    for (const cb of this.handlers[event] ?? []) cb(...args);
  }
  matches(topic: string): boolean {
    return [...this.filters].some((f) => topicMatches(f, topic));
  }
  async publishAsync(topic: string, payload: string, opts?: { qos?: 0 | 1 }): Promise<void> {
    if (!this.connected) return new Promise<void>((done) => void this.offline.push({ topic, payload, done }));
    if (this.stallQos1 && opts?.qos === 1) return new Promise<void>(() => undefined);
    this.broker.deliver(this.id, topic, payload);
  }
  /** Queda da conexão MQTT. */
  disconnect(): void {
    this.connected = false;
    this.emit('offline');
  }
  /** Reconexão: entrega a fila offline (como o mqtt.js) e emite `connect`. */
  reconnect(): void {
    this.connected = true;
    for (const m of this.offline.splice(0)) {
      this.broker.deliver(this.id, m.topic, m.payload);
      m.done();
    }
    this.emit('connect');
  }
  async subscribeAsync(topics: string[]): Promise<void> {
    for (const t of topics) this.filters.add(t);
  }
  async endAsync(): Promise<void> {
    this.connected = false;
  }
}

export class FakeBroker {
  readonly log: Array<{ from: string; topic: string; payload: string }> = [];
  private readonly clients = new Set<FakeMqttClient>();

  client(id: string): FakeMqttClient {
    const c = new FakeMqttClient(this, id);
    this.clients.add(c);
    queueMicrotask(() => c.emit('connect'));
    return c;
  }

  deliver(from: string, topic: string, payload: string): void {
    this.log.push({ from, topic, payload });
    for (const c of this.clients) if (c.id !== from && c.connected && c.matches(topic)) queueMicrotask(() => c.emit('message', topic, Buffer.from(payload)));
  }
}
