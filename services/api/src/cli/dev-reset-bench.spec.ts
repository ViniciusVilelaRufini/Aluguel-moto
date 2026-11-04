import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { MemoryRedisStore } from '../redis/redis-store';
import { DEPOSIT_CENTS } from '../modules/payments/rental-billing.service';
import { PricingService } from '../modules/pricing/pricing.service';
import { ReportsService } from '../modules/reports/reports.service';
import { RentalsService } from '../modules/rentals/rentals.service';
import { FakePrisma, FKS, MODELS } from './__tests__/fake-prisma';
import {
  assertDevEnvironment,
  CONFIRM_FLAG,
  DEFAULT_DEPOSIT_CENTS,
  maskEmail,
  MODEL_POLICY,
  ORPHAN_SWEEP_DELAY_MS,
  parseResetArgs,
  RESET_STEPS,
  runDevReset,
  type ResetDeps,
  type ResetOptions,
} from './dev-reset-bench';

const DEV_SINGLE_ENV = { NODE_ENV: 'production', VOLTI_ENV: 'dev', PAYMENT_PROVIDER: 'fake', ALLOW_FAKE_PAYMENTS: 'true' };
const OWNER_EMAIL = 'viniciusrufini17@gmail.com';
const OPTS: ResetOptions = { keepCode: 'VLT-0059', customerEmail: OWNER_EMAIL, dryRun: false, confirmed: true, planCode: 'day', coverage: 'basic' };
const OPERATION_ZONE = [{ type: 'operation' }];

/**
 * Mundo de teste: a moto da bancada (VLT-0059, GT06, no galpão, em manutenção por dado de teste) com um aluguel aberto,
 * duas outras motos (uma MQTT, uma GT06) com aluguel encerrado e todos os filhos, mais o que tem que ficar.
 */
