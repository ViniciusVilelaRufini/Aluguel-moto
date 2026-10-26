import { describe, expect, it } from 'vitest';
import { validateZone } from '@/lib/zone-validation';

const poly = { type: 'Polygon' as const, coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] };

describe('validateZone', () => {
  it('requires a name and a polygon', () => {
    expect(validateZone({ name: '', type: 'operation', geometry: poly }).name).toBeTruthy();
    expect(validateZone({ name: 'A', type: 'operation', geometry: undefined }).geometry).toBeTruthy();
  });
  it('requires a speed limit for reduced_speed', () => {
    const e = validateZone({ name: 'A', type: 'reduced_speed', geometry: poly });
    expect(e.speedLimitKmh).toBe('Informe o limite de velocidade');
  });
  it('rejects reduced_speed above 20 with the 20 km/h message', () => {
    const e = validateZone({ name: 'A', type: 'reduced_speed', speedLimitKmh: 25, geometry: poly });
    expect(e.speedLimitKmh).toBe('Máximo de 20 km/h em zona de velocidade reduzida');
  });
  it('rejects any limit above 32 with the 32 km/h message', () => {
    const e = validateZone({ name: 'A', type: 'reduced_speed', speedLimitKmh: 40, geometry: poly });
    expect(e.speedLimitKmh).toBe('Máximo de 32 km/h');
    const e2 = validateZone({ name: 'A', type: 'operation', speedLimitKmh: 33, geometry: poly });
    expect(e2.speedLimitKmh).toBe('Máximo de 32 km/h');
  });
  it('rejects negative limits', () => {
    expect(validateZone({ name: 'A', type: 'reduced_speed', speedLimitKmh: -1, geometry: poly }).speedLimitKmh).toBeTruthy();
  });
  it('rejects reduced_speed below 6 (pedestrian minimum, same rule as the API)', () => {
    for (const kmh of [0, 3, 5]) {
      expect(validateZone({ name: 'A', type: 'reduced_speed', speedLimitKmh: kmh, geometry: poly }).speedLimitKmh).toBe('Mínimo de 6 km/h em zona de velocidade reduzida');
    }
  });
  it('accepts valid zones', () => {
    expect(validateZone({ name: 'A', type: 'reduced_speed', speedLimitKmh: 6, geometry: poly })).toEqual({});
    expect(validateZone({ name: 'A', type: 'reduced_speed', speedLimitKmh: 20, geometry: poly })).toEqual({});
    expect(validateZone({ name: 'A', type: 'forbidden', geometry: poly })).toEqual({});
  });
});
