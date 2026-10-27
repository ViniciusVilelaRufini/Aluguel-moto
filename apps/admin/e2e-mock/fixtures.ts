/**
 * Fixtures tipadas pelo contrato (packages/contracts). Dinheiro em centavos, datas em UTC ISO.
 * Funcoes puras: cada teste recebe uma copia nova do "banco" em memoria (ver mock-api.ts).
 */
import type { components } from '@volti/contracts';

type S<K extends keyof components['schemas']> = components['schemas'][K];

const NOW = new Date('2026-10-26T15:00:00.000Z');
const iso = (minAgo = 0) => new Date(NOW.getTime() - minAgo * 60_000).toISOString();

const MODEL_NAMES = ['Volti One', 'Volti Urban', 'Volti Cargo'];
const STATUSES: S<'VehicleStatus'>[] = ['free', 'rented', 'free', 'paused', 'blocked', 'maintenance', 'offline', 'free', 'rented', 'reserved'];
const pad = (n: number, w = 3) => String(n).padStart(w, '0');

export function makeStaffMe(group: S<'StaffGroup'> = 'admin'): S<'Me'> {
  return {
    id: `staff-${group}`,
    sub: `dev-${group}`,
    pool: 'staff',
    email: `${group}@volti.dev`,
    groups: [group],
    staff: { id: `staff-${group}`, email: `${group}@volti.dev`, name: 'Ana QA', groups: [group], active: true, mfaEnabled: true, createdAt: iso(100000) },
  };
}

export function makeVehicles(n = 24): S<'Vehicle'>[] {
  return Array.from({ length: n }, (_, i) => {
    const status = STATUSES[i % STATUSES.length]!;
    return {
      id: `veh-${pad(i + 1)}`,
      code: `VLT-${pad(i + 1)}`,
      qrCode: `QR${i + 1}`,
      model: MODEL_NAMES[i % 3]!,
      status,
      lat: -23.5615 + (i % 6) * 0.004,
      lng: -46.6559 + Math.floor(i / 6) * 0.005,
      batteryPct: 12 + ((i * 17) % 88),
      estimatedRangeKm: 8 + ((i * 3) % 40),
      speedLimitKmh: 32,
      thingName: `volti-veh-${pad(i + 1)}`,
      online: status !== 'offline',
      locked: status === 'free' || status === 'blocked',
      ignition: status === 'rented',
      speedKmh: status === 'rented' ? 18 : 0,
      signal: 3,
      stolenMode: false,
      firmwareVersion: '1.4.2',
      lastSeenAt: iso(status === 'offline' ? 600 : 1),
      currentRentalId: status === 'rented' ? `rent-${pad(i + 1)}` : undefined,
      address: `Av. Paulista, ${1000 + i * 10}, Bela Vista, São Paulo`,
      odometerKm: 120 + i * 11,
      usageHours: 20 + i,
      createdAt: iso(200000),
      updatedAt: iso(1),
    };
  });
}

export function makeZones(): S<'GeoZone'>[] {
  const sq = (lng: number, lat: number, d = 0.004): S<'GeoJsonPolygon'> => ({
    type: 'Polygon',
    coordinates: [[[lng, lat], [lng + d, lat], [lng + d, lat + d], [lng, lat + d], [lng, lat]]],
  });
  return [
    { id: 'zone-1', name: 'Área de operação Paulista', type: 'operation', geometry: sq(-46.67, -23.57, 0.04), active: true, createdAt: iso(5000), updatedAt: iso(5000) },
    { id: 'zone-2', name: 'Devolução Trianon', type: 'return', geometry: sq(-46.6545, -23.5615), active: true, createdAt: iso(5000), updatedAt: iso(5000) },
    { id: 'zone-3', name: 'Proibida Metrô', type: 'forbidden', geometry: sq(-46.652, -23.558), active: true, createdAt: iso(5000), updatedAt: iso(5000) },
    { id: 'zone-4', name: 'Calçadão', type: 'reduced_speed', speedLimitKmh: 6, geometry: sq(-46.659, -23.564), active: false, createdAt: iso(5000), updatedAt: iso(5000) },
  ];
}

const ALERT_TYPES: S<'AlertType'>[] = ['tamper', 'battery_critical', 'out_of_operation_area', 'vehicle_offline', 'fall_detected', 'command_failed'];
const PRIOS: S<'AlertPriority'>[] = ['critical', 'medium', 'high', 'low'];
export function makeAlerts(n = 30): S<'Alert'>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `alert-${pad(i + 1)}`,
    type: ALERT_TYPES[i % ALERT_TYPES.length]!,
    priority: PRIOS[i % PRIOS.length]!,
    status: (i % 7 === 6 ? 'resolved' : i % 5 === 4 ? 'assigned' : 'open') as S<'AlertStatus'>,
    vehicleId: `veh-${pad((i % 24) + 1)}`,
    vehicleCode: `VLT-${pad((i % 24) + 1)}`,
    message: `Alerta de teste ${i + 1}`,
    lat: -23.56,
    lng: -46.65,
    createdAt: iso(i * 7),
  }));
}

