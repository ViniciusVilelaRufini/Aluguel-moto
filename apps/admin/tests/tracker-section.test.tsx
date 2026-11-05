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
let mutSuccess = false;
let authGroups: string[] = ['admin'];
let trackersState: { isLoading: boolean; error: Error | null } = { isLoading: false, error: null };
let trackersOpts: { refetchInterval?: unknown } = {};
vi.mock('@tanstack/react-query', async (orig) => {
  const real = await orig<typeof import('@tanstack/react-query')>();
  return {
    ...real,
    useQuery: (opts: { queryKey: unknown[] }) => {
      const { queryKey } = opts;
      const k = queryKey[0];
      if (k === 'vehicle') return { data: vehicle, isLoading: false, error: null };
      if (k === 'trackers' && queryKey[1] === 'vehicle') {
        trackersOpts = opts as typeof trackersOpts;
        if (trackersState.isLoading || trackersState.error) return { data: undefined, ...trackersState };
      }
      return { data: { items: k === 'trackers' ? items : [] }, isLoading: false, error: null };
    },
    useQueryClient: () => ({ invalidateQueries() {}, setQueryData() {} }),
    useMutation: () => ({ mutate() {}, mutateAsync: async () => ({}), reset() {}, isPending: false, isSuccess: mutSuccess, error: mutError }),
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

describe('TrackerSection — revisão final (I5, M1, M4)', () => {
  const render = async (props: Record<string, unknown> = {}) => {
    const { TrackerSection } = await import('@/components/trackers/TrackerSection');
    return text(renderToStaticMarkup(<TrackerSection vehicleId="v1" vehicleCode="M-0059" groups={['operacao']} {...props} />));
  };

  it('I5a: rastreador MQTT (speed_control) → aviso e nenhum botão', async () => {
    items = [];
    const t = await render({ controlMode: 'speed_control', trackerId: 'tm1' });
    expect(t).toContain('Rastreador MQTT, gerenciado fora do painel.');
    expect(t).not.toContain('Instalar rastreador');
    expect(t).not.toContain('Esta moto não tem rastreador.');
    expect(t).not.toContain('Trocar');
    // Sem rastreador cadastrado a API também diz speed_control: continua oferecendo Instalar.
    const none = await render({ controlMode: 'speed_control', trackerId: undefined });
    expect(none).toContain('Instalar rastreador');
  });

  it('I5b: carregando ou com erro não oferece Instalar', async () => {
    items = [];
    trackersState = { isLoading: true, error: null };
    const loading = await render();
    trackersState = { isLoading: false, error: new Error('Falha ao carregar o rastreador') };
    const failed = await render();
    trackersState = { isLoading: false, error: null };
    expect(loading).toContain('Carregando…');
    expect(loading).not.toContain('Instalar rastreador');
    expect(loading).not.toContain('Esta moto não tem rastreador.');
    expect(failed).toContain('Falha ao carregar o rastreador');
    expect(failed).not.toContain('Instalar rastreador');
  });

  it('I5c: instalado sem sinal ainda → "Aguardando o primeiro sinal (até ~1 min)"; offline recarrega a cada 10 s', async () => {
    items = [{ ...tracker, online: false, lastSeenAt: null }];
    const t = await render();
    expect(t).toContain('Aguardando o primeiro sinal (até ~1 min)');
    const interval = trackersOpts.refetchInterval as (q: { state: { data?: { items: unknown[] } } }) => number | false;
    expect(interval({ state: { data: { items } } })).toBe(10_000);
    expect(interval({ state: { data: { items: [tracker] } } })).toBe(false);
    expect(interval({ state: { data: { items: [] } } })).toBe(false);
  });

  it('I5c: aviso depois de instalar', async () => {
    items = [{ ...tracker, online: false, lastSeenAt: null }];
    mutSuccess = true;
    const t = await render();
    mutSuccess = false;
    expect(t).toContain('Instalado. O rastreador aparece online em até 1 minuto.');
  });

  it('M1: abrir um diálogo e fechar limpam os erros de instalar/remover; concluir não (o aviso de sucesso fica)', async () => {
    const { trackerDialogControls } = await import('@/components/trackers/TrackerSection');
    const install = { reset: vi.fn() };
    const remove = { reset: vi.fn() };
    const setDialog = vi.fn();
    const setPicked = vi.fn();
    const c = trackerDialogControls(setDialog, setPicked, [install, remove]);
    c.open('remove');
    expect(install.reset).toHaveBeenCalledTimes(1);
    expect(remove.reset).toHaveBeenCalledTimes(1);
    expect(setDialog).toHaveBeenLastCalledWith('remove');
    c.close();
    expect(install.reset).toHaveBeenCalledTimes(2);
    expect(remove.reset).toHaveBeenCalledTimes(2);
    expect(setDialog).toHaveBeenLastCalledWith(null);
    expect(setPicked).toHaveBeenLastCalledWith(null);
    c.finish();
    expect(install.reset).toHaveBeenCalledTimes(2);
    expect(setDialog).toHaveBeenLastCalledWith(null);
  });

  it('M4: o chip aparece uma vez só, dentro do bloco, com as ações do chip para o admin', async () => {
    items = [tracker];
    const { TrackerSection } = await import('@/components/trackers/TrackerSection');
    const t = text(renderToStaticMarkup(<TrackerSection vehicleId="v1" vehicleCode="M-0059" groups={['admin']} simCard={tracker.simCard} />));
    expect(t.split('8955171234567890123').length - 1).toBe(1);
    expect(t).toContain('Editar chip');
    expect(t).toContain('indica.algar.br');
  });
});

describe('VehicleDetailPanel — chip num lugar só (M4)', () => {
  it('a ficha mostra o chip uma vez (bloco "Rastreador e chip"), sem a seção "Chip" separada', async () => {
    authGroups = ['admin'];
    items = [tracker];
    const prev = vehicle.simCard;
    (vehicle as Record<string, unknown>).simCard = tracker.simCard;
    const { VehicleDetailPanel } = await import('@/components/vehicles/VehicleDetailPanel');
    const html = renderToStaticMarkup(<VehicleDetailPanel vehicleId="v1" depots={[]} models={[]} onClose={() => {}} />);
    (vehicle as Record<string, unknown>).simCard = prev;
    expect(text(html).split('8955171234567890123').length - 1).toBe(1);
    expect(html).not.toContain('data-testid="sim-card-section"');
    expect(text(html)).toContain('Editar chip');
  });
});
