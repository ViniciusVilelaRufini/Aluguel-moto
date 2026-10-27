import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { BLOCKED_FRESH_MS } from '../mapping';

export interface TimelineOptions {
  /** `Gt06Emulator.cuts` de um teste em processo (a mesma informação dos logs `gt06_cut`). */
  emulatorCuts?: Array<{ text: string; speedKmhAtCut: number }>;
  /** `true` se o e2e pediu um desbloqueio de propósito (`desired travada:false` esperado). */
  unlockRequested?: boolean;
  /** Dispensa o log do emulador de propósito: as checagens que dependem dele não rodam (nada de passar em silêncio por falta de entrada). */
  noEmulatorLog?: boolean;
}

const TS = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:?\d\d)?)\s+(.*)$/;
const SECOND_ONLY = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:Z|[+-]\d\d:?\d\d)?\s/;

/** Modo `stamp` do CLI: prefixa a linha com a hora UTC (ISO 8601, milissegundos) do recebimento. */
export function stampLine(line: string, now: number = Date.now()): string {
  return `${new Date(now).toISOString()} ${line}`;
}

function parseTime(raw: string): number | undefined {
  const norm = raw.replace(/([+-]\d\d)(\d\d)$/, '$1:$2');
  const t = Date.parse(norm);
  return Number.isFinite(t) ? t : undefined;
}

/**
 * Confere o tráfego MQTT do e2e do dev single (`mosquitto_sub -v | check-timeline.js stamp`: "hora-com-ms tópico payload" por linha; a hora ISO no
 * começo é opcional) contra a spec GT06 §5: o primeiro `desired travada:true` só depois de ≥ 2 telemetrias < 3 km/h consecutivas
 * cobrindo ≥ 10 s, uma única vez, e um `reported travada:true` depois dele.
 *
 * Oráculo de segurança do e2e (falha fechada: sem o log do emulador o resultado é um problema, não um "ok"):
 * - corte recebido pelo emulador (`gt06_cut` nas linhas, ou `opts.emulatorCuts`) com a moto a >= 3 km/h;
 * - `desired travada:true` visto sem nenhum `gt06_cut` do emulador;
 * - `reported travada:true` sem um `gt06_status_sent` com `blocked:true` depois do corte do emulador e antes da publicação (e, quando
 *   há hora nas linhas, com no máximo BLOCKED_FRESH_MS de idade). Os logs JSON do emulador entram intercalados, na ordem;
 * - `desired travada:false` (shadow update ou delta) que ninguém pediu (`opts.unlockRequested`).
 */
