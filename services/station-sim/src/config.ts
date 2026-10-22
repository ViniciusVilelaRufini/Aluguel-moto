/** Configuração do simulador de estações (variáveis de ambiente e argumentos). */
export interface SimConfig {
  mqttUrl: string;
  /** `auto`: responde sozinho em segundos; `manual`: a vaga abre sozinha e o resto é pelo teclado. */
  mode: 'auto' | 'manual';
  /** Intervalo entre os passos automáticos. */
  stepMs: number;
  /** Vagas por estação (número da vaga aberta: 1..slots). */
  slots: number;
  /** Só responde por estas estações (ids); vazio = todas. */
  stations: string[];
  /** Carga sorteada da bateria devolvida (modo automático e tecla `d`). */
  returnPctMin: number;
  returnPctMax: number;
  seed: number;
}

type Env = Record<string, string | undefined>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function int(env: Env, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const v = Number(raw);
  if (!Number.isInteger(v) || v < min || v > max) throw new Error(`${name} inválido: "${raw}" (inteiro de ${min} a ${max})`);
  return v;
}

export function loadConfig(env: Env = process.env, argv: string[] = process.argv.slice(2)): SimConfig {
  const rawMode = argv.includes('--manual') ? 'manual' : argv.includes('--auto') ? 'auto' : (env.STATION_SIM_MODE || 'auto');
  if (rawMode !== 'auto' && rawMode !== 'manual') throw new Error(`STATION_SIM_MODE inválido: "${rawMode}" (use auto | manual)`);
  const stations = (env.STATION_SIM_STATIONS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  for (const s of stations) if (!UUID.test(s)) throw new Error(`STATION_SIM_STATIONS inválido: "${s}" (ids de estação separados por vírgula)`);
  // Fix 1 (I5): responder por todas as estações só de propósito (dev), nunca por engano num broker compartilhado.
  const rawAll = env.STATION_SIM_ALL;
  if (rawAll !== undefined && rawAll !== '' && rawAll !== 'true' && rawAll !== 'false') throw new Error(`STATION_SIM_ALL inválido: "${rawAll}" (true | false)`);
  const all = rawAll === 'true' || argv.includes('--all');
  if (!stations.length && !all) throw new Error('Informe STATION_SIM_STATIONS (ids das estações simuladas) ou STATION_SIM_ALL=true / --all para responder por todas.');
  const mqttUrl = env.MQTT_URL || 'mqtt://localhost:1883';
  if (/amazonaws\.com/i.test(mqttUrl)) throw new Error('MQTT_URL aponta para o AWS IoT Core (amazonaws.com): o simulador só roda contra o Mosquitto de desenvolvimento.');
  const returnPctMax = int(env, 'STATION_SIM_RETURN_PCT_MAX', 25, 0, 100);
  const returnPctMin = int(env, 'STATION_SIM_RETURN_PCT_MIN', Math.min(5, returnPctMax), 0, returnPctMax);
  return {
    mqttUrl,
    mode: rawMode,
    stepMs: int(env, 'STATION_SIM_STEP_MS', 2000, 50, 120_000),
    slots: int(env, 'STATION_SIM_SLOTS', 12, 1, 999),
    stations,
    returnPctMin,
    returnPctMax,
    seed: int(env, 'STATION_SIM_SEED', 7, 0, 2 ** 31),
  };
}
