import jestOpenAPI from 'jest-openapi';
import { loadSpecAs30 } from '../test/contract/openapi-30';
import { ProblemException } from './common/problem';
import { toProblem } from './common/problem.filter';
import { toAlert } from './modules/alerts/alerts.service';
import { toVehicleCommand } from './modules/commands/commands.mapper';
import { toConsents, toCustomer } from './modules/customers/customers.mapper';
import { toFieldTask, toInspection } from './modules/field-tasks/field-tasks.service';
import { toPayment } from './modules/payments/payments.mapper';
import { toCoupon, toFee, toPlan } from './modules/pricing/pricing-admin.service';
import { toDeposit, toRental, toRentalEvent } from './modules/rentals/rentals.mapper';
import { toReservation } from './modules/reservations/reservations.service';
import { toVehicle, toVehicleSummary } from './modules/vehicles/vehicles.mapper';
import { toGeoZone } from './modules/zones/zones.service';

jestOpenAPI(loadSpecAs30() as any);

const now = new Date();
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const vehicle: any = {
  id: U(1), code: 'VLT-0001', qrCode: 'volti://v/VLT-0001', model: 'Volti S1', thingName: 'moto-0001', status: 'free', statusBeforeOffline: null,
  lat: -23.56, lng: -46.69, batteryPct: 80, speedLimitKmh: 32, speedKmh: 0, online: true, locked: true, ignition: false, signal: 4, stolenMode: false,
  firmwareVersion: '1.0.0', lastSeenAt: now, batterySerial: 'BAT-1', createdAt: now, updatedAt: now, tracker: { id: U(2) },
};
const rental: any = {
  id: U(3), customerId: U(4), vehicleId: U(1), vehicle: { code: 'VLT-0001' }, planCode: 'minute', coverage: 'basic', status: 'active',
  startedAt: new Date(now.getTime() - 600_000), pausedAt: null, pausedSecondsAcc: 0, endRequestedAt: null, endedAt: null,
  priceSnapshot: { planCode: 'minute', unit: 'minute', unlockFeeCents: 300, unitPriceCents: 79, pausePerMinuteCents: 20, insurancePremiumCents: 200, coverage: 'basic', coupon: { code: 'VOLTI20', discountType: 'percent', percentOff: 20 } },
  costCents: 0, breakdown: null, couponCode: 'VOLTI20', depositId: U(5), insurancePolicyId: U(6), paymentId: null, endZoneId: null, returnPhotoObjectKey: null,
  forceEndReason: null, forcedEndById: null, rating: null, speedLimitKmh: 20, createdAt: now, updatedAt: now,
};
const deposit: any = { id: U(5), rentalId: U(3), customerId: U(4), method: 'pix', status: 'awaiting_pix', amountCents: 5000, capturedCents: null, pix: { chargeId: 'c', qrCodeBase64: 'iVBOR', copyPaste: '0002', expiresAt: now.toISOString() }, createdAt: now, updatedAt: now };

