import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

export interface TimelineOptions {
  /** `Gt06Emulator.cuts` (ou os logs `gt06_cut`): cada corte recebido pelo emulador com a velocidade do instante. */
  emulatorCuts?: Array<{ text: string; speedKmhAtCut: number }>;
  /** `true` se o e2e pediu um desbloqueio de propósito (`desired travada:false` esperado). */
  unlockRequested?: boolean;
}

/**
 * Confere o tráfego MQTT do e2e do dev single (`mosquitto_sub -v`: "tópico payload" por linha, na ordem de chegada) contra a
 * spec GT06 §5: o primeiro `desired travada:true` só depois de ≥ 2 telemetrias < 3 km/h consecutivas cobrindo ≥ 10 s, uma única
 * vez, e um `reported travada:true` depois dele.
 *
 * Oráculo de segurança do e2e, além disso:
 * - corte recebido pelo emulador com a moto a >= 3 km/h (`opts.emulatorCuts`);
 * - `reported travada:true` sem um status do rastreador com o bit de corte depois da última (re)conexão. Só vale quando as linhas
 *   trazem também os logs JSON do emulador (linhas que começam com `{`: `gt06_logged_in`, `gt06_status_sent`) intercalados na ordem;
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
  let statusSinceLogin = false;
  let reportedWithoutStatus = false;
  let unrequestedUnlock = false;
  for (const line of lines) {
    if (line.startsWith('{')) {
      let ev: any;
      try {
        ev = JSON.parse(line);
      } catch {
        continue;
      }
      if (ev?.msg === 'gt06_logged_in') {
        sawEmulatorEvents = true;
        statusSinceLogin = false;
      } else if (ev?.msg === 'gt06_status_sent' && typeof ev.blocked === 'boolean') {
        sawEmulatorEvents = true;
        statusSinceLogin = true;
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
    if (topic === update && body?.state?.reported?.travada === true && sawEmulatorEvents && !statusSinceLogin) reportedWithoutStatus = true;
    if ((topic === delta && body?.state?.travada === false) || (topic === update && body?.state?.desired?.travada === false)) unrequestedUnlock = true;
  }
  if (cuts === 0) problems.push('nenhum desired travada:true observado');
  else {
    if (cuts > 1) problems.push(`travada:true gravado ${cuts} vezes`);
    if (!confirmed) problems.push('sem reported travada:true depois do corte');
  }
  for (const c of opts.emulatorCuts ?? []) {
    if (c.speedKmhAtCut >= 3) problems.push(`emulador recebeu corte "${c.text}" com a moto a ${c.speedKmhAtCut} km/h (>= 3)`);
  }
  if (reportedWithoutStatus) problems.push('reported travada:true publicado sem status com bit de corte depois da última conexão do rastreador');
  if (unrequestedUnlock && !opts.unlockRequested) problems.push('desired travada:false não solicitado');
  return { ok: problems.length === 0, problems };
}

/** Extrai os cortes dos logs JSON do emulador (`gt06_cut`); ignora linhas que não são JSON. */
export function cutsFromEmulatorLog(text: string): Array<{ text: string; speedKmhAtCut: number }> {
  const out: Array<{ text: string; speedKmhAtCut: number }> = [];
  for (const l of text.split('\n')) {
    try {
      const e = JSON.parse(l);
      if (e?.msg === 'gt06_cut') out.push({ text: String(e.text ?? 'cut'), speedKmhAtCut: Number(e.speedKmhAtCut) });
    } catch {
      /* linha que não é JSON */
    }
  }
  return out;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const thing = args.find((a) => !a.startsWith('--'));
  const logArg = args.find((a) => a.startsWith('--emulator-log='));
  if (!thing) {
    process.stderr.write('uso: node dist/e2e/check-timeline.js <thingName> [--emulator-log=arquivo] [--unlock-requested] < saida-do-mosquitto_sub\n');
    process.exit(2);
  }
  const emulatorCuts = logArg ? cutsFromEmulatorLog(readFileSync(logArg.slice('--emulator-log='.length), 'utf8')) : undefined;
  const lines: string[] = [];
  createInterface({ input: process.stdin })
    .on('line', (l) => lines.push(l))
    .on('close', () => {
      const r = checkTimeline(lines, thing, { emulatorCuts, unlockRequested: args.includes('--unlock-requested') });
      process.stdout.write(`${JSON.stringify(r)}\n`);
      process.exit(r.ok ? 0 : 1);
    });
}
