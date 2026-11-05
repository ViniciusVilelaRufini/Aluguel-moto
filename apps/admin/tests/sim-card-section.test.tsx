import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

let listItems: unknown[] = [];
vi.mock('@tanstack/react-query', async (orig) => {
  const real = await orig<typeof import('@tanstack/react-query')>();
  return {
    ...real,
    useQuery: () => ({ data: { items: listItems }, isLoading: false, error: null }),
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

describe('SimFormModal — observações (M7)', () => {
  it('cadastro mostra o campo Observações', async () => {
    listItems = [];
    const { SimFormModal } = await import('@/components/tracker/SimCardSection');
    const html = renderToStaticMarkup(<SimFormModal title="Cadastrar chip" vehicleId="v1" onClose={() => {}} onDone={() => {}} />);
    expect(text(html)).toContain('Observações');
    expect(html).toContain('data-testid="sim-notes"');
  });
  it('edição preenche as observações do chip (lidas da lista de chips)', async () => {
    listItems = [{ ...chip, notes: 'Chip reserva do galpão', vehicleId: 'v1', vehicleCode: 'M-1', createdAt: 'x', updatedAt: 'x' }];
    const { SimFormModal } = await import('@/components/tracker/SimCardSection');
    const html = renderToStaticMarkup(<SimFormModal title="Editar chip" initial={chip} simId="s1" onClose={() => {}} onDone={() => {}} />);
    expect(html).toContain('Chip reserva do galpão');
  });
  it('simCardBody: notes com trim, vazio vira null, intocado não vai no corpo; limite de 500', async () => {
    const { simCardBody, SIM_NOTES_MAX } = await import('@/components/tracker/SimCardSection');
    const base = { iccid: '8955171234567890123', carrier: ' Algar ', msisdn: '', apn: ' ', status: 'active' as const };
    expect(simCardBody({ ...base, notes: '  reserva  ' })).toEqual({ iccid: base.iccid, carrier: 'Algar', msisdn: null, apn: null, status: 'active', notes: 'reserva' });
    expect(simCardBody({ ...base, notes: '   ' })).toMatchObject({ notes: null });
    expect(simCardBody({ ...base, notes: null })).not.toHaveProperty('notes');
    expect(SIM_NOTES_MAX).toBe(500);
  });
});