function world() {
  const db = new FakePrisma();
  const s = db.seed.bind(db);
  const depot = s('Depot', { name: 'Galpão Pinheiros', address: 'R. A', lat: -23.56, lng: -46.69, openingHours: [] });
  const model = s('VehicleModel', { name: 'Volti S', slug: 'volti-s', categoryLabel: 'Urbana', pricePerMinuteCents: 79 });
  for (const [code, unit, price] of [['minute', 'minute', 79], ['hour', 'hour', 2500], ['day', 'day', 9000]] as const) {
    s('PricingPlan', { code, name: code, unit, unitPriceCents: price, unlockFeeCents: 300 });
  }
  s('InsuranceCoverageConfig', { coverage: 'basic', name: 'Básica', description: 'b', premiumCents: 250 });
  s('Zone', { name: 'Centro', type: 'operation', geometry: {} });
  const station = s('SwapStation', { name: 'Estação 1', address: 'R. B', lat: 0, lng: 0, openingHours: '24h' });
  const coupon = s('Coupon', { code: 'BEMVINDO', discountType: 'percent', percentOff: 10, redemptions: 2 });
  s('Fee', { code: 'battery_swap_fee', name: 'Troca', amountCents: 500 });
  s('MinutePackage', { name: '100 min', minutes: 100, priceCents: 5000 });
  s('StaffUser', { email: 'admin@volti.dev', name: 'Admin', groups: ['admin'] });
  s('RestrictionEntry', { cpf: '00000000000', reason: 'fraude' });
  const owner = s('Customer', {
    cognitoSub: 'sub-owner', email: 'ViniciusRufini17@Gmail.com', kycStatus: 'approved', status: 'active', cpf: '11111111111',
    locationConsent: true, termsAccepted: true, delinquent: true,
  });
  const other = s('Customer', { cognitoSub: 'sub-b', email: 'b@exemplo.com', kycStatus: 'approved', status: 'active', locationConsent: true, termsAccepted: true });
  const card = s('PaymentCard', { customerId: owner.id, providerCardId: 'fake-card-0b0e9a2e-1111-4a0a-9a0a-000000000001', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030, isDefault: true });
  s('PaymentCard', { customerId: other.id, providerCardId: 'fake-card-x', brand: 'visa', last4: '1111', expMonth: 1, expYear: 2031, isDefault: true });
  s('Device', { fcmToken: 'tok', platform: 'android', ownerType: 'customer', ownerId: owner.id });
  s('PaymentProviderRef', { entityType: 'customer', entityId: owner.id, provider: 'fake', providerId: 'fake-cus-1' });
  s('ProviderCustomerDeletion', { customerId: other.id, provider: 'fake', providerCustomerId: 'fake-cus-2', providerCardIds: [] });
  s('CustomerIdentityDeletion', { customerId: other.id, sub: 'sub-x' });
  s('CustomerCoupon', { customerId: owner.id, couponId: coupon.id });

  const bench = s('Vehicle', { code: 'VLT-0059', model: 'Volti S', thingName: 'moto-0059', status: 'maintenance', lat: -23.5612345, lng: -46.6912345, depotId: depot.id, vehicleModelId: model.id, speedLimitKmh: 32, locked: true });
  const mqtt = s('Vehicle', { code: 'VLT-0001', model: 'Volti S', thingName: 'moto-0001', status: 'free' });
  const gt06 = s('Vehicle', { code: 'VLT-0002', model: 'Volti S', thingName: 'moto-0002', status: 'rented' });
  const benchTracker = s('Tracker', { vehicleId: bench.id, thingName: 'moto-0059', imei: '860000000000059', controlMode: 'relay_only', protocol: 'gt06' });
  const mqttTracker = s('Tracker', { vehicleId: mqtt.id, thingName: 'moto-0001', controlMode: 'speed_control', protocol: null });
  const gt06Tracker = s('Tracker', { vehicleId: gt06.id, thingName: 'moto-0002', imei: '860000000000002', controlMode: 'relay_only', protocol: 'gt06' });
  const looseTracker = s('Tracker', { vehicleId: null, thingName: 'moto-9999', controlMode: 'speed_control' });

  const batInMqtt = s('Battery', { serial: 'BAT-1', vehicleId: mqtt.id, status: 'in_vehicle' });
  const batInBench = s('Battery', { serial: 'BAT-59', vehicleId: bench.id, status: 'in_vehicle' });
  const batDepot = s('Battery', { serial: 'BAT-D', depotId: depot.id, status: 'charged' });
  s('BatteryMovement', { batteryId: batInMqtt.id, toStatus: 'in_vehicle', vehicleId: mqtt.id, actorId: owner.id });
  s('BatteryMovement', { batteryId: batDepot.id, toStatus: 'charged', vehicleId: mqtt.id, actorId: owner.id });

  // Aluguel encerrado de outro cliente na moto MQTT, com todos os filhos.
  const ended = s('Rental', { customerId: other.id, vehicleId: mqtt.id, planCode: 'minute', coverage: 'basic', status: 'ended', priceSnapshot: {}, depositId: 'dep-x', costCents: 1500, endedAt: new Date() });
  // Aluguel aberto (teste) do dono na moto da bancada.
  const open = s('Rental', { customerId: owner.id, vehicleId: bench.id, planCode: 'minute', coverage: 'basic', status: 'active', priceSnapshot: {}, depositId: 'dep-y' });
  for (const r of [ended, open]) {
    s('RentalEvent', { rentalId: r.id, type: 'started', actorType: 'customer' });
    s('TrackPoint', { rentalId: r.id, vehicleId: r.vehicleId, lat: 1, lng: 1, recordedAt: new Date(), expiresAt: new Date() });
    s('LocationShare', { rentalId: r.id, token: `tok-${r.id}`, expiresAt: new Date() });
    s('InsurancePolicy', { rentalId: r.id, customerId: r.customerId, coverage: 'basic', premiumCents: 250 });
    const dep = s('Deposit', { rentalId: r.id, customerId: r.customerId, method: 'card', status: 'held', amountCents: 5000 });
    const pay = s('Payment', { customerId: r.customerId, rentalId: r.id, depositId: dep.id, kind: 'rental', method: 'card', status: 'paid', amountCents: 1500 });
    s('PaymentReceipt', { paymentId: pay.id, rentalId: r.id, bucket: 'b', objectKey: 'k' });
    s('Invoice', { paymentId: pay.id, issuer: 'mock', number: '1', status: 'issued', amountCents: 1500 });
    s('PaymentCapture', { paymentId: pay.id, capturedCents: 1500 });
    s('PaymentRefund', { paymentId: pay.id, idempotencyKey: `ref-${pay.id}`, amountCents: 1, prevStatus: 'paid', prevRefundedCents: 0, newStatus: 'partially_refunded', newRefundedCents: 1, status: 'succeeded' });
    s('SettlementProgress', { paymentId: pay.id, plan: 'capture' });
    s('DepositRelease', { depositId: dep.id, reason: 'x' });
    s('Dispute', { customerId: r.customerId, rentalId: r.id, reason: 'x' });
    s('Claim', { customerId: r.customerId, rentalId: r.id, type: 'damage', description: 'x', occurredAt: new Date() });
    s('StationSwap', { stationId: station.id, rentalId: r.id, customerId: r.customerId, vehicleId: r.vehicleId, distanceM: 10, expiresAt: new Date() });
  }
  s('InsuranceRemittance', { policyId: 'pol-x', rentalId: ended.id, insurer: 'mock', amountCents: 250 });
  s('CouponRedemption', { couponId: coupon.id, customerId: other.id, rentalId: ended.id });
  s('RentalStart', { rentalId: 'rs-1', vehicleId: mqtt.id, customerId: other.id, previousStatus: 'free' });
  s('Incident', { rentalId: ended.id, vehicleId: mqtt.id, category: 'other', description: 'x', createdByType: 'customer' });
  s('Incident', { vehicleId: gt06.id, category: 'other', description: 'moto apagada', createdByType: 'staff' });
  const keptIncident = s('Incident', { customerId: owner.id, category: 'app_problem', description: 'sem vínculo', createdByType: 'customer' });
  const conv = s('SupportConversation', { customerId: other.id, rentalId: ended.id, subject: 'cobrança' });
  s('SupportMessage', { conversationId: conv.id, authorType: 'customer', body: 'oi' });
  const keptConv = s('SupportConversation', { customerId: owner.id, rentalId: null, subject: 'dúvida' });
  s('SupportMessage', { conversationId: keptConv.id, authorType: 'customer', body: 'oi' });

  const resv = s('Reservation', { customerId: other.id, vehicleId: gt06.id, status: 'converted', expiresAt: new Date(), depotId: depot.id });
  s('Handover', { type: 'pickup', status: 'accepted', depotId: depot.id, reservationId: resv.id, rentalId: ended.id, vehicleId: gt06.id, operatorId: owner.id, checklist: [], batteryPct: 90 });

  const we1 = s('WalletEntry', { customerId: owner.id, type: 'bonus', amountCents: 1000, balanceAfterCents: 1000, description: 'indicação' });
  s('WalletEntry', { customerId: owner.id, type: 'rental_charge', amountCents: -500, balanceAfterCents: 500, description: 'aluguel', rentalId: ended.id });
  s('TopUp', { customerId: owner.id, status: 'paid', method: 'pix', amountCents: 1000 });
  s('Referral', { referrerId: other.id, refereeId: owner.id, code: 'ABC', referrerRewardCents: 1000, refereeRewardCents: 1000, refereeWalletEntryId: we1.id, status: 'pending' });
  s('Subscription', { customerId: owner.id, planCode: 'monthly', status: 'active', priceCents: 1, currentPeriodStart: new Date(), currentPeriodEnd: new Date(), assignedVehicleId: mqtt.id });
  s('PaymentProviderRef', { entityType: 'subscription', entityId: 'sub-1', provider: 'fake', providerId: 'fake-sub-1' });
  s('ProcessedWebhook', { provider: 'fake', eventId: 'e1', type: 'payment' });

  s('Alert', { type: 'vehicle_offline', priority: 'high', vehicleId: mqtt.id });
  s('Alert', { type: 'tamper', priority: 'high', vehicleId: bench.id, rentalId: open.id });
  s('Alert', { type: 'battery_stock_low', priority: 'low', depotId: depot.id });
  const ft = s('FieldTask', { type: 'battery_swap', priority: 'low', vehicleId: mqtt.id });
  s('Inspection', { fieldTaskId: ft.id, vehicleId: mqtt.id, inspectorId: owner.id, checklist: {}, passed: true, recordedAt: new Date() });
  s('BatterySwap', { fieldTaskId: ft.id, vehicleId: mqtt.id, operatorId: owner.id, removedBatterySerial: 'a', installedBatterySerial: 'b', recordedAt: new Date() });
  s('FieldTask', { type: 'inspection', priority: 'low', vehicleId: bench.id });
  s('MaintenanceTask', { vehicleId: mqtt.id, kind: 'corrective', title: 'freio' });
  const benchMaintenance = s('MaintenanceTask', { vehicleId: bench.id, kind: 'preventive', title: 'revisão' });
  s('VehicleCommand', { vehicleId: mqtt.id, type: 'lock', status: 'confirmed', reason: 'x' });
  const benchCommand = s('VehicleCommand', { vehicleId: bench.id, type: 'unlock', status: 'confirmed', reason: 'bancada' });
  s('IdempotencyRecord', { scope: 'rentals', key: 'k', requestHash: 'h', expiresAt: new Date() });
  const audit = s('AuditLog', { actorType: 'staff', action: 'vehicle.lock', entityType: 'Vehicle', entityId: mqtt.id });

  return {
    db, owner, other, card, bench, mqtt, gt06, coupon, depot,
    kept: { benchTracker, mqttTracker, gt06Tracker, looseTracker, batInBench, batDepot, keptIncident, keptConv, benchMaintenance, benchCommand, audit },
  };
}

