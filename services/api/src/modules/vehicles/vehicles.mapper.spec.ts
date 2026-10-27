import { onlineWindowMs, toVehicle, trackerOnline } from './vehicles.mapper';

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
