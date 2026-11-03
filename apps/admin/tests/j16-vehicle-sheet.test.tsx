import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { S } from '@/lib/types';
import {
  addressView, applyVehiclePosition, applyVehicleState, batteryView, speedLimitChip, statePatch,
} from '@/lib/vehicle-live';
import { commandSentMessage } from '@/lib/fleet-copy';
import { STATUS_LABEL, commandStateLabel } from '@/lib/status';
import { commandSteps } from '@/lib/command-steps';
import { lockDescription, lockMovingWarning, RELAY_UNLOCK_WAITING } from '@/lib/tracker';
import { matchesVehicle, shortAddress } from '@/lib/fleet-search';
import { vehicleItems } from '@/lib/palette';
import { BatteryPill } from '@/ds/BatteryPill';

/**
 * Bancada J16 (03/11/2026): a ficha da moto mostrava dados falsos (cópia velha da lista da frota por cima do
 * GET /vehicles/{id}, 0% de bateria sem leitura, "Limite 32 km/h" num rastreador que não controla velocidade,
 * endereço de outro lugar, texto de bloqueio de rastreador com controle de velocidade).
 */

type Vehicle = S<'Vehicle'>;
const T0 = '2026-11-03T12:00:00.000Z';
const T1 = '2026-11-03T12:00:30.000Z';
const base: Vehicle = {
  id: 'v1', code: 'VLT-0059', model: 'Volti Flash', status: 'free', lat: -23.5, lng: -46.6, batteryPct: 80, estimatedRangeKm: 40,
  speedLimitKmh: 32, online: true, locked: false, lastSeenAt: T0, createdAt: T0, trackerControlMode: 'relay_only',
};
const stateEv = (p: Partial<{ locked: boolean; online: boolean; lastSeenAt: string; batteryKnown: boolean; ts: string }> = {}) =>
  ({ vehicleId: 'v1', locked: true, online: true, lastSeenAt: T1, batteryKnown: true, ts: T1, ...p });
const posEv = (p: Partial<{ lat: number; lng: number; speedKmh: number; batteryPct: number; ts: string }> = {}) =>
  ({ vehicleId: 'v1', lat: -23.6, lng: -46.7, speedKmh: 0, batteryPct: 77, status: 'free' as const, speedLimitKmh: 32, ts: T1, ...p });

describe('vehicle.state (J16)', () => {
  it('aplica locked/online/lastSeenAt/batteryKnown de um evento mais novo', () => {
    const v = applyVehicleState(base, stateEv({ batteryKnown: false }));
    expect(v).toMatchObject({ locked: true, online: true, lastSeenAt: T1, batteryKnown: false });
  });

  it('descarta evento mais velho que o que já está carregado', () => {
    const loaded = { ...base, locked: false, lastSeenAt: T1 };
    const v = applyVehicleState(loaded, stateEv({ locked: true, lastSeenAt: T0, ts: T0 }));
    expect(v).toBe(loaded);
  });

  it('evento com o mesmo lastSeenAt ainda vale (a trava muda sem novo sinal)', () => {
    expect(applyVehicleState({ ...base, lastSeenAt: T1 }, stateEv({ lastSeenAt: T1 })).locked).toBe(true);
  });

  it('statePatch tem só os campos do estado', () => {
    expect(Object.keys(statePatch(stateEv())).sort()).toEqual(['batteryKnown', 'lastSeenAt', 'locked', 'online']);
  });
});

describe('vehicle.position (J16)', () => {
  it('aplica posição mais nova; leitura de bateria > 0 volta a bateria conhecida', () => {
    const v = applyVehiclePosition({ ...base, batteryKnown: false, batteryPct: 0 }, posEv());
    expect(v).toMatchObject({ lat: -23.6, lng: -46.7, batteryPct: 77, batteryKnown: true, lastSeenAt: T1 });
  });

  it('batteryPct 0 não marca a bateria como conhecida', () => {
    expect(applyVehiclePosition({ ...base, batteryKnown: false, batteryPct: 0 }, posEv({ batteryPct: 0 })).batteryKnown).toBe(false);
  });

  it('descarta posição mais velha que a carregada', () => {
    const loaded = { ...base, lastSeenAt: T1 };
    expect(applyVehiclePosition(loaded, posEv({ ts: T0 }))).toBe(loaded);
  });

  it('não altera locked/online (a posição não os carrega)', () => {
    const v = applyVehiclePosition({ ...base, locked: true, online: false }, posEv());
    expect(v).toMatchObject({ locked: true, online: false });
  });
});

