// services/api/src/ports/iot-gateway.port.ts
export const IOT_GATEWAY = Symbol('IOT_GATEWAY');

export interface CommandRequest {
  commandId: string;   // VehicleCommand.id, criado pelo módulo commands antes da chamada
  thingName: string;
}

export interface CommandOutcome {
  commandId: string;
  status: 'pending' | 'in_progress' | 'confirmed' | 'failed';
  reason?: 'offline' | 'timeout' | 'did_not_stop' | 'invalid_limit';
}

export interface VehicleLiveState {
  thingName: string;
  lat: number;
  lng: number;
  speedKmh: number;
  batteryPct: number;
  locked: boolean;
  ignition: boolean;
  signal: number;          // 0–5
  speedLimitKmh: number;
  stolenMode: boolean;
  online: boolean;
  lastSeenAt: string;      // ISO 8601
}

export interface IotGateway {
  /** Bloqueio seguro: se speedKmh > 3, rampa de limite até parar e só então trava. */
  lock(req: CommandRequest): Promise<CommandOutcome>;
  unlock(req: CommandRequest): Promise<CommandOutcome>;
  /** Lança InvalidSpeedLimitError se kmh < 0 ou kmh > 32. */
  setSpeedLimit(req: CommandRequest, kmh: number): Promise<CommandOutcome>;
  setStolenMode(req: CommandRequest, on: boolean): Promise<CommandOutcome>;
  horn(req: CommandRequest): Promise<CommandOutcome>;
  getLiveState(thingName: string): Promise<VehicleLiveState | null>;
  /**
   * Velocidade conhecida e fresca (a mesma que o bloqueio seguro usa), ou `null` = desconhecida/velha → tratar como em
   * movimento. Opcional: gateway sem a informação conta como desconhecida.
   */
  knownSpeedKmh?(thingName: string): Promise<number | null>;
}

export class InvalidSpeedLimitError extends Error {}
