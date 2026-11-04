import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { hasCounterBalance } from '@/lib/counter';
import {
  ARRIVAL_CHECKLIST, buildReturnBody, canReceiveAtDepot, defaultReturnDepot, missingForReturn, returnErrorMessage, type ReturnDraft,
} from '@/lib/return-handover';
import { emptyChecklist } from '@/lib/pickup-handover';
import { ReturnHandoverDialog } from '@/components/depots/ReturnHandoverDialog';
import type { S } from '@/lib/types';

/** Chegada no galpão pelo painel (2026-11-04): o atendente recebe a moto do aluguel em andamento. */
const RENTAL = '7a1f0a52-8f3e-4b8e-9d55-0d6a7f1e2c22';
const depot = (id: string, over: Partial<S<'Depot'>> = {}): S<'Depot'> => ({
  id, name: `Galpão ${id}`, address: 'Rua A, 1', lat: -23.56, lng: -46.69, timezone: 'America/Sao_Paulo', openingHours: [], pickupNowWindowMinutes: 120,
  maxScheduleDays: 7, scheduledGraceMinutes: 30, minChargedBatteries: 4, active: true, availableVehicleCount: 0, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z', ...over,
} as S<'Depot'>);
const DEPOTS = [depot('dep-1'), depot('dep-2')];

const allOk = () => Object.fromEntries(ARRIVAL_CHECKLIST.map((i) => [i.code, { ok: true, note: '' }]));
const draft = (over: Partial<ReturnDraft> = {}): ReturnDraft =>
  ({ rentalId: RENTAL, depotId: 'dep-2', checklist: allOk(), photoKeys: ['handovers/a.jpg'], battery: '64', batterySerial: '', ...over });