describe('Mapeadores × schemas do contrato', () => {
  it('Vehicle (staff e cliente) e VehicleSummary', () => {
    expect(toVehicle(vehicle, { staff: true, currentRentalId: U(3) })).toSatisfySchemaInApiSpec('Vehicle');
    expect(toVehicle(vehicle, { staff: false })).toSatisfySchemaInApiSpec('Vehicle');
    expect(toVehicleSummary(vehicle, 123.4)).toSatisfySchemaInApiSpec('VehicleSummary');
  });

  it('Rental (em andamento e encerrado), RentalEvent, Deposit e RentalStartResult', () => {
    const active = toRental(rental);
    expect(active).toSatisfySchemaInApiSpec('Rental');
    expect(active.costCents).toBe(872 + 200);
    const ended = toRental({ ...rental, status: 'ended', endedAt: now, endRequestedAt: now, costCents: 1072, breakdown: active.breakdown, paymentId: U(9) });
    expect(ended).toSatisfySchemaInApiSpec('Rental');
    expect(toRentalEvent({ id: U(7), rentalId: U(3), type: 'paused', at: now, actorType: 'customer', actorId: U(4), message: null, data: null } as any)).toSatisfySchemaInApiSpec('RentalEvent');
    expect(toDeposit(deposit)).toSatisfySchemaInApiSpec('Deposit');
    expect({ outcome: 'awaiting_deposit', deposit: toDeposit(deposit) }).toSatisfySchemaInApiSpec('RentalStartResult');
    expect({ outcome: 'started', rental: active, deposit: toDeposit({ ...deposit, method: 'card', status: 'held', pix: null }) }).toSatisfySchemaInApiSpec('RentalStartResult');
  });

  it('Reservation, VehicleCommand, GeoZone', () => {
    expect(toReservation({ id: U(8), customerId: U(4), vehicleId: U(1), status: 'active', depositId: null, expiresAt: now, endedAt: null, createdAt: now, updatedAt: now, vehicle } as any)).toSatisfySchemaInApiSpec('Reservation');
    expect(
      toVehicleCommand({ id: U(10), vehicleId: U(1), type: 'speed_limit', status: 'pending', statusReason: 'offline', reason: 'Zona escolar', requestedById: U(11), requestedByType: 'staff', requestedByName: null, payload: { speedLimitKmh: 20 }, confirmedAt: null, createdAt: now, updatedAt: now } as any),
    ).toSatisfySchemaInApiSpec('VehicleCommand');
    expect(
      toGeoZone({ id: U(12), name: 'Ciclovia', type: 'reduced_speed', speedLimitKmh: 20, geometry: { type: 'Polygon', coordinates: [[[-46.69, -23.56], [-46.68, -23.56], [-46.68, -23.55], [-46.69, -23.56]]] }, active: true, deletedAt: null, createdAt: now, updatedAt: now } as any),
    ).toSatisfySchemaInApiSpec('GeoZone');
  });

  it('Customer (CPF mascarado), Consents, Payment', () => {
    const c: any = {
      id: U(4), email: 'c@example.com', name: 'Cliente', phone: '+5511999990000', cpf: '12345678901', birthDate: new Date('1990-01-01'), kycStatus: 'approved', status: 'active',
      delinquent: false, blockedReason: null, blockedAt: null, locationConsent: true, emergencyContactName: null, emergencyContactPhone: null, createdAt: now,
      termsVersion: '2026-10', termsAccepted: true, termsAcceptedAt: now, locationConsentUpdatedAt: now, marketingConsent: false, consentsUpdatedAt: now,
    };
    const masked = toCustomer(c, { fullCpf: false, stats: { rentalsCount: 1, totalSpentCents: 1290, openDisputes: 0 } });
    expect(masked.cpf).toBe('***.456.789-**');
    expect(masked).toSatisfySchemaInApiSpec('Customer');
    expect(toConsents(c)).toSatisfySchemaInApiSpec('Consents');
    expect(
      toPayment({ id: U(9), customerId: U(4), rentalId: U(3), depositId: U(5), subscriptionId: null, kind: 'rental', method: 'card', status: 'paid', amountCents: 1290, refundedCents: 0, cardLast4: '4242', failureReason: null, providerPaymentId: 'x', receiptUrl: null, createdAt: now, updatedAt: now } as any),
    ).toSatisfySchemaInApiSpec('Payment');
  });

  it('PricingPlan, Coupon, Fee', () => {
    expect(toPlan({ id: U(13), code: 'minute', name: 'Por minuto', description: null, unit: 'minute', unlockFeeCents: 300, unitPriceCents: 79, pausePerMinuteCents: 20, recurring: false, active: true, createdAt: now, updatedAt: now } as any)).toSatisfySchemaInApiSpec('PricingPlan');
    expect(toCoupon({ id: U(14), code: 'VOLTI20', description: null, discountType: 'percent', percentOff: 20, amountOffCents: null, planCodes: [], validFrom: null, validUntil: null, maxRedemptions: null, maxRedemptionsPerCustomer: 3, redemptions: 0, active: true, createdAt: now, updatedAt: now } as any)).toSatisfySchemaInApiSpec('Coupon');
    expect(toFee({ id: U(15), code: 'deposit', name: 'Caução', description: null, amountCents: 5000, active: true, system: true, createdAt: now, updatedAt: now } as any)).toSatisfySchemaInApiSpec('Fee');
  });

  it('Alert, FieldTask, Inspection', () => {
    expect(toAlert({ id: U(16), type: 'speed_limiter_noncompliant', priority: 'high', status: 'open', vehicleId: U(1), rentalId: null, message: 'x', lat: -23.5, lng: -46.6, assigneeId: null, resolution: null, createdAt: now, assignedAt: null, resolvedAt: null, vehicle: { code: 'VLT-0001' } } as any)).toSatisfySchemaInApiSpec('Alert');
    expect(
      toFieldTask({ id: U(17), type: 'inspection', status: 'assigned', priority: 'high', vehicleId: U(1), targetLat: null, targetLng: null, assigneeId: U(11), notes: null, dueAt: now, maintenanceTaskId: null, createdById: U(11), completionNotes: null, startedAt: null, completedAt: null, createdAt: now, updatedAt: now, vehicle: { code: 'VLT-0001', lat: -23.5, lng: -46.6, batteryPct: 50 }, assignee: { name: 'Campo' } } as any),
    ).toSatisfySchemaInApiSpec('FieldTask');
    const ok = { ok: true };
    expect(
      toInspection({ id: U(18), fieldTaskId: U(17), vehicleId: U(1), inspectorId: U(11), checklist: { brakes: ok, tires: ok, lights: ok, bell: ok, speedLimiter: { ok: false, configuredMaxKmh: 45 } }, photoObjectKeys: ['k'], notes: null, passed: false, maintenanceTaskId: U(19), alertId: U(16), idempotencyKey: null, recordedAt: now, createdAt: now } as any),
    ).toSatisfySchemaInApiSpec('Inspection');
  });

  it('Problem (RFC 7807)', () => {
    const body = toProblem(new ProblemException(422, 'rental-outside-return-zone', 'Estacione numa zona de devolução.'));
    expect({ ...body, instance: '/rentals/x/end', traceId: 't' }).toSatisfySchemaInApiSpec('Problem');
    expect(body.type).toBe('https://api.volti.com.br/problems/rental-outside-return-zone');
    // Controle negativo: o validador recusa dados fora do schema.
    expect({ ...toRental(rental), status: 'unknown' }).not.toSatisfySchemaInApiSpec('Rental');
    expect({ ...toVehicleCommand({ id: U(1), vehicleId: U(1), type: 'speed_limit', status: 'pending', statusReason: null, reason: 'x', requestedById: null, requestedByType: 'staff', requestedByName: null, payload: { speedLimitKmh: 33 }, confirmedAt: null, createdAt: now, updatedAt: now } as any) }).not.toSatisfySchemaInApiSpec('VehicleCommand');
  });
});
