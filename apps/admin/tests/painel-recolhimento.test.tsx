import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { S } from '@/lib/types';

/** "Recebida no galpão" (2026-11-04): moto awaiting_pickup + tarefa `collect` concluída pelo painel com o galpão. */
const calls: { path: string; body?: unknown }[] = [];
let respond: (path: string) => { error?: unknown; status?: number } = () => ({});
vi.mock('@/lib/api', async (orig) => {
  const real = await orig<typeof import('@/lib/api')>();
  const post = async (path: string, init?: { body?: unknown }) => {
    calls.push({ path, body: init?.body });
    const r = respond(path);
    return { data: r.error ? undefined : {}, error: r.error, response: { ok: !r.error, status: r.status ?? 200 } };
  };
  return { ...real, api: { POST: post, GET: async () => ({ data: { items: [] }, response: { ok: true, status: 200 } }) } };
});
const auth: { groups: string[] } = { groups: ['admin'] };
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ groups: auth.groups }) }));

import { ApiError } from '@/lib/api';
import { collectArrivalError, pickCollectTask, receiveCollectAtDepot } from '@/lib/collect-arrival';
import { CollectArrival, CollectArrivalDialog } from '@/components/depots/CollectArrival';
import { can } from '@/lib/permissions';

const task = (over: Partial<S<'FieldTask'>> = {}): S<'FieldTask'> => ({
  id: 'task-1', type: 'collect', status: 'open', priority: 'medium', vehicleId: 'veh-1', vehicleCode: 'VLT-0001', createdAt: '2026-11-04T10:00:00Z', updatedAt: '2026-11-04T10:00:00Z', ...over,
} as S<'FieldTask'>);
const depot = (id: string, active = true) => ({ id, name: `Galpão ${id}`, active }) as S<'Depot'>;
const vehicle = { id: 'veh-1', code: 'VLT-0001', depotId: 'dep-2', status: 'awaiting_pickup' as const };

beforeEach(() => { calls.length = 0; respond = () => ({}); auth.groups = ['admin']; });

describe('lib: tarefa collect e conclusão', () => {
  it('pickCollectTask: só collect em aberto', () => {
    expect(pickCollectTask([task({ type: 'inspection' }), task({ status: 'done' }), task({ status: 'canceled' })])).toBeUndefined();
    expect(pickCollectTask([task({ status: 'done' }), task({ id: 't2', status: 'assigned' })])?.id).toBe('t2');
  });

  it('tarefa open: inicia (atribui ao usuário) e conclui com depotId e nota aparada', async () => {
    await receiveCollectAtDepot(task(), { depotId: 'dep-2', notes: ' trazida ' });
    expect(calls).toEqual([
      { path: '/field-tasks/{id}/start', body: undefined },
      { path: '/field-tasks/{id}/complete', body: { depotId: 'dep-2', notes: 'trazida' } },
    ]);
  });

  it('tarefa assigned/in_progress: só conclui, sem nota vazia', async () => {
    await receiveCollectAtDepot(task({ status: 'assigned' }), { depotId: 'dep-2', notes: '  ' });
    expect(calls).toEqual([{ path: '/field-tasks/{id}/complete', body: { depotId: 'dep-2' } }]);
  });

  it('sem galpão não chama a API', async () => {
    await expect(receiveCollectAtDepot(task(), { depotId: '' })).rejects.toThrow(/galpão/);
    expect(calls).toHaveLength(0);
  });

  it('409 moto travada pela equipe: o texto da API chega inteiro (não o genérico do slug)', async () => {
    const text = 'A moto está bloqueada pela equipe; libere-a antes de devolver à frota.';
    respond = (p) => (p.endsWith('/complete') ? { status: 409, error: { type: 'https://x/problems/vehicle-unavailable', detail: text } } : {});
    const err = await receiveCollectAtDepot(task({ status: 'assigned' }), { depotId: 'dep-2' }).catch((e) => e);
    expect(collectArrivalError(err)).toBe(text);
  });

  it('422 sem galpão e galpão inativo usam o texto da API; falha no start não conclui', async () => {
    expect(collectArrivalError(new ApiError(422, 'Informe o galpão onde a moto chegou.', 'validation-error'))).toBe('Informe o galpão onde a moto chegou.');
    expect(collectArrivalError(new ApiError(422, 'Este galpão está desativado; escolha outro galpão.', 'depot-inactive'))).toBe('Este galpão está desativado; escolha outro galpão.');
    respond = (p) => (p.endsWith('/start') ? { status: 409, error: { detail: 'A tarefa mudou de situação; atualize e tente de novo.' } } : {});
    await expect(receiveCollectAtDepot(task(), { depotId: 'dep-2' })).rejects.toThrow(/mudou de situação/);
    expect(calls.map((c) => c.path)).toEqual(['/field-tasks/{id}/start']);
  });

  it('perfis: admin e operacao; suporte e financeiro não', () => {
    expect(can(['admin'], 'collect.arrive')).toBe(true);
    expect(can(['operacao'], 'collect.arrive')).toBe(true);
    expect(can(['suporte'], 'collect.arrive')).toBe(false);
    expect(can(['financeiro'], 'collect.arrive')).toBe(false);
  });
});

describe('componentes', () => {
  const wrap = (el: React.ReactNode, seed?: (qc: QueryClient) => void) => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(['depots', 'active'], { items: [depot('dep-1'), depot('dep-2'), depot('dep-3', false)] });
    seed?.(qc);
    return renderToStaticMarkup(<QueryClientProvider client={qc}>{el}</QueryClientProvider>);
  };
  const seedTask = (t: S<'FieldTask'> | null) => (qc: QueryClient) => qc.setQueryData(['field-tasks', 'collect', 'veh-1'], t);

  it('awaiting_pickup com tarefa: mostra o botão', () => {
    expect(wrap(<CollectArrival vehicle={vehicle} />, seedTask(task()))).toContain('data-testid="vehicle-collect-arrive"');
  });

  it('outro status: nada aparece', () => {
    expect(wrap(<CollectArrival vehicle={{ ...vehicle, status: 'free' }} />, seedTask(task()))).toBe('');
  });

  it('perfil sem permissão: nada aparece', () => {
    auth.groups = ['suporte'];
    expect(wrap(<CollectArrival vehicle={vehicle} />, seedTask(task()))).toBe('');
  });

  it('awaiting_pickup sem tarefa collect aberta: aviso e nenhuma ação', () => {
    const html = wrap(<CollectArrival vehicle={vehicle} />, seedTask(null));
    expect(html).toContain('data-testid="collect-no-task"');
    expect(html).toContain('não há tarefa de recolhimento em aberto');
    expect(html).not.toContain('vehicle-collect-arrive');
  });

  it('diálogo: galpão da moto pré-selecionado, só galpões ativos, nota opcional', () => {
    const html = wrap(<CollectArrivalDialog task={task()} vehicle={vehicle} onClose={() => {}} />);
    expect(html).toContain('data-testid="collect-arrival-dialog"');
    expect(html).toMatch(/<option value="dep-2" selected="">/);
    expect(html).not.toContain('value="dep-3"');
    expect(html).toContain('data-testid="collect-notes"');
    expect(html).not.toMatch(/disabled="" data-testid="collect-arrival-submit"/);
  });

  it('diálogo sem galpão definido: confirmar desabilitado até escolher', () => {
    const html = wrap(<CollectArrivalDialog task={task()} vehicle={{ ...vehicle, depotId: undefined }} onClose={() => {}} />);
    expect(html).toMatch(/disabled="" data-testid="collect-arrival-submit"/);
  });
});
