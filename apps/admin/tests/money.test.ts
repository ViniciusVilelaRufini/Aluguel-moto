import { describe, expect, it } from 'vitest';
import { formatBRL } from '@/lib/format';

describe('formatBRL', () => {
  it('formats cents', () => {
    expect(formatBRL(7900).replace(/\s/g, ' ')).toBe('R$ 79,00');
    expect(formatBRL(0).replace(/\s/g, ' ')).toBe('R$ 0,00');
  });
});
