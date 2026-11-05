import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const tracker = {
  id: 't1', imei: '869890080273430', model: 'J16' as const, installed: true, vehicleId: 'v1', vehicleCode: 'M-0059',
  simCard: { id: 's1', iccid: '8955171234567890123', msisdn: '+5511999990000', carrier: 'Algar', apn: 'indica.algar.br', status: 'active' as const },
  online: true, lastSeenAt: new Date().toISOString(), createdAt: '2026-11-01T12:00:00.000Z',
};
const vehicle = {
  id: 'v1', code: 'M-0059', status: 'free', batteryPct: 80, estimatedRangeKm: 30, lat: -23.5, lng: -46.6,
  trackerControlMode: 'relay_only', thingName: 'moto-0059', simCard: null, depotId: null, odometerKm: 0, usageHours: 0,
};
let items: unknown[] = [];
let mutError: Error | null = null;
let authGroups: string[] = ['admin'];
vi.mock('@tanstack/react-query', async (orig) => {
  const real = await orig<typeof import('@tanstack/react-query')>();
  return {
    ...real,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      const k = queryKey[0];
      if (k === 'vehicle') return { data: vehicle, isLoading: false, error: null };
      return { data: { items: k === 'trackers' ? items : [] }, isLoading: false, error: null };
    },
    useQueryClient: () => ({ invalidateQueries() {}, setQueryData() {} }),
    useMutation: () => ({ mutate() {}, mutateAsync: async () => ({}), isPending: false, error: mutError }),
  };
});
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ groups: authGroups }) }));
vi.mock('next/link', () => ({ default: ({ children }: { children: unknown }) => <a>{children as never}</a> }));

const text = (html: string) => html.replace(/<[^>]*>/g, '|');

describe('TrackerSection', () => {
  it('sem rastreador: aviso e Instalar rastreador para operacao', async () => {
    items = [];
    const { TrackerSection } = await import('@/components/trackers/TrackerSection');
    const t = text(renderToStaticMarkup(<TrackerSection vehicleId="v1" vehicleCode="M-0059" groups={['operacao']} />));
    expect(t).toContain('Rastreador e chip');
    expect(t).toContain('Esta moto não tem rastreador.');
    expect(t).toContain('Instalar rastreador');
  });
  it('com rastreador: IMEI, modelo, chip, sinal e Trocar/Remover', async () => {
    items = [tracker];
    const { TrackerSection } = await import('@/components/trackers/TrackerSection');
    const t = text(renderToStaticMarkup(<TrackerSection vehicleId="v1" vehicleCode="M-0059" groups={['operacao']} />));
    expect(t).toContain('869890080273430');
    expect(t).toContain('J16');
    expect(t).toContain('8955171234567890123');
    expect(t).toContain('Online');
    expect(t).toContain('Trocar');
    expect(t).toContain('Remover');
  });
  it('suporte vê os dados mas não os botões', async () => {
    items = [tracker];
    const { TrackerSection } = await import('@/components/trackers/TrackerSection');
    const t = text(renderToStaticMarkup(<TrackerSection vehicleId="v1" vehicleCode="M-0059" groups={['suporte']} />));
    expect(t).toContain('869890080273430');
    expect(t).not.toContain('Trocar');
    expect(t).not.toContain('Remover');
    items = [];
    const t2 = text(renderToStaticMarkup(<TrackerSection vehicleId="v1" vehicleCode="M-0059" groups={['suporte']} />));
    expect(t2).toContain('Esta moto não tem rastreador.');
    expect(t2).not.toContain('Instalar rastreador');
  });
});

describe('TrackerSection — erro ao instalar', () => {
  it('mostra a mensagem da API no próprio bloco quando a instalação falha', async () => {
    items = [];
    mutError = new Error('Este rastreador já está instalado em outra moto');
    const { TrackerSection } = await import('@/components/trackers/TrackerSection');
    const t = text(renderToStaticMarkup(<TrackerSection vehicleId="v1" vehicleCode="M-0059" groups={['operacao']} />));
    mutError = null;
    expect(t).toContain('Este rastreador já está instalado em outra moto');
  });
});

describe('VehicleDetailPanel — bloco do rastreador e console', () => {
  const render = async (g: string[]) => {
    authGroups = g;
    items = [tracker];
    const { VehicleDetailPanel } = await import('@/components/vehicles/VehicleDetailPanel');
    return text(renderToStaticMarkup(<VehicleDetailPanel vehicleId="v1" depots={[]} models={[]} onClose={() => {}} />));
  };
  it('admin vê o bloco e o console', async () => {
    const t = await render(['admin']);
    expect(t).toContain('Rastreador e chip');
    expect(t).toContain('Console do rastreador');
  });
  it('operacao vê o bloco com Trocar/Remover, mas não o console', async () => {
    const t = await render(['operacao']);
    expect(t).toContain('Rastreador e chip');
    expect(t).toContain('Trocar');
    expect(t).not.toContain('Console do rastreador');
  });
});
