export type ToastTone = 'success' | 'info' | 'warning' | 'danger';
export interface ToastItem { id: number; msg: string; tone: ToastTone; leaving?: boolean }

/** Quantos toasts ficam visíveis ao mesmo tempo (os mais antigos saem primeiro). */
export const MAX_TOASTS = 3;

/** Tempo na tela: erros ficam mais tempo para dar tempo de ler o que fazer. */
export function toastDuration(tone: ToastTone): number {
  return tone === 'danger' ? 6000 : tone === 'warning' ? 4500 : 3200;
}

/**
 * Empilha um toast novo. Mensagem igual à última visível não duplica (renova o tempo);
 * acima do limite, os mais antigos são marcados para sair.
 */
export function pushToast(list: ToastItem[], next: ToastItem, max = MAX_TOASTS): ToastItem[] {
  const visible = list.filter((t) => !t.leaving);
  const last = visible[visible.length - 1];
  if (last && last.msg === next.msg && last.tone === next.tone) {
    return list.map((t) => (t.id === last.id ? { ...t, id: next.id } : t));
  }
  const out = [...list, next];
  let excess = out.filter((t) => !t.leaving).length - max;
  return out.map((t) => {
    if (excess > 0 && !t.leaving) { excess -= 1; return { ...t, leaving: true }; }
    return t;
  });
}

export function markLeaving(list: ToastItem[], id: number): ToastItem[] {
  return list.map((t) => (t.id === id ? { ...t, leaving: true } : t));
}

export function removeToast(list: ToastItem[], id: number): ToastItem[] {
  return list.filter((t) => t.id !== id);
}
