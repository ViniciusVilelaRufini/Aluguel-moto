import { describe, expect, it } from 'vitest';
import { commandStateLabel, commandStateTone } from '@/lib/status';
import { commandOutcome, commandSteps } from '@/lib/command-steps';
import { commandSentMessage, fleetBadgeText, pendingAlertCount, plural, stolenModeDescription } from '@/lib/fleet-copy';
import { applyVehiclePosition, positionPatch, positionView, speedLimitChip } from '@/lib/vehicle-live';
import { fitPoints } from '@/lib/fleet-fit';
import { revenuePerVehicleDay } from '@/lib/finance-revenue';
import { automaticZoneRules } from '@/lib/zone-rules';
import { batteryChargeText, taskBatteryText } from '@/lib/batteries';
import { auditHref, auditTime, signalCount } from '@/lib/fleet-copy';
import type { S } from '@/lib/types';

/**
 * Painel de bancada (2026-11-03): uma moto real (VLT-0059, Concox J16 `relay_only`), GPS muitas vezes inválido, bateria
 * desconhecida. Achados ao vivo (L1–L4) e da auditoria (P1–P3).
 */

const base: S<'Vehicle'> = {
  id: 'v1', code: 'VLT-0059', model: 'Volti Flash', status: 'rented', lat: -23.5, lng: -46.6, batteryPct: 0, batteryKnown: false,
  estimatedRangeKm: 0, speedLimitKmh: 32, trackerControlMode: 'relay_only', speedKmh: 12, lastSeenAt: '2026-11-03T12:00:00.000Z',
  positionAt: '2026-11-03T11:55:00.000Z',
};

describe('L1: comando substituído não é falha', () => {
  it('rótulo e tom neutros; linha do tempo sem vermelho; toast informativo', () => {
    expect(commandStateLabel('failed', 'superseded', { type: 'lock', controlMode: 'relay_only' })).toBe('substituído por um comando mais novo');
    expect(commandStateTone('failed', 'superseded')).toBe('neutral');
    expect(commandSteps('failed', 'superseded').map((s) => s.state)).not.toContain('failed');
    expect(commandSteps('failed', 'superseded')[2].label).toBe('Substituído');
    expect(commandOutcome('Bloquear', 'failed', 'superseded')).toEqual({ msg: 'Bloquear: substituído por um comando mais novo', tone: 'info' });
    expect(commandOutcome('Bloquear', 'failed', 'timeout')).toEqual({ msg: 'Bloquear: falhou. Veja o motivo na ficha', tone: 'danger' });
  });
});

describe('P2-5: did_not_stop do relay_only explica por que não confirmou a parada', () => {
  it('cita GPS recente e que nenhum corte foi enviado', () => {
    expect(commandStateLabel('failed', 'did_not_stop', { type: 'lock', controlMode: 'relay_only' }))
      .toBe('falhou: não foi possível confirmar a moto parada em 120 s (sem posição GPS recente ou em movimento); nenhum corte foi enviado');
  });
});

describe('P1-1: modo roubada no rastreador só relé', () => {
  it('não promete bloqueio nem posição a cada 5 s', () => {
    expect(stolenModeDescription('relay_only')).not.toMatch(/5 segundos|Bloqueia a moto/);
    expect(stolenModeDescription('relay_only')).toMatch(/Bloquear/);
    expect(stolenModeDescription('speed_control')).toBe('Bloqueia a moto e passa a enviar a posição a cada 5 segundos.');
    expect(commandSentMessage('stolen_mode', { on: true }, 'relay_only')).not.toMatch(/5 s/);
    expect(commandSentMessage('stolen_mode', { on: true }, 'speed_control')).toBe('Modo roubada: bloqueio + posição a cada 5 s');
  });
});

describe('P1-3: posição velha (GPS inválido) e velocidade', () => {
  const now = Date.parse('2026-11-03T12:00:10.000Z');
  it('mais de 30 s → "Posição de há X min (sem GPS)" e velocidade "—"', () => {
    expect(positionView(base, now)).toEqual({ stale: true, note: 'Posição de há 5 min (sem GPS)', speedText: '— km/h' });
  });
  it('fresca → velocidade arredondada, sem aviso', () => {
    expect(positionView({ ...base, positionAt: '2026-11-03T12:00:00.000Z' }, now)).toEqual({ stale: false, note: undefined, speedText: '12 km/h' });
  });
  it('velocidade desconhecida → "—"; sem positionAt (API antiga) → não marca como velha', () => {
    expect(positionView({ ...base, positionAt: undefined, speedKmh: undefined }, now).speedText).toBe('— km/h');
    expect(positionView({ ...base, positionAt: undefined }, now)).toMatchObject({ stale: false, speedText: '12 km/h' });
  });
});

describe('P3: vehicle.position ordenada pela hora da posição, não pelo último sinal', () => {
  const ev = { vehicleId: 'v1', lat: -23.6, lng: -46.7, speedKmh: 3, batteryPct: 0, batteryKnown: false, status: 'rented' as const, speedLimitKmh: 32 };
  it('heartbeat avançou o lastSeenAt: posição mais nova que positionAt ainda entra', () => {
    const v = applyVehiclePosition(base, { ...ev, ts: '2026-11-03T11:59:00.000Z' });
    expect(v).toMatchObject({ lat: -23.6, positionAt: '2026-11-03T11:59:00.000Z', lastSeenAt: '2026-11-03T12:00:00.000Z' });
  });
  it('posição mais velha que a carregada é descartada', () => {
    expect(applyVehiclePosition(base, { ...ev, ts: '2026-11-03T11:50:00.000Z' })).toBe(base);
  });
  it('positionPatch leva positionAt', () => {
    expect(positionPatch({ ...ev, ts: '2026-11-03T12:00:05.000Z' })).toMatchObject({ positionAt: '2026-11-03T12:00:05.000Z' });
  });
});

