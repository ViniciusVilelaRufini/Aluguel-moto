import { describe, expect, it } from 'vitest';
import { deltaTone, formatDelta, tickerValue } from '@/lib/ticker';
import { formatBRL } from '@/lib/format';

describe('ticker dos indicadores', () => {
  it('interpola e arredonda inteiros; termina exatamente no destino', () => {
    expect(tickerValue(0, 10, 0.44)).toBe(4);
    expect(tickerValue(0, 10, 1)).toBe(10);
    expect(tickerValue(0, 79400, 0.5, false)).toBe(39700);
  });
  it('variação em texto curto com sinal tipográfico', () => {
    expect(formatDelta(3, 5)).toBe('+2');
    expect(formatDelta(5, 4)).toBe('−1');
    expect(formatDelta(4, 4)).toBeNull();
    expect(formatDelta(10000, 12550, formatBRL)?.replace(/\s/g, ' ')).toBe('+R$ 25,50');
  });
  it('tom depende se subir é bom ou ruim', () => {
    expect(deltaTone(1, 2, 'up')).toBe('success');
    expect(deltaTone(1, 2, 'down')).toBe('danger');
    expect(deltaTone(2, 1, 'down')).toBe('success');
    expect(deltaTone(2, 2, 'up')).toBeNull();
  });
});
