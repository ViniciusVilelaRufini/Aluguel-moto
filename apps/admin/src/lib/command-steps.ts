import type { CommandStatus, CommandStatusReason } from './types';

export type StepState = 'done' | 'active' | 'waiting' | 'todo' | 'failed';
export interface CommandStep { key: 'pending' | 'in_progress' | 'result'; label: string; state: StepState }

/**
 * Linha do tempo do comando remoto: pendente → em andamento → confirmado | falhou.
 * `waiting` = pendente com a moto offline (aplica ao reconectar).
 */
export function commandSteps(status: CommandStatus, reason?: CommandStatusReason): CommandStep[] {
  const failed = status === 'failed';
  const result: CommandStep = { key: 'result', label: failed ? 'Falhou' : 'Confirmado', state: 'todo' };
  const pending: CommandStep = { key: 'pending', label: 'Pendente', state: 'todo' };
  const progress: CommandStep = { key: 'in_progress', label: 'Em andamento', state: 'todo' };
  switch (status) {
    case 'pending':
      pending.state = reason === 'offline' ? 'waiting' : 'active';
      break;
    case 'in_progress':
      pending.state = 'done';
      progress.state = 'active';
      break;
    case 'confirmed':
      pending.state = progress.state = result.state = 'done';
      break;
    case 'failed':
      pending.state = 'done';
      // Limite inválido / comando não suportado: recusado antes de chegar à moto.
      progress.state = reason === 'invalid_limit' || reason === 'unsupported_by_tracker' ? 'todo' : 'done';
      result.state = 'failed';
      break;
  }
  return [pending, progress, result];
}

/** Fração preenchida da linha que liga os passos (0..1). */
export function stepProgress(steps: CommandStep[]): number {
  const last = steps.reduce((acc, s, i) => (s.state === 'done' || s.state === 'failed' ? i : acc), -1);
  const active = steps.findIndex((s) => s.state === 'active' || s.state === 'waiting');
  const reach = Math.max(last, active);
  return steps.length > 1 ? Math.max(0, reach) / (steps.length - 1) : 1;
}

/** Texto do toast quando o comando termina; `null` enquanto não terminou. */
export function commandOutcome(label: string, status: CommandStatus): { msg: string; tone: 'success' | 'danger' } | null {
  if (status === 'confirmed') return { msg: `${label}: confirmado pela moto`, tone: 'success' };
  if (status === 'failed') return { msg: `${label}: falhou. Veja o motivo na ficha`, tone: 'danger' };
  return null;
}
