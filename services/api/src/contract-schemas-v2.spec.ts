import jestOpenAPI from 'jest-openapi';
import { loadSpecAs30 } from '../test/contract/openapi-30';
import { toBattery } from './modules/batteries/batteries.mapper';
import { toSwapStation, toVehicleModel } from './modules/catalog/catalog.service';
import { toCustomer } from './modules/customers/customers.mapper';
import { toBatterySwap, toFieldTask } from './modules/field-tasks/field-tasks.service';
import { toMaintenance } from './modules/field-tasks/maintenance.controller';
import { computeServiceInfo, publicServiceInfo } from './modules/maintenance/service-due';
import { toSubscription } from './modules/payments/payments.mapper';
import { toMessage } from './modules/support/support.mapper';
import { toVehicle, toVehicleSummary } from './modules/vehicles/vehicles.mapper';

jestOpenAPI(loadSpecAs30() as any);

/** Contrato v2: mapeadores novos/estendidos × schemas do `openapi.yaml`. */
const now = new Date();
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const model = { id: U(30), name: 'Volti Cargo', slug: 'cargo', categoryLabel: 'Com baú · entregas', description: null, photoObjectKey: 'catalog/cargo.png', pricePerMinuteCents: 99, unlockFeeCents: null, serviceIntervalKm: 800, serviceIntervalHours: 80, active: true, sortOrder: 3, createdAt: now, updatedAt: now };
const battery = { id: U(31), serial: 'BT-190577', chargePct: 12, vehicleId: U(1), cycleCount: 412, status: 'in_vehicle', holderId: null, stationId: null, createdAt: now, updatedAt: now };
const vehicle: any = {
  id: U(1), code: 'VLT-0001', qrCode: 'volti://v/VLT-0001', model: 'Volti Cargo', thingName: 'moto-0001', status: 'free', statusBeforeOffline: null, lat: -23.56, lng: -46.69,
  batteryPct: 80, speedLimitKmh: 32, speedKmh: 0, online: true, locked: true, ignition: false, signal: 4, stolenMode: false, firmwareVersion: '1.0.0', lastSeenAt: now,
  batterySerial: 'BT-190577', createdAt: now, updatedAt: now, tracker: { id: U(2) }, vehicleModelId: U(30), vehicleModel: model, addressLabel: 'R. Teodoro Sampaio, 1020 · Pinheiros, São Paulo',
  addressLat: -23.56, addressLng: -46.69, addressUpdatedAt: now, odometerKm: 1210.44, usageHours: 50.2, lastServiceAt: now, lastServiceOdometerKm: 400, lastServiceUsageHours: 10,
};

