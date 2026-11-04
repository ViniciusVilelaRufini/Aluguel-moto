import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { S } from '@/lib/types';
import { GPS_SLEEP_LOCK_WARNING, WEAK_GPS_SATELLITES, gpsMapNote, gpsState, gpsView } from '@/lib/vehicle-live';
import { CommandDialog } from '@/components/VehicleSheet';

type Vehicle = S<'Vehicle'>;
const NOW = Date.parse('2026-11-04T12:00:00.000Z');
const fresh = '2026-11-04T11:59:50.000Z';
const old = '2026-11-04T11:55:00.000Z';
const base: Vehicle = {
  id: 'v1', code: 'VLT-0059', model: 'Volti Flash', status: 'free', lat: -23.5, lng: -46.6, batteryPct: 80, estimatedRangeKm: 40,
  speedLimitKmh: 32, online: true, locked: false, lastSeenAt: fresh, createdAt: fresh, positionAt: fresh,
};

describe('linha GPS da ficha', () => {
  it('bom (>= 5 satélites)', () => {
    expect(gpsView({ ...base, gpsSatellites: 14 }, NOW)).toEqual({ state: 'ok', text: '14 satélites' });
    expect(gpsView({ ...base, gpsSatellites: WEAK_GPS_SATELLITES }, NOW).state).toBe('ok');
  });
  it('fraco (< 5 satélites)', () => {
    expect(gpsView({ ...base, gpsSatellites: 3 }, NOW)).toEqual({ state: 'weak', text: '3 satélites (sinal fraco)' });
    expect(gpsView({ ...base, gpsSatellites: 1 }, NOW).text).toBe('1 satélite (sinal fraco)');
  });
  it('dormindo vence os demais', () => {
    expect(gpsView({ ...base, gpsSleep: true, gpsSatellites: 0, positionAt: old }, NOW)).toEqual({ state: 'sleep', text: 'Dormindo (ignição desligada)' });
  });
  it('desconhecido', () => {
    expect(gpsView(base, NOW)).toEqual({ state: 'unknown', text: '—' });
  });
  it('combina com a idade da posição quando ela é velha', () => {
    expect(gpsView({ ...base, gpsSatellites: 14, positionAt: old }, NOW)).toEqual({ state: 'no_gps', text: '14 satélites · posição de há 5 min' });
    expect(gpsView({ ...base, positionAt: old }, NOW).text).toBe('Sem GPS · posição de há 5 min');
  });
});

describe('estado no mapa', () => {
  it('só avisa fraco, dormindo e sem GPS', () => {
    expect(gpsMapNote(gpsState({ ...base, gpsSatellites: 2 }, NOW))).toBe('GPS fraco');
    expect(gpsMapNote(gpsState({ ...base, gpsSleep: true }, NOW))).toBe('GPS dormindo (ignição desligada)');
    expect(gpsMapNote(gpsState({ ...base, positionAt: old }, NOW))).toBe('Sem GPS recente');
    expect(gpsMapNote(gpsState({ ...base, gpsSatellites: 10 }, NOW))).toBeUndefined();
    expect(gpsMapNote(gpsState(base, NOW))).toBeUndefined();
  });
});

describe('diálogo de Bloquear', () => {
  const render = (type: 'lock' | 'unlock', v: Vehicle) =>
    renderToStaticMarkup(<CommandDialog type={type} vehicle={v} mode="relay_only" moving={false} speedUnknown={false} onClose={() => {}} onSend={async () => {}} />);
  it('avisa quando o GPS está dormindo', () => {
    expect(render('lock', { ...base, gpsSleep: true })).toContain(GPS_SLEEP_LOCK_WARNING);
  });
  it('sem aviso com o GPS acordado ou em outros comandos', () => {
    expect(render('lock', { ...base, gpsSleep: false })).not.toContain('dormindo');
    expect(render('unlock', { ...base, gpsSleep: true })).not.toContain('dormindo');
  });
});
