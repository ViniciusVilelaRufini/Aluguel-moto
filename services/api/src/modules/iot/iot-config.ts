/** Configuração do módulo IoT (variáveis de ambiente; nenhum segredo). */
export interface IotConfig {
  iotMode: 'local' | 'aws' | 'stub';
  geofenceMode: 'local' | 'aws';
  mqttUrl: string;
  /** Endpoint do IoT Data Plane (`https://<prefixo>-ats.iot.sa-east-1.amazonaws.com`), publicado pela Task 2 no SSM `iot/endpoint`. */
  iotEndpoint?: string;
  region: string;
  trackerName: string;
  geofenceCollection: string;
  confirmWaitMs: number;
  commandTimeoutMs: number;
  offlineAfterMs: number;
  /** Com o relógio do rastreador adiantado, nenhuma amostra vale para travar neste intervalo depois da reconexão (fila offline). */
  reconnectGraceMs: number;
  outOfAreaLockMinutes: number;
  shadowPollMs: number;
}

const num = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const v = Number(raw);
  return raw !== undefined && raw !== '' && Number.isFinite(v) ? v : fallback;
};

export function loadIotConfig(): IotConfig {
  const env = process.env.VOLTI_ENV ?? 'dev';
  const endpoint = process.env.IOT_ENDPOINT;
  return {
    iotMode: (process.env.IOT_MODE as IotConfig['iotMode']) || 'local',
    geofenceMode: (process.env.GEOFENCE_MODE as IotConfig['geofenceMode']) || 'local',
    mqttUrl: process.env.MQTT_URL || 'mqtt://localhost:1883',
    iotEndpoint: endpoint ? (endpoint.startsWith('http') ? endpoint : `https://${endpoint}`) : undefined,
    region: process.env.AWS_REGION || 'sa-east-1',
    trackerName: process.env.LOCATION_TRACKER_NAME || `volti-${env}-tracker`,
    geofenceCollection: process.env.LOCATION_GEOFENCE_COLLECTION || `volti-${env}-geofences`,
    confirmWaitMs: num('IOT_CONFIRM_WAIT_MS', 3_000),
    commandTimeoutMs: num('IOT_COMMAND_TIMEOUT_MS', 30_000),
    offlineAfterMs: num('IOT_OFFLINE_AFTER_MS', 180_000),
    reconnectGraceMs: num('IOT_RECONNECT_GRACE_MS', 10_000),
    outOfAreaLockMinutes: num('OUT_OF_AREA_LOCK_MINUTES', 5),
    shadowPollMs: num('IOT_SHADOW_POLL_MS', 1_000),
  };
}

export const IOT_CONFIG = Symbol('IOT_CONFIG');
