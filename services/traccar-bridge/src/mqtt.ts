import { connect, type IClientOptions } from 'mqtt';
import type { BridgeConfig } from './config';

/** Subconjunto do cliente `mqtt` v5 usado pela ponte (o broker falso dos testes implementa o mesmo). */
export interface MqttLike {
  /** `false` com a conexão caída (mqtt.js). Ausente = considerado conectado. */
  readonly connected?: boolean;
  publishAsync(topic: string, payload: string, opts?: { qos?: 0 | 1 }): Promise<unknown>;
  subscribeAsync(topics: string[], opts?: { qos?: 0 | 1 }): Promise<unknown>;
  /** `packet.retain`: mensagem retida entregue no SUBSCRIBE (mqtt.js passa o pacote como 3º argumento). */
  on(event: 'message', cb: (topic: string, payload: Buffer, packet?: { retain?: boolean }) => void): unknown;
  on(event: 'connect', cb: () => void): unknown;
  endAsync(force?: boolean): Promise<unknown>;
}

/** local: Mosquitto sem TLS (dev single: usuário e senha na MQTT_URL, `mqtt://usuario:senha@host`); aws: IoT Core (mqtts 8883) com o certificado de serviço da ponte. Sessão limpa. */
export function connectMqtt(cfg: BridgeConfig): MqttLike {
  const opts: IClientOptions = { clientId: cfg.mqttClientId, clean: true, keepalive: 30, reconnectPeriod: 2_000, connectTimeout: 10_000 };
  if (cfg.iotMode === 'aws') Object.assign(opts, { cert: cfg.mqttCertPem, key: cfg.mqttKeyPem, rejectUnauthorized: true });
  return connect(cfg.mqttUrl, opts) as unknown as MqttLike;
}
