export interface Page<T> { items: T[]; nextCursor?: string }

/**
 * Busca páginas por cursor até acabar ou até `maxPages` (padrão 20 × 100 = 2000 itens).
 * `capped` indica que ainda havia páginas: a tela avisa que a lista está incompleta.
 */
export async function loadAllPages<T>(get: (cursor?: string) => Promise<Page<T>>, maxPages = 20): Promise<{ items: T[]; capped: boolean }> {
  const items: T[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await get(cursor);
    items.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) return { items, capped: false };
  }
  return { items, capped: true };
}
