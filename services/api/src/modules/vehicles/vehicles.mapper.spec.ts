import { onlineWindowMs, toVehicle, toVehicleSummary, trackerOnline } from './vehicles.mapper';

const NOW = Date.parse('2026-10-25T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms);

const row = (over: Record<string, unknown> = {}) =>
  ({
    id: 'v1', code: 'VLT-0011', model: 'Volti S1', thingName: 'moto-0011', status: 'free', lat: -21.1378, lng: -48.9729, batteryPct: 80,
    speedLimitKmh: 32, online: true, locked: true, ignition: false, stolenMode: false, lastSeenAt: ago(30_000),
    odometerKm: 0, usageHours: 0, lastServiceOdometerKm: 0, lastServiceUsageHours: 0, createdAt: ago(1e9), updatedAt: ago(1e3), ...over,
  }) as any;

describe('online derivado do último heartbeat (lastSeenAt dentro da janela)', () => {
  it('telemetria recente → online', () => {
    expect(trackerOnline({ online: true, lastSeenAt: ago(30_000) }, NOW, 180_000)).toBe(true);
  });

  it('nunca teve rastreador (online padrão da coluna, sem lastSeenAt) → offline', () => {
    expect(trackerOnline({ online: true, lastSeenAt: null }, NOW, 180_000)).toBe(false);
  });

  it('sem notícia há mais que a janela → offline, mesmo com online=true no banco', () => {
    expect(trackerOnline({ online: true, lastSeenAt: ago(180_000) }, NOW, 180_000)).toBe(false);
    expect(trackerOnline({ online: true, lastSeenAt: ago(179_999) }, NOW, 180_000)).toBe(true);
  });

  it('presença desconectada (online=false) → offline, mesmo com lastSeenAt recente', () => {
    expect(trackerOnline({ online: false, lastSeenAt: ago(1_000) }, NOW, 180_000)).toBe(false);
  });

  it('janela = IOT_OFFLINE_AFTER_MS (padrão 180 s, igual à vigia de inatividade)', () => {
    expect(onlineWindowMs({})).toBe(180_000);
    expect(onlineWindowMs({ IOT_OFFLINE_AFTER_MS: '300000' })).toBe(300_000);
    expect(onlineWindowMs({ IOT_OFFLINE_AFTER_MS: 'x' })).toBe(180_000);
  });

  it('toVehicle (staff) usa o online derivado; cliente continua sem o campo', () => {
    expect((toVehicle(row(), { staff: true, now: NOW }) as any).online).toBe(true);
    expect((toVehicle(row({ lastSeenAt: null }), { staff: true, now: NOW }) as any).online).toBe(false);
    expect((toVehicle(row({ lastSeenAt: ago(10 * 60_000) }), { staff: true, now: NOW }) as any).online).toBe(false);
    expect(toVehicle(row(), { staff: false, now: NOW })).not.toHaveProperty('online');
  });
});

describe('trackerControlMode (spec GT06 §3.2)', () => {
  it('staff vê o tipo do rastreador; sem Tracker cadastrado = speed_control', () => {
    expect((toVehicle(row({ tracker: { id: 't1', controlMode: 'relay_only' } }), { staff: true, now: NOW }) as any).trackerControlMode).toBe('relay_only');
    expect((toVehicle(row({ tracker: { id: 't1', controlMode: 'speed_control' } }), { staff: true, now: NOW }) as any).trackerControlMode).toBe('speed_control');
    expect((toVehicle(row({ tracker: null }), { staff: true, now: NOW }) as any).trackerControlMode).toBe('speed_control');
  });

  it('cliente nunca recebe o tipo do rastreador', () => {
    expect(toVehicle(row({ tracker: { id: 't1', controlMode: 'relay_only' } }), { staff: false, now: NOW })).not.toHaveProperty('trackerControlMode');
  });
});

describe('bancada do J16 (2026-11-03): bateria desconhecida, endereço da posição atual e firmware do rastreador', () => {
  it('batteryKnown false → batteryPct e estimatedRangeKm 0 (cliente e staff); padrão true', () => {
    for (const staff of [true, false]) {
      expect(toVehicle(row({ batteryKnown: false, batteryPct: 55 }), { staff, now: NOW })).toMatchObject({ batteryKnown: false, batteryPct: 0, estimatedRangeKm: 0 });
      expect(toVehicle(row(), { staff, now: NOW })).toMatchObject({ batteryKnown: true, batteryPct: 80 });
    }
  });

  it('VehicleSummary: batteryKnown (ausente = true); sem leitura → batteryPct e estimatedRangeKm 0', () => {
    expect(toVehicleSummary(row({ batteryKnown: false, batteryPct: 55 }))).toMatchObject({ batteryKnown: false, batteryPct: 0, estimatedRangeKm: 0 });
    expect(toVehicleSummary(row())).toMatchObject({ batteryKnown: true, batteryPct: 80 });
  });

  it('sem endereço da posição atual → address e addressUpdatedAt null (nunca ausentes); com locationHidden continuam ausentes', () => {
    expect(toVehicle(row({ addressLabel: null, addressUpdatedAt: null }), { staff: true, now: NOW })).toMatchObject({ address: null, addressUpdatedAt: null });
    expect(toVehicle(row({ addressLabel: null }), { staff: false, now: NOW })).toMatchObject({ address: null, addressUpdatedAt: null });
    expect(toVehicle(row({ addressLabel: 'R. A, 1', addressUpdatedAt: ago(1_000) }), { staff: true, now: NOW })).toMatchObject({ address: 'R. A, 1', addressUpdatedAt: ago(1_000).toISOString() });
    const hidden = toVehicle(row({ addressLabel: 'R. A, 1' }), { staff: false, hideLocation: true, now: NOW });
    expect(hidden).not.toHaveProperty('address');
    expect(hidden).not.toHaveProperty('addressUpdatedAt');
  });

  it('firmwareVersion vem do Tracker vinculado; sem ele, da coluna da moto', () => {
    expect((toVehicle(row({ firmwareVersion: '1.0.0', tracker: { id: 't1', controlMode: 'relay_only', firmwareVersion: 'J16_V2.3' } }), { staff: true, now: NOW }) as any).firmwareVersion).toBe('J16_V2.3');
    expect((toVehicle(row({ firmwareVersion: '1.0.0', tracker: { id: 't1', controlMode: 'relay_only', firmwareVersion: null } }), { staff: true, now: NOW }) as any).firmwareVersion).toBe('1.0.0');
    expect(toVehicle(row({ firmwareVersion: null, tracker: null }), { staff: true, now: NOW })).not.toHaveProperty('firmwareVersion');
  });
});

describe('painel de bancada (2026-11-03): hora da posição (positionAt)', () => {
  it('staff recebe positionAt (hora da medição de lat/lng); sem a coluna, ausente', () => {
    const at = ago(5 * 60_000);
    expect(toVehicle(row({ positionAt: at }), { staff: true, now: NOW })).toMatchObject({ positionAt: at.toISOString() });
    expect(toVehicle(row({ positionAt: null }), { staff: true, now: NOW })).not.toHaveProperty('positionAt');
  });

  it('devolução sem GPS (2026-11-04): cliente recebe positionAt junto com a posição visível; com a posição oculta, não', () => {
    const at = ago(5 * 60_000);
    expect(toVehicle(row({ positionAt: at }), { staff: false, now: NOW })).toMatchObject({ positionAt: at.toISOString() });
    expect(toVehicle(row({ positionAt: null }), { staff: false, now: NOW })).not.toHaveProperty('positionAt');
    expect(toVehicle(row({ positionAt: at }), { staff: false, hideLocation: true, now: NOW })).not.toHaveProperty('positionAt');
  });
});

describe('painel de bancada (2026-11-03): bateria instalada numa moto sem leitura', () => {
  it('battery.chargeKnown false quando a moto não tem leitura (batteryKnown false)', () => {
    const battery = { id: 'b1', serial: 'BT-1', chargePct: 63, cycleCount: 2, status: 'in_vehicle', vehicleId: 'v1', holderId: null, stationId: null, depotId: null, updatedAt: ago(1e3) } as any;
    expect((toVehicle(row({ batteryKnown: false }), { staff: true, now: NOW, battery }) as any).battery).toMatchObject({ serial: 'BT-1', chargeKnown: false });
    expect((toVehicle(row(), { staff: true, now: NOW, battery }) as any).battery).not.toHaveProperty('chargeKnown');
  });
});
