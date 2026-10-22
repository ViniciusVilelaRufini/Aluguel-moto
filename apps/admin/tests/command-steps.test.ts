import { describe, expect, it } from 'vitest';
import { commandOutcome, commandSteps, stepProgress } from '@/lib/command-steps';

const states = (s: ReturnType<typeof commandSteps>) => s.map((x) => x.state);

describe('linha do tempo do comando', () => {
  it('pendente → em andamento → confirmado', () => {
    expect(states(commandSteps('pending'))).toEqual(['active', 'todo', 'todo']);
    expect(states(commandSteps('in_progress'))).toEqual(['done', 'active', 'todo']);
    expect(states(commandSteps('confirmed'))).toEqual(['done', 'done', 'done']);
    expect(commandSteps('confirmed')[2].label).toBe('Confirmado');
  });
  it('moto offline fica aguardando no primeiro passo', () => {
    expect(states(commandSteps('pending', 'offline'))).toEqual(['waiting', 'todo', 'todo']);
  });
  it('falha marca o resultado; limite inválido nem chega à moto', () => {
    expect(states(commandSteps('failed', 'did_not_stop'))).toEqual(['done', 'done', 'failed']);
    expect(commandSteps('failed')[2].label).toBe('Falhou');
    expect(states(commandSteps('failed', 'invalid_limit'))).toEqual(['done', 'todo', 'failed']);
  });
  it('progresso da linha', () => {
    expect(stepProgress(commandSteps('pending'))).toBe(0);
    expect(stepProgress(commandSteps('in_progress'))).toBe(0.5);
    expect(stepProgress(commandSteps('confirmed'))).toBe(1);
  });
  it('toast só quando termina', () => {
    expect(commandOutcome('Bloquear', 'pending')).toBeNull();
    expect(commandOutcome('Bloquear', 'confirmed')).toEqual({ msg: 'Bloquear: confirmado pela moto', tone: 'success' });
    expect(commandOutcome('Bloquear', 'failed')?.tone).toBe('danger');
  });
});
