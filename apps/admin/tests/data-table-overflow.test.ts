import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchOverflow } from '@/components/ui';

afterEach(() => vi.unstubAllGlobals());

describe('watchOverflow', () => {
  it('reporta o transbordo e reage ao redimensionar', () => {
    let cb: () => void = () => {};
    const disconnect = vi.fn();
    const observed: unknown[] = [];
    vi.stubGlobal('ResizeObserver', class { constructor(f: () => void) { cb = f; } observe(e: unknown) { observed.push(e); } disconnect = disconnect; });
    const table = {};
    const el = { scrollWidth: 1200, clientWidth: 900, firstElementChild: table } as unknown as HTMLElement;
    const seen: boolean[] = [];
    const stop = watchOverflow(el, (v) => seen.push(v));
    expect(seen).toEqual([true]);
    expect(observed).toEqual([el, table]);
    (el as { scrollWidth: number }).scrollWidth = 900;
    cb();
    expect(seen).toEqual([true, false]);
    stop();
    expect(disconnect).toHaveBeenCalled();
  });
  it('sem ResizeObserver mede uma vez e não quebra', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const seen: boolean[] = [];
    watchOverflow({ scrollWidth: 500, clientWidth: 500, firstElementChild: null } as unknown as HTMLElement, (v) => seen.push(v))();
    expect(seen).toEqual([false]);
  });
});
