import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildFeeCreate, buildHandoverCancel, buildPlanCreate, buildVehicleCreate, buildVehicleUpdate, buildWalletAdjustment, walletAdjustFeedback, activePlanForCode, firstFreePlanCode, canCancelHandover,
  EMPTY_FEE_FORM, EMPTY_PLAN_FORM, EMPTY_VEHICLE_FORM, PLAN_UNIT_BY_CODE, reasonError, vehicleFormFrom,
} from '@/lib/admin-forms';
import { formatBRLBar, formatDate, formatPhone } from '@/lib/format';
import { can } from '@/lib/permissions';
import { DEPOSIT_STATUS, STATION_SWAP_STATUS } from '@/lib/labels';
import { DEPOSIT_STATUS_OPTIONS } from '@/components/DepositsPanel';
import { swapColumns } from '@/components/StationSwapsModal';
import { HandoverDetail } from '@/components/depots/HandoverViews';
import type { S } from '@/lib/types';

const vehicle: S<'Vehicle'> = {
  id: 'v1', code: 'VLT-0001', model: 'Volti Flash', status: 'free', lat: 0, lng: 0, batteryPct: 90, estimatedRangeKm: 40, speedLimitKmh: 32,
  thingName: 'moto-0001', qrCode: 'volti://v/VLT-0001', vehicleModelId: 'm1', odometerKm: 120, usageHours: 10,
};

describe('moto: cadastrar (POST /vehicles)', () => {
  const ok = { ...EMPTY_VEHICLE_FORM, code: 'VLT-0061', thingName: 'moto-0061', vehicleModelId: 'm1' };
  it('monta o corpo do contrato e usa o nome do modelo do catálogo', () => {
    const r = buildVehicleCreate({ ...ok, qrCode: ' volti://v/VLT-0061 ', batterySerial: 'BT-1' }, 'Volti Flash');
    expect(r).toEqual({ ok: true, body: { code: 'VLT-0061', thingName: 'moto-0061', model: 'Volti Flash', vehicleModelId: 'm1', qrCode: 'volti://v/VLT-0061', batterySerial: 'BT-1' } });
  });
  it('valida código, rastreador e modelo', () => {
    expect(buildVehicleCreate({ ...ok, code: 'VLT-12' }, 'X')).toMatchObject({ ok: false });
    expect(buildVehicleCreate({ ...ok, code: 'moto-1' }, 'X')).toMatchObject({ ok: false });
    expect(buildVehicleCreate({ ...ok, thingName: 'moto 61' }, 'X')).toMatchObject({ ok: false });
    expect(buildVehicleCreate({ ...ok, vehicleModelId: '' })).toEqual({ ok: false, error: 'Escolha o modelo' });
  });
  it('sem catálogo aceita o nome do modelo digitado', () => {
    const r = buildVehicleCreate({ ...ok, vehicleModelId: '', model: 'Volti S1' });
    expect(r).toMatchObject({ ok: true, body: { model: 'Volti S1' } });
    expect((r as { body: object }).body).not.toHaveProperty('vehicleModelId');
  });
});

describe('moto: editar (PATCH /vehicles/{id})', () => {
  const base = vehicleFormFrom(vehicle);
  it('manda só o que mudou', () => {
    expect(buildVehicleUpdate({ ...base, thingName: 'moto-0002', odometerKm: '130,5' }, vehicle, 'Volti Flash')).toEqual({ ok: true, body: { thingName: 'moto-0002', odometerKm: 130.5 } });
  });
  it('trocar o modelo manda vehicleModelId', () => {
    expect(buildVehicleUpdate({ ...base, vehicleModelId: 'm2' }, vehicle, 'Volti S1')).toEqual({ ok: true, body: { vehicleModelId: 'm2' } });
  });
  it('sem mudança e valores fora da faixa são recusados', () => {
    expect(buildVehicleUpdate(base, vehicle, 'Volti Flash')).toEqual({ ok: false, error: 'Nada foi alterado' });
    expect(buildVehicleUpdate({ ...base, odometerKm: '-1' }, vehicle, 'Volti Flash')).toMatchObject({ ok: false });
    expect(buildVehicleUpdate({ ...base, usageHours: '100001' }, vehicle, 'Volti Flash')).toMatchObject({ ok: false });
    expect(buildVehicleUpdate({ ...base, thingName: 'inválido!' }, vehicle, 'Volti Flash')).toMatchObject({ ok: false });
  });
});