export function makeCustomers(n = 40): S<'Customer'>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `cus-${pad(i + 1)}`,
    name: `Cliente Teste ${pad(i + 1, 2)}`,
    email: `cliente${i + 1}@exemplo.com.br`,
    phone: '+5511987654321',
    cpf: `***.${100 + i}.${200 + i}-**`,
    kycStatus: (i % 4 === 0 ? 'pending' : 'approved') as S<'KycStatus'>,
    status: (i % 9 === 8 ? 'blocked' : 'active') as S<'CustomerStatus'>,
    delinquent: i % 11 === 10,
    restricted: false,
    blockedReason: i % 9 === 8 ? 'Fraude suspeita' : undefined,
    locationConsent: true,
    stats: { rentalsCount: i, totalSpentCents: i * 1234, openDisputes: i % 3 === 0 ? 1 : 0 },
    createdAt: iso(90000 - i * 100),
  }));
}

export function makeRentals(n = 25): S<'Rental'>[] {
  const st: S<'RentalStatus'>[] = ['active', 'ended', 'paused', 'force_ended', 'ended'];
  return Array.from({ length: n }, (_, i) => ({
    id: `rent-${pad(i + 1)}`,
    customerId: `cus-${pad((i % 40) + 1)}`,
    vehicleId: `veh-${pad((i % 24) + 1)}`,
    vehicleCode: `VLT-${pad((i % 24) + 1)}`,
    planCode: (['minute', 'hour', 'day'] as const)[i % 3]!,
    coverage: (i % 2 ? 'full' : 'basic') as S<'InsuranceCoverage'>,
    status: st[i % st.length]!,
    startedAt: iso(300 + i * 30),
    elapsedSeconds: 600 + i * 60,
    pausedSeconds: 0,
    costCents: 1500 + i * 250,
    breakdown: {
      lines: [
        { code: 'unlock', description: 'Desbloqueio', amountCents: 300 },
        { code: 'minutes', description: 'Minutos', quantity: 10, unitCents: 120, amountCents: 1200 },
      ],
      subtotalCents: 1500, discountCents: 0, insuranceCents: 200, feesCents: 0, totalCents: 1700,
    },
    depositId: `dep-${i + 1}`,
    speedLimitKmh: 32,
    createdAt: iso(300 + i * 30),
    updatedAt: iso(10),
  }));
}

export function makePayments(n = 25): S<'Payment'>[] {
  const st: S<'PaymentStatus'>[] = ['paid', 'captured', 'refunded', 'pending', 'failed', 'partially_refunded'];
  const kind: S<'PaymentKind'>[] = ['rental', 'deposit', 'top_up', 'subscription', 'fee'];
  return Array.from({ length: n }, (_, i) => ({
    id: `pay-${pad(i + 1)}`,
    customerId: `cus-${pad((i % 40) + 1)}`,
    rentalId: `rent-${pad((i % 25) + 1)}`,
    kind: kind[i % kind.length]!,
    method: (i % 2 ? 'pix' : 'card') as S<'PaymentMethod'>,
    status: st[i % st.length]!,
    amountCents: 2000 + i * 321,
    refundedCents: st[i % st.length] === 'refunded' ? 2000 + i * 321 : 0,
    cardLast4: '4242',
    createdAt: iso(i * 50),
    updatedAt: iso(i * 50),
  }));
}

export function makePlans(): S<'PricingPlan'>[] {
  const mk = (code: S<'PlanCode'>, name: string, unit: S<'PlanUnit'>, price: number, recurring = false): S<'PricingPlan'> => ({
    id: `plan-${code}`, code, name, unit, unlockFeeCents: 300, unitPriceCents: price, pausePerMinuteCents: 20, recurring, active: true, createdAt: iso(9000), updatedAt: iso(9000),
  });
  return [mk('minute', 'Por minuto', 'minute', 120), mk('hour', 'Por hora', 'hour', 1500), mk('day', 'Diária', 'day', 6000), mk('weekly', 'Semanal', 'week', 29900, true), mk('monthly', 'Mensal', 'month', 89900, true)];
}

