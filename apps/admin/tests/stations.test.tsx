import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QrImage } from '@/components/StationQrModal';
import { depotCreateBody, depotUpdateBody, draftFromDepot, emptyDepotDraft } from '@/lib/depot-hours';
import {
  draftFromStation, emptyStationDraft, occupiedSlots, OPEN_24H_TEXT, qrFileName, qrMatrix, qrPrintHtml, qrSvg, stationCreateBody, stationFeatures, stationSummary,
  stationUpdateBody, toggle24h, validateStation,
} from '@/lib/stations';
import type { S } from '@/lib/types';

const ID = 'd0000000-0000-4000-8000-000000000001';
const CODE = `vst1.${ID}.lMyoiWvb5xuRTHIzBFoxEQ`;

/** Resposta simulada no formato do contrato (`SwapStationAdmin`). */
const station: S<'SwapStationAdmin'> = {
  id: ID, name: 'Estação Largo da Batata', address: 'Largo da Batata, 40 · Pinheiros', lat: -23.5672, lng: -46.693, availableBatteries: 9, totalSlots: 12,
  openingHours: 'Todos os dias, 24 h', open24h: true, active: true, thingName: `station-${ID}`, batteriesInStation: 10, openSwaps: 1,
  depotIds: ['e0000000-0000-4000-8000-000000000001'], createdAt: '2026-10-24T12:00:00.000Z', updatedAt: '2026-10-24T12:00:00.000Z',
};

const filled = () => ({ ...emptyStationDraft(), name: ' Estação Nova ', address: ' R. Nova, 10 ', lat: -23.5, lng: -46.6, openingHours: ' Seg a sáb, 7h às 22h ', totalSlots: '8' });

describe('formulário da estação', () => {
  it('rascunho a partir do contrato: thing padrão vira vazio; vagas ocupadas = maior entre carregadas e registradas', () => {
    const d = draftFromStation(station);
    expect(d).toMatchObject({ id: ID, totalSlots: '12', thingName: '', open24h: true, occupied: 10 });
    expect(draftFromStation({ ...station, thingName: 'station-aaaaaaaa-0000-4000-8000-000000000009' }).thingName).toBe('station-aaaaaaaa-0000-4000-8000-000000000009');
    expect(occupiedSlots({ availableBatteries: 7, batteriesInStation: 2 })).toBe(7);
  });

  it('validação: obrigatórios, ponto, horário sem 24 h, vagas 1..200 e não abaixo das baterias, thing station-<uuid>', () => {
    const e = validateStation(emptyStationDraft());
    expect(Object.keys(e).sort()).toEqual(['address', 'name', 'openingHours', 'point']);
    expect(validateStation(filled())).toEqual({});
    expect(validateStation({ ...filled(), openingHours: '', open24h: true })).toEqual({});
    expect(validateStation({ ...filled(), totalSlots: '0' }).totalSlots).toMatch(/Entre 1 e 200/);
    expect(validateStation({ ...filled(), totalSlots: '201' }).totalSlots).toMatch(/Entre 1 e 200/);
    expect(validateStation({ ...filled(), totalSlots: '2,5' }).totalSlots).toBeDefined();
    expect(validateStation({ ...filled(), totalSlots: '5', occupied: 6 }).totalSlots).toMatch(/6 bateria/);
    expect(validateStation({ ...filled(), thingName: 'moto-0001' }).thingName).toBeDefined();
    expect(validateStation({ ...filled(), thingName: `station-${ID.toUpperCase()}` }).thingName).toBeDefined();
    expect(validateStation({ ...filled(), thingName: `station-${ID}` })).toEqual({});
    // Fix M2: sem 24 h, o texto padrão de 24 h não vale como horário.
    expect(validateStation({ ...filled(), openingHours: OPEN_24H_TEXT, open24h: false }).openingHours).toMatch(/deixou de ser 24 h/);
  });

  it('fix M2: desmarcar 24 h limpa o texto padrão; texto próprio é mantido', () => {
    expect(toggle24h({ ...filled(), open24h: true, openingHours: OPEN_24H_TEXT }, false)).toEqual({ open24h: false, openingHours: '' });
    expect(toggle24h({ ...filled(), open24h: true }, false)).toEqual({ open24h: false });
    expect(toggle24h(filled(), true)).toEqual({ open24h: true });
  });

  it('corpo do POST: campos aparados, sem thing quando vazia, horário omitido em 24 h sem texto', () => {
    expect(stationCreateBody(filled())).toEqual({
      name: 'Estação Nova', address: 'R. Nova, 10', lat: -23.5, lng: -46.6, open24h: false, openingHours: 'Seg a sáb, 7h às 22h', totalSlots: 8, active: true,
    });
    const h24 = stationCreateBody({ ...filled(), openingHours: '', open24h: true, thingName: `station-${ID}` });
    expect(h24).not.toHaveProperty('openingHours');
    expect(h24).toMatchObject({ open24h: true, thingName: `station-${ID}` });
  });

  it('corpo do PATCH: nunca muda active; thing vazia volta explicitamente ao padrão station-{id}', () => {
    const body = stationUpdateBody({ ...draftFromStation(station), active: false });
    expect(body).not.toHaveProperty('active');
    expect(body).toMatchObject({ thingName: `station-${ID}`, totalSlots: 12, openingHours: OPEN_24H_TEXT });
  });

  it('lista e mapa: resumo e pontos com inativa/sem carregada', () => {
    expect(stationSummary(station)).toBe('9/12 carregadas · 24 h');
    expect(stationSummary({ ...station, open24h: false, openingHours: 'Seg a sex, 7h às 20h' })).toBe('9/12 carregadas · Seg a sex, 7h às 20h');
    const fc = stationFeatures([station, { ...station, id: 'x', active: false, availableBatteries: 0 }]);
    expect(fc.features[0]).toMatchObject({ geometry: { coordinates: [-46.693, -23.5672] }, properties: { id: ID, active: true, empty: false } });
    expect(fc.features[1].properties).toMatchObject({ active: false, empty: true });
  });
});

