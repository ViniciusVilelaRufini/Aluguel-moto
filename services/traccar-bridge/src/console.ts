/** Prazo da resposta do aparelho a um comando de console; passado dele, o comando falha com `timeout`. */
export const CONSOLE_TIMEOUT_MS = 60_000;

export interface PendingConsole {
  comandoId: string;
  sentAt: number;
}

/** Política do payload `acao: "console"` (contrato MQTT): `comando_id` string não vazia e `texto` de 1 a 100 caracteres. */
export function parseConsoleCommand(body: unknown): { comandoId: string; texto: string } | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const b = body as Record<string, unknown>;
  if (b.acao !== 'console') return undefined;
  if (typeof b.comando_id !== 'string' || b.comando_id === '') return undefined;
  if (typeof b.texto !== 'string' || b.texto.length < 1 || b.texto.length > 100) return undefined;
  return { comandoId: b.comando_id, texto: b.texto };
}

/** Fila por moto dos comandos de console enviados e ainda sem resposta (o mais antigo recebe a próxima resposta de texto). */
export class ConsoleQueue {
  private readonly pending = new Map<string, PendingConsole[]>();

  constructor(private readonly timeoutMs: number = CONSOLE_TIMEOUT_MS) {}

  add(thing: string, comandoId: string, now: number): void {
    const list = this.pending.get(thing) ?? [];
    list.push({ comandoId, sentAt: now });
    this.pending.set(thing, list);
  }

  /** Tira da fila o pendente mais antigo (recebeu a resposta). */
  take(thing: string): PendingConsole | undefined {
    const list = this.pending.get(thing);
    const first = list?.shift();
    if (list && list.length === 0) this.pending.delete(thing);
    return first;
  }

  /** Remove um pendente específico (envio que falhou). */
  remove(thing: string, comandoId: string): void {
    const list = this.pending.get(thing);
    if (!list) return;
    const rest = list.filter((p) => p.comandoId !== comandoId);
    if (rest.length) this.pending.set(thing, rest);
    else this.pending.delete(thing);
  }

  /** Tira e devolve os pendentes sem resposta há `timeoutMs` ou mais. */
  expire(now: number): Array<{ thing: string; comandoId: string }> {
    const out: Array<{ thing: string; comandoId: string }> = [];
    for (const [thing, list] of [...this.pending]) {
      const keep = list.filter((p) => {
        const late = now - p.sentAt >= this.timeoutMs;
        if (late) out.push({ thing, comandoId: p.comandoId });
        return !late;
      });
      if (keep.length) this.pending.set(thing, keep);
      else this.pending.delete(thing);
    }
    return out;
  }

  /** Aparelho do thing mudou: nada pendente vale. */
  clear(thing: string): void {
    this.pending.delete(thing);
  }
}