describe('Receber no galpão: regras', () => {
  it('checklist de chegada com os 4 códigos do app do operador e rótulos pt-BR', () => {
    expect(ARRIVAL_CHECKLIST.map((i) => i.code)).toEqual(['freios', 'pneus', 'luzes', 'carenagem']);
    expect(ARRIVAL_CHECKLIST.map((i) => i.label)).toEqual(['Freios', 'Pneus', 'Luzes', 'Carenagem']);
    expect(Object.keys(emptyChecklist(ARRIVAL_CHECKLIST))).toEqual(['freios', 'pneus', 'luzes', 'carenagem']);
  });

  it('galpão: o da moto quando ativo; senão o único ativo; senão o atendente escolhe', () => {
    expect(defaultReturnDepot(DEPOTS, 'dep-2')).toBe('dep-2');
    expect(defaultReturnDepot(DEPOTS, 'dep-9')).toBe('');
    expect(defaultReturnDepot(DEPOTS, undefined)).toBe('');
    expect(defaultReturnDepot([depot('dep-1')], undefined)).toBe('dep-1');
    expect(defaultReturnDepot([depot('dep-1', { active: false })], 'dep-1')).toBe('');
  });

  it('corpo: return_depot com rentalId, depotId, checklist (nota aparada), fotos e bateria', () => {
    const body = buildReturnBody(draft({ checklist: { ...allOk(), pneus: { ok: false, note: ' Traseiro murcho ' } }, batterySerial: ' BT-9 ' }));
    expect(body).toEqual({
      type: 'return_depot', rentalId: RENTAL, depotId: 'dep-2', photoKeys: ['handovers/a.jpg'], batteryPct: 64, batterySerial: 'BT-9',
      checklist: ARRIVAL_CHECKLIST.map((i) => (i.code === 'pneus' ? { code: 'pneus', ok: false, note: 'Traseiro murcho' } : { code: i.code, ok: true })),
    });
    expect(buildReturnBody(draft())).not.toHaveProperty('batterySerial');
  });

  it('falta algo → sem corpo e com a lista do que falta (galpão, checklist, foto, bateria)', () => {
    expect(buildReturnBody(draft({ depotId: '' }))).toBeNull();
    expect(missingForReturn(draft({ depotId: '' }))).toContain('Escolha o galpão');
    expect(missingForReturn(draft({ checklist: emptyChecklist(ARRIVAL_CHECKLIST) }))).toContain('Responda todo o checklist');
    expect(missingForReturn(draft({ photoKeys: [] }))).toContain('Envie ao menos uma foto da moto');
    expect(missingForReturn(draft({ battery: '' }))).toContain('Informe a bateria (0 a 100)');
    expect(missingForReturn(draft({ battery: '101' }))).toContain('Informe a bateria (0 a 100)');
    expect(missingForReturn(draft())).toEqual([]);
  });

  it('erros em pt-BR: fora do galpão explica o raio, o sinal e o encerramento forçado; 409 usa o texto da API', () => {
    const far = returnErrorMessage(new ApiError(422, 'A moto não está no galpão.', 'vehicle-not-at-depot'));
    expect(far).toContain('precisa estar no galpão');
    expect(far).toContain('sinal');
    expect(far).toContain('Encerrar aluguel à força');
    expect(returnErrorMessage(new ApiError(409, 'Este aluguel não está em andamento.', 'rental-not-active'))).toBe('Este aluguel não está em andamento.');
    expect(returnErrorMessage(new ApiError(404, 'x', 'not-found'))).toMatch(/não encontrad/);
  });

  it('quem vê "Receber no galpão": admin e operacao com aluguel em andamento; suporte não', () => {
    expect(canReceiveAtDepot(['admin'], { currentRentalId: RENTAL })).toBe(true);
    expect(canReceiveAtDepot(['operacao'], { currentRentalId: RENTAL })).toBe(true);
    expect(canReceiveAtDepot(['suporte'], { currentRentalId: RENTAL })).toBe(false);
    expect(canReceiveAtDepot(['financeiro'], { currentRentalId: RENTAL })).toBe(false);
    expect(canReceiveAtDepot(['operacao'], {})).toBe(false);
  });

  it('acerto no balcão só quando há dívida ou caução a devolver', () => {
    const b = (debtTotalCents: number, deposits: unknown[] = []) => ({ debtTotalCents, deposits }) as unknown as S<'CounterBalance'>;
    expect(hasCounterBalance(b(0))).toBe(false);
    expect(hasCounterBalance(b(6000))).toBe(true);
    expect(hasCounterBalance(b(0, [{}]))).toBe(true);
  });
});

describe('Receber no galpão: diálogo', () => {
  const render = (vehicle: Partial<S<'Vehicle'>> = {}) => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(['depots', 'active'], { items: DEPOTS });
    const v = { id: 'veh-2', code: 'VLT-0002', depotId: 'dep-2', batteryPct: 64, batteryKnown: true, ...vehicle };
    return renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <ReturnHandoverDialog rentalId={RENTAL} vehicle={v} onClose={() => {}} onDone={() => {}} />
      </QueryClientProvider>,
    );
  };

  it('galpão da moto pré-selecionado entre os ativos; 4 itens do checklist; bateria pré-preenchida', () => {
    const html = render();
    expect(html).toContain('data-testid="return-handover-dialog"');
    expect(html).toContain('VLT-0002');
    expect(html).toMatch(/<option value="dep-2" selected="">/);
    for (const i of ARRIVAL_CHECKLIST) expect(html).toContain(`return-check-${i.code}-ok`);
    expect(html.match(/return-check-[a-z]+-ok/g)).toHaveLength(4);
    expect(html).toContain('value="64"');
  });

  it('sem foto não registra (botão desabilitado) e diz o que falta', () => {
    const html = render();
    expect(html).toMatch(/disabled="" data-testid="return-handover-submit"/);
    expect(html).toContain('Envie ao menos uma foto da moto');
    expect(html).toContain('0 de 12');
  });

  it('sem leitura de bateria (batteryKnown false) o atendente informa', () => {
    const html = render({ batteryKnown: false, batteryPct: 0 });
    expect(html).toContain('sem leitura de bateria');
    expect(html).not.toContain('value="0"');
  });
});