export function checkTimeline(lines: string[], thing: string, opts: TimelineOptions = {}): { ok: boolean; problems: string[] } {
  const telemetry = `motos/${thing}/telemetria`;
  const delta = `$aws/things/${thing}/shadow/update/delta`;
  const update = `$aws/things/${thing}/shadow/update`;
  const samples: Array<{ kmh: number; ts: number }> = [];
  const problems: string[] = [];
  let cuts = 0;
  let confirmed = false;
  let sawEmulatorEvents = false;
  let cutSinceLogin = false;
  let blockedStatus: { at?: number } | undefined;
  let reportedWithoutStatus = false;
  let staleStatusSeconds: number | undefined;
  let unrequestedUnlock = false;
  let secondOnly = false;
  const emulatorCuts = [...(opts.emulatorCuts ?? [])];
  for (const raw of lines) {
    let line = raw;
    let at: number | undefined;
    const m = TS.exec(line);
    if (m) {
      if (SECOND_ONLY.test(line)) secondOnly = true;
      at = parseTime(m[1]);
      line = m[2];
    }
    if (line.startsWith('{')) {
      let ev: any;
      try {
        ev = JSON.parse(line);
      } catch {
        continue;
      }
      if (typeof ev?.ts === 'string') at = parseTime(ev.ts) ?? at;
      if (ev?.msg === 'gt06_logged_in') {
        sawEmulatorEvents = true;
        cutSinceLogin = false;
        blockedStatus = undefined;
      } else if (ev?.msg === 'gt06_cut') {
        sawEmulatorEvents = true;
        cutSinceLogin = true;
        emulatorCuts.push({ text: String(ev.text ?? 'cut'), speedKmhAtCut: Number(ev.speedKmhAtCut) });
      } else if (ev?.msg === 'gt06_status_sent' && typeof ev.blocked === 'boolean') {
        sawEmulatorEvents = true;
        blockedStatus = ev.blocked && cutSinceLogin ? { at } : undefined;
      }
      continue;
    }
    const sp = line.indexOf(' ');
    if (sp < 0) continue;
    const topic = line.slice(0, sp);
    let body: any;
    try {
      body = JSON.parse(line.slice(sp + 1));
    } catch {
      continue;
    }
    if (topic === telemetry && cuts === 0) samples.push({ kmh: Number(body.velocidade_kmh), ts: Date.parse(body.timestamp) });
    if (topic === delta && body?.state?.travada === true) {
      cuts++;
      if (cuts > 1) continue;
      const tail: Array<{ kmh: number; ts: number }> = [];
      for (let k = samples.length - 1; k >= 0 && samples[k].kmh < 3; k--) tail.unshift(samples[k]);
      if (tail.length < 2) problems.push(`corte com ${tail.length} amostra(s) parada(s) antes`);
      else if (tail[tail.length - 1].ts - tail[0].ts < 10_000) problems.push('corte com amostras paradas cobrindo menos de 10 s');
      if (samples.length && !(samples[samples.length - 1].kmh < 3)) problems.push('corte com a última velocidade >= 3 km/h');
    }
    if (topic === update && cuts > 0 && body?.state?.reported?.travada === true) confirmed = true;
    if (topic === update && body?.state?.reported?.travada === true && !opts.noEmulatorLog) {
      if (!blockedStatus) reportedWithoutStatus = true;
      else if (blockedStatus.at !== undefined && at !== undefined && at - blockedStatus.at > BLOCKED_FRESH_MS) staleStatusSeconds = Math.round((at - blockedStatus.at) / 1000);
    }
    if ((topic === delta && body?.state?.travada === false) || (topic === update && body?.state?.desired?.travada === false)) unrequestedUnlock = true;
  }
  if (secondOnly) problems.push('check skipped: linhas do mosquitto sem milissegundos');
  if (cuts === 0) problems.push('nenhum desired travada:true observado');
  else {
    if (cuts > 1) problems.push(`travada:true gravado ${cuts} vezes`);
    if (!confirmed) problems.push('sem reported travada:true depois do corte');
  }
  if (!opts.noEmulatorLog) {
    if (!sawEmulatorEvents && opts.emulatorCuts === undefined) {
      problems.push('check skipped: sem log do emulador (gt06_*) nas linhas; passe o log ou dispense com noEmulatorLog');
    } else {
      if (cuts > 0 && emulatorCuts.length === 0) problems.push('desired travada:true observado mas o emulador não registrou nenhum corte (gt06_cut)');
      const seen = new Set<string>();
      for (const c of emulatorCuts) {
        const key = `${c.text}|${c.speedKmhAtCut}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!(c.speedKmhAtCut < 3)) problems.push(`emulador recebeu corte "${c.text}" com a moto a ${c.speedKmhAtCut} km/h (>= 3)`);
      }
      if (reportedWithoutStatus) problems.push('reported travada:true publicado sem status com bit de corte (blocked:true) depois do corte do emulador e da última conexão');
      if (staleStatusSeconds !== undefined) problems.push(`reported travada:true publicado ${staleStatusSeconds} s depois do último status com o bit de corte (> ${BLOCKED_FRESH_MS / 1000} s)`);
    }
  }
  if (unrequestedUnlock && !opts.unlockRequested) problems.push('desired travada:false não solicitado');
  return { ok: problems.length === 0, problems };
}

/** Une as linhas do mosquitto (todas com hora no começo) e as do log do emulador pela hora; estável, emulador antes em empate. */
export function mergeByTime(stream: string[], emulator: string[]): string[] | null {
  const timed = (l: string): number | undefined => {
    const m = TS.exec(l);
    if (m) return parseTime(m[1]);
    if (l.startsWith('{')) {
      try {
        const ts = JSON.parse(l)?.ts;
        return typeof ts === 'string' ? parseTime(ts) : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  };
  const items = [...emulator.map((l, i) => ({ l, t: timed(l), k: 0, i })), ...stream.filter((l) => l.trim()).map((l, i) => ({ l, t: timed(l), k: 1, i }))];
  if (items.some((x) => x.t === undefined)) return null;
  return items.sort((a, b) => (a.t as number) - (b.t as number) || a.k - b.k || a.i - b.i).map((x) => x.l);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args[0] === 'stamp') {
    createInterface({ input: process.stdin }).on('line', (l) => process.stdout.write(`${stampLine(l)}
`));
    return;
  }
  const thing = args.find((a) => !a.startsWith('--'));
  const logArg = args.find((a) => a.startsWith('--emulator-log='));
  const noLog = args.includes('--no-emulator-log');
  if (!thing || (!logArg && !noLog)) {
    process.stderr.write('uso: node dist/e2e/check-timeline.js <thingName> (--emulator-log=arquivo | --no-emulator-log) [--unlock-requested] < saida-do-mosquitto_sub -v -F "%I %t %p"\n');
    process.exit(2);
  }
  const stream: string[] = [];
  createInterface({ input: process.stdin })
    .on('line', (l) => stream.push(l))
    .on('close', () => {
      const base = { unlockRequested: args.includes('--unlock-requested') };
      let r: { ok: boolean; problems: string[] };
      if (noLog) r = checkTimeline(stream, thing, { ...base, noEmulatorLog: true });
      else {
        const log = readFileSync(logArg!.slice('--emulator-log='.length), 'utf8').split('\n').filter((l) => l.trim());
        const merged = mergeByTime(stream, log);
        if (merged) r = checkTimeline(merged, thing, base);
        else {
          const partial = checkTimeline(stream, thing, { ...base, noEmulatorLog: true });
          r = { ok: false, problems: ['check skipped: linhas do mosquitto sem hora (passe a saída do mosquitto_sub -v por "check-timeline.js stamp"); não dá para intercalar com o log do emulador', ...partial.problems] };
        }
      }
      process.stdout.write(`${JSON.stringify(r)}\n`);
      process.exit(r.ok ? 0 : 1);
    });
}

if (require.main === module) main();