export function makeFees(): S<'Fee'>[] {
  return [
    { id: 'fee-1', code: 'late_return', name: 'Devolução fora da zona', amountCents: 5000, active: true, system: true, createdAt: iso(9000), updatedAt: iso(9000) },
    { id: 'fee-2', code: 'cleaning', name: 'Limpeza', amountCents: 2500, active: true, system: false, createdAt: iso(9000), updatedAt: iso(9000) },
  ];
}

export function makeCoupons(): S<'Coupon'>[] {
  return [
    { id: 'cp-1', code: 'BEMVINDO10', discountType: 'percent', percentOff: 10, redemptions: 3, active: true, createdAt: iso(9000), updatedAt: iso(9000) },
    { id: 'cp-2', code: 'MENOS5', discountType: 'fixed', amountOffCents: 500, redemptions: 0, active: false, createdAt: iso(9000), updatedAt: iso(9000) },
  ];
}

export function makeCoverages(): S<'InsuranceCoverageOption'>[] {
  return [
    { coverage: 'basic', name: 'Básico', description: 'Cobertura de terceiros', premiumCents: 200, mandatory: true, items: [{ code: 'rcf', description: 'Responsabilidade civil', limitCents: 1000000 }], active: true },
    { coverage: 'full', name: 'Completo', description: 'Cobertura total', premiumCents: 600, mandatory: false, items: [{ code: 'theft', description: 'Roubo e furto', limitCents: 800000 }], active: true },
  ];
}

export function makeModels(): S<'VehicleModel'>[] {
  return MODEL_NAMES.map((name, i) => ({
    id: `model-${i + 1}`, name, slug: name.toLowerCase().replace(/\s+/g, '-'), categoryLabel: ['Urbana', 'Conforto', 'Carga'][i]!,
    pricePerMinuteCents: 120 + i * 20, serviceIntervalKm: 500, serviceIntervalHours: 100, active: true, sortOrder: i, createdAt: iso(9000), updatedAt: iso(9000),
  }));
}

export function makeStaff(): S<'StaffUser'>[] {
  const g: S<'StaffGroup'>[] = ['admin', 'operacao', 'financeiro', 'suporte', 'campo'];
  return g.map((group, i) => ({ id: `staff-${group}`, email: `${group}@volti.dev`, name: `Pessoa ${group}`, groups: [group], active: i !== 3, mfaEnabled: true, lastLoginAt: iso(i * 100), createdAt: iso(50000) }));
}

export function makeAudit(n = 25): S<'AuditLog'>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `aud-${i + 1}`, actorType: 'staff' as const, actorId: 'staff-admin', actorName: 'Ana QA', action: i % 2 ? 'vehicle.lock' : 'customer.block',
    entityType: 'vehicle', entityId: `veh-${pad(i + 1)}`, reason: 'Teste', createdAt: iso(i * 30),
  }));
}

export function makeFieldTasks(): S<'FieldTask'>[] {
  const t: S<'FieldTaskType'>[] = ['battery_swap', 'collect', 'inspection', 'reposition', 'maintenance'];
  return Array.from({ length: 8 }, (_, i) => ({
    id: `ft-${i + 1}`, type: t[i % t.length]!, status: (i % 3 === 0 ? 'in_progress' : 'open') as S<'FieldTaskStatus'>,
    priority: (['low', 'medium', 'high', 'urgent'] as const)[i % 4]!, vehicleId: `veh-${pad(i + 1)}`, vehicleCode: `VLT-${pad(i + 1)}`,
    vehicleBatteryPct: 15, vehicleStatus: 'free' as const, vehicleAddress: 'Av. Paulista, 1000', createdAt: iso(100), updatedAt: iso(50),
  }));
}

export function makeMaintenance(): S<'MaintenanceTask'>[] {
  return [
    { id: 'mt-1', vehicleId: 'veh-006', vehicleCode: 'VLT-006', kind: 'corrective', title: 'Trocar freio dianteiro', status: 'scheduled', scheduledFor: iso(-1440), source: 'staff', createdAt: iso(500), updatedAt: iso(500) },
    { id: 'mt-2', vehicleId: 'veh-007', vehicleCode: 'VLT-007', kind: 'preventive', title: 'Revisão de 500 km', status: 'in_progress', source: 'system', createdAt: iso(500), updatedAt: iso(500) },
  ];
}

export function makeBatteries(n = 12): S<'Battery'>[] {
  const st: S<'BatteryStatus'>[] = ['in_vehicle', 'in_van', 'charging', 'in_station'];
  return Array.from({ length: n }, (_, i) => ({
    id: `bat-${i + 1}`, serial: `BAT-${pad(i + 1, 4)}`, chargePct: (i * 9) % 100, cycleCount: 20 + i, status: st[i % 4]!,
    vehicleId: i % 4 === 0 ? `veh-${pad(i + 1)}` : undefined, vehicleCode: i % 4 === 0 ? `VLT-${pad(i + 1)}` : undefined, updatedAt: iso(5),
  }));
}