describe('bateria desconhecida', () => {
  it('batteryKnown=false: texto "Bateria desconhecida" e autonomia "—", nunca 0%', () => {
    const b = batteryView({ ...base, batteryKnown: false, batteryPct: 0, estimatedRangeKm: 0 });
    expect(b).toEqual({ known: false, pctText: 'Bateria desconhecida', rangeText: '—' });
  });
  it('conhecida (ou ausente) mostra % e km', () => {
    expect(batteryView(base)).toEqual({ known: true, pctText: '80%', rangeText: '~40 km' });
    expect(batteryView({ ...base, batteryKnown: true, batteryPct: 0 }).pctText).toBe('0%');
  });
  it('BatteryPill sem leitura não mostra 0% nem ~0 km', () => {
    const html = renderToStaticMarkup(<BatteryPill level={0} range={0} known={false} />);
    expect(html).toContain('Bateria desconhecida');
    const text = html.replace(/<[^>]*>/g, '');
    expect(text).toBe('Bateria desconhecida');
    expect(text).not.toMatch(/\d%|~\d+ km/);
    const ok = renderToStaticMarkup(<BatteryPill level={80} range={40} />);
    expect(ok).toContain('80%');
    expect(ok).toContain('~40 km');
  });
});

describe('chip de limite', () => {
  it('relay_only não controla velocidade: sem "Limite 32 km/h"', () => {
    expect(speedLimitChip({ ...base, trackerControlMode: 'relay_only' })).toBe('Sem controle de velocidade');
  });
  it('speed_control (ou ausente) mostra o limite', () => {
    expect(speedLimitChip({ ...base, trackerControlMode: 'speed_control', speedLimitKmh: 20 })).toBe('Limite 20 km/h');
    expect(speedLimitChip({ ...base, trackerControlMode: undefined })).toBe('Limite 32 km/h');
  });
});

describe('endereço nulo', () => {
  it('null: "Sem endereço" e sem "atualizado há…"', () => {
    expect(addressView({ ...base, address: null, addressUpdatedAt: null })).toEqual({ text: 'Sem endereço', updatedAt: undefined });
  });
  it('com endereço mantém o horário', () => {
    expect(addressView({ ...base, address: 'R. A, 1', addressUpdatedAt: T0 })).toEqual({ text: 'R. A, 1', updatedAt: T0 });
  });
  it('ausente (API antiga) mostra "—"', () => {
    expect(addressView(base).text).toBe('—');
  });
  it('busca, atalho e paleta aceitam null', () => {
    expect(matchesVehicle({ code: 'VLT-1', address: null }, 'vlt')).toBe(true);
    expect(shortAddress(null)).toBe('—');
    expect(vehicleItems([{ id: 'v', code: 'VLT-1', status: 'free', address: null }], (s) => STATUS_LABEL[s as keyof typeof STATUS_LABEL])[0].hint).toBe('Livre');
  });
});

describe('bloqueio em rastreador só relé', () => {
  it('descrição do diálogo de bloqueio', () => {
    expect(lockDescription('speed_control')).toBe('A moto reduz a potência aos poucos e só trava abaixo de 3 km/h. Nunca corta o motor em movimento.');
    expect(lockDescription(undefined)).toBe(lockDescription('speed_control'));
    const relay = lockDescription('relay_only');
    expect(relay).toContain('só corta o relé');
    expect(relay).toContain('3 posições paradas em 20 s');
    expect(relay).toContain('Nunca corta com a moto em movimento');
    expect(relay).not.toContain('reduz a potência');
  });
  it('aviso de moto em movimento', () => {
    expect(lockMovingWarning('speed_control')).toContain('abaixo de 3 km/h');
    expect(lockMovingWarning('relay_only')).toContain('3 posições paradas em 20 s');
  });
  it('toast depois de enviar', () => {
    expect(commandSentMessage('lock')).toBe('Bloqueio enviado · reduz potência e trava abaixo de 3 km/h');
    expect(commandSentMessage('lock', {}, 'speed_control')).toBe('Bloqueio enviado · reduz potência e trava abaixo de 3 km/h');
    const relay = commandSentMessage('lock', {}, 'relay_only');
    expect(relay).toBe('Bloqueio enviado · aguarda a moto parar e corta o relé');
    expect(relay).not.toContain('reduz potência');
    expect(commandSentMessage('unlock', {}, 'relay_only')).toBe('Desbloqueio enviado');
  });
});

describe('desbloqueio em rastreador só relé (até 90 s)', () => {
  it('em andamento diz que espera o rastreador confirmar', () => {
    expect(commandStateLabel('in_progress', undefined, { type: 'unlock', controlMode: 'relay_only' })).toBe(RELAY_UNLOCK_WAITING);
    expect(RELAY_UNLOCK_WAITING).toBe('Aguardando o rastreador confirmar o desbloqueio');
    expect(commandStateLabel('in_progress', undefined, { type: 'unlock', controlMode: 'speed_control' })).toBe('em andamento');
  });
  it('timeout cita os 90 s só no unlock relay_only', () => {
    expect(commandStateLabel('failed', 'timeout', { type: 'unlock', controlMode: 'relay_only' })).toBe('falhou: sem resposta do rastreador em 90 s');
    expect(commandStateLabel('failed', 'timeout')).toBe('falhou: sem resposta da moto');
  });
  it('a linha do tempo segue pendente → em andamento → resultado', () => {
    expect(commandSteps('in_progress').map((s) => s.state)).toEqual(['done', 'active', 'todo']);
  });
});
