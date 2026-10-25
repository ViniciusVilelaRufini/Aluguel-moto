import { loadConfig, type SimConfig } from './config';
import { Fleet, jsonLog } from './fleet';
import { postgresFleetSource, type FleetSource } from './fleet-source';

/**
 * Modo `postgres`: lê a frota agora e a cada `fleetRefreshSec`. Falha de leitura (banco subindo, migração) só gera log e
 * tenta de novo no próximo ciclo; as motos já simuladas seguem conectadas.
 */
function runFromDatabase(cfg: SimConfig, fleet: Fleet): { stop: () => Promise<void> } {
  const source: FleetSource = postgresFleetSource(cfg.databaseUrl!);
  let busy = false;
  const refresh = async () => {
    if (busy) return;
    busy = true;
    try {
      fleet.sync(await source.load());
    } catch (err) {
      jsonLog({ level: 'warn', msg: 'sim_fleet_load_failed', error: (err as Error).message });
    } finally {
      busy = false;
    }
  };
  void refresh();
  const timer = setInterval(() => void refresh(), cfg.fleetRefreshSec * 1000);
  jsonLog({ msg: 'sim_started', source: 'postgres', refreshSec: cfg.fleetRefreshSec, rideOnUnlock: cfg.rideOnUnlock });
  return {
    stop: async () => {
      clearInterval(timer);
      await source.close().catch(() => undefined);
    },
  };
}

/** Simulador de rastreadores Volti. Variáveis em services/iot-sim/README.md. */
function main(): void {
  const cfg = loadConfig();
  const fleet = new Fleet(cfg);
  const db = cfg.fleetSource === 'postgres' ? runFromDatabase(cfg, fleet) : (fleet.start(), undefined);
  const stop = () => {
    void (db?.stop() ?? Promise.resolve())
      .then(() => fleet.stop())
      .then(() => process.exit(0));
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
