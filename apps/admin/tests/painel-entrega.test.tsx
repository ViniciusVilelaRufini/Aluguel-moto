import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { can } from '@/lib/permissions';
import {
  PICKUP_CHECKLIST, buildPickupBody, cameraScanSupported, checkPickupCode, emptyChecklist, initialBattery, missingForPickup, parseBattery, type PickupDraft,
} from '@/lib/pickup-handover';
import { PickupHandoverDialog } from '@/components/depots/PickupHandoverDialog';
import { PickupTable } from '@/components/depots/PickupTable';
import type { S } from '@/lib/types';

vi.mock('@tanstack/react-query', async (orig) => {
  const real = await orig<typeof import('@tanstack/react-query')>();
  return { ...real, useQueryClient: () => ({ invalidateQueries() {} }) };
});

/** Entrega de saída pelo painel (2026-11-04): QR por câmera/leitor, checklist, fotos, bateria; sem QR só admin. */
const RES_ID = '6c1f0a52-8f3e-4b8e-9d55-0d6a7f1e2c11';
const OTHER = '11111111-1111-4111-8111-111111111111';
const CODE = `v1.${RES_ID}.1792663200.Zm9vYmFy`;
const vehicle = (over: Partial<S<'VehicleSummary'>> = {}): S<'VehicleSummary'> =>
  ({ id: 'v1', code: 'VLT-0011', model: 'Volti One', status: 'reserved', lat: 0, lng: 0, batteryPct: 87, estimatedRangeKm: 50, ...over });
const reservation = (over: Partial<S<'Reservation'>> = {}): S<'Reservation'> =>
  ({ id: RES_ID, vehicleId: 'v1', vehicle: vehicle(), status: 'active', depotId: 'dep-1', pickupMode: 'now', createdAt: '2026-11-04T12:00:00.000Z', expiresAt: '2026-11-04T14:00:00.000Z', customerFirstName: 'Ana Souza', ...over });

const allOk = () => Object.fromEntries(PICKUP_CHECKLIST.map((i) => [i.code, { ok: true, note: '' }]));
const draft = (over: Partial<PickupDraft> = {}): PickupDraft =>
  ({ reservationId: RES_ID, depotId: 'dep-1', id: { kind: 'code', code: CODE }, checklist: allOk(), photoKeys: ['handovers/a.jpg'], battery: '87', batterySerial: '', ...over });

describe('Entregar moto: regras', () => {
  it('checklist com os mesmos códigos e rótulos do app do operador', () => {
    expect(PICKUP_CHECKLIST.map((i) => i.code)).toEqual(['freios', 'luzes', 'pneus', 'buzina', 'painel', 'carenagem']);
    expect(PICKUP_CHECKLIST.map((i) => i.label)).toEqual(['Freios', 'Luzes', 'Pneus', 'Buzina', 'Painel', 'Carenagem']);
  });

  it('código: aparado; fora de 8 a 256 recusa; QR de outra reserva recusa; outro formato segue para a API', () => {
    expect(checkPickupCode(`  ${CODE}\n`, RES_ID)).toEqual({ ok: true, code: CODE });
    expect(checkPickupCode('curto', RES_ID).ok).toBe(false);
    expect(checkPickupCode('x'.repeat(257), RES_ID).ok).toBe(false);
    expect(checkPickupCode(`v1.${OTHER}.1792663200.Zm9v`, RES_ID)).toEqual({ ok: false, error: 'Este QR é de outra reserva.' });
    expect(checkPickupCode('formato-desconhecido-123', RES_ID).ok).toBe(true);
  });

  it('câmera só com BarcodeDetector e getUserMedia', () => {
    expect(cameraScanSupported(undefined)).toBe(false);
    expect(cameraScanSupported({ navigator: { mediaDevices: { getUserMedia() {} } } })).toBe(false);
    expect(cameraScanSupported({ BarcodeDetector: class {}, navigator: { mediaDevices: { getUserMedia() {} } } })).toBe(true);
  });

  it('bateria pré-preenchida com a da moto; sem leitura (batteryKnown false) o atendente informa', () => {
    expect(initialBattery(vehicle())).toBe('87');
    expect(initialBattery(vehicle({ batteryKnown: false, batteryPct: 0 }))).toBe('');
    expect(initialBattery(undefined)).toBe('');
    expect(parseBattery('100')).toBe(100);
    expect(parseBattery('101')).toBeNull();
    expect(parseBattery('')).toBeNull();
  });

  it('corpo com código: pickupCode, sem reservationId/noCodeReason', () => {
    const body = buildPickupBody(draft({ checklist: { ...allOk(), pneus: { ok: false, note: ' Traseiro murcho ' } }, batterySerial: ' BT-1 ' }));
    expect(body).toEqual({
      type: 'pickup', depotId: 'dep-1', pickupCode: CODE, photoKeys: ['handovers/a.jpg'], batteryPct: 87, batterySerial: 'BT-1',
      checklist: PICKUP_CHECKLIST.map((i) => (i.code === 'pneus' ? { code: 'pneus', ok: false, note: 'Traseiro murcho' } : { code: i.code, ok: true })),
    });
  });

  it('corpo sem QR: reservationId + motivo aparado, sem pickupCode', () => {
    const body = buildPickupBody(draft({ id: { kind: 'noCode', reason: '  Celular sem bateria; RG conferido.  ' } }))!;
    expect(body).toMatchObject({ reservationId: RES_ID, noCodeReason: 'Celular sem bateria; RG conferido.' });
    expect(body).not.toHaveProperty('pickupCode');
  });

  it('falta algo → sem corpo e com a lista do que falta', () => {
    expect(buildPickupBody(draft({ id: { kind: 'code', code: null } }))).toBeNull();
    expect(missingForPickup(draft({ id: { kind: 'code', code: null } }))).toContain('Leia o QR do cliente');
    expect(missingForPickup(draft({ id: { kind: 'noCode', reason: 'curto' } }))[0]).toMatch(/motivo/);
    expect(missingForPickup(draft({ checklist: emptyChecklist() }))).toContain('Responda todo o checklist');
    expect(missingForPickup(draft({ photoKeys: [] }))).toContain('Envie ao menos uma foto da moto');
    expect(missingForPickup(draft({ battery: '' }))).toContain('Informe a bateria (0 a 100)');
  });

  it('permissões: admin e operacao entregam; sem QR só admin', () => {
    expect(can(['admin'], 'handover.create')).toBe(true);
    expect(can(['operacao'], 'handover.create')).toBe(true);
    expect(can(['suporte'], 'handover.create')).toBe(false);
    expect(can(['admin'], 'handover.createWithoutCode')).toBe(true);
    expect(can(['operacao'], 'handover.createWithoutCode')).toBe(false);
  });
});