describe('L4: chips da ficha sem dado', () => {
  it('limite com tipo de rastreador desconhecido → "Limite —"', () => {
    expect(speedLimitChip({ trackerControlMode: undefined, speedLimitKmh: 32 })).toBe('Limite —');
    expect(speedLimitChip({ trackerControlMode: 'relay_only', speedLimitKmh: 32 })).toBe('Sem controle de velocidade');
  });
});

describe('P2-3: alertas pendentes sem dado do servidor', () => {
  it('sem total → null ("—"), nunca 0', () => {
    expect(pendingAlertCount(undefined, 0)).toBeNull();
    expect(pendingAlertCount(3, 1)).toBe(4);
  });
});

describe('P2-8 / P2-11: plural e "sem sinal" pelo online', () => {
  it('plural com 1', () => {
    expect(plural(1, 'moto', 'motos')).toBe('1 moto');
    expect(plural(0, 'moto', 'motos')).toBe('0 motos');
    expect(plural(2, 'dia', 'dias')).toBe('2 dias');
  });
  it('sem sinal = online false (status offline sem o campo online conta também)', () => {
    expect(signalCount([{ online: false, status: 'rented' }, { online: true, status: 'offline' }, { status: 'offline' }, { online: true, status: 'free' }])).toBe(2);
    expect(fleetBadgeText(1, 0)).toBe('1 moto · 0 sem sinal');
  });
});

describe('P3: enquadramento ignora 0,0', () => {
  it('posição nula (0,0) não entra', () => {
    const pts = fitPoints([{ lat: 0, lng: 0, status: 'free' }, { lat: -23.5, lng: -46.6, status: 'free' }]);
    expect(pts).toEqual([{ lat: -23.5, lng: -46.6, status: 'free' }]);
  });
});

describe('P2-1: receita por moto por dia = receita ÷ (frota × dias)', () => {
  it('divide pela frota do relatório de ocupação, não pelas linhas com receita', () => {
    const revenue = [{ revenueCents: 7000 }, { revenueCents: 3000 }];
    const occ = [{ vehiclesTotal: 2 }, { vehiclesTotal: 2 }, { vehiclesTotal: 1 }];
    expect(revenuePerVehicleDay(revenue, occ)).toBe(2000);
    expect(revenuePerVehicleDay(revenue, [])).toBeNull();
    expect(revenuePerVehicleDay(undefined, occ)).toBeNull();
  });
});

describe('P1-2: regras automáticas das cercas com rastreador só relé', () => {
  it('sem relay_only: texto de sempre; com relay_only: aviso de que o limite não é imposto e a trava espera a moto parar', () => {
    const plain = automaticZoneRules({ relayOnly: false });
    expect(plain.find((r) => r.title.startsWith('Entrou'))!.detail).toBe('Limite de 6 km/h (pedestres) ou 20 km/h (ciclovia)');
    const relay = automaticZoneRules({ relayOnly: true });
    expect(relay.find((r) => r.title.startsWith('Entrou'))!.detail).toMatch(/só relé.*aviso/i);
    expect(relay.find((r) => r.title.startsWith('Saiu'))!.detail).toMatch(/parar/);
    expect(automaticZoneRules({ relayOnly: false, returnFeeText: 'R$ 15,00' }).at(-1)!.detail).toBe('Só o admin encerra à força, com taxa de R$ 15,00');
  });
});

describe('P1-4 / P2-7: bateria sem leitura', () => {
  it('tarefa sem vehicleBatteryPct não mostra "· 0%"', () => {
    expect(taskBatteryText({ vehicleBatterySerial: 'BT-1', vehicleBatteryCycleCount: 3 })).toBe('Retirada: BT-1 · 3 ciclos');
    expect(taskBatteryText({ vehicleBatterySerial: 'BT-1', vehicleBatteryPct: 41 })).toBe('Retirada: BT-1 · 41%');
  });
  it('bateria na moto sem leitura → "sem leitura"', () => {
    expect(batteryChargeText({ chargePct: 63, chargeKnown: false })).toBe('sem leitura');
    expect(batteryChargeText({ chargePct: 63 })).toBe('63%');
  });
});

describe('P3: log da ficha', () => {
  it('hora com data e link da auditoria filtrado pela moto', () => {
    expect(auditTime('2026-11-03T12:34:00.000Z')).toBe('03/11 09:34');
    expect(auditHref('v1')).toBe('/team?tab=audit&entity=v1');
  });
});

import { sheetVehicle } from '@/lib/vehicle-live';

describe('ficha: posição ao vivo que chegou com o GET em voo', () => {
  it('posição da frota mais nova que a do GET vence só nos campos de posição; senão o GET vence', () => {
    const detail = { ...base, lat: -23.1, positionAt: '2026-11-03T11:00:00.000Z', locked: true };
    const live = { ...base, lat: -23.9, positionAt: '2026-11-03T12:00:05.000Z', locked: false };
    expect(sheetVehicle(detail, live)).toMatchObject({ lat: -23.9, positionAt: '2026-11-03T12:00:05.000Z', locked: true });
    expect(sheetVehicle({ ...detail, positionAt: '2026-11-03T12:01:00.000Z' }, live)).toMatchObject({ lat: -23.1 });
    expect(sheetVehicle(detail, { ...live, positionAt: undefined })).toBe(detail);
    expect(sheetVehicle(undefined, live)).toBe(live);
  });
});
