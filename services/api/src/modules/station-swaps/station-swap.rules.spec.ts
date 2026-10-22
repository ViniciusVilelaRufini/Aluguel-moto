import { isStationOpen, nextStepAfter, swapFeeCents, SWAP_MAX_DISTANCE_M, vehicleStationary, withinSwapRange } from './station-swap.rules';

const live = (o: Partial<{ locked: boolean; online: boolean; speedKmh: number }> = {}) => ({
  thingName: 'moto-0001', lat: 0, lng: 0, speedKmh: 0, batteryPct: 20, locked: false, ignition: true, signal: 4, speedLimitKmh: 32,
  stolenMode: false, online: true, lastSeenAt: new Date().toISOString(), ...o,
});

describe('moto parada (mesma regra do bloqueio: velocidade desconhecida = em movimento)', () => {
  it('velocidade 0 conhecida e fresca → parada', () => {
    expect(vehicleStationary({ rentalStatus: 'active', live: live(), knownSpeedKmh: 0 })).toBe(true);
  });
  it('velocidade desconhecida (null) → em movimento, mesmo com a última leitura 0', () => {
    expect(vehicleStationary({ rentalStatus: 'active', live: live({ speedKmh: 0 }), knownSpeedKmh: null })).toBe(false);
    expect(vehicleStationary({ rentalStatus: 'active', live: null, knownSpeedKmh: null })).toBe(false);
  });
  it('velocidade > 0 → em movimento (até 0,5 km/h)', () => {
    expect(vehicleStationary({ rentalStatus: 'active', live: live(), knownSpeedKmh: 0.5 })).toBe(false);
    expect(vehicleStationary({ rentalStatus: 'active', live: live(), knownSpeedKmh: 12 })).toBe(false);
  });
  it('travada e online → parada (a trava só acontece abaixo de 3 km/h)', () => {
    expect(vehicleStationary({ rentalStatus: 'active', live: live({ locked: true }), knownSpeedKmh: null })).toBe(true);
  });
  it('travada mas offline não conta (estado velho)', () => {
    expect(vehicleStationary({ rentalStatus: 'active', live: live({ locked: true, online: false }), knownSpeedKmh: null })).toBe(false);
  });
  it('fix 1 (I3): aluguel pausado só conta com a moto travada e online ou velocidade 0 fresca; pausado com velocidade desconhecida → recusa', () => {
    expect(vehicleStationary({ rentalStatus: 'paused', live: null, knownSpeedKmh: null })).toBe(false);
    expect(vehicleStationary({ rentalStatus: 'paused', live: live({ locked: false }), knownSpeedKmh: null })).toBe(false);
    expect(vehicleStationary({ rentalStatus: 'paused', live: live({ locked: true, online: false }), knownSpeedKmh: null })).toBe(false);
    expect(vehicleStationary({ rentalStatus: 'paused', live: live({ locked: true }), knownSpeedKmh: null })).toBe(true);
    expect(vehicleStationary({ rentalStatus: 'paused', live: null, knownSpeedKmh: 0 })).toBe(true);
  });
  it('velocidade conhecida > 0 vence a trava reportada', () => {
    expect(vehicleStationary({ rentalStatus: 'active', live: live({ locked: true }), knownSpeedKmh: 8 })).toBe(false);
  });
});

describe('distância até a estação', () => {
  const station = { lat: -23.5672, lng: -46.693 };
  it('limite de 50 m', () => {
    expect(SWAP_MAX_DISTANCE_M).toBe(50);
    expect(withinSwapRange({ lat: -23.5672, lng: -46.693 }, station)).toEqual({ ok: true, distanceM: 0 });
    // ~33 m ao norte
    expect(withinSwapRange({ lat: -23.5669, lng: -46.693 }, station).ok).toBe(true);
    // ~67 m ao norte
    const far = withinSwapRange({ lat: -23.5666, lng: -46.693 }, station);
    expect(far.ok).toBe(false);
    expect(far.distanceM).toBeGreaterThan(50);
  });
});

