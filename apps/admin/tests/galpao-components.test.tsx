import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OpeningHoursEditor } from '@/components/depots/OpeningHoursEditor';
import { PickupTable } from '@/components/depots/PickupTable';
import { HandoverDetail, HandoverTable } from '@/components/depots/HandoverViews';
import { FLEET_STATUS } from '@/ds/FleetStatus';
import { hoursFromApi } from '@/lib/depot-hours';
import type { S } from '@/lib/types';

const noop = () => {};

/** Respostas simuladas no formato do contrato (packages/contracts/openapi.yaml). */
const pickupsResponse: S<'DepotPickupList'> = {
  date: '2026-10-22',
  items: [
    { id: 'r2', vehicleId: 'v2', status: 'active', pickupMode: 'scheduled', pickupAt: '2026-10-22T19:00:00.000Z', createdAt: '2026-10-21T10:00:00.000Z', expiresAt: '2026-10-22T19:30:00.000Z', customerFirstName: 'Bruno Lima', vehicle: { id: 'v2', code: 'VLT-0012' } as never, pickupCode: 'v1.NAO-MOSTRAR.1.x' },
    { id: 'r1', vehicleId: 'v1', status: 'handover', pickupMode: 'now', createdAt: '2026-10-22T12:10:00.000Z', expiresAt: '2026-10-22T14:10:00.000Z', customerFirstName: 'Ana', vehicle: { id: 'v1', code: 'VLT-0011' } as never },
  ],
};

const disputed: S<'Handover'> = {
  id: 'h1', type: 'pickup', depotId: 'd1', reservationId: 'r1', vehicleId: 'v1', vehicleCode: 'VLT-0011', operatorId: 'o1', operatorFirstName: 'Rafael',
  checklist: [{ code: 'freios', ok: true }, { code: 'retrovisor', ok: false, note: 'Esquerdo trincado' }],
  photoKeys: ['handovers/a.jpg', 'handovers/b.jpg'], photoUrls: ['https://minio.local/handovers/a.jpg?sig=1', 'https://minio.local/handovers/b.jpg?sig=2'],
  batteryPct: 96, batterySerial: 'BT-190577', status: 'disputed', disputeReason: 'Retrovisor esquerdo quebrado.',
  createdAt: '2026-10-22T13:00:00.000Z', respondedAt: '2026-10-22T13:04:00.000Z',
};

describe('OpeningHoursEditor', () => {
  it('lista a semana começando na segunda e mostra o erro do dia', () => {
    const html = renderToStaticMarkup(
      <OpeningHoursEditor value={hoursFromApi([{ weekday: 1, opensAt: '07:00', closesAt: '20:00' }])} onChange={noop} errors={{ 1: 'A abertura precisa ser antes do fechamento' }} />,
    );
    expect(html.indexOf('Segunda')).toBeLessThan(html.indexOf('Domingo'));
    expect(html).toContain('A abertura precisa ser antes do fechamento');
    expect(html).toContain('value="07:00"');
    expect(html).toContain('Fechado');
  });
  it('desabilita os campos em modo leitura', () => {
    const html = renderToStaticMarkup(<OpeningHoursEditor value={hoursFromApi([{ weekday: 2, opensAt: '08:00', closesAt: '18:00' }])} onChange={noop} disabled />);
    expect(html).toContain('disabled');
  });
});

describe('PickupTable (agenda)', () => {
  it('ordena por horário, mostra só o primeiro nome e nunca o pickupCode', () => {
    const html = renderToStaticMarkup(<PickupTable items={pickupsResponse.items} mode="all" />);
    expect(html.indexOf('Ana')).toBeLessThan(html.indexOf('Bruno'));
    expect(html).toContain('09:10');
    expect(html).toContain('16:00');
    expect(html).not.toContain('Lima');
    expect(html).not.toContain('NAO-MOSTRAR');
    expect(html).toContain('Em entrega');
  });
  it('mostra o estado vazio', () => {
    expect(renderToStaticMarkup(<PickupTable items={[]} mode="all" />)).toContain('Nenhuma retirada neste dia');
  });
});

describe('Entregas e disputas', () => {
  it('a tabela mostra tipo, moto, operador, checklist e status', () => {
    const html = renderToStaticMarkup(<HandoverTable rows={[disputed]} onSelect={noop} />);
    expect(html).toContain('Saída');
    expect(html).toContain('VLT-0011');
    expect(html).toContain('Rafael');
    expect(html).toContain('1/2');
    expect(html).toContain('Problema apontado');
  });

  it('o detalhe da disputa traz fotos, checklist, motivo e "Abrir no suporte"', () => {
    const html = renderToStaticMarkup(<HandoverDetail handover={disputed} supportHref="/customers?tab=support" rentalHref={null} />);
    expect(html).toContain('src="https://minio.local/handovers/a.jpg?sig=1"');
    expect(html).toContain('src="https://minio.local/handovers/b.jpg?sig=2"');
    expect(html).toContain('Retrovisor esquerdo quebrado.');
    expect(html).toContain('Esquerdo trincado');
    expect(html).toContain('BT-190577');
    expect(html).toContain('href="/customers?tab=support"');
    expect(html).toContain('Abrir no suporte');
  });

  it('sem acesso ao suporte, não mostra o link (só o motivo)', () => {
    const html = renderToStaticMarkup(<HandoverDetail handover={disputed} supportHref={null} rentalHref={null} />);
    expect(html).not.toContain('Abrir no suporte');
    expect(html).toContain('Retrovisor esquerdo quebrado.');
  });

  it('pagamento recusado no aceite aparece para o operador', () => {
    const html = renderToStaticMarkup(<HandoverDetail handover={{ ...disputed, status: 'pending_customer', disputeReason: undefined, lastError: 'payment-declined' }} supportHref={null} rentalHref={null} />);
    expect(html).toContain('Pagamento não aprovado');
  });

  it('sem fotos, explica que a entrega não tem fotos', () => {
    const html = renderToStaticMarkup(<HandoverDetail handover={{ ...disputed, photoKeys: [], photoUrls: [] }} supportHref={null} rentalHref={null} />);
    expect(html).toContain('Sem fotos');
  });
});

describe('legenda da frota', () => {
  it('awaiting_pickup tem chip próprio com o token --status-awaiting-pickup', () => {
    expect(FLEET_STATUS.awaiting_pickup).toEqual(['Aguardando recolhimento', 'var(--status-awaiting-pickup)']);
  });
});
