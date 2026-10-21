// Verificação de tipos do cliente gerado: garante que schema.d.ts compila e que os nomes
// usados pelo painel (paths, components, operations) existem com os enums do plano mestre.
import type { components, operations, paths } from '../generated/ts/schema';

type S = components['schemas'];

const status: S['VehicleStatus'][] = ['free', 'rented', 'reserved', 'paused', 'blocked', 'maintenance', 'offline'];
const zone: S['ZoneType'][] = ['operation', 'return', 'forbidden', 'reduced_speed'];
const groups: S['StaffGroup'][] = ['admin', 'operacao', 'financeiro', 'suporte', 'campo'];
const rental: S['RentalStatus'][] = ['active', 'paused', 'ending', 'ended', 'force_ended'];
const cmd: S['CommandType'][] = ['lock', 'unlock', 'horn', 'speed_limit', 'stolen_mode'];
const cmdStatus: S['CommandStatus'][] = ['pending', 'in_progress', 'confirmed', 'failed'];
const plan: S['PlanCode'][] = ['minute', 'hour', 'day', 'weekly', 'monthly'];
const coverage: S['InsuranceCoverage'][] = ['basic', 'full'];
const kyc: S['KycStatus'][] = ['not_started', 'pending', 'approved', 'rejected'];

const command: S['SendCommandRequest'] = { type: 'speed_limit', reason: 'Teste de limite', speedLimitKmh: 20 };
const start: S['StartRentalRequest'] = { vehicleId: 'x', planCode: 'minute', coverage: 'basic', depositMethod: 'card' };

type NearbyQuery = NonNullable<operations['listNearbyVehicles']['parameters']['query']>;
const nearby: NearbyQuery = { lat: -23.56, lng: -46.69 };
type NearbyOk = paths['/vehicles/nearby']['get']['responses'][200]['content']['application/json'];
const page: NearbyOk = { items: [] };

export const checks = { status, zone, groups, rental, cmd, cmdStatus, plan, coverage, kyc, command, start, nearby, page };