describe('entregas: cancelar (POST /handovers/{id}/cancel)', () => {
  it('motivo obrigatório de 3 a 500 caracteres', () => {
    expect(reasonError('ab')).toMatch(/mínimo de 3/);
    expect(reasonError('   ')).not.toBeNull();
    expect(reasonError('x'.repeat(501))).toMatch(/500/);
    expect(buildHandoverCancel(' Moto trocada ')).toEqual({ ok: true, body: { reason: 'Moto trocada' } });
    expect(buildHandoverCancel('')).toMatchObject({ ok: false });
  });
  it('só saída aguardando o cliente ou em disputa pode ser cancelada', () => {
    expect(canCancelHandover({ type: 'pickup', status: 'pending_customer' })).toBe(true);
    expect(canCancelHandover({ type: 'pickup', status: 'disputed' })).toBe(true);
    expect(canCancelHandover({ type: 'pickup', status: 'accepted' })).toBe(false);
    expect(canCancelHandover({ type: 'pickup', status: 'canceled' })).toBe(false);
    expect(canCancelHandover({ type: 'return_depot', status: 'pending_customer' })).toBe(false);
  });
  const h: S<'Handover'> = {
    id: 'h1', type: 'pickup', depotId: 'd1', vehicleId: 'v1', operatorId: 'o1', checklist: [], photoKeys: [], batteryPct: 90, status: 'disputed', createdAt: '2026-10-22T13:00:00.000Z',
  } as S<'Handover'>;
  it('o botão só aparece quando recebe onCancel', () => {
    const base = { handover: h, supportHref: null, rentalHref: null };
    expect(renderToStaticMarkup(<HandoverDetail {...base} />)).not.toContain('Cancelar entrega');
    expect(renderToStaticMarkup(<HandoverDetail {...base} onCancel={() => {}} />)).toContain('Cancelar entrega');
  });
});

describe('estações: histórico de trocas', () => {
  const swap: S<'StationSwap'> = {
    id: 's1', stationId: 'st1', rentalId: 'r1', status: 'completed', feeCents: 500, expiresAt: '2026-10-22T15:03:00.000Z',
    returnedSerial: 'BT-IN', releasedSerial: 'BT-OUT', createdAt: '2026-10-22T15:00:00.000Z',
  };
  it('mostra série de entrada/saída, status e horário em São Paulo', () => {
    const cols = swapColumns();
    expect(cols.map((c) => c.label)).toEqual(['Horário', 'Série entrada', 'Série saída', 'Status', 'Taxa']);
    const cell = (k: string) => renderToStaticMarkup(<>{cols.find((c) => c.key === k)!.render!(swap)}</>);
    expect(cell('createdAt')).toContain('12:00'); // 15:00 UTC = 12:00 em São Paulo
    expect(cell('returnedSerial')).toContain('BT-IN');
    expect(cell('releasedSerial')).toContain('BT-OUT');
    expect(cell('status')).toContain('Concluída');
    expect(cell('feeCents')).toContain('5,00');
  });
  it('troca sem série (ainda em andamento) mostra travessão', () => {
    const cols = swapColumns();
    const open: S<'StationSwap'> = { ...swap, status: 'awaiting_return', returnedSerial: undefined, releasedSerial: undefined };
    expect(renderToStaticMarkup(<>{cols.find((c) => c.key === 'returnedSerial')!.render!(open)}</>)).toContain('—');
  });
  it('todos os status do contrato têm rótulo', () => {
    expect(Object.keys(STATION_SWAP_STATUS).sort()).toEqual(['awaiting_return', 'canceled', 'completed', 'failed', 'opening_slot', 'releasing', 'returned']);
  });
});

