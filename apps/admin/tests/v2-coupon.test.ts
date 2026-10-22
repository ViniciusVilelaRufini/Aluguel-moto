import { describe, expect, it } from 'vitest';
import { couponLimitsError } from '@/lib/coupon';

describe('limites do cupom', () => {
  it('aceita vazio (sem limite) e inteiros a partir de 1', () => {
    expect(couponLimitsError('', '')).toBeNull();
    expect(couponLimitsError('100', '1')).toBeNull();
  });
  it('usos por cliente precisa ser inteiro >= 1', () => {
    expect(couponLimitsError('', '1.5')).toBe('Usos por cliente: número inteiro a partir de 1');
    expect(couponLimitsError('', '0')).toBe('Usos por cliente: número inteiro a partir de 1');
    expect(couponLimitsError('', 'abc')).toBe('Usos por cliente: número inteiro a partir de 1');
  });
  it('limite total também é inteiro >= 1', () => {
    expect(couponLimitsError('2.5', '1')).toBe('Limite de usos: número inteiro a partir de 1');
  });
});