describe('estação aberta', () => {
  // 2026-10-22 é quinta-feira. 15:00Z = 12:00 em São Paulo (UTC−3).
  const thuNoon = new Date('2026-10-22T15:00:00Z');
  const thuLate = new Date('2026-10-23T02:30:00Z'); // qui 23:30 local
  const sunNoon = new Date('2026-10-25T15:00:00Z');
  const satNoon = new Date('2026-10-24T15:00:00Z');

  it('open24h sempre aberta', () => {
    expect(isStationOpen({ open24h: true, openingHours: 'Seg a sex, 7h às 20h' }, sunNoon)).toBe(true);
  });
  it('dias e horário interpretados no fuso de São Paulo', () => {
    const s = { open24h: false, openingHours: 'Seg a sáb, 7h às 22h' };
    expect(isStationOpen(s, thuNoon)).toBe(true);
    expect(isStationOpen(s, thuLate)).toBe(false);
    expect(isStationOpen(s, satNoon)).toBe(true);
    expect(isStationOpen(s, sunNoon)).toBe(false);
  });
  it('seg a sex fecha no sábado; minutos e "a"/"-" como separador', () => {
    expect(isStationOpen({ open24h: false, openingHours: 'Seg a sex, 7h às 20h' }, satNoon)).toBe(false);
    expect(isStationOpen({ open24h: false, openingHours: 'Seg a sex, 7h30 - 12h' }, thuNoon)).toBe(false);
    expect(isStationOpen({ open24h: false, openingHours: 'Seg a sex, 7h30 a 12h01' }, thuNoon)).toBe(true);
  });
  it('"todos os dias" e "24 h"', () => {
    expect(isStationOpen({ open24h: false, openingHours: 'Todos os dias, 24 h' }, sunNoon)).toBe(true);
    expect(isStationOpen({ open24h: false, openingHours: 'Todos os dias, 8h às 11h' }, sunNoon)).toBe(false);
  });
  it('horário que vira a noite (18h às 2h)', () => {
    expect(isStationOpen({ open24h: false, openingHours: 'Todos os dias, 18h às 2h' }, thuLate)).toBe(true);
    expect(isStationOpen({ open24h: false, openingHours: 'Todos os dias, 18h às 2h' }, thuNoon)).toBe(false);
  });
  it('texto que não dá para interpretar → libera (o operador mantém o cadastro)', () => {
    expect(isStationOpen({ open24h: false, openingHours: 'Horário do shopping' }, sunNoon)).toBe(true);
    expect(isStationOpen({ open24h: false, openingHours: '' }, sunNoon)).toBe(true);
  });
});

describe('taxa por troca', () => {
  it('grátis nos planos diário/semanal/mensal; taxa configurada nos planos por minuto e por hora', () => {
    expect(swapFeeCents('minute', 500)).toBe(500);
    expect(swapFeeCents('hour', 700)).toBe(700);
    expect(swapFeeCents('day', 500)).toBe(0);
    expect(swapFeeCents('weekly', 500)).toBe(0);
    expect(swapFeeCents('monthly', 500)).toBe(0);
  });
  it('nunca negativa', () => {
    expect(swapFeeCents('minute', -10)).toBe(0);
  });
});

describe('máquina de estados (eventos da estação)', () => {
  it('caminho feliz', () => {
    expect(nextStepAfter('opening_slot', 'slot_opened')).toBe('awaiting_return');
    expect(nextStepAfter('awaiting_return', 'battery_returned')).toBe('returned');
    expect(nextStepAfter('returned', 'slot_closed')).toBe('releasing');
    expect(nextStepAfter('releasing', 'battery_released')).toBe('completed');
  });
  it('vaga fechada sem devolução cancela; liberar nunca acontece sem devolução', () => {
    expect(nextStepAfter('awaiting_return', 'slot_closed')).toBe('canceled');
    expect(nextStepAfter('opening_slot', 'battery_released')).toBeNull();
    expect(nextStepAfter('awaiting_return', 'battery_released')).toBeNull();
  });
  it('eventos fora de ordem e repetidos são ignorados; troca encerrada não muda', () => {
    expect(nextStepAfter('opening_slot', 'battery_returned')).toBe('returned');
    expect(nextStepAfter('returned', 'battery_returned')).toBeNull();
    expect(nextStepAfter('completed', 'battery_released')).toBeNull();
    expect(nextStepAfter('canceled', 'slot_opened')).toBeNull();
  });
});
