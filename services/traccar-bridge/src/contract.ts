/** Contrato MQTT (packages/contracts/mqtt.md e schemas/): o que a ponte publica e assina. Para a API nada muda (spec §6.1). */
export const TOPICS = {
  telemetry: (t: string) => `motos/${t}/telemetria`,
  events: (t: string) => `motos/${t}/eventos`,
  commands: (t: string) => `motos/${t}/comandos`,
  shadowUpdate: (t: string) => `$aws/things/${t}/shadow/update`,
  shadowDelta: (t: string) => `$aws/things/${t}/shadow/update/delta`,
  shadowGet: (t: string) => `$aws/things/${t}/shadow/get`,
  shadowGetAccepted: (t: string) => `$aws/things/${t}/shadow/get/accepted`,
  presenceConnected: (t: string) => `$aws/events/presence/connected/${t}`,
  presenceDisconnected: (t: string) => `$aws/events/presence/disconnected/${t}`,
} as const;

/** GT06 não limita velocidade: o reported traz o máximo legal, garantido pelo controlador da moto (spec §1.4). */
export const FIXED_LIMIT_KMH = 32;

/**
 * Posição fraca: satélites conhecidos (`satelites`) abaixo disto. Continua no mapa e no trajeto, mas não é amostra parada da
 * segunda guarda do corte nem entra no alerta `movimento_sem_aluguel` (a API também não a conta como parada para a trava só
 * relé e, nas cercas, ela só pode baixar o limite de zona). Mesmo valor de MIN_GPS_SATELLITES em services/api/src/modules/iot/mqtt-contract.ts
 * (copiado, não importado entre pacotes; contrato: packages/contracts/mqtt.md).
 */
export const MIN_GPS_SATELLITES = 5;

export type DeviceEventType = 'queda' | 'violacao' | 'bateria_critica' | 'movimento_sem_aluguel';

export interface TelemetryMessage {
  lat: number;
  lng: number;
  velocidade_kmh: number;
  bateria_pct: number;
  travada: boolean;
  ignicao: boolean;
  sinal: number;
  timestamp: string;
  /** `false` = `bateria_pct` é 0 por falta de leitura (teto de 5 min da ponte), não bateria vazia. Ausente = `true`. */
  bateria_conhecida?: boolean;
  /** Satélites do fix (`attributes.sat` do Traccar). Ausente = desconhecido. */
  satelites?: number;
}

export interface DeviceEventMessage {
  tipo: DeviceEventType;
  timestamp: string;
}

export interface ReportedState {
  travada?: boolean;
  limite_kmh?: number;
  modo_roubada?: boolean;
  firmware?: string;
  velocidade_kmh?: number;
  /** Rastreamento GPS desligado com a ignição desligada (modo de economia do J16), do byte de status do heartbeat. */
  gps_economia?: boolean;
}

export interface DesiredDelta {
  travada?: boolean;
  limite_kmh?: number;
  modo_roubada?: boolean;
}

const inRange = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;

/** Espelha `telemetria.schema.json` (a API descarta o que não passar, com log `telemetry_invalid`). */
export function isValidTelemetry(t: TelemetryMessage): boolean {
  return (
    inRange(t.lat, -90, 90) &&
    inRange(t.lng, -180, 180) &&
    inRange(t.velocidade_kmh, 0, 200) &&
    inRange(t.bateria_pct, 0, 100) &&
    typeof t.travada === 'boolean' &&
    typeof t.ignicao === 'boolean' &&
    Number.isInteger(t.sinal) &&
    inRange(t.sinal, 0, 5) &&
    !Number.isNaN(Date.parse(t.timestamp)) &&
    (t.bateria_conhecida === undefined || typeof t.bateria_conhecida === 'boolean') &&
    (t.satelites === undefined || (Number.isInteger(t.satelites) && inRange(t.satelites, 0, 255)))
  );
}

export function thingOf(topic: string): string | null {
  const p = topic.split('/');
  if (p[0] === 'motos' && p.length === 3) return p[1] || null;
  if (p[0] === '$aws' && p[1] === 'things' && p.length >= 4) return p[2] || null;
  return null;
}