describe('Entregar moto: diálogo', () => {
  const render = (props: Partial<Parameters<typeof PickupHandoverDialog>[0]> = {}) =>
    renderToStaticMarkup(<PickupHandoverDialog reservation={reservation()} canWithoutCode={false} onClose={() => {}} onCreated={() => {}} {...props} />);

  it('sem câmera disponível mostra só o campo do código', () => {
    const html = render();
    expect(html).toContain('data-testid="pickup-code-input"');
    expect(html).toContain('type="password"');
    expect(html).not.toContain('pickup-camera-start');
  });

  it('com BarcodeDetector oferece a câmera (e o campo continua)', () => {
    const html = render({ cameraSupported: true });
    expect(html).toContain('pickup-camera-start');
    expect(html).toContain('pickup-code-input');
  });

  it('admin vê "Sem QR (admin)"; operacao não', () => {
    expect(render({ canWithoutCode: true })).toContain('Sem QR (admin)');
    expect(render({ canWithoutCode: false })).not.toContain('Sem QR');
  });

  it('bateria pré-preenchida; sem leitura pede ao atendente; checklist com os 6 itens; nunca mostra o código', () => {
    expect(render()).toContain('value="87"');
    const unknown = render({ reservation: reservation({ vehicle: vehicle({ batteryKnown: false, batteryPct: 0 }), pickupCode: CODE }) });
    expect(unknown).toContain('sem leitura de bateria');
    expect(unknown).not.toContain('value="0"');
    expect(unknown).not.toContain(CODE);
    for (const i of PICKUP_CHECKLIST) expect(unknown).toContain(`pickup-check-${i.code}-ok`);
    expect(unknown).toMatch(/disabled="" data-testid="pickup-handover-submit"/);
  });
});

describe('Retiradas: botão "Entregar moto"', () => {
  const items = [reservation(), reservation({ id: 'r-h', status: 'handover', handoverId: 'h1' })];
  it('aparece na reserva aguardando para quem pode entregar; a em entrega segue com "Contrato e pagamento"', () => {
    const html = renderToStaticMarkup(<PickupTable items={items} mode="all" canCheckout canDeliver />);
    expect(html.match(/pickup-deliver/g)).toHaveLength(1);
    expect(html.match(/pickup-counter-checkout/g)).toHaveLength(1);
    expect(renderToStaticMarkup(<PickupTable items={items} mode="all" canCheckout />)).not.toContain('pickup-deliver');
  });
});
