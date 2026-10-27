import { loadConfig } from './config';

const base = { TRACCAR_URL: 'http://traccar:8082', TRACCAR_EMAIL: 'bridge@volti.local', TRACCAR_PASSWORD: 'x', DATABASE_URL: 'postgresql://volti_bridge:y@postgres:5432/volti' };

describe('loadConfig', () => {
  it('local: Mosquitto sem TLS, bateria 72v e registro a cada 60 s por padrão', () => {
    expect(loadConfig(base)).toMatchObject({ iotMode: 'local', mqttUrl: 'mqtt://localhost:1883', mqttClientId: 'traccar-bridge', battery: '72v', registryRefreshMs: 60_000, traccarBootstrapAdmin: false, database: { connectionString: base.DATABASE_URL } });
  });
  it('aws: mqtts no endpoint do IoT Core e certificado de serviço obrigatório; banco por partes com SSL', () => {
    expect(() => loadConfig({ ...base, IOT_MODE: 'aws', IOT_ENDPOINT: 'abc-ats.iot.sa-east-1.amazonaws.com' })).toThrow('MQTT_CERT_PEM');
    const cfg = loadConfig({ ...base, DATABASE_URL: undefined, IOT_MODE: 'aws', IOT_ENDPOINT: 'https://abc-ats.iot.sa-east-1.amazonaws.com', MQTT_CERT_PEM: 'c', MQTT_KEY_PEM: 'k', MQTT_CLIENT_ID: 'traccar-bridge-dev', DATABASE_HOST: 'db', DATABASE_USER: 'volti_bridge', DATABASE_PASSWORD: 'p', DATABASE_SSL: 'require' });
    expect(cfg).toMatchObject({ mqttUrl: 'mqtts://abc-ats.iot.sa-east-1.amazonaws.com:8883', mqttClientId: 'traccar-bridge-dev', database: { host: 'db', port: 5432, database: 'volti', user: 'volti_bridge', password: 'p', ssl: { rejectUnauthorized: false } } });
  });
  it('erros de configuração', () => {
    expect(() => loadConfig({ ...base, TRACCAR_PASSWORD: undefined })).toThrow('TRACCAR_PASSWORD ausente');
    expect(() => loadConfig({ ...base, IOT_MODE: 'stub' })).toThrow('IOT_MODE deve ser local ou aws');
    expect(() => loadConfig({ ...base, BATTERY_MODEL: '36v' })).toThrow('BATTERY_MODEL deve ser 48v, 60v ou 72v');
    expect(() => loadConfig({ ...base, REGISTRY_REFRESH_MS: 'abc' })).toThrow('REGISTRY_REFRESH_MS');
  });
});
