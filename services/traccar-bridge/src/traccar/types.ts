/** Formatos da API do Traccar 6 (REST `/api/devices` e mensagens do WebSocket `/api/socket`). Só os campos usados. */
export interface TraccarDevice {
  id: number;
  name: string;
  /** IMEI no GT06. */
  uniqueId: string;
  status?: 'online' | 'offline' | 'unknown';
  model?: string | null;
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  protocol?: string;
  serverTime: string;
  deviceTime: string;
  /** Hora da medição (GPS), UTC. */
  fixTime: string;
  /** Posição repetida da última conhecida (heartbeat/status do GT06), não uma medição nova. */
  outdated: boolean;
  valid: boolean;
  latitude: number;
  longitude: number;
  /** Nós. */
  speed: number;
  course?: number;
  attributes: { blocked?: boolean; ignition?: boolean; rssi?: number; power?: number; [k: string]: unknown };
}

export interface TraccarEvent {
  id: number;
  type: string;
  eventTime: string;
  deviceId: number;
  positionId?: number;
  attributes: { alarm?: string; [k: string]: unknown };
}

export interface TraccarSocketMessage {
  devices?: TraccarDevice[];
  positions?: TraccarPosition[];
  events?: TraccarEvent[];
}
