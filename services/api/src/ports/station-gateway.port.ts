// services/api/src/ports/station-gateway.port.ts
/**
 * Porta da estação de troca de bateria (armário com vagas). Implementações por `IOT_MODE`:
 * `stub` (avança sozinha, para e2e e emulador), `local` (Mosquitto, simulador `services/station-sim`) e `aws` (IoT Core).
 * Contrato MQTT: `packages/contracts/mqtt.md`, seção "Estações de troca".
 */
export const STATION_GATEWAY = Symbol('STATION_GATEWAY');

export type StationCommandAction = 'open_slot' | 'release_battery' | 'abort_swap';

export interface StationCommand {
  commandId: string;
  swapId: string;
  action: StationCommandAction;
  /** `open_slot`: série da bateria que a moto do cliente leva (a estação pode conferir). */
  expectedSerial?: string;
  /** `release_battery`: bateria carregada sugerida pelo estoque da API (a estação pode liberar outra). */
  serialHint?: string;
  /** `abort_swap`: vaga a fechar (se já aberta). A estação confirma com `slot_closed`. */
  slotNumber?: number;
}

export type StationEventType = 'slot_opened' | 'battery_returned' | 'slot_closed' | 'battery_released';

export interface StationEvent {
  type: StationEventType;
  swapId: string;
  /** `slot_opened`. */
  slotNumber?: number;
  /** `battery_returned` (devolvida) e `battery_released` (liberada). */
  serial?: string;
  /** `battery_returned`: carga lida da bateria devolvida. */
  pct?: number;
  ts: string;
}

export type StationEventHandler = (stationThing: string, event: StationEvent) => Promise<void>;

export interface StationGateway {
  send(stationThing: string, command: StationCommand): Promise<void>;
  start(handler: StationEventHandler): Promise<void>;
  stop(): Promise<void>;
}

/** Nome da "thing" da estação no IoT Core (um certificado X.509 por estação, como os rastreadores). */
export const stationThingName = (stationId: string) => `station-${stationId}`;
export const stationIdFromThing = (thing: string): string | null => {
  const m = /^station-([0-9a-f-]{36})$/i.exec(thing);
  return m ? m[1].toLowerCase() : null;
};
