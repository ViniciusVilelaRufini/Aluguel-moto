import { loadConfig } from './config';
import { Fleet, jsonLog } from './fleet';

/** Simulador de rastreadores Volti. Variáveis em services/iot-sim/README.md. */
function main(): void {
  const cfg = loadConfig();
  const fleet = new Fleet(cfg);
  fleet.start();
  const stop = () => {
    void fleet.stop().then(() => process.exit(0));
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  if (cfg.durationSec > 0) setTimeout(stop, cfg.durationSec * 1000);
}

try {
  main();
} catch (err) {
  jsonLog({ level: 'error', msg: 'sim_failed', error: (err as Error).message });
  process.exit(1);
}
