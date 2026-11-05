import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@tanstack/react-query', async (orig) => {
  const real = await orig<typeof import('@tanstack/react-query')>();
  return {
    ...real,
    useQuery: () => ({ data: { items: [] }, isLoading: false, error: null }),
    useQueryClient: () => ({ invalidateQueries() {}, setQueryData() {} }),
    useMutation: () => ({ mutateAsync: async () => ({}), isPending: false }),
  };
});

const chip = { id: 's1', iccid: '8955171234567890123', msisdn: '+5511999990000', carrier: 'Algar', apn: 'indica.algar.br', status: 'active' as const };
const text = (html: string) => html.replace(/<[^>]*>/g, '|');

describe('SimCardSection', () => {
  it('mostra ICCID, operadora, APN e situação', async () => {
    const { SimCardSection } = await import('@/components/tracker/SimCardSection');
    const t = text(renderToStaticMarkup(<SimCardSection vehicleId="v1" simCard={chip} groups={['admin']} />));
    expect(t).toContain('8955171234567890123');
    expect(t).toContain('Algar');
    expect(t).toContain('indica.algar.br');
    expect(t).toContain('Ativo');
    expect(t).toContain('Desvincular');
  });
  it('sem chip: aviso e botão só para admin', async () => {
    const { SimCardSection } = await import('@/components/tracker/SimCardSection');
    const a = text(renderToStaticMarkup(<SimCardSection vehicleId="v1" simCard={null} groups={['admin']} />));
    expect(a).toContain('Nenhum chip vinculado');
    expect(a).toContain('Vincular chip');
    const o = text(renderToStaticMarkup(<SimCardSection vehicleId="v1" simCard={null} groups={['operacao']} />));
    expect(o).toContain('Nenhum chip vinculado');
    expect(o).not.toContain('Vincular chip');
  });
});