function deps(db: FakePrisma, extra: Partial<ResetDeps> = {}) {
  const logs: Array<Record<string, unknown>> = [];
  const redis = new MemoryRedisStore();
  const d: ResetDeps = {
    prisma: db as never,
    redis,
    zonesAt: async () => OPERATION_ZONE,
    log: (e) => logs.push(e),
    sleep: async () => undefined,
    ...extra,
  };
  return { d, logs, redis };
}

const totalRows = (db: FakePrisma) => Object.fromEntries(MODELS.map((m) => [m.name, db.rows(m.name).length]));

describe('assertDevEnvironment (dev-reset-bench)', () => {
  it('aceita o ambiente do dev single (deploy/single/compose.yml, serviço api)', () => {
    const compose = load(readFileSync(join(__dirname, '../../../../deploy/single/compose.yml'), 'utf8')) as { services: { api: { environment: Record<string, string> } } };
    const env = compose.services.api.environment;
    expect({ NODE_ENV: env.NODE_ENV, VOLTI_ENV: env.VOLTI_ENV, PAYMENT_PROVIDER: env.PAYMENT_PROVIDER, ALLOW_FAKE_PAYMENTS: env.ALLOW_FAKE_PAYMENTS }).toEqual(DEV_SINGLE_ENV);
    expect(() => assertDevEnvironment(env)).not.toThrow();
  });

  it('aceita o dev local (NODE_ENV=development, sem PAYMENT_PROVIDER = fake)', () => {
    expect(() => assertDevEnvironment({ NODE_ENV: 'development' })).not.toThrow();
  });

  it.each([
    [{ ...DEV_SINGLE_ENV, VOLTI_ENV: 'prod' }, 'VOLTI_ENV=prod'],
    [{ ...DEV_SINGLE_ENV, VOLTI_ENV: 'staging' }, 'VOLTI_ENV=staging'],
    [{ NODE_ENV: 'production', PAYMENT_PROVIDER: 'fake', ALLOW_FAKE_PAYMENTS: 'true' }, 'sem VOLTI_ENV=dev'],
    [{ PAYMENT_PROVIDER: 'fake' }, 'sem VOLTI_ENV=dev'],
    [{ ...DEV_SINGLE_ENV, ALLOW_FAKE_PAYMENTS: undefined }, 'ALLOW_FAKE_PAYMENTS'],
    [{ ...DEV_SINGLE_ENV, PAYMENT_PROVIDER: 'mercadopago' }, 'PAYMENT_PROVIDER=mercadopago'],
    [{ NODE_ENV: 'development', PAYMENT_PROVIDER: 'mercadopago' }, 'PAYMENT_PROVIDER=mercadopago'],
    [{ NODE_ENV: 'development', VOLTI_ENV: 'prod' }, 'VOLTI_ENV=prod'],
  ])('recusa fora de dev: %j', (env, message) => {
    expect(() => assertDevEnvironment(env)).toThrow(message);
  });
});

