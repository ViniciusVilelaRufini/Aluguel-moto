import type { CommandStatus, CommandType, RentalStatus, VehicleStatus, ZoneType } from './enums';

/** Eventos internos do plano mestre (@nestjs/event-emitter). Emissores: Task 4 (iot.*, geofence.*), Task 5 (payment.*). */
export const EV = {
  IOT_TELEMETRY: 'iot.telemetry',
  IOT_DEVICE_EVENT: 'iot.device-event',
  IOT_COMMAND_UPDATED: 'iot.command-updated',
  IOT_CONNECTIVITY: 'iot.connectivity',
  GEOFENCE_TRANSITION: 'geofence.transition',
  PAYMENT_UPDATED: 'payment.updated',
  // Eventos próprios da API (Task 3) — alimentam o WebSocket e as Tasks 4/5.
  VEHICLE_STATUS_CHANGED: 'vehicle.status-changed',
  COMMAND_CHANGED: 'command.changed',
  ALERT_CREATED: 'alert.created',
  RENTAL_CHANGED: 'rental.changed',
  ZONE_CHANGED: 'zone.changed',
  RESERVATION_ENDED: 'reservation.ended',
  DEPOSIT_RELEASE_REQUESTED: 'deposit.release-requested',
} as const;

export interface IotTelemetryEvent {
  thingName: string;
  vehicleId: string;
  lat: number;
  lng: number;
  speedKmh: number;
  batteryPct: number;
  locked: boolean;
  ignition: boolean;
  signal: number;
  ts: string;
}

export type DeviceEventType = 'queda' | 'violacao' | 'bateria_critica' | 'movimento_sem_aluguel';
export interface IotDeviceEvent {
  thingName: string;
  vehicleId: string;
  type: DeviceEventType;
  ts: string;
}

export interface IotCommandUpdatedEvent {
  commandId: string;
  status: CommandStatus;
  reason?: 'offline' | 'timeout' | 'did_not_stop' | 'invalid_limit';
}

export interface IotConnectivityEvent {
  thingName: string;
  vehicleId: string;
  online: boolean;
  ts: string;
}

export interface GeofenceTransitionEvent {
  vehicleId: string;
  rentalId?: string;
  zoneId: string;
  zoneType: ZoneType;
  speedLimitKmh?: number;
  transition: 'ENTER' | 'EXIT';
  ts: string;
}

export interface PaymentUpdatedEvent {
  paymentId: string;
  rentalId?: string;
  status: string;
}

export interface VehicleStatusChangedEvent {
  vehicleId: string;
  status: VehicleStatus;
  ts: string;
}

export interface CommandChangedEvent {
  commandId: string;
  vehicleId: string;
  type: CommandType;
  status: CommandStatus;
  reason?: 'offline' | 'timeout' | 'did_not_stop' | 'invalid_limit';
  /** payload do VehicleCommand (rentalId, purpose…), para consumidores internos. */
  payload?: Record<string, unknown>;
}

export interface AlertCreatedEvent {
  alertId: string;
  vehicleId?: string;
  rentalId?: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

export interface RentalChangedEvent {
  rentalId: string;
  customerId: string;
  vehicleId: string;
  status: RentalStatus;
  elapsedSeconds: number;
  costCents: number;
  ts: string;
}

export interface ZoneChangedEvent {
  zoneId: string;
  action: 'created' | 'updated' | 'deleted';
  /** Estado da zona depois da mudança (QA-03: o motor de cercas reavalia as motos dentro com o limite novo). */
  type?: ZoneType;
  speedLimitKmh?: number | null;
  active?: boolean;
}

/** Reserva encerrada sem virar aluguel: a Task 5 libera a caução Pix associada (decisão #16). */
export interface ReservationEndedEvent {
  reservationId: string;
  customerId: string;
  vehicleId: string;
  depositId?: string;
  reason: 'expired' | 'canceled';
}

/** Caução que não virou aluguel (reserva expirada/cancelada, 409 na segunda chamada): a Task 5 libera/estorna (decisão #16). */
export interface DepositReleaseRequestedEvent {
  depositId: string;
  customerId: string;
  reason: 'reservation_expired' | 'reservation_canceled' | 'rental_not_started';
}