describe('QR fixo da estação', () => {
  it('matriz determinística, com os três padrões de localização nos cantos', () => {
    const a = qrMatrix(CODE);
    expect(qrMatrix(CODE)).toEqual(a);
    expect(a.size).toBeGreaterThanOrEqual(25);
    expect((a.size - 17) % 4).toBe(0);
    const dark = new Set(a.path.match(/M\d+ \d+/g)!.map((m) => m.slice(1)));
    const isDark = (c: number, r: number) => dark.has(`${c} ${r}`);
    for (const [c0, r0] of [[0, 0], [a.size - 7, 0], [0, a.size - 7]]) {
      // Borda 7x7 escura, anel claro e miolo 3x3 escuro.
      for (let i = 0; i < 7; i++) expect([isDark(c0 + i, r0), isDark(c0, r0 + i), isDark(c0 + 6, r0 + i), isDark(c0 + i, r0 + 6)]).toEqual([true, true, true, true]);
      expect(isDark(c0 + 1, r0 + 1)).toBe(false);
      expect(isDark(c0 + 3, r0 + 3)).toBe(true);
    }
    expect(qrMatrix(`${CODE}x`).path).not.toBe(a.path);
  });

  it('SVG autônomo com zona de silêncio; componente desenha o mesmo caminho', () => {
    const svg = qrSvg(CODE, 400);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="400" height="400" viewBox="-4 -4 /);
    expect(svg).toContain(qrMatrix(CODE).path);
    const html = renderToStaticMarkup(<QrImage code={CODE} />);
    expect(html).toContain('data-testid="station-qr-image"');
    expect(html).toContain(qrMatrix(CODE).path);
  });

  it('impressão escapa nome e endereço; arquivo sem acentos', () => {
    const html = qrPrintHtml({ name: 'Estação <script>alert(1)</script>', address: 'R. "A" & B' }, CODE);
    expect(html).not.toContain('<script>');
    expect(html).toContain('Estação &lt;script&gt;');
    expect(html).toContain('R. &quot;A&quot; &amp; B');
    expect(html).toContain('<svg');
    expect(qrFileName('Estação Paulista–Consolação')).toBe('qr-estacao-estacao-paulista-consolacao.svg');
    expect(qrFileName('***')).toBe('qr-estacao-sem-nome.svg');
  });
});

describe('galpão ligado à estação', () => {
  const depot = (o: Partial<S<'Depot'>> = {}): S<'Depot'> => ({
    id: 'g1', name: 'G', address: 'R', lat: -23.5, lng: -46.6, timezone: 'America/Sao_Paulo', openingHours: [], pickupNowWindowMinutes: 120, maxScheduleDays: 7,
    scheduledGraceMinutes: 30, active: true, ...o,
  });

  it('cadastro: envia swapStationId só quando escolhida', () => {
    const base = { ...emptyDepotDraft(), name: 'G', address: 'R', lat: -23.5, lng: -46.6 };
    expect(depotCreateBody(base)).not.toHaveProperty('swapStationId');
    expect(depotCreateBody({ ...base, swapStationId: ID }).swapStationId).toBe(ID);
  });

  it('edição: escolhe → swapStationId; "Nenhuma" num galpão que tinha → clearSwapStation; sem estação antes nem agora → nada', () => {
    const linked = draftFromDepot(depot({ swapStationId: ID }));
    expect(linked).toMatchObject({ swapStationId: ID, hadSwapStation: true });
    expect(depotUpdateBody(linked)).toMatchObject({ swapStationId: ID });
    const cleared = depotUpdateBody({ ...linked, swapStationId: '' });
    expect(cleared).toMatchObject({ clearSwapStation: true });
    expect(cleared).not.toHaveProperty('swapStationId');
    const none = depotUpdateBody(draftFromDepot(depot()));
    expect(none).not.toHaveProperty('swapStationId');
    expect(none).not.toHaveProperty('clearSwapStation');
  });
});
