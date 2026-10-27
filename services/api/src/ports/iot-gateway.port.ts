// services/api/src/ports/iot-gateway.port.ts
export const IOT_GATEWAY = Symbol('IOT_GATEWAY');

/**
 * Autoridade de quem pede o comando (derivada pelo `CommandsService` do ator): `customer` (pool de clientes), `field` (staff sem
 * admin/operacao, ex.: só `campo`), `staff` (admin/operacao), `system` (cercas, encerramento, safe-lock automático).
 */
export type CommandAuthority = 'customer' | 'field' | 'staff' | 'system';

/** Quem travou a moto. `staff`/`system` só são desfeitos por `staff` (admin/operacao). */
export type LockOrigin = 'customer' | 'staff' | 'system';

export interface CommandRequest {
  commandId: string;   // VehicleCommand.id, criado pelo módulo commands antes da chamada
  thingName: string;
  /** Ausente = a interpretação mais segura: `unlock` como `customer` (sujeito às travas de equipe/sistema). */
  authority?: CommandAuthority;
  /**
   * Só `lock`: origem a gravar. `null` = trava comum (encerramento, rollback, campo), que não grava origem e não rebaixa uma
   * origem `staff`/`system` já gravada. Ausente = `system` (a mais restritiva).
   */
  lockOrigin?: LockOrigin | null;
}

export interface CommandOutcome {
  commandId: string;
  status: 'pending' | 'in_progress' | 'confirmed' | 'failed';
  /** `locked_by_staff`: unlock de cliente/campo recusado (trava de equipe/sistema, hold em 0 ou modo roubada). */
  reason?: 'offline' | 'timeout' | 'did_not_stop' | 'invalid_limit' | 'locked_by_staff' | 'unsupported_by_tracker';
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
  /**
   * Trava que cliente/campo não desfaz: origem `staff`/`system`, limite segurado em 0 (hold) ou modo roubada no estado ao vivo.
   * Opcional (o stub sem estado de trava não implementa). Erro de leitura = `true` (falha fechada).
   */
  lockedByStaff?(thingName: string): Promise<boolean>;
}

export class InvalidSpeedLimitError extends Error {}
