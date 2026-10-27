import { Bridge } from './bridge';
import { loadConfig } from './config';
import { createLogger } from './log';
import { connectMqtt } from './mqtt';
import { PgRegistry, pgQuery } from './registry';
import { TraccarRest } from './traccar/rest';
import { TraccarSocket } from './traccar/socket';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const cfg = loadConfig();
  const log = createLogger('traccar-bridge');
  const rest = new TraccarRest(cfg.traccarUrl, cfg.traccarEmail, cfg.traccarPassword);
  const mqtt = connectMqtt(cfg);
  const bridge = new Bridge(mqtt, rest, new PgRegistry(pgQuery(cfg.database)), { iotMode: cfg.iotMode, battery: cfg.battery, log });
  // A ponte trata o `connect` do MQTT (reassina e republica o estado atual). Traccar e banco podem subir depois: tenta até conseguir.
  for (let attempt = 1; ; attempt++) {
    try {
      if (cfg.traccarBootstrapAdmin && (await rest.bootstrapFirstUser('Volti dev'))) log.info({ msg: 'traccar_first_user_created' });
      await bridge.start();
      break;
    } catch (err) {
      log.warn({ msg: 'bridge_start_retry', attempt, error: (err as Error).message });
      await sleep(5_000);
    }
  }
  // Cada abertura do WebSocket (inclusive reconexão): esquece o bit de corte, marca o replay e relê os dispositivos.
  const socket = new TraccarSocket(cfg.traccarUrl, rest, (m) => void bridge.enqueue(m), log, () => void bridge.onSocketOpen());
  for (let attempt = 1; ; attempt++) {
    try {
      await socket.connect();
      break;
    } catch (err) {
      log.warn({ msg: 'traccar_socket_connect_retry', attempt, error: (err as Error).message });
      await sleep(5_000);
    }
  }
  setInterval(() => {
    void bridge.refreshRegistry().catch((err: Error) => log.error({ msg: 'registry_refresh_failed', error: err.message }));
    void bridge.refreshServerVersion(); // não lança: falha vira noQueueOk=false com log
  }, cfg.registryRefreshMs).unref();
  log.info({ msg: 'bridge_started', iotMode: cfg.iotMode });
  const stop = async () => {
    socket.close();
    await mqtt.endAsync(true).catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGTERM', () => void stop());
  process.on('SIGINT', () => void stop());
}

main().catch((err) => {
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), level: 'error', service: 'traccar-bridge', msg: 'bridge_failed', error: (err as Error).message })}\n`);
  process.exit(1);
});
