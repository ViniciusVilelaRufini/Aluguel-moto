import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RelayOnlyNotice } from '@/components/vehicles/RelayOnlyNotice';
import { commandSteps } from '@/lib/command-steps';
import { ALERT_TYPE } from '@/lib/labels';
import { commandStateLabel } from '@/lib/status';
import { commandSupported, RELAY_LOCK_WAITING, TRACKER_CONTROL_LABEL, unsupportedHint } from '@/lib/tracker';

describe('rastreador só relé no painel (spec GT06 §9)', () => {
  it('rótulos do tipo de rastreador', () => {
    expect(TRACKER_CONTROL_LABEL).toEqual({ speed_control: 'Controle de velocidade', relay_only: 'Só relé' });
  });

  it('limite de velocidade e buzina indisponíveis só em relay_only', () => {
    expect(commandSupported('speed_limit', 'relay_only')).toBe(false);
    expect(commandSupported('horn', 'relay_only')).toBe(false);
    for (const t of ['lock', 'unlock', 'stolen_mode'] as const) expect(commandSupported(t, 'relay_only')).toBe(true);
    expect(commandSupported('speed_limit', 'speed_control')).toBe(true);
    expect(commandSupported('speed_limit', undefined)).toBe(true);
    expect(unsupportedHint('speed_limit')).toBe('Este rastreador não controla velocidade');
  });

  it('lock em andamento em relay_only espera a moto parar; speed_control continua "em andamento"', () => {
    expect(commandStateLabel('in_progress', undefined, { type: 'lock', controlMode: 'relay_only' })).toBe(RELAY_LOCK_WAITING);
    expect(RELAY_LOCK_WAITING).toBe('Aguardando a moto parar para bloquear');
    expect(commandStateLabel('in_progress', undefined, { type: 'lock', controlMode: 'speed_control' })).toBe('em andamento');
    expect(commandStateLabel('in_progress')).toBe('em andamento');
  });

  it('falhas: unsupported_by_tracker e did_not_stop sem corte; a linha do tempo não passa por "em andamento"', () => {
    expect(commandStateLabel('failed', 'unsupported_by_tracker')).toBe('falhou: este rastreador não executa este comando');
    expect(commandStateLabel('failed', 'did_not_stop', { type: 'lock', controlMode: 'relay_only' })).toBe('falhou: a moto não parou em 120 s; nenhum corte foi enviado');
    expect(commandStateLabel('failed', 'did_not_stop')).toBe('falhou: a moto não parou');
    expect(commandSteps('failed', 'unsupported_by_tracker')[1].state).toBe('todo');
  });

  it('aviso na ficha só em relay_only; alerta zone_speed_exceeded rotulado', () => {
    expect(renderToStaticMarkup(<RelayOnlyNotice mode="relay_only" />)).toContain('Este rastreador não controla velocidade');
    expect(renderToStaticMarkup(<RelayOnlyNotice mode="speed_control" />)).toBe('');
    expect(ALERT_TYPE.zone_speed_exceeded[0]).toBe('Acima do limite da zona (rastreador só relé)');
  });
});