describe('preços: criar plano (POST /pricing/plans) e taxa (POST /pricing/fees)', () => {
  it('plano: reais viram centavos e a unidade segue o código', () => {
    expect(PLAN_UNIT_BY_CODE).toEqual({ minute: 'minute', hour: 'hour', day: 'day', weekly: 'week', monthly: 'month' });
    const r = buildPlanCreate({ ...EMPTY_PLAN_FORM, code: 'weekly', unit: 'week', recurring: true, name: ' Semanal ', unitPrice: '149,90', unlock: '0', pause: '0,20', description: 'Plano da semana' });
    expect(r).toEqual({ ok: true, body: { code: 'weekly', name: 'Semanal', unit: 'week', recurring: true, active: true, unitPriceCents: 14990, unlockFeeCents: 0, pausePerMinuteCents: 20, description: 'Plano da semana' } });
  });
  it('plano: valida nome e dinheiro', () => {
    expect(buildPlanCreate({ ...EMPTY_PLAN_FORM, name: 'A', unitPrice: '1' })).toMatchObject({ ok: false });
    expect(buildPlanCreate({ ...EMPTY_PLAN_FORM, name: 'Diária', unitPrice: '' })).toMatchObject({ ok: false });
    expect(buildPlanCreate({ ...EMPTY_PLAN_FORM, name: 'Diária', unitPrice: '12,345' })).toMatchObject({ ok: false });
    expect(buildPlanCreate({ ...EMPTY_PLAN_FORM, name: 'Diária', unitPrice: '1.000.000,00' })).toMatchObject({ ok: false });
  });
  it('taxa: monta o corpo e valida código e valor', () => {
    expect(buildFeeCreate({ ...EMPTY_FEE_FORM, code: 'taxa_limpeza', name: 'Taxa de limpeza', amount: '15,00' })).toEqual({ ok: true, body: { code: 'taxa_limpeza', name: 'Taxa de limpeza', amountCents: 1500, active: true } });
    expect(buildFeeCreate({ ...EMPTY_FEE_FORM, code: 'Taxa Limpeza', name: 'Taxa', amount: '1' })).toMatchObject({ ok: false });
    expect(buildFeeCreate({ ...EMPTY_FEE_FORM, code: 'taxa', name: 'Taxa', amount: 'abc' })).toMatchObject({ ok: false });
    expect(buildFeeCreate({ ...EMPTY_FEE_FORM, code: 'taxa', name: 'T', amount: '1' })).toMatchObject({ ok: false });
  });
});

describe('carteira: ajuste manual (POST /customers/{id}/wallet/adjustments)', () => {
  it('crédito positivo e débito negativo, em centavos inteiros', () => {
    expect(buildWalletAdjustment('10,50', 'credit', 'Cortesia')).toEqual({ ok: true, body: { amountCents: 1050, reason: 'Cortesia' } });
    expect(buildWalletAdjustment('0.79', 'debit', ' Cobrança indevida ')).toEqual({ ok: true, body: { amountCents: -79, reason: 'Cobrança indevida' } });
  });
  it('recusa zero, valor inválido, acima de R$ 1.000 e motivo curto', () => {
    expect(buildWalletAdjustment('0', 'credit', 'Cortesia')).toMatchObject({ ok: false });
    expect(buildWalletAdjustment('abc', 'credit', 'Cortesia')).toMatchObject({ ok: false });
    expect(buildWalletAdjustment('1.000,01', 'credit', 'Cortesia')).toMatchObject({ ok: false });
    expect(buildWalletAdjustment('1.000,00', 'debit', 'Cortesia')).toMatchObject({ ok: true, body: { amountCents: -100000 } });
    expect(buildWalletAdjustment('10', 'credit', 'ab')).toMatchObject({ ok: false });
  });
});

describe('cauções: filtro de status', () => {
  it('oferece "Todas" e todos os status do contrato', () => {
    expect(DEPOSIT_STATUS_OPTIONS[0]).toEqual({ value: '', label: 'Todas' });
    expect(DEPOSIT_STATUS_OPTIONS.slice(1).map((o) => o.value).sort()).toEqual(Object.keys(DEPOSIT_STATUS).sort());
    expect(Object.keys(DEPOSIT_STATUS).sort()).toEqual(['awaiting_pix', 'captured', 'failed', 'held', 'released']);
  });
});