describe('Mapeadores v2 × schemas do contrato', () => {
  it('Vehicle (staff e cliente) com catálogo, endereço, revisão e bateria; VehicleSummary', () => {
    const staff = toVehicle(vehicle, { staff: true, battery: battery as any, assignedSubscriptionId: U(40) });
    expect(staff).toSatisfySchemaInApiSpec('Vehicle');
    expect(staff).toMatchObject({ categoryLabel: 'Com baú · entregas', pricePerMinuteCents: 99, service: { status: 'overdue', serviceIntervalKm: 800 }, battery: { serial: 'BT-190577', cycleCount: 412 } });
    const customer = toVehicle(vehicle, { staff: false });
    expect(customer).toSatisfySchemaInApiSpec('Vehicle');
    expect(customer).not.toHaveProperty('service');
    expect(customer.address).toContain('Pinheiros');
    // Fix round 1 (I5): moto em uso por outro cliente — posição e endereço ocultos.
    const hidden = toVehicle({ ...vehicle, status: 'rented' }, { staff: false, hideLocation: true });
    expect(hidden).toMatchObject({ lat: 0, lng: 0, locationHidden: true });
    expect(hidden.address).toBeUndefined();
    expect(hidden).toSatisfySchemaInApiSpec('Vehicle');
    expect(toVehicleSummary(vehicle, 12)).toSatisfySchemaInApiSpec('VehicleSummary');
    expect(toVehicleSummary({ ...vehicle, vehicleModel: undefined, categoryLabel: 'Urbana', pricePerMinuteCents: 79 })).toMatchObject({ categoryLabel: 'Urbana', pricePerMinuteCents: 79 });
  });

  it('VehicleModel, SwapStation, Battery, VehicleServiceInfo', () => {
    expect(toVehicleModel(model as any, { staff: false, photoUrl: 'http://localhost:9000/catalogo/catalog/cargo.png?sig=1' })).toSatisfySchemaInApiSpec('VehicleModel');
    expect(toVehicleModel(model as any, { staff: true })).toSatisfySchemaInApiSpec('VehicleModel');
    expect(
      toSwapStation({ id: U(32), name: 'Estação Largo da Batata', address: 'R. Teodoro Sampaio, 2000 · Pinheiros', lat: -23.56, lng: -46.69, availableBatteries: 8, totalSlots: 12, openingHours: 'Todos os dias, 24 h', open24h: true, active: true, stationCode: 'vst1.x.y', thingName: null, createdAt: now, updatedAt: now }, 321.6),
    ).toSatisfySchemaInApiSpec('SwapStation');
    expect(toBattery(battery as any, 'VLT-0001')).toSatisfySchemaInApiSpec('Battery');
    expect(publicServiceInfo(computeServiceInfo({ odometerKm: 10, usageHours: 1, lastServiceOdometerKm: 0, lastServiceUsageHours: 0, intervalKm: 1000, intervalHours: 100 }))).toSatisfySchemaInApiSpec('VehicleServiceInfo');
  });

  it('Customer com chave Pix (completa e mascarada) e plano ativo', () => {
    const c: any = {
      id: U(4), email: 'c@example.com', name: 'Cliente', phone: null, cpf: '52998224725', birthDate: null, kycStatus: 'approved', status: 'active', delinquent: false,
      blockedReason: null, blockedAt: null, locationConsent: true, emergencyContactName: null, emergencyContactPhone: null, createdAt: now, pixRefundKeyType: 'email', pixRefundKey: 'cliente@volti.dev',
    };
    const full = toCustomer(c, { fullCpf: true, activeSubscription: { id: U(40), planCode: 'weekly' } });
    expect(full).toSatisfySchemaInApiSpec('Customer');
    expect(full).toMatchObject({ pixRefundKey: 'cliente@volti.dev', activePlanCode: 'weekly' });
    const masked = toCustomer(c, { fullCpf: false });
    expect(masked.pixRefundKey).toBe('c***@volti.dev');
    expect(masked).toSatisfySchemaInApiSpec('Customer');
  });

  it('Subscription com próxima cobrança, pausa, cartão e moto fixa', () => {
    const sub: any = {
      id: U(40), customerId: U(4), planCode: 'weekly', status: 'active', cardId: U(41), priceCents: 24900, currentPeriodStart: now, currentPeriodEnd: new Date(now.getTime() + 7 * 86400000),
      cancelAtPeriodEnd: false, canceledAt: null, pausedAt: null, pauseEndsAt: null, pausesUsedInPeriod: 0, assignedVehicleId: U(1), createdAt: now, updatedAt: now,
    };
    const out = toSubscription(sub, { card: { brand: 'visa', last4: '4242' }, lastPayment: { status: 'paid', createdAt: now }, assignedVehicle: toVehicleSummary(vehicle) });
    expect(out).toSatisfySchemaInApiSpec('Subscription');
    expect(out).toMatchObject({ nextChargeCents: 24900, maxPauseDays: 3, pausesRemainingInPeriod: 1, cardLast4: '4242' });
    const paused = toSubscription({ ...sub, status: 'paused', pausedAt: now, pauseEndsAt: now, pausesUsedInPeriod: 1 });
    expect(paused).toSatisfySchemaInApiSpec('Subscription');
    expect(paused).not.toHaveProperty('nextChargeAt');
  });

  it('SupportMessage com estado, FieldTask com endereço/bateria, BatterySwap e MaintenanceTask do cliente', () => {
    const msg: any = { id: U(50), conversationId: U(51), authorType: 'staff', authorId: U(11), authorName: 'Ana', body: 'Oi', attachmentObjectKeys: [], deliveredAt: now, readAt: null, createdAt: now };
    expect(toMessage(msg)).toMatchObject({ status: 'delivered' });
    expect(toMessage(msg)).toSatisfySchemaInApiSpec('SupportMessage');
    expect(toMessage({ ...msg, readAt: now }).status).toBe('read');
    expect(toMessage({ ...msg, deliveredAt: null }).status).toBe('sent');
    expect(
      toFieldTask({
        id: U(17), type: 'battery_swap', status: 'assigned', priority: 'high', vehicleId: U(1), targetLat: -23.55, targetLng: -46.68, assigneeId: U(11), notes: null, dueAt: null,
        maintenanceTaskId: null, createdById: U(11), completionNotes: null, startedAt: null, completedAt: null, createdAt: now, updatedAt: now,
        vehicle: { code: 'VLT-0001', lat: -23.5, lng: -46.6, batteryPct: 12, status: 'free', addressLabel: 'R. Fradique Coutinho, 410 · Pinheiros, São Paulo', batterySerial: 'BT-190577' },
        battery: { serial: 'BT-190577', cycleCount: 412 }, targetAddress: 'R. Harmonia, 300 · Vila Madalena, São Paulo', assignee: { name: 'Campo' },
      } as any),
    ).toSatisfySchemaInApiSpec('FieldTask');
    expect(
      toBatterySwap({ id: U(52), fieldTaskId: U(17), vehicleId: U(1), operatorId: U(11), removedBatterySerial: 'BT-190577', installedBatterySerial: 'BT-200001', installedBatteryPct: 100, removedBatteryPct: 12, removedBatteryCycleCount: 412, installedBatteryCycleCount: 88, idempotencyKey: null, recordedAt: now, createdAt: now } as any),
    ).toSatisfySchemaInApiSpec('BatterySwap');
    expect(
      toMaintenance({ id: U(53), vehicleId: U(1), kind: 'preventive', title: 'Manutenção agendada pelo cliente', description: 'Freio', status: 'scheduled', scheduledFor: now, completedAt: null, notes: null, createdById: null, source: 'customer', customerId: U(4), customerName: 'Cliente', createdAt: now, updatedAt: now, vehicle: { code: 'VLT-0001' } } as any),
    ).toSatisfySchemaInApiSpec('MaintenanceTask');
  });
});
