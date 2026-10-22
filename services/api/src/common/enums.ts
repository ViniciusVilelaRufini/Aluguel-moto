// services/api/src/common/enums.ts (e espelhados no openapi.yaml)
export type VehicleStatus = 'free' | 'rented' | 'reserved' | 'paused' | 'blocked' | 'maintenance' | 'offline' | 'awaiting_pickup';
export type ZoneType = 'operation' | 'return' | 'forbidden' | 'reduced_speed';
export type StaffGroup = 'admin' | 'operacao' | 'financeiro' | 'suporte' | 'campo';
export type RentalStatus = 'active' | 'paused' | 'ending' | 'ended' | 'force_ended';
export type CommandType = 'lock' | 'unlock' | 'horn' | 'speed_limit' | 'stolen_mode';
export type CommandStatus = 'pending' | 'in_progress' | 'confirmed' | 'failed';
export type PlanCode = 'minute' | 'hour' | 'day' | 'weekly' | 'monthly';
export type InsuranceCoverage = 'basic' | 'full';
export type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected';
export const MAX_SPEED_KMH = 32;
export const SAFE_LOCK_SPEED_KMH = 3;

// Listas de valores (validação com class-validator).
export const VEHICLE_STATUSES: VehicleStatus[] = ['free', 'rented', 'reserved', 'paused', 'blocked', 'maintenance', 'offline', 'awaiting_pickup'];
export const ZONE_TYPES: ZoneType[] = ['operation', 'return', 'forbidden', 'reduced_speed'];
export const STAFF_GROUPS: StaffGroup[] = ['admin', 'operacao', 'financeiro', 'suporte', 'campo'];
export const RENTAL_STATUSES: RentalStatus[] = ['active', 'paused', 'ending', 'ended', 'force_ended'];
export const COMMAND_TYPES: CommandType[] = ['lock', 'unlock', 'horn', 'speed_limit', 'stolen_mode'];
export const PLAN_CODES: PlanCode[] = ['minute', 'hour', 'day', 'weekly', 'monthly'];
export const INSURANCE_COVERAGES: InsuranceCoverage[] = ['basic', 'full'];
export const KYC_STATUSES: KycStatus[] = ['not_started', 'pending', 'approved', 'rejected'];
/** Status de aluguel "em andamento" (sala `rental:{id}`, decisão #18). */
export const OPEN_RENTAL_STATUSES: RentalStatus[] = ['active', 'paused', 'ending'];
