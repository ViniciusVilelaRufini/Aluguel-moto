import { describe, expect, it } from 'vitest';
import { assertSpeedLimit } from '@/lib/speed-limit';

describe('assertSpeedLimit', () => {
  it('accepts integers from 0 to 32', () => {
    expect(() => assertSpeedLimit(0)).not.toThrow();
    expect(() => assertSpeedLimit(20)).not.toThrow();
    expect(() => assertSpeedLimit(32)).not.toThrow();
  });
  it('rejects above 32 with the 32 km/h message', () => {
    expect(() => assertSpeedLimit(33)).toThrow('Máximo de 32 km/h');
    expect(() => assertSpeedLimit(40)).toThrow('Máximo de 32 km/h');
  });
  it('rejects negative, fractional and non-numeric values', () => {
    expect(() => assertSpeedLimit(-1)).toThrow();
    expect(() => assertSpeedLimit(10.5)).toThrow();
    expect(() => assertSpeedLimit(Number.NaN)).toThrow();
    expect(() => assertSpeedLimit(undefined)).toThrow('Informe o limite de velocidade');
  });
});
