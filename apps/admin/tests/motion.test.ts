import { describe, expect, it, vi } from 'vitest';
import { easeOutCubic, motionDuration, prefersReducedMotion, tween, REDUCED_MOTION_QUERY } from '@/lib/motion';

describe('prefers-reduced-motion', () => {
  it('lê a media query do sistema', () => {
    const mm = vi.fn((q: string) => ({ matches: q === REDUCED_MOTION_QUERY }));
    expect(prefersReducedMotion(mm)).toBe(true);
    expect(mm).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
  });
  it('sem matchMedia (export estático) assume movimento normal', () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
    expect(prefersReducedMotion(() => { throw new Error('x'); })).toBe(false);
  });
  it('zera a duração com movimento reduzido', () => {
    expect(motionDuration(320, true)).toBe(0);
    expect(motionDuration(320, false)).toBe(320);
  });
});

describe('tween', () => {
  it('com movimento reduzido aplica o valor final de uma vez', () => {
    const seen: number[] = [];
    const done = vi.fn();
    tween({ duration: 500, reduced: true, onUpdate: (t) => seen.push(t), onDone: done });
    expect(seen).toEqual([1]);
    expect(done).toHaveBeenCalledOnce();
  });
  it('avança quadro a quadro até 1 e pode ser cancelado', () => {
    let clock = 0;
    const frames: ((ts: number) => void)[] = [];
    const raf = (cb: (ts: number) => void) => frames.push(cb);
    const seen: number[] = [];
    tween({ duration: 100, onUpdate: (t) => seen.push(t), raf, caf: () => {}, now: () => clock, ease: (t) => t });
    clock = 50; frames.shift()!(0);
    clock = 120; frames.shift()!(0);
    expect(seen).toEqual([0.5, 1]);
    expect(frames).toHaveLength(0);

    const seen2: number[] = [];
    clock = 0;
    const cancel = tween({ duration: 100, onUpdate: (t) => seen2.push(t), raf, caf: () => {}, now: () => clock, ease: (t) => t });
    cancel();
    clock = 50; frames.shift()?.(0);
    expect(seen2).toEqual([]);
  });
  it('easeOutCubic começa rápido e termina em 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});
