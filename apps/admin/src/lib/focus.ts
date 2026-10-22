/** Seletor dos elementos que recebem foco por Tab dentro de um diálogo. */
export const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Próximo índice no ciclo de foco (prende o Tab dentro do diálogo).
 * `current` = -1 quando o foco está fora da lista.
 */
export function cycleFocusIndex(count: number, current: number, backwards: boolean): number {
  if (count <= 0) return -1;
  if (current < 0) return backwards ? count - 1 : 0;
  return backwards ? (current - 1 + count) % count : (current + 1) % count;
}

/** Pilha de diálogos abertos: só o do topo responde ao Esc. */
const stack: symbol[] = [];
export const dialogStack = {
  push(id: symbol) { stack.push(id); },
  remove(id: symbol) { const i = stack.lastIndexOf(id); if (i >= 0) stack.splice(i, 1); },
  isTop(id: symbol) { return stack[stack.length - 1] === id; },
  size() { return stack.length; },
};
