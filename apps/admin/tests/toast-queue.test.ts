import { describe, expect, it } from 'vitest';
import { markLeaving, pushToast, removeToast, toastDuration, type ToastItem } from '@/lib/toast-queue';

const t = (id: number, msg = `m${id}`): ToastItem => ({ id, msg, tone: 'success' });

describe('fila de toasts', () => {
  it('empilha e marca os mais antigos para sair acima do limite', () => {
    let l: ToastItem[] = [];
    for (let i = 1; i <= 4; i++) l = pushToast(l, t(i), 3);
    expect(l.map((x) => [x.id, !!x.leaving])).toEqual([[1, true], [2, false], [3, false], [4, false]]);
  });
  it('mensagem repetida não duplica, só renova', () => {
    const l = pushToast([t(1, 'Cerca criada')], t(2, 'Cerca criada'));
    expect(l).toHaveLength(1);
    expect(l[0].id).toBe(2);
  });
  it('sair e remover', () => {
    const l = markLeaving([t(1), t(2)], 1);
    expect(l[0].leaving).toBe(true);
    expect(removeToast(l, 1).map((x) => x.id)).toEqual([2]);
  });
  it('erro fica mais tempo na tela', () => {
    expect(toastDuration('danger')).toBeGreaterThan(toastDuration('success'));
  });
});
