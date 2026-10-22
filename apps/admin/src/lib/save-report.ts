/** Salvamento em lote com relatório: continua depois de uma falha e informa o que foi salvo e o que não foi. */

export interface SaveStep { key: string; label: string; run: () => Promise<unknown> }
export interface SaveReport { saved: string[]; failed: { key: string; label: string; error: unknown }[] }

export async function runSaveSteps(steps: SaveStep[]): Promise<SaveReport> {
  const report: SaveReport = { saved: [], failed: [] };
  for (const s of steps) {
    try { await s.run(); report.saved.push(s.key); } catch (error) { report.failed.push({ key: s.key, label: s.label, error }); }
  }
  return report;
}

export function reportMessage(r: SaveReport, savedLabels: Record<string, string>): string | null {
  if (r.failed.length === 0) return null;
  const ok = r.saved.map((k) => savedLabels[k] ?? k);
  return `${ok.length ? `Salvos: ${ok.join(', ')}. ` : 'Nada foi salvo. '}Não salvos: ${r.failed.map((f) => f.label).join(', ')}.`;
}
