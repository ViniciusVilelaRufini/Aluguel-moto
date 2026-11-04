import type { CommandStatus, CommandStatusReason, CommandType } from './types';

export type StepState = 'done' | 'active' | 'waiting' | 'todo' | 'failed';
export interface CommandStep { key: 'pending' | 'in_progress' | 'result'; label: string; state: StepState }

/**
 * Linha do tempo do comando remoto: pendente → em andamento → confirmado | falhou.
 * `waiting` = pendente com a moto offline (aplica ao reconectar).
 */
export function commandSteps(status: CommandStatus, reason?: CommandStatusReason): CommandStep[] {
  const failed = status === 'failed';
  const superseded = failed && reason === 'superseded';
  const result: CommandStep = { key: 'result', label: superseded ? 'Substituído' : failed ? 'Falhou' : 'Confirmado', state: 'todo' };
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
      // L1: substituído por um comando mais novo não é falha — a linha para sem vermelho.
      if (superseded) break;
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
export function commandOutcome(label: string, status: CommandStatus, reason?: CommandStatusReason): { msg: string; tone: 'success' | 'danger' | 'info' } | null {
  if (status === 'confirmed') return { msg: `${label}: confirmado pela moto`, tone: 'success' };
  if (status === 'failed' && reason === 'superseded') return { msg: `${label}: substituído por um comando mais novo`, tone: 'info' };
  if (status === 'failed') return { msg: `${label}: falhou. Veja o motivo na ficha`, tone: 'danger' };
  return null;
}

/** Comando em curso restaurado ao reabrir a ficha só vale como "em andamento" se for recente (revisão do painel de bancada). */
export const RESTORE_IN_FLIGHT_MS = 3 * 60_000;

export interface RestoredCommand { id: string; type: CommandType; status: CommandStatus; reason?: CommandStatusReason; stale?: true }

/**
 * Comando a mostrar ao reabrir a ficha: o mais novo ainda `pending`/`in_progress`. Criado há mais de 3 min é órfão provável
 * (o acompanhamento do gateway é em memória e não há varredura no banco): volta como `stale` ("sem confirmação") e não
 * segura o Bloquear. Já terminado antes de abrir → nada (sem toast).
 */
export function restoredCommand(items: Array<{ id: string; type: CommandType; status: CommandStatus; statusReason?: CommandStatusReason; createdAt: string }>, now = Date.now()): RestoredCommand | null {
  const c = items.find((x) => x.status === 'pending' || x.status === 'in_progress');
  if (!c) return null;
  const base: RestoredCommand = { id: c.id, type: c.type, status: c.status, reason: c.statusReason };
  return now - Date.parse(c.createdAt) > RESTORE_IN_FLIGHT_MS ? { ...base, stale: true } : base;
}
