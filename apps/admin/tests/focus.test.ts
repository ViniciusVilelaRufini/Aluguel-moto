import { describe, expect, it } from 'vitest';
import { cycleFocusIndex, dialogStack } from '@/lib/focus';

describe('foco preso no diálogo', () => {
  it('Tab no último volta ao primeiro; Shift+Tab no primeiro vai ao último', () => {
    expect(cycleFocusIndex(3, 2, false)).toBe(0);
    expect(cycleFocusIndex(3, 0, true)).toBe(2);
    expect(cycleFocusIndex(3, 1, false)).toBe(2);
  });
  it('foco fora do diálogo entra pelo começo (ou pelo fim com Shift)', () => {
    expect(cycleFocusIndex(4, -1, false)).toBe(0);
    expect(cycleFocusIndex(4, -1, true)).toBe(3);
  });
  it('sem elementos focáveis não há destino', () => {
    expect(cycleFocusIndex(0, -1, false)).toBe(-1);
  });
  it('Esc só fecha o diálogo do topo da pilha', () => {
    const a = Symbol('a');
    const b = Symbol('b');
    dialogStack.push(a);
    dialogStack.push(b);
    expect(dialogStack.isTop(a)).toBe(false);
    expect(dialogStack.isTop(b)).toBe(true);
    dialogStack.remove(b);
    expect(dialogStack.isTop(a)).toBe(true);
    dialogStack.remove(a);
    expect(dialogStack.size()).toBe(0);
  });
});
