export const IOT_CLOCK = Symbol('IOT_CLOCK');

export type TimerHandle = { readonly id: number };

/** Relógio injetável: os testes usam `FakeClock` para avançar o tempo (rampa de 2 s, 120 s, 5 min fora da área). */
export interface Clock {
  now(): number;
  setTimeout(fn: () => unknown, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle | undefined): void;
}

export class SystemClock implements Clock {
  private seq = 0;
  private readonly timers = new Map<number, NodeJS.Timeout>();

  now(): number {
    return Date.now();
  }

  setTimeout(fn: () => unknown, ms: number): TimerHandle {
    const id = ++this.seq;
    const t = setTimeout(() => {
      this.timers.delete(id);
      void fn();
    }, Math.max(0, ms));
    t.unref?.();
    this.timers.set(id, t);
    return { id };
  }

  clearTimeout(handle: TimerHandle | undefined): void {
    if (!handle) return;
    const t = this.timers.get(handle.id);
    if (t) clearTimeout(t);
    this.timers.delete(handle.id);
  }

  /** Cancela tudo (encerramento do módulo). */
  clearAll(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }
}

/** Relógio falso para testes: `advance(ms)` dispara os timers vencidos em ordem e espera as promessas pendentes. */
export class FakeClock implements Clock {
  private seq = 0;
  private readonly timers = new Map<number, { at: number; fn: () => unknown }>();

  constructor(private current = 0) {}

  now(): number {
    return this.current;
  }

  setTimeout(fn: () => unknown, ms: number): TimerHandle {
    const id = ++this.seq;
    this.timers.set(id, { at: this.current + Math.max(0, ms), fn });
    return { id };
  }

  clearTimeout(handle: TimerHandle | undefined): void {
    if (handle) this.timers.delete(handle.id);
  }

  pending(): number {
    return this.timers.size;
  }

  async advance(ms: number): Promise<void> {
    const target = this.current + ms;
    await flush();
    for (;;) {
      let next: [number, { at: number; fn: () => unknown }] | undefined;
      for (const entry of this.timers) if (entry[1].at <= target && (!next || entry[1].at < next[1].at)) next = entry;
      if (!next) break;
      this.timers.delete(next[0]);
      this.current = next[1].at;
      await next[1].fn();
      await flush();
    }
    this.current = target;
    await flush();
  }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
}
