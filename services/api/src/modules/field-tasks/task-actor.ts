import type { FieldTask } from '@prisma/client';
import { forbidden } from '../../common/problem';
import { hasGroup, type Principal } from '../auth/principal';

/** Usuário só do grupo `campo` (sem `admin`/`operacao`): age apenas nas tarefas atribuídas a ele. */
export const isFieldOnly = (user: Principal): boolean => hasGroup(user, 'campo') && !hasGroup(user, 'admin', 'operacao');

/**
 * Regra de responsável da tarefa de campo. `admin`/`operacao` passam sempre; o usuário só-campo precisa ser o
 * responsável. `allowUnassigned` libera tarefa sem responsável (assumir com `start` e ver o detalhe antes de assumir).
 */
export function assertTaskActor(user: Principal, task: Pick<FieldTask, 'assigneeId'>, opts: { allowUnassigned?: boolean } = {}): void {
  if (!isFieldOnly(user)) return;
  if (task.assigneeId === user.userId) return;
  if (!task.assigneeId && opts.allowUnassigned) return;
  throw forbidden('Esta tarefa está atribuída a outro operador.');
}
