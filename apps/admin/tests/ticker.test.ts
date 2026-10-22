import { describe, expect, it } from 'vitest';
import { createTicker, deltaTone, formatDelta, tickerValue } from '@/lib/ticker';
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

describe('controlador do ticker (AnimatedNumber)', () => {
  const setup = () => {
    let clock = 0;
    const frames: (() => void)[] = [];
    const shown: number[] = [];
    const t = createTicker({ initial: 0, duration: 100, onShow: (n) => shown.push(n), raf: (cb) => frames.push(() => cb(0)), caf: () => {}, now: () => clock });
    const advance = (to: number) => { clock = to; const f = frames.splice(0); f.forEach((fn) => fn()); };
    return { t, shown, advance, frames };
  };

  it('efeito duplo do StrictMode (inicia, cancela, inicia) ainda chega ao alvo', () => {
    const { t, advance } = setup();
    t.to(42);
    t.stop(); // limpeza do primeiro efeito
    t.to(42); // segundo efeito: parte do que está na tela (0), não desiste
    advance(50);
    advance(200);
    expect(t.shown).toBe(42);
  });

  it('mudança no meio da animação continua do valor exibido, sem salto', () => {
    const { t, shown, advance } = setup();
    t.to(100);
    advance(50); // ~87 com easeOutCubic
    const mid = t.shown;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);
    t.stop();
    t.to(10);
    advance(51); // primeiro quadro da nova animação
    const first = shown[shown.length - 1];
    expect(first).toBeLessThanOrEqual(mid);
    expect(first).toBeGreaterThanOrEqual(10);
    advance(500);
    expect(t.shown).toBe(10);
  });

  it('com movimento reduzido vai direto ao alvo', () => {
    const shown: number[] = [];
    const t = createTicker({ initial: 0, duration: 700, onShow: (n) => shown.push(n), reduced: () => true });
    t.to(7);
    expect(shown).toEqual([7]);
  });
});