describe('parseResetArgs / maskEmail', () => {
  it('lê os argumentos (plano day e cobertura basic por padrão)', () => {
    expect(parseResetArgs(['--keep', 'vlt-0059', '--customer-email', OWNER_EMAIL, `--${CONFIRM_FLAG}`, '--dry-run'])).toEqual({
      keepCode: 'VLT-0059', customerEmail: OWNER_EMAIL, dryRun: true, confirmed: true, planCode: 'day', coverage: 'basic',
    });
  });

  it('sem a confirmação: confirmed=false; argumentos inválidos recusam', () => {
    expect(parseResetArgs(['--keep', 'VLT-0059', '--customer-email', OWNER_EMAIL]).confirmed).toBe(false);
    expect(() => parseResetArgs(['--customer-email', OWNER_EMAIL])).toThrow('--keep');
    expect(() => parseResetArgs(['--keep', 'VLT-0059'])).toThrow('--customer-email');
    expect(() => parseResetArgs(['--keep', 'VLT-0059', '--customer-email', OWNER_EMAIL, '--plan', 'monthly'])).toThrow('--plan');
    expect(() => parseResetArgs(['--keep', 'VLT-0059', '--customer-email', OWNER_EMAIL, '--force'])).toThrow();
    expect(() => parseResetArgs(['--keep', 'VLT-0059', '--customer-email', OWNER_EMAIL, '--customer-id', 'x'])).toThrow('--customer-id');
  });

  it('--customer-id desempata contas com o mesmo e-mail', () => {
    const id = '42a10b53-b36d-45e6-b778-14698034ee2b';
    expect(parseResetArgs(['--keep', 'VLT-0059', '--customer-email', OWNER_EMAIL, '--customer-id', id]).customerId).toBe(id);
  });

  it('mascara o e-mail', () => {
    expect(maskEmail(OWNER_EMAIL)).toBe('v***7@gmail.com');
    expect(maskEmail('a@b.com')).toBe('a***@b.com');
  });

  it('caução padrão igual à do RentalBillingService', () => {
    expect(DEFAULT_DEPOSIT_CENTS).toBe(DEPOSIT_CENTS);
  });
});

