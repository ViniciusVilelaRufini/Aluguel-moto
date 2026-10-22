import { describe, expect, it } from 'vitest';
import { reportMessage, runSaveSteps } from '@/lib/save-report';

describe('runSaveSteps', () => {
  it('continua depois da falha e lista salvos e falhos', async () => {
    const r = await runSaveSteps([
      { key: 'a', label: 'Minuto', run: async () => 1 },
      { key: 'b', label: 'Hora', run: async () => { throw new Error('boom'); } },
      { key: 'c', label: 'Diária', run: async () => 3 },
    ]);
    expect(r.saved).toEqual(['a', 'c']);
    expect(r.failed.map((f) => f.key)).toEqual(['b']);
    expect(reportMessage(r, { a: 'Minuto', c: 'Diária' })).toBe('Salvos: Minuto, Diária. Não salvos: Hora.');
  });
  it('sem falhas não há mensagem', async () => {
    const r = await runSaveSteps([{ key: 'a', label: 'A', run: async () => 1 }]);
    expect(reportMessage(r, {})).toBeNull();
  });
  it('tudo falhou', async () => {
    const r = await runSaveSteps([{ key: 'a', label: 'A', run: async () => { throw new Error('x'); } }]);
    expect(reportMessage(r, {})).toBe('Nada foi salvo. Não salvos: A.');
  });
});
