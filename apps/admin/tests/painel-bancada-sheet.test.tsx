import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { S } from '@/lib/types';

/**
 * Painel de bancada (L4, P1-3, P1-1, P3): a ficha da VLT-0059 (J16 só relé, sem leitura de bateria, GPS inválido) na primeira
 * pintura (antes do GET /vehicles/{id}) e com a posição velha.
 */

const fleetCopy: S<'Vehicle'> = {
  id: 'v1', code: 'VLT-0059', model: 'Volti Flash', status: 'rented', lat: -23.5, lng: -46.6, batteryPct: 0, batteryKnown: false,
  estimatedRangeKm: 0, speedLimitKmh: 32, online: true, locked: false, lastSeenAt: new Date().toISOString(), trackerControlMode: 'relay_only',
};

const state: { detail: S<'Vehicle'> | undefined; live: S<'Vehicle'>[] } = { detail: undefined, live: [fleetCopy] };

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ groups: ['admin'] }) }));
vi.mock('@/lib/realtime', () => ({ useRealtime: () => ({ vehicles: state.live }), useRealtimeEvent: () => {} }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace() {}, push() {} }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@tanstack/react-query', async (orig) => {
  const real = await orig<typeof import('@tanstack/react-query')>();
  return {
    ...real,
    useQuery: (o: { queryKey: unknown[] }) => ({ data: o.queryKey[0] === 'vehicle' ? state.detail : undefined, isLoading: o.queryKey[0] === 'vehicle' && !state.detail, error: null }),
    useQueryClient: () => ({ invalidateQueries() {}, setQueryData() {} }),
  };
});

const render = async () => {
  const { VehicleSheet } = await import('@/components/VehicleSheet');
  const html = renderToStaticMarkup(<VehicleSheet vehicleId="v1" onClose={() => {}} onReplay={() => {}} replayActive={false} />);
  return { html, text: html.replace(/<[^>]*>/g, '|') };
};

describe('VehicleSheet — primeira pintura (L4)', () => {
  beforeEach(() => { state.detail = undefined; state.live = [fleetCopy]; });

  it('antes do GET da ficha: esqueleto no lugar de bateria/velocidade/limite; nunca "0%", "~0 km" nem "Limite 32 km/h"', async () => {
    // Cópia da frota velha/incompleta (sem batteryKnown nem trackerControlMode): era ela que pintava "0% ~0 km · Limite 32 km/h".
    state.live = [{ ...fleetCopy, batteryKnown: undefined, trackerControlMode: undefined }];
    const { html, text } = await render();
    expect(html).toContain('sheet-chips-loading');
    expect(text).not.toContain('0%');
    expect(text).not.toContain('~0 km');
    expect(text).not.toContain('Limite 32 km/h');
  });

  it('cópia da frota sem o tipo do rastreador → "Rastreador —" (não "Controle de velocidade")', async () => {
    state.live = [{ ...fleetCopy, trackerControlMode: undefined }];
    const { html } = await render();
    expect(html).toMatch(/data-testid="tracker-mode">—</);
  });

  it('com o GET: bateria desconhecida, sem controle de velocidade; posição velha → aviso e velocidade "—"', async () => {
    state.detail = { ...fleetCopy, speedKmh: 14, positionAt: new Date(Date.now() - 6 * 60_000).toISOString() };
    const { html, text } = await render();
    expect(html).not.toContain('sheet-chips-loading');
    expect(text).toContain('Bateria desconhecida');
    expect(text).toContain('Sem controle de velocidade');
    expect(text).toContain('Posição de há 6 min (sem GPS)');
    expect(html).toMatch(/data-testid="vehicle-speed">— km\/h</);
    expect(text).not.toContain('14 km/h');
  });

  it('moto já travada: Bloquear avisa (title) mas continua habilitado — a trava reportada pode não ser a física', async () => {
    state.detail = { ...fleetCopy, locked: true };
    const { html } = await render();
    const btn = html.match(/<button[^>]*data-testid="cmd-lock"[^>]*>/)?.[0] ?? '';
    expect(btn).toContain('title="A moto já consta como travada"');
    expect(btn).not.toContain('disabled=""');
  });
});

describe('StatTile (P2-4)', () => {
  it('a primeira pintura já mostra o valor (não sobe do 0)', async () => {
    const { StatTile } = await import('@/ds/StatTile');
    const html = renderToStaticMarkup(<StatTile label="Alertas pendentes" numeric={7} />);
    expect(html.replace(/<[^>]*>/g, '|')).toContain('|7|');
    expect(renderToStaticMarkup(<StatTile label="Alertas pendentes" numeric={null} />)).toContain('—');
  });
});

describe('MapView (revisão, item 6)', () => {
  it('até o "load" do mapa mostra "Carregando mapa…" sem bloquear cliques', async () => {
    const { MapView } = await import('@/components/MapView');
    const html = renderToStaticMarkup(<MapView onReady={() => {}} />);
    expect(html).toContain('data-testid="map-loading"');
    expect(html).toContain('Carregando mapa…');
    expect(html).toMatch(/data-testid="map-loading"[^>]*pointer-events:none|pointer-events:none[^>]*data-testid="map-loading"/);
  });
});
