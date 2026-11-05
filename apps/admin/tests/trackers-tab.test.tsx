import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { imeiLast4, trackerStatusLabel } from '@/lib/trackers';
import { can, canOpen } from '@/lib/permissions';

const NOW = Date.parse('2026-11-05T15:00:00.000Z');
const base = {
  id: 't1', imei: '869890080273430', model: 'J16' as const, installed: false, vehicleId: null, vehicleCode: null, simCard: null,
  online: false, lastSeenAt: null as string | null, createdAt: '2026-11-01T12:00:00.000Z',
};

let items: unknown[] = [];
vi.mock('@tanstack/react-query', async (orig) => {
  const real = await orig<typeof import('@tanstack/react-query')>();
  return {
    ...real,
    useQuery: () => ({ data: { items }, isLoading: false, error: null }),
    useQueryClient: () => ({ invalidateQueries() {}, setQueryData() {} }),
    useMutation: () => ({ mutate() {}, mutateAsync: async () => ({}), isPending: false, error: null }),
  };
});

const text = (html: string) => html.replace(/<[^>]*>/g, '|');

describe('lib/trackers', () => {
  it('trackerStatusLabel: online, offline com tempo e nunca conectou', () => {
    expect(trackerStatusLabel({ ...base, online: true, lastSeenAt: new Date(NOW - 60_000).toISOString() }, NOW)).toBe('Online');
    expect(trackerStatusLabel({ ...base, lastSeenAt: new Date(NOW - 5 * 60_000).toISOString() }, NOW)).toBe('Offline · último sinal há 5 min');
    expect(trackerStatusLabel(base, NOW)).toBe('Nunca conectou');
  });
  it('imeiLast4 devolve os 4 últimos dígitos', () => {
    expect(imeiLast4('869890080273430')).toBe('3430');
  });
  it('permissão tracker.manage: admin e operacao', () => {
    expect(can(['admin'], 'tracker.manage')).toBe(true);
    expect(can(['operacao'], 'tracker.manage')).toBe(true);
    expect(can(['suporte'], 'tracker.manage')).toBe(false);
    expect(canOpen(['operacao'], 'vehicles')).toBe(true);
  });
});

describe('TrackersTab', () => {
  it('sem rastreadores: texto de aba vazia e botão de cadastro', async () => {
    items = [];
    const { TrackersTab } = await import('@/components/trackers/TrackersTab');
    const t = text(renderToStaticMarkup(<TrackersTab groups={['operacao']} />));
    expect(t).toContain('Nenhum rastreador cadastrado. Cadastre o primeiro para poder instalar nas motos.');
    expect(t).toContain('Cadastrar rastreador');
  });
  it('lista mostra "No estoque", colunas e filtros', async () => {
    items = [base, { ...base, id: 't2', imei: '869890080273431', installed: true, vehicleId: 'v1', vehicleCode: 'M-0059', online: true, lastSeenAt: '2026-11-05T14:59:00.000Z' }];
    const { TrackersTab } = await import('@/components/trackers/TrackersTab');
    const t = text(renderToStaticMarkup(<TrackersTab groups={['admin']} />));
    expect(t).toContain('No estoque');
    expect(t).toContain('M-0059');
    for (const c of ['IMEI', 'Modelo', 'Chip', 'Instalado em', 'Sinal', 'Todos', 'Instalados']) expect(t).toContain(c);
    expect(t).toContain('869890080273430');
  });
  it('suporte lê a lista mas não vê o botão de cadastro', async () => {
    items = [];
    const { TrackersTab } = await import('@/components/trackers/TrackersTab');
    const t = text(renderToStaticMarkup(<TrackersTab groups={['suporte']} />));
    expect(t).not.toContain('Cadastrar rastreador');
  });
});

describe('CreateTrackerWizard', () => {
  it('passo 1 mostra a ajuda do IMEI e o modelo J16', async () => {
    const { CreateTrackerWizard } = await import('@/components/trackers/CreateTrackerWizard');
    const t = text(renderToStaticMarkup(<CreateTrackerWizard onClose={() => {}} onCreated={() => {}} />));
    expect(t).toContain('1. Aparelho');
    expect(t).toContain('2. Chip');
    expect(t).toContain('15 números. Está na etiqueta do aparelho ou na resposta do comando PARAM#.');
    expect(t).toContain('J16');
  });
});
