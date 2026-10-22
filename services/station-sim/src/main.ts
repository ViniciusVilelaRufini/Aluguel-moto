import { randomBytes } from 'node:crypto';
import { connect } from 'mqtt';
import { loadConfig } from './config';
import { COMMANDS_FILTER, eventsTopic, parseCommand, thingFromCommandTopic } from './protocol';
import { StationSim, type Logger } from './station';

/** Logs em JSON, só ids (nenhum dado pessoal: o simulador nem conhece o cliente). */
const jsonLog: Logger = (entry) => process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), service: 'station-sim', ...entry })}\n`);

const HELP = [
  'Teclas (modo manual):',
  '  d  devolver a bateria na vaga aberta mais antiga (e fechar a vaga)',
  '  f  fechar a vaga mais antiga sem devolver (a API cancela a troca)',
  '  l  liberar a bateria carregada da liberação pedida mais antiga',
  '  s  situação das trocas',
  '  h  esta ajuda',
  '  q  sair',
].join('\n');

/** Simulador das estações de troca. Variáveis em services/station-sim/README.md. */
function main(): void {
  const cfg = loadConfig();
  const client = connect(cfg.mqttUrl, { clientId: `station-sim-${randomBytes(3).toString('hex')}`, clean: true, reconnectPeriod: 2_000, connectTimeout: 5_000 });
  const sim = new StationSim(cfg, (thing, event) => {
    void client.publishAsync(eventsTopic(thing), JSON.stringify(event), { qos: 1 }).catch((err: Error) => jsonLog({ level: 'error', msg: 'publicacao_falhou', error: err.message }));
  }, jsonLog);

  client.on('connect', () => {
    void client.subscribeAsync([COMMANDS_FILTER], { qos: 1 }).then(
      () => jsonLog({ msg: 'sim_started', mode: cfg.mode, stepMs: cfg.stepMs, stations: cfg.stations.length || 'todas' }),
      (err: Error) => jsonLog({ level: 'error', msg: 'assinatura_falhou', error: err.message }),
    );
  });
  client.on('error', (err) => jsonLog({ level: 'warn', msg: 'mqtt_error', error: err.message }));
  client.on('message', (topic, payload) => {
    const thing = thingFromCommandTopic(topic);
    if (!thing) return;
    let body: unknown;
    try {
      body = JSON.parse(payload.toString('utf8'));
    } catch {
      jsonLog({ level: 'warn', msg: 'comando_json_invalido' });
      return;
    }
    const cmd = parseCommand(body);
    if (!cmd) {
      jsonLog({ level: 'warn', msg: 'comando_invalido' });
      return;
    }
    sim.onCommand(thing, cmd);
  });

  const stop = () => {
    void client.endAsync(true).finally(() => process.exit(0));
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  if (cfg.mode === 'manual' && process.stdin.isTTY) {
    console.log(HELP);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key: string) => {
      const k = key.toLowerCase();
      if (k === 'q' || key === '\u0003') return stop();
      if (k === 'h') return console.log(HELP);
      if (k === 's') {
        const rows = [...sim.swaps.values()].filter((s) => s.phase !== 'done');
        console.log(rows.length ? rows.map((s) => `${s.swapId}  vaga ${s.slotNumber}  ${s.phase}`).join('\n') : 'Nenhuma troca em andamento.');
        return;
      }
      const action = k === 'd' ? sim.returnBattery() : k === 'f' ? sim.closeEmpty() : k === 'l' ? sim.release() : undefined;
      if (action === null) console.log(k === 'l' ? 'Nenhuma liberação pedida pela API.' : 'Nenhuma vaga aberta esperando a bateria.');
    });
  }
}

try {
  main();
} catch (err) {
  jsonLog({ level: 'error', msg: 'sim_failed', error: (err as Error).message });
  process.exit(1);
}
