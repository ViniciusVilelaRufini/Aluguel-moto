import { api, ApiError, problemMessage } from './api';
import type { S } from './types';

/**
 * "Recebida no galpão" (2026-11-04): o cliente devolveu a moto fora do galpão (`awaiting_pickup`) e a equipe a trouxe.
 * O painel conclui a tarefa de campo `collect` (`POST /field-tasks/{id}/complete` com `depotId`): a moto volta a `free`
 * naquele galpão. A conclusão exige a tarefa fora de `open`; como o painel não conhece o id do operador, ela é
 * iniciada por `POST /field-tasks/{id}/start` (admin e operacao podem; a API passa a tarefa sem responsável ao próprio usuário).
 */

type Task = S<'FieldTask'>;

/** A tarefa `collect` em aberto da moto (a mais antiga da lista é a primeira da API: prioridade e prazo). */
export function pickCollectTask(items: readonly Task[]): Task | undefined {
  return items.find((t) => t.type === 'collect' && (t.status === 'open' || t.status === 'assigned' || t.status === 'in_progress'));
}

export const COLLECT_NO_TASK_NOTICE = 'Esta moto aguarda recolhimento, mas não há tarefa de recolhimento em aberto. Crie a tarefa em Operação ou peça apoio da equipe técnica.';

/** Erro da API com o texto dela (o `detail`), sem o texto genérico que `unwrap` põe em alguns slugs. */
function apiError(error: unknown, status: number): ApiError {
  const detail = (error as { detail?: string } | undefined)?.detail;
  const { message, slug } = problemMessage(error, status);
  return new ApiError(status, detail || message, slug);
}

export interface CollectArrivalInput { depotId: string; notes?: string }

/** Inicia a tarefa quando está `open` e a conclui no galpão. Qualquer falha lança `ApiError` com o texto da API. */
export async function receiveCollectAtDepot(task: Pick<Task, 'id' | 'status'>, input: CollectArrivalInput): Promise<void> {
  if (!input.depotId) throw new Error('Escolha o galpão onde a moto chegou.');
  const path = { id: task.id };
  if (task.status === 'open') {
    const s = await api.POST('/field-tasks/{id}/start', { params: { path } });
    if (s.error !== undefined) throw apiError(s.error, s.response.status);
  }
  const notes = input.notes?.trim();
  const c = await api.POST('/field-tasks/{id}/complete', { params: { path }, body: { depotId: input.depotId, ...(notes ? { notes } : {}) } });
  if (c.error !== undefined) throw apiError(c.error, c.response.status);
}

/** Mensagem em pt-BR: o texto da API (422 sem galpão, galpão inativo, 409 moto travada); 404 e falha de rede ganham texto próprio. */
export function collectArrivalError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 404) return 'Tarefa ou galpão não encontrado. Atualize a tela e tente de novo.';
    if (e.status === 409 || e.status === 422) return e.message;
    return e.message || 'Algo deu errado. Tente de novo.';
  }
  return e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.';
}