export function makeConversations(): S<'SupportConversation'>[] {
  return [
    { id: 'conv-1', customerId: 'cus-001', customerName: 'Cliente Teste 01', subject: 'Moto não destrava', status: 'open', unreadCount: 2, createdAt: iso(60), lastMessageAt: iso(5) },
    { id: 'conv-2', customerId: 'cus-002', customerName: 'Cliente Teste 02', subject: 'Cobrança duplicada', status: 'closed', unreadCount: 0, createdAt: iso(600), lastMessageAt: iso(500) },
  ];
}

export function makeDashboard(): S<'DashboardSummary'> {
  return { generatedAt: iso(), occupancyPct: 42, activeRentals: 5, revenueTodayCents: 123456, openAlerts: 12, vehiclesByStatus: { free: 10, rented: 5, reserved: 1, paused: 2, blocked: 2, maintenance: 2, offline: 2, awaiting_pickup: 0 } };
}

export function makeFinanceReport(): S<'FinanceReport'> {
  return {
    from: iso(60 * 24 * 30), to: iso(), revenueByPlan: [{ planCode: 'minute', rentals: 120, revenueCents: 540000 }, { planCode: 'day', rentals: 20, revenueCents: 120000 }],
    totalRevenueCents: 660000, depositsHeldCount: 4, depositsHeldCents: 40000, delinquentCustomers: 2, delinquentAmountCents: 9000,
    refundsCents: 5000, walletTopUpsCents: 30000, insurancePremiumsCents: 20000, insurancePayoutsCents: 0,
  };
}

/* ───── galpões, estações e entregas (Motos, Galpões, Estações, Retiradas, Entregas) ───── */

export function makeDepots(): S<'Depot'>[] {
  const hours = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: '08:00', closesAt: '20:00' }));
  return [
    { id: 'dep-1', name: 'Galpão Volti Pinheiros', address: 'R. Fradique Coutinho, 1500 · Pinheiros, São Paulo', district: 'Pinheiros', lat: -23.5636, lng: -46.6914, timezone: 'America/Sao_Paulo', openingHours: hours, pickupNowWindowMinutes: 120, maxScheduleDays: 7, scheduledGraceMinutes: 30, swapStationId: 'st-1', minChargedBatteries: 4, active: true, availableVehicleCount: 6, createdAt: iso(200000), updatedAt: iso(100) },
    { id: 'dep-2', name: 'Galpão Volti Mooca', address: 'R. da Mooca, 2000 · Mooca, São Paulo', district: 'Mooca', lat: -23.5568, lng: -46.5996, timezone: 'America/Sao_Paulo', openingHours: hours.slice(0, 5), pickupNowWindowMinutes: 120, maxScheduleDays: 7, scheduledGraceMinutes: 30, active: false, availableVehicleCount: 0, createdAt: iso(200000), updatedAt: iso(100) },
  ];
}

export function makeStationRegistry(): S<'SwapStationAdmin'>[] {
  return [
    { id: 'st-1', name: 'Estação Paulista', address: 'Av. Paulista, 900', lat: -23.56, lng: -46.65, availableBatteries: 3, totalSlots: 8, openingHours: '24h', open24h: true, active: true, thingName: 'station-d0000000-0000-4000-8000-000000000001', batteriesInStation: 3, openSwaps: 0, depotIds: ['dep-1'], createdAt: iso(200000), updatedAt: iso(100) },
  ];
}

export function makeHandovers(): S<'Handover'>[] {
  const checklist = ['freios', 'pneus', 'luzes', 'carenagem'].map((code) => ({ code, ok: true }));
  return [
    { id: 'ho-1', type: 'pickup', depotId: 'dep-1', reservationId: 'res-1', rentalId: 'rent-002', vehicleId: 'veh-002', vehicleCode: 'VLT-002', operatorId: 'staff-campo', operatorFirstName: 'Rafael', checklist, photoKeys: [], batteryPct: 96, status: 'accepted', createdAt: iso(90), respondedAt: iso(85) },
    { id: 'ho-2', type: 'return_depot', depotId: 'dep-1', rentalId: 'rent-009', vehicleId: 'veh-009', vehicleCode: 'VLT-009', operatorId: 'staff-campo', operatorFirstName: 'Rafael', checklist, photoKeys: [], batteryPct: 31, status: 'pending_customer', createdAt: iso(20) },
  ];
}
