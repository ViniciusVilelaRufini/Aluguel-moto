import type { BatteryModel } from './units';

export type PoolConfigLike =
  | { connectionString: string }
  | { host: string; port: number; database: string; user: string; password: string; ssl?: { rejectUnauthorized: boolean } };

export interface BridgeConfig {
  iotMode: 'local' | 'aws';
  mqttUrl: string;
  mqttClientId: string;
  mqttCertPem?: string;
  mqttKeyPem?: string;
  traccarUrl: string;
  traccarEmail: string;
  traccarPassword: string;
  /** Só no docker-compose local: cria o primeiro usuário do Traccar (vira admin) com estas credenciais. */
  traccarBootstrapAdmin: boolean;
  database: PoolConfigLike;
  battery: BatteryModel;
  registryRefreshMs: number;
}

const BATTERIES: BatteryModel[] = ['48v', '60v', '72v'];

/** Variáveis de ambiente (nenhum segredo no código: senhas e certificado vêm do ambiente / Secrets Manager). */
export function loadConfig(env: Record<string, string | undefined> = process.env): BridgeConfig {
  const need = (k: string): string => {
    const v = env[k];
    if (!v) throw new Error(`${k} ausente`);
    return v;
  };
  const mode = env.IOT_MODE ?? 'local';
  if (mode !== 'local' && mode !== 'aws') throw new Error('IOT_MODE deve ser local ou aws');
  const battery = (env.BATTERY_MODEL ?? '72v') as BatteryModel;
  if (!BATTERIES.includes(battery)) throw new Error('BATTERY_MODEL deve ser 48v, 60v ou 72v');
  if (mode === 'aws' && (!env.MQTT_CERT_PEM || !env.MQTT_KEY_PEM)) throw new Error('IOT_MODE=aws exige MQTT_CERT_PEM e MQTT_KEY_PEM (certificado de serviço da ponte)');
  const registryRefreshMs = Number(env.REGISTRY_REFRESH_MS ?? 60_000);
  if (!Number.isFinite(registryRefreshMs) || registryRefreshMs < 1_000) throw new Error('REGISTRY_REFRESH_MS deve ser um número ≥ 1000');
  const mqttUrl = env.MQTT_URL || (mode === 'aws' ? `mqtts://${need('IOT_ENDPOINT').replace(/^https?:\/\//, '')}:8883` : 'mqtt://localhost:1883');
  const database: PoolConfigLike = env.DATABASE_URL
    ? { connectionString: env.DATABASE_URL }
    : {
        host: need('DATABASE_HOST'),
        port: Number(env.DATABASE_PORT ?? 5432),
        database: env.DATABASE_NAME ?? 'volti',
        user: need('DATABASE_USER'),
        password: need('DATABASE_PASSWORD'),
        // Cifrado; a verificação da CA da RDS fica como pendência antes de produção (docs/decisoes.md).
        ...(env.DATABASE_SSL === 'require' ? { ssl: { rejectUnauthorized: false } } : {}),
      };
  return {
    iotMode: mode,
    mqttUrl,
    mqttClientId: env.MQTT_CLIENT_ID || 'traccar-bridge',
    mqttCertPem: env.MQTT_CERT_PEM,
    mqttKeyPem: env.MQTT_KEY_PEM,
    traccarUrl: need('TRACCAR_URL').replace(/\/$/, ''),
    traccarEmail: need('TRACCAR_EMAIL'),
    traccarPassword: need('TRACCAR_PASSWORD'),
    traccarBootstrapAdmin: env.TRACCAR_BOOTSTRAP_ADMIN === 'true',
    database,
    battery,
    registryRefreshMs,
  };
}
