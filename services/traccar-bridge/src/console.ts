/** Prazo da resposta do aparelho a um comando de console; passado dele, o comando falha com `timeout`. */
export const CONSOLE_TIMEOUT_MS = 60_000;

/** `comando_id` já vistos (pendentes ou concluídos) guardados para ignorar reentrega QoS 1 (M3). */
export const CONSOLE_SEEN_MAX = 500;

export interface PendingConsole {
  comandoId: string;
  sentAt: number;
  /** Texto enviado (só em memória, nunca em log): base da coerência da resposta (`replyMatches`). */
  texto: string;
}

/** Palavra-chave do texto do console: trecho antes da primeira `,` ou do `#`, em maiúsculas. */
export function consoleKeyword(texto: string): string {
  const body = texto.trim().replace(/#$/, '');
  const comma = body.indexOf(',');
  return (comma === -1 ? body : body.slice(0, comma)).toUpperCase();
}

/** Comandos de relé/motor do J16: a ponte nunca os envia pelo console (C1, defesa em profundidade além da política da API). */
const RELAY_KEYWORDS = new Set(['RELAY', 'DYD', 'HFYD', 'STOP', 'RESUME']);

export function isRelayConsoleText(texto: string): boolean {
  return RELAY_KEYWORDS.has(consoleKeyword(texto));
}

/**
 * M2: a fila é FIFO sem correlação (o GT06 não ecoa o comando). Para as leituras de resposta conhecida, o texto tem de
 * conter a marca esperada (sem diferenciar caixa); senão a resposta (atrasada, de outro comando) não é atribuída ao pendente.
 */
const REPLY_MARKERS: Record<string, string[]> = {
  'STATUS#': ['battery:'],
  'WHERE#': ['lati', 'position'],
  'PARAM#': ['imei'],
  'APN#': ['apn'],
  'SERVER#': ['server'],
};

export function replyMatches(texto: string, reply: string): boolean {
  const markers = Object.prototype.hasOwnProperty.call(REPLY_MARKERS, texto.trim().toUpperCase()) ? REPLY_MARKERS[texto.trim().toUpperCase()] : undefined;
  if (!markers) return true;
  const r = reply.toLowerCase();
  return markers.some((m) => r.includes(m));
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
  /** Ids já aceitos (ordem de chegada; limitado a `seenMax`). */
  private readonly seen = new Set<string>();

  constructor(
    private readonly timeoutMs: number = CONSOLE_TIMEOUT_MS,
    private readonly seenMax: number = CONSOLE_SEEN_MAX,
  ) {}

  /** `false` = `comandoId` já visto (pendente ou concluído há pouco): reentrega QoS 1, não reenvia. */
  add(thing: string, comandoId: string, now: number, texto: string): boolean {
    if (this.seen.has(comandoId)) return false;
    this.seen.add(comandoId);
    if (this.seen.size > this.seenMax) this.seen.delete(this.seen.values().next().value as string);
    const list = this.pending.get(thing) ?? [];
    list.push({ comandoId, sentAt: now, texto });
    this.pending.set(thing, list);
    return true;
  }

  /** O pendente mais antigo, sem tirar da fila. */
  peek(thing: string): PendingConsole | undefined {
    return this.pending.get(thing)?.[0];
  }

  /** Há comando de console pendente para o thing? */
  has(thing: string): boolean {
    return (this.pending.get(thing)?.length ?? 0) > 0;
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
  clear(thing: string): PendingConsole[] {
    const list = this.pending.get(thing) ?? [];
    this.pending.delete(thing);
    return list;
  }
}