describe('permissões por grupo (iguais ao x-required-groups do contrato)', () => {
  const table: [Parameters<typeof can>[1], string[], string[]][] = [
    ['vehicle.edit', ['admin', 'operacao'], ['suporte', 'financeiro']],
    ['handover.cancel', ['admin', 'operacao'], ['suporte', 'financeiro']],
    ['station.swaps', ['admin', 'operacao', 'suporte'], ['financeiro']],
    ['settings.edit', ['admin'], ['operacao', 'financeiro', 'suporte']],
    ['wallet.adjust', ['admin', 'financeiro'], ['operacao', 'suporte']],
    ['deposit.view', ['admin', 'financeiro'], ['operacao', 'suporte']],
  ];
  for (const [action, allowed, denied] of table) {
    it(action, () => {
      for (const g of allowed) expect(can([g as never], action)).toBe(true);
      for (const g of denied) expect(can([g as never], action)).toBe(false);
    });
  }

  // Confere contra o OpenAPI: cada operação usada tem exatamente estes grupos (campo fica de fora: não usa o painel).
  const yaml = readFileSync(path.resolve(__dirname, '../../../packages/contracts/openapi.yaml'), 'utf8');
  const groupsOf = (operationId: string) => {
    const i = yaml.indexOf(`operationId: ${operationId}\n`);
    const m = /x-required-groups: \[([^\]]*)\]/.exec(yaml.slice(i, i + 1500));
    return m![1].split(',').map((s) => s.trim()).filter((g) => g !== 'campo').sort();
  };
  const panelGroups = (action: Parameters<typeof can>[1]) => (['admin', 'operacao', 'financeiro', 'suporte'] as const).filter((g) => can([g], action)).sort();
  const ops: [string, Parameters<typeof can>[1]][] = [
    ['createVehicle', 'vehicle.edit'], ['updateVehicle', 'vehicle.edit'], ['cancelHandover', 'handover.cancel'], ['listStationSwaps', 'station.swaps'],
    ['createPricingPlan', 'settings.edit'], ['createFee', 'settings.edit'], ['createWalletAdjustment', 'wallet.adjust'], ['listDeposits', 'deposit.view'],
  ];
  for (const [op, action] of ops) {
    it(`${op} confere com o contrato`, () => {
      expect(panelGroups(action)).toEqual(groupsOf(op));
    });
  }
});

describe('carteira: retorno do ajuste (QA-04)', () => {
  it('mostra o saldo resultante', () => {
    expect(walletAdjustFeedback({ amountCents: 2550, balanceAfterCents: 2550 })).toEqual({ message: expect.stringContaining('Saldo atual: R$'), tone: 'success' });
  });
  it('avisa quando o débito deixa o saldo negativo', () => {
    const r = walletAdjustFeedback({ amountCents: -10000, balanceAfterCents: -7450 });
    expect(r.tone).toBe('danger');
    expect(r.message).toContain('negativo');
  });
});

describe('formatDate: data só dia (QA-05)', () => {
  it('não recua um dia para YYYY-MM-DD', () => {
    expect(formatDate('1992-03-15')).toBe('15/03/1992');
  });
  it('instante com horário segue em São Paulo', () => {
    expect(formatDate('2026-10-25T01:27:00Z')).toBe('24/10/2026');
  });
});

describe('planos: código já ocupado (QA-06)', () => {
  const plans = [{ code: 'day', active: true }, { code: 'hour', active: false }, { code: 'minute', active: true }];
  it('acha o plano ativo do código', () => {
    expect(activePlanForCode(plans, 'day')).toBe(plans[0]);
    expect(activePlanForCode(plans, 'hour')).toBeUndefined();
  });
  it('sugere o primeiro código livre', () => {
    expect(firstFreePlanCode(plans, ['minute', 'hour', 'day'])).toBe('hour');
    expect(firstFreePlanCode(plans, ['minute', 'day'])).toBeUndefined();
  });
});

describe('formatadores do painel (QA-09, QA-22)', () => {
  it('barra do gráfico em R$ com centavos e abreviação só acima de R$ 10 mil', () => {
    expect(formatBRLBar(4395).replace(/\s/g, ' ')).toBe('R$ 43,95');
    expect(formatBRLBar(1_234_500)).toBe('R$ 12,3 mil');
  });
  it('telefone com máscara', () => {
    expect(formatPhone('+5511990000001')).toBe('(11) 99000-0001');
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
    expect(formatPhone(undefined)).toBe('—');
  });
});
