import { createLogger, maskImei } from '../log';
import type { BatteryModel } from '../units';
import { defaultPowerVolts, Gt06Emulator } from './emulator';

const env = process.env;
const log = createLogger('gt06-emulator');
const num = (k: string, d: number) => (env[k] ? Number(env[k]) : d);
const imei = env.GT06_IMEI ?? '860000000000901';
if (!/^\d{15}$/.test(imei)) throw new Error('GT06_IMEI deve ter 15 dígitos');
const scenario = env.GT06_SCENARIO ?? 'parked';
if (scenario !== 'parked' && scenario !== 'ride-then-stop') throw new Error('GT06_SCENARIO deve ser parked ou ride-then-stop');
// Mesma variável da ponte (BATTERY_MODEL, padrão 72v): a tensão enviada cai em ~70 % da curva desse modelo.
const batteryModel = (env.BATTERY_MODEL ?? '72v') as BatteryModel;
if (!['48v', '60v', '72v'].includes(batteryModel)) throw new Error('BATTERY_MODEL deve ser 48v, 60v ou 72v');
const rideKmh = num('GT06_RIDE_KMH', 20);
const rideMs = num('GT06_RIDE_SECONDS', 60) * 1000;
const startedAt = Date.now();
const start = { lat: num('GT06_START_LAT', -23.5614), lng: num('GT06_START_LNG', -46.6914) };

/** Cenário pela hora desde que o processo subiu (sobrevive a reconexões): anda `GT06_RIDE_SECONDS` e para com a ignição ligada. */
function speedNow(): number {
  return scenario === 'ride-then-stop' && Date.now() - startedAt < rideMs ? rideKmh : 0;
}

async function run(): Promise<void> {
  for (;;) {
    const emu = new Gt06Emulator({ host: env.GT06_HOST ?? 'localhost', port: num('GT06_PORT', 5023), imei, intervalMs: num('GT06_INTERVAL_MS', 5_000), heartbeatMs: num('GT06_HEARTBEAT_MS', 30_000), powerVolts: num('GT06_POWER_VOLTS', defaultPowerVolts(batteryModel)), start, log });
    try {
      emu.setIgnition(scenario === 'ride-then-stop');
      emu.setSpeed(speedNow());
      await emu.start();
      log.info({ msg: 'gt06_emulator_started', imei: maskImei(imei), scenario });
      const t = setInterval(() => emu.setSpeed(speedNow()), 1_000);
      await emu.closed;
      clearInterval(t);
    } catch (err) {
      log.warn({ msg: 'gt06_emulator_connect_failed', error: (err as Error).message });
    }
    emu.stop();
    await new Promise((r) => setTimeout(r, 5_000));
  }
}

void run();
