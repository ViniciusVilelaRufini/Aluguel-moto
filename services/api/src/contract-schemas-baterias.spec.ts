import jestOpenAPI from 'jest-openapi';
import { loadSpecAs30 } from '../test/contract/openapi-30';
import { toAlert } from './modules/alerts/alerts.service';
import { toBattery, toBatteryMovement } from './modules/batteries/batteries.mapper';
import { BATTERY_STATUSES } from './modules/batteries/batteries.service';
import { toDepot } from './modules/depots/depots.mapper';

jestOpenAPI(loadSpecAs30() as any);

/** Ciclo de vida das baterias no galpão (2026-10-24): schemas aditivos e mapeadores conforme o contrato. */
describe('contrato do ciclo de vida das baterias', () => {
  const s = (loadSpecAs30() as any).components.schemas;
  const now = new Date('2026-10-24T15:00:00Z');
  const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const battery = { id: U(1), serial: 'BT-200001', chargePct: 100, cycleCount: 0, status: 'charged', vehicleId: null, holderId: null, stationId: null, depotId: U(2), createdAt: now, updatedAt: now };

  it('BatteryStatus e BatteryStatusCounts têm exatamente os status do Prisma/serviço', () => {
    expect([...s.BatteryStatus.enum].sort()).toEqual([...BATTERY_STATUSES].sort());
    expect([...s.BatteryStatusCounts.required].sort()).toEqual([...BATTERY_STATUSES].sort());
    expect(s.AlertType.enum).toContain('battery_stock_low');
  });

  it('Battery com depotId, BatteryPage com statusCounts, VanStock com loadedChargingSerials', () => {
    expect(toBattery(battery as any)).toSatisfySchemaInApiSpec('Battery');
    const counts = Object.fromEntries(BATTERY_STATUSES.map((st) => [st, 0]));
    expect({ items: [toBattery(battery as any)], statusCounts: { ...counts, charged: 1 } }).toSatisfySchemaInApiSpec('BatteryPage');
    expect({ operatorId: U(3), total: 1, chargedCount: 0, depletedCount: 1, items: [toBattery({ ...battery, status: 'in_van', chargePct: 60, depotId: null } as any)], loadedChargingSerials: ['BT-200001'] })
      .toSatisfySchemaInApiSpec('VanStock');
  });

  it('BatteryMovement: cadastro (sem fromStatus) e defeito com motivo', () => {
    const base = { id: U(4), batteryId: U(1), fromStatus: null, toStatus: 'charged', depotId: U(2), stationId: null, vehicleId: null, actorId: U(5), reason: null, at: now };
    const created = toBatteryMovement(base as any);
    expect(created).toSatisfySchemaInApiSpec('BatteryMovement');
    expect(created).not.toHaveProperty('fromStatus');
    expect({ items: [created, toBatteryMovement({ ...base, id: U(6), fromStatus: 'charged', toStatus: 'defective', reason: 'Carcaça trincada' } as any)] })
      .toSatisfySchemaInApiSpec('BatteryMovementPage');
  });

  it('Alert battery_stock_low com depotId; Depot com minChargedBatteries para staff', () => {
    const alert = { id: U(7), type: 'battery_stock_low', priority: 'medium', status: 'open', vehicleId: null, rentalId: null, depotId: U(2), message: 'Poucas baterias carregadas', lat: null, lng: null, assigneeId: null, resolution: null, createdAt: now, assignedAt: null, resolvedAt: null };
    expect(toAlert(alert as any)).toSatisfySchemaInApiSpec('Alert');
    const depot = {
      id: U(2), name: 'Galpão Volti Pinheiros', address: 'R. Fradique Coutinho, 1500', district: null, lat: -23.56, lng: -46.69, timezone: 'America/Sao_Paulo',
      openingHours: [{ weekday: 1, opensAt: '08:00', closesAt: '20:00' }], pickupNowWindowMinutes: 120, maxScheduleDays: 7, scheduledGraceMinutes: 30, swapStationId: null,
      minChargedBatteries: 6, active: true, createdAt: now, updatedAt: now,
    };
    expect(toDepot(depot as any, { availableVehicleCount: 2, staff: true })).toSatisfySchemaInApiSpec('Depot');
  });
});
