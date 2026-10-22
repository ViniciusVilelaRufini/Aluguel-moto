import { accumulateUsage } from './usage-accumulator';

const t0 = Date.parse('2026-10-22T12:00:00Z');
const s = (over: Partial<{ lat: number; lng: number; ts: number; ignition: boolean; speedKmh: number }> = {}) => ({ lat: -23.5614, lng: -46.6559, ts: t0, ignition: true, speedKmh: 20, ...over });

describe('odômetro e horas de uso pela telemetria', () => {
  it('primeira amostra não soma nada', () => {
    expect(accumulateUsage(undefined, s())).toEqual({ km: 0, hours: 0 });
  });

  it('soma a distância e o tempo com ignição ligada', () => {
    // ~111 m para o norte em 20 s (≈ 20 km/h)
    const r = accumulateUsage(s(), s({ lat: -23.5604, ts: t0 + 20_000 }));
    expect(r.km).toBeCloseTo(0.111, 2);
    expect(r.hours).toBeCloseTo(20 / 3600, 6);
  });

  it('ignição desligada não soma horas; parada sem ignição não soma km', () => {
    expect(accumulateUsage(s({ ignition: false }), s({ ignition: false, ts: t0 + 60_000 })).hours).toBe(0);
    expect(accumulateUsage(s({ ignition: false, speedKmh: 0 }), s({ ignition: false, speedKmh: 0, lat: -23.5604, ts: t0 + 60_000 })).km).toBe(0);
  });

  it('descarta ruído (< 5 m), salto de GPS (> 45 km/h implícitos), lacunas > 10 min e amostras fora de ordem', () => {
    expect(accumulateUsage(s(), s({ lat: -23.56142, ts: t0 + 5000 })).km).toBe(0);
    expect(accumulateUsage(s(), s({ lat: -23.5514, ts: t0 + 5000 })).km).toBe(0); // 1,1 km em 5 s
    expect(accumulateUsage(s(), s({ lat: -23.5604, ts: t0 + 11 * 60_000 }))).toEqual({ km: 0, hours: 0 });
    expect(accumulateUsage(s({ ts: t0 + 5000 }), s())).toEqual({ km: 0, hours: 0 });
  });
});