describe('cobertura do plano pela DMMF do Prisma', () => {
  const names = MODELS.map((m) => m.name).sort();
  const stepIndexes = (model: string, actions: Array<'delete' | 'update'>) =>
    RESET_STEPS.map((s, i) => (s.model === model && actions.includes(s.action) ? i : -1)).filter((i) => i >= 0);

  it('toda tabela do schema tem destino decidido em MODEL_POLICY', () => {
    expect(Object.keys(MODEL_POLICY).sort()).toEqual(names);
  });

  it('o destino bate com os passos: keep sem passo; os demais com passo', () => {
    for (const [model, p] of Object.entries(MODEL_POLICY)) {
      const has = RESET_STEPS.some((s) => s.model === model);
      expect({ model, has }).toEqual({ model, has: p.fate !== 'keep' });
    }
  });

  it('todo modelo ligado a Vehicle/Rental (FK ou coluna rentalId/vehicleId) tem passo', () => {
    const linked = MODELS.filter(
      (m) =>
        FKS.some((fk) => fk.from === m.name && (fk.to === 'Vehicle' || fk.to === 'Rental')) ||
        m.fields.some((f) => f.kind === 'scalar' && /^(rental|vehicle)Id$|(Rental|Vehicle)Id$/.test(f.name)),
    ).map((m) => m.name);
    expect(linked.length).toBeGreaterThan(20);
    for (const model of linked) expect({ model, steps: stepIndexes(model, ['delete', 'update']).length > 0 }).toEqual({ model, steps: true });
  });

  it('toda FK para um modelo apagado é desfeita antes (apagando ou desvinculando o filho)', () => {
    const deleted = new Set(RESET_STEPS.filter((s) => s.action === 'delete').map((s) => s.model as string));
    const checked: string[] = [];
    for (const fk of FKS.filter((x) => deleted.has(x.to))) {
      const parent = Math.min(...stepIndexes(fk.to, ['delete']));
      const child = stepIndexes(fk.from, ['delete', 'update']);
      expect({ fk: `${fk.from}.${fk.field}`, before: child.length > 0 && Math.min(...child) < parent }).toEqual({ fk: `${fk.from}.${fk.field}`, before: true });
      checked.push(`${fk.from}.${fk.field}`);
    }
    // As relações que motivaram a ordem (uma relação nova entra sozinha nesta lista).
    expect(checked).toEqual(expect.arrayContaining(['Tracker.vehicle', 'VehicleCommand.vehicle', 'Reservation.vehicle', 'Rental.vehicle', 'RentalEvent.rental', 'MaintenanceTask.vehicle', 'FieldTask.vehicle', 'Handover.vehicle', 'Handover.reservation', 'Inspection.fieldTask', 'BatterySwap.fieldTask', 'SupportMessage.conversation', 'BatteryMovement.battery']));
  });
});

