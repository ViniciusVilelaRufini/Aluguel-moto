import type { components } from '@volti/contracts';

export type Schemas = components['schemas'];
export type S<K extends keyof Schemas> = Schemas[K];

export type VehicleStatus = S<'VehicleStatus'>;
export type ZoneType = S<'ZoneType'>;
export type StaffGroup = S<'StaffGroup'>;
export type CommandType = S<'CommandType'>;
export type CommandStatus = S<'CommandStatus'>;
export type CommandStatusReason = S<'CommandStatusReason'>;
export type AlertPriority = S<'AlertPriority'>;

/** Payloads do WebSocket (packages/contracts/realtime.md). */
export interface RealtimeEvents {
  'vehicle.position': { vehicleId: string; lat: number; lng: number; speedKmh: number; batteryPct: number; status: VehicleStatus; speedLimitKmh: number; ts: string };
  'vehicle.status': { vehicleId: string; status: VehicleStatus; ts: string };
  'command.updated': { commandId: string; vehicleId: string; type: CommandType; status: CommandStatus; reason?: CommandStatusReason };
  'alert.created': { alertId: string; vehicleId?: string; rentalId?: string; type: S<'AlertType'>; priority: AlertPriority; createdAt: string };
}

export const MAX_SPEED_KMH = 32;
export const MAX_REDUCED_SPEED_KMH = 20;
/** Piso de zona de velocidade reduzida (a API responde 422 abaixo disso). */
export const MIN_REDUCED_SPEED_KMH = 6;
export const SAFE_LOCK_SPEED_KMH = 3;
