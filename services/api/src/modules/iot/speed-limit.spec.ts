import { InvalidSpeedLimitError } from '../../ports/iot-gateway.port';
import { assertSpeedLimit, effectiveZoneLimit, safeLockSteps } from './speed-limit';

describe('speed-limit', () => {
  it.each([33, -1, 6.5, Number.NaN, Number.POSITIVE_INFINITY, 100])('rejeita %p sem truncar', (v) => {
    expect(() => assertSpeedLimit(v)).toThrow(InvalidSpeedLimitError);
  });

  it.each([0, 3, 6, 20, 32])('aceita %p', (v) => {
    expect(assertSpeedLimit(v)).toBe(v);
  });

  it('limite efetivo: sem zona → 32; menor limite entre as zonas', () => {
    expect(effectiveZoneLimit([])).toBe(32);
    expect(effectiveZoneLimit([20, 6])).toBe(6);
    expect(effectiveZoneLimit([20])).toBe(20);
  });

  it('limite efetivo nunca passa de 32 (zona mal configurada é ignorada para cima)', () => {
    expect(effectiveZoneLimit([40])).toBe(32);
  });

  it('degraus da rampa: min(atual,15) → 8 → 3 → 0, sem subir o limite', () => {
    expect(safeLockSteps(32)).toEqual([15, 8, 3, 0]);
    expect(safeLockSteps(20)).toEqual([15, 8, 3, 0]);
    expect(safeLockSteps(15)).toEqual([15, 8, 3, 0]);
    expect(safeLockSteps(6)).toEqual([6, 3, 0]);
    expect(safeLockSteps(0)).toEqual([0]);
  });
});