describe('runDevReset', () => {
  it('recusa sem --i-understand-this-deletes-test-data, sem ler nem gravar nada', async () => {
    const w = world();
    const before = totalRows(w.db);
    const findSpy = jest.spyOn(w.db.vehicle, 'findUnique');
    await expect(runDevReset(deps(w.db).d, { ...OPTS, confirmed: false }, DEV_SINGLE_ENV)).rejects.toThrow(CONFIRM_FLAG);
    expect(findSpy).not.toHaveBeenCalled();
    expect(w.db.writes).toEqual([]);
    expect(totalRows(w.db)).toEqual(before);
  });

  it('recusa fora de dev (também no dry-run), sem ler nem gravar nada', async () => {
    const w = world();
    const findSpy = jest.spyOn(w.db.vehicle, 'findUnique');
    for (const env of [{ ...DEV_SINGLE_ENV, VOLTI_ENV: 'prod' }, { NODE_ENV: 'production', PAYMENT_PROVIDER: 'mercadopago' }]) {
      await expect(runDevReset(deps(w.db).d, { ...OPTS, dryRun: true }, env)).rejects.toThrow('Recusado');
    }
    expect(findSpy).not.toHaveBeenCalled();
    expect(w.db.writes).toEqual([]);
  });

  it('dry-run: nenhuma escrita, contagens por tabela e e-mail mascarado no log', async () => {
    const w = world();
    const before = totalRows(w.db);
    const { d, logs } = deps(w.db);
    const out = await runDevReset(d, { ...OPTS, dryRun: true }, DEV_SINGLE_ENV);
    expect(w.db.writes).toEqual([]);
    expect(totalRows(w.db)).toEqual(before);
    const count = (model: string, action = 'delete') => out.steps.filter((s) => s.model === model && s.action === action).reduce((a, s) => a + s.count, 0);
    expect(count('Vehicle')).toBe(2);
    expect(count('Rental')).toBe(2);
    expect(count('Tracker')).toBe(1);
    expect(count('Tracker', 'update')).toBe(1);
    expect(count('Battery')).toBe(1);
    expect(count('Alert')).toBe(3);
    expect(count('VehicleCommand')).toBe(1);
    expect(count('Incident')).toBe(2);
    expect(count('SupportMessage')).toBe(1);
    expect(count('Customer', 'update')).toBe(1);
    const text = JSON.stringify(logs);
    expect(text).not.toContain(OWNER_EMAIL);
    expect(text.toLowerCase()).not.toContain(OWNER_EMAIL);
    expect(text).toContain('v***7@gmail.com');
    expect(logs.at(-1)).toMatchObject({ msg: 'dry_run_done', writes: 0, keep: 'VLT-0059' });
  });

  it('apaga os dados de teste na ordem das FKs, mantém o resto e cria o aluguel ativo da bancada', async () => {
    const w = world();
    const { d, logs } = deps(w.db);
    const out = await runDevReset(d, OPTS, DEV_SINGLE_ENV);
    const rows = (m: string) => w.db.rows(m);

    // Frota: só a bancada, com o rastreador dela; GT06 de moto apagada fica desvinculado; MQTT sai.
    expect(rows('Vehicle').map((v) => v.code)).toEqual(['VLT-0059']);
    expect(rows('Tracker').map((t) => [t.thingName, t.vehicleId]).sort()).toEqual([
      ['moto-0002', null],
      ['moto-0059', w.bench.id],
      ['moto-9999', null],
    ]);
    expect(rows('Battery').map((b) => b.serial).sort()).toEqual(['BAT-59', 'BAT-D']);
    expect(rows('BatteryMovement')).toHaveLength(1);
    expect(rows('VehicleCommand').map((c) => c.id)).toEqual([w.kept.benchCommand.id]);
    expect(rows('MaintenanceTask').map((m) => m.id)).toEqual([w.kept.benchMaintenance.id]);

    // Operação e dinheiro de teste: só o que o aluguel novo cria.
    for (const m of ['TrackPoint', 'LocationShare', 'StationSwap', 'CouponRedemption', 'Dispute', 'Claim', 'InsuranceRemittance', 'PaymentReceipt', 'Invoice',
      'PaymentCapture', 'PaymentRefund', 'SettlementProgress', 'DepositRelease', 'WalletEntry', 'TopUp', 'ProcessedWebhook', 'Subscription', 'Alert',
      'Inspection', 'BatterySwap', 'FieldTask', 'Handover', 'Reservation', 'IdempotencyRecord', 'RentalStart']) {
      expect({ m, n: rows(m).length }).toEqual({ m, n: 0 });
    }
    expect(rows('Incident').map((i) => i.id)).toEqual([w.kept.keptIncident.id]);
    expect(rows('SupportConversation').map((c) => c.id)).toEqual([w.kept.keptConv.id]);
    expect(rows('SupportMessage')).toHaveLength(1);
    expect(rows('PaymentProviderRef').map((r) => r.entityType)).toEqual(['customer']);
    expect(rows('Referral')[0]).toMatchObject({ refereeWalletEntryId: null, referrerWalletEntryId: null });
    expect(rows('Coupon')[0].redemptions).toBe(0);
    expect(rows('Customer').find((c) => c.id === w.owner.id)!.delinquent).toBe(false);

    // Contas e configuração intactas.
    for (const [m, n] of [['Customer', 2], ['PaymentCard', 2], ['Device', 1], ['StaffUser', 1], ['Depot', 1], ['SwapStation', 1], ['Zone', 1], ['PricingPlan', 3],
      ['VehicleModel', 1], ['Coupon', 1], ['CustomerCoupon', 1], ['Fee', 1], ['MinutePackage', 1], ['InsuranceCoverageConfig', 1], ['RestrictionEntry', 1],
      ['ProviderCustomerDeletion', 1], ['CustomerIdentityDeletion', 1], ['Referral', 1]] as const) {
      expect({ m, n: rows(m).length }).toEqual({ m, n });
    }

    // Aluguel novo: as linhas do início normal com o gateway fake, sem comando à moto.
    const [rental] = rows('Rental');
    expect(rows('Rental')).toHaveLength(1);
    expect(rental).toMatchObject({ id: out.rental!.rentalId, customerId: w.owner.id, vehicleId: w.bench.id, status: 'active', planCode: 'day', coverage: 'basic', couponCode: null, speedLimitKmh: 32, startLat: -23.561, startLng: -46.691 });
    expect(rental.priceSnapshot).toEqual(PricingService.snapshotFrom(rows('PricingPlan').find((p) => p.code === 'day') as never, 250, 'basic', null, false, { pricePerMinuteCents: 79, unlockFeeCents: null }));
    expect(rows('Deposit')).toEqual([expect.objectContaining({ id: rental.depositId, rentalId: rental.id, customerId: w.owner.id, method: 'card', status: 'held', amountCents: DEPOSIT_CENTS, cardId: w.card.id })]);
    const [payment] = rows('Payment');
    expect(rows('Payment')).toHaveLength(1);
    expect(payment).toMatchObject({ kind: 'deposit', method: 'card', status: 'authorized', amountCents: DEPOSIT_CENTS, rentalId: rental.id, depositId: rental.depositId, cardLast4: '4242' });
    expect(payment.providerPaymentId).toMatch(/^fake-pay-[0-9a-f-]{36}$/);
    expect(rows('Deposit')[0].providerReference).toBe(payment.providerPaymentId);
    expect(payment.idempotencyKey).toBe(rows('Deposit')[0].idempotencyKey);
    expect(rows('InsurancePolicy')).toEqual([expect.objectContaining({ id: rental.insurancePolicyId, rentalId: rental.id, customerId: w.owner.id, status: 'active', premiumCents: 250 })]);
    expect(rows('RentalEvent')).toEqual([expect.objectContaining({ rentalId: rental.id, type: 'started', actorType: 'customer', actorId: w.owner.id })]);
    expect(rows('Vehicle')[0]).toMatchObject({ status: 'rented', statusBeforeOffline: null, locked: true, depotId: w.depot.id });
    expect(w.db.writes.filter((x) => x.startsWith('VehicleCommand.') && x !== 'VehicleCommand.deleteMany')).toEqual([]);
    expect(rows('AuditLog').map((a) => a.action).sort()).toEqual(['dev.reset_bench', 'vehicle.lock']);
    expect(logs.find((l) => l.msg === 'rental_created')).toMatchObject({ commandsSent: 0, status: 'active' });
    expect(JSON.stringify(logs)).not.toContain(OWNER_EMAIL);
  });

  it('o aluguel criado é o que o app e o painel leem (GET /rentals/current e dashboard)', async () => {
    const w = world();
    const out = await runDevReset(deps(w.db).d, OPTS, DEV_SINGLE_ENV);
    const rentals = new RentalsService(w.db as never, undefined as never, undefined as never, undefined as never, undefined as never, undefined as never, undefined as never, new PricingService(w.db as never));
    const current = (await rentals.current(w.owner.id)) as { rental: Record<string, unknown> };
    expect(current.rental).toMatchObject({ id: out.rental!.rentalId, customerId: w.owner.id, vehicleId: w.bench.id, vehicleCode: 'VLT-0059', status: 'active', planCode: 'day', depositId: out.rental!.depositId });
    expect(await rentals.current(w.other.id)).toEqual({});

    const dash = await new ReportsService(w.db as never).dashboard(true);
    expect(dash).toMatchObject({ activeRentals: 1, openAlerts: 0, revenueTodayCents: 0, occupancyPct: 100 });
    expect(dash.vehiclesByStatus).toMatchObject({ rented: 1, free: 0, maintenance: 0 });
  });

  it('moto offline: fica offline e volta como rented (statusBeforeOffline)', async () => {
    const w = world();
    Object.assign(w.bench, { status: 'offline', online: false, statusBeforeOffline: 'free' });
    const { d, logs } = deps(w.db);
    await runDevReset(d, OPTS, DEV_SINGLE_ENV);
    expect(w.db.rows('Vehicle')[0]).toMatchObject({ status: 'offline', statusBeforeOffline: 'rented' });
    expect(logs).toContainEqual(expect.objectContaining({ warning: 'vehicle_offline' }));
  });

  it('recusas antes de qualquer escrita: sem cartão, sem consentimento, e-mail desconhecido, trava em andamento no Redis', async () => {
    const cases: Array<[string, (w: ReturnType<typeof world>, redis: MemoryRedisStore) => Promise<void> | void, string]> = [
      ['sem cartão', (w) => void (w.card.deletedAt = new Date()), 'cartão'],
      ['sem consentimento', (w) => void (w.owner.locationConsent = false), 'localização'],
      ['KYC pendente', (w) => void (w.owner.kycStatus = 'pending'), 'KYC'],
      ['termos', (w) => void (w.owner.termsAccepted = false), 'termos'],
      ['CPF restrito', (w) => void (w.owner.cpf = '00000000000'), 'restrição'],
      ['e-mail desconhecido', (w) => void (w.owner.email = 'outro@exemplo.com'), 'Nenhuma conta'],
      ['modo roubada', (w) => void (w.bench.stolenMode = true), 'roubada'],
      ['trava relé em andamento', async (_w, redis) => void (await redis.set('iot:relay-lock:moto-0059', '{}')), 'trava em andamento'],
    ];
    for (const [name, arrange, message] of cases) {
      const w = world();
      const { d, redis } = deps(w.db);
      await arrange(w, redis);
      const before = totalRows(w.db);
      await expect(runDevReset(d, OPTS, DEV_SINGLE_ENV)).rejects.toThrow(message);
      expect({ name, writes: w.db.writes }).toEqual({ name, writes: [] });
      expect(totalRows(w.db)).toEqual(before);
    }
  });

  it('erro no meio desfaz tudo (uma transação só)', async () => {
    const w = world();
    const before = structuredClone(w.db.data);
    jest.spyOn(w.db.insurancePolicy, 'create').mockRejectedValueOnce(new Error('falha simulada'));
    await expect(runDevReset(deps(w.db).d, OPTS, DEV_SINGLE_ENV)).rejects.toThrow('falha simulada');
    expect(w.db.data).toEqual(before);
  });

  it('avisa (sem recusar) moto fora da área de operação e trava de equipe', async () => {
    const w = world();
    const { d, logs, redis } = deps(w.db, { zonesAt: async () => [] });
    await redis.hset('iot:lock-origin:moto-0059', { origin: 'staff' });
    await runDevReset(d, { ...OPTS, dryRun: true }, DEV_SINGLE_ENV);
    expect(logs).toContainEqual(expect.objectContaining({ warning: 'outside_operation_area' }));
    expect(logs).toContainEqual(expect.objectContaining({ warning: 'lock_origin_not_customer', origin: 'staff' }));
  });

  it('varredura depois do commit: trajeto/alerta gravado pela API com aluguel ou moto apagados', async () => {
    const w = world();
    let sweptAfter = 0;
    const { d, logs } = deps(w.db, {
      sleep: async (ms) => {
        sweptAfter = ms;
        // A API (cache de 5 s) grava um ponto do aluguel antigo e um alerta da moto apagada depois do commit.
        w.db.seed('TrackPoint', { rentalId: 'aluguel-apagado', vehicleId: w.bench.id, lat: 0, lng: 0, recordedAt: new Date(), expiresAt: new Date() });
        w.db.seed('Alert', { type: 'vehicle_offline', priority: 'low', vehicleId: w.mqtt.id });
      },
    });
    const out = await runDevReset(d, OPTS, DEV_SINGLE_ENV);
    w.db.seed('TrackPoint', { rentalId: out.rental!.rentalId, vehicleId: w.bench.id, lat: 0, lng: 0, recordedAt: new Date(), expiresAt: new Date() });
    expect(sweptAfter).toBe(ORPHAN_SWEEP_DELAY_MS);
    expect(w.db.rows('TrackPoint').map((p) => p.rentalId)).toEqual([out.rental!.rentalId]);
    expect(w.db.rows('Alert')).toHaveLength(0);
    expect(logs.at(-1)).toMatchObject({ msg: 'reset_done', orphansSwept: { trackPoints: 1, alerts: 1 } });
  });
});
