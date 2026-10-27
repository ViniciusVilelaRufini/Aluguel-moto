'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { GeoJSONSource, Map as MlMap, Marker, Popup } from 'maplibre-gl';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRealtime, type FleetVehicle } from '@/lib/realtime';
import { STATUS_COLOR, STATUS_LABEL, VEHICLE_STATUSES } from '@/lib/status';
import { formatBRL } from '@/lib/format';
import { anyMoved, batteryHex, interpolatePositions, positionsOf, type LngLat } from '@/lib/map-anim';
import { easeInOutCubic, prefersReducedMotion, tween } from '@/lib/motion';
import { dialogStack } from '@/lib/focus';
import { rentalWindow } from '@/lib/fleet-copy';
import { BIKE_ICON, registerFleetImages } from '@/lib/map-icons';
import { addDepotLayer, DEPOT_LAYER, setDepots } from '@/lib/depot-layer';
import { MapView } from '@/components/MapView';
import { fitPoints } from '@/lib/fleet-fit';
import { VehicleSheet } from '@/components/VehicleSheet';
import { FleetList } from '@/components/FleetList';
import { SegmentedControl } from '@/ds/SegmentedControl';
import { Field, Select } from '@/components/ui';
import { FleetStatus } from '@/ds/FleetStatus';
import { StatTile, StatTileSkeleton } from '@/ds/StatTile';
import { Button } from '@/ds/Button';
import { IconButton } from '@/ds/IconButton';
import { Icon } from '@/ds/Icon';
import { can, canOpen } from '@/lib/permissions';
import type { VehicleStatus } from '@/lib/types';

const FLEET_SRC = 'fleet';
/** Tempo do deslize do pin até a nova posição (telemetria chega a cada 5 s em aluguel). */
const MOVE_MS = 900;
const pct = (n: number) => `${n}%`;
const colorExpr = ['match', ['get', 'status'], ...VEHICLE_STATUSES.flatMap((s) => [s, STATUS_COLOR[s]]), '#9AA0A6'] as never;

function toFeatures(list: FleetVehicle[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: list.map((v) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
      properties: { id: v.id, code: v.code, status: v.status, battery: v.batteryPct, batteryColor: batteryHex(v.batteryPct) },
    })),
  };
}

const REVENUE_GROUPS = ['admin', 'financeiro'];

export default function FleetPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { groups } = useAuth();
  const { vehicles, vehiclesReady, openAlerts } = useRealtime();
  const [filter, setFilter] = useState<VehicleStatus | null>(null);
  const [selected, setSelected] = useState<string | null>(params.get('vehicle'));
  const [mapReady, setMapReady] = useState(false);
  const [showHeat, setShowHeat] = useState(false);
  const [replay, setReplay] = useState(false);
  const [view, setView] = useState<'map' | 'list'>(params.get('view') === 'list' ? 'list' : 'map');
  const [onlyFixed, setOnlyFixed] = useState(false);
  const mapRef = useRef<MlMap | null>(null);
  const pulseRef = useRef<Marker | null>(null);
  const imagesOff = useRef<() => void>(() => {});
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  // A paleta (Ctrl+K) navega para /fleet?vehicle= estando já na frota: acompanha a query string.
  const paramVehicle = params.get('vehicle');
  useEffect(() => {
    if (paramVehicle && paramVehicle !== selectedRef.current) { setSelected(paramVehicle); setReplay(false); }
  }, [paramVehicle]);

  const code = params.get('code');
  useEffect(() => {
    if (!code) return;
    const v = vehicles.find((x) => x.code.toLowerCase() === code.toLowerCase());
    if (v) setSelected(v.id);
  }, [code, vehicles]);

  const counts = useMemo(() => vehicles.reduce<Record<string, number>>((a, v) => { a[v.status] = (a[v.status] ?? 0) + 1; return a; }, {}), [vehicles]);
  const shown = useMemo(() => vehicles.filter((v) => !filter || v.status === filter), [vehicles, filter]);

  const select = useCallback((id: string | null) => {
    setSelected(id);
    setReplay(false);
    router.replace(id ? `/fleet?vehicle=${id}` : '/fleet', { scroll: false });
  }, [router]);

  const changeView = (v: 'map' | 'list') => { setView(v); if (v === 'list') setReplay(false); };

  // Na lista, o endereço vem do `GET /vehicles` (o tempo real só traz posição): recarrega a frota a cada 60 s.
  const qc = useQueryClient();
  useEffect(() => {
    if (view !== 'list') return;
    const t = setInterval(() => qc.invalidateQueries({ queryKey: ['fleet'] }), 60_000);
    return () => clearInterval(t);
  }, [view, qc]);

  // Esc fecha a ficha da moto (quando nenhum diálogo está aberto).
  useEffect(() => {
    if (!selected) return;
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || dialogStack.size() > 0) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      select(null);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selected, select]);

  // Mapa: fonte com cluster, camadas e interação.
  const onReady = useCallback((map: MlMap) => {
    mapRef.current = map;
    map.addSource(FLEET_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 44, clusterMaxZoom: 14 });
    imagesOff.current = registerFleetImages(map);
    // Cluster: imagem em canvas com a contagem (sem glifos externos); o clique continua nesta camada.
    map.addLayer({ id: 'clusters', type: 'symbol', source: FLEET_SRC, filter: ['has', 'point_count'], layout: { 'icon-image': ['concat', 'cluster-', ['to-string', ['get', 'point_count']]] as never, 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
    // Anel de bateria por fora do pin (mesma regra da BatteryPill), depois o pin na cor do status com o ícone da moto.
    // Retirada em galpão: moto devolvida em ponto verde, esperando recolhimento, ganha um halo na cor do status.
    map.addLayer({ id: 'vehicles-awaiting-halo', type: 'circle', source: FLEET_SRC, filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'status'], 'awaiting_pickup']], paint: { 'circle-color': STATUS_COLOR.awaiting_pickup, 'circle-opacity': 0.22, 'circle-radius': 24, 'circle-stroke-color': STATUS_COLOR.awaiting_pickup, 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.8 } });
    map.addLayer({ id: 'vehicles-battery', type: 'circle', source: FLEET_SRC, filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['get', 'batteryColor'] as never, 'circle-radius': 14.5, 'circle-opacity': 0.95 } });
    map.addLayer({ id: 'vehicles', type: 'circle', source: FLEET_SRC, filter: ['!', ['has', 'point_count']], paint: { 'circle-color': colorExpr, 'circle-radius': 12, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5 } });
    map.addLayer({ id: 'vehicle-selected', type: 'circle', source: FLEET_SRC, filter: ['==', ['get', 'id'], ''], paint: { 'circle-color': colorExpr, 'circle-radius': 17, 'circle-stroke-color': '#15181A', 'circle-stroke-width': 3 } });
    map.addLayer({ id: 'vehicles-icon', type: 'symbol', source: FLEET_SRC, filter: ['!', ['has', 'point_count']], layout: { 'icon-image': BIKE_ICON, 'icon-size': 0.5, 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
    // Pino do galpão por cima das motos (a ponta aponta para o cluster das motos guardadas).
    addDepotLayer(map);
    map.on('click', 'vehicles', (e) => { const id = e.features?.[0]?.properties?.id as string | undefined; if (id) select(id); });
    map.on('click', 'clusters', async (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const src = map.getSource(FLEET_SRC) as GeoJSONSource;
      const zoom = await src.getClusterExpansionZoom(f.properties?.cluster_id as number);
      // Abre o grupo com um zoom suave (curto com movimento reduzido).
      map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom, duration: prefersReducedMotion() ? 0 : 650, easing: easeInOutCubic });
    });
    for (const l of ['vehicles', 'clusters']) {
      map.on('mouseenter', l, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', l, () => (map.getCanvas().style.cursor = ''));
    }
    // Dica ao passar o mouse: código, status e bateria.
    import('maplibre-gl').then((ml) => {
      if (mapRef.current !== map) return;
      let popup: Popup | null = null;
      map.on('mouseenter', 'vehicles', (e) => {
        const p = e.features?.[0]?.properties as { code?: string; status?: VehicleStatus; battery?: number } | undefined;
        if (!p?.code) return;
        const el = document.createElement('div');
        el.className = 'vt-tip';
        const strong = document.createElement('strong');
        strong.textContent = p.code;
        const span = document.createElement('span');
        span.textContent = `${p.status ? STATUS_LABEL[p.status] : ''} · ${p.battery ?? '—'}%`;
        el.append(strong, span);
        popup = new ml.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: 'vt-popup' })
          .setLngLat((e.features![0].geometry as GeoJSON.Point).coordinates as [number, number]).setDOMContent(el).addTo(map);
      });
      map.on('mouseleave', 'vehicles', () => { popup?.remove(); popup = null; });
      map.on('mouseenter', DEPOT_LAYER, (e) => {
        const p = e.features?.[0]?.properties as { name?: string; address?: string } | undefined;
        if (!p?.name) return;
        const el = document.createElement('div');
        el.className = 'vt-tip';
        const strong = document.createElement('strong');
        strong.textContent = p.name;
        const span = document.createElement('span');
        span.textContent = p.address ?? '';
        el.append(strong, span);
        popup = new ml.Popup({ closeButton: false, closeOnClick: false, offset: [0, -40], className: 'vt-popup' })
          .setLngLat((e.features![0].geometry as GeoJSON.Point).coordinates as [number, number]).setDOMContent(el).addTo(map);
      });
      map.on('mouseleave', DEPOT_LAYER, () => { popup?.remove(); popup = null; });
      // Pulso da moto selecionada (HTML, para usar vt-pulse-ring e respeitar movimento reduzido no CSS).
      const el = document.createElement('div');
      el.className = 'map-pulse';
      el.setAttribute('aria-hidden', 'true');
      pulseRef.current = new ml.Marker({ element: el });
      setMapReady(true);
    });
  }, [select]);

  // Posições: o pin desliza da posição desenhada até a nova (vehicle.position), sem saltar.
  const drawn = useRef<Map<string, LngLat>>(new Map());
  const cancelMove = useRef<() => void>(() => {});
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const src = map.getSource(FLEET_SRC) as GeoJSONSource | undefined;
    if (!src) return;
    cancelMove.current();
    const from = drawn.current;
    const paint = (list: FleetVehicle[]) => {
      src.setData(toFeatures(list));
      drawn.current = positionsOf(list);
      const sel = list.find((v) => v.id === selectedRef.current);
      if (sel) pulseRef.current?.setLngLat([sel.lng, sel.lat]);
    };
    if (from.size === 0 || !anyMoved(from, shown)) { paint(shown); return; }
    cancelMove.current = tween({ duration: MOVE_MS, reduced: prefersReducedMotion(), onUpdate: (t) => paint(interpolatePositions(from, shown, t)) });
    return () => cancelMove.current();
  }, [shown, mapReady]);

  // Enquadra a frota uma vez, quando os dados chegam (sem moto selecionada).
  const fitted = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || fitted.current || vehicles.length === 0 || selectedRef.current) return;
    fitted.current = true;
    const pts = fitPoints(vehicles);
    const lngs = pts.map((v) => v.lng);
    const lats = pts.map((v) => v.lat);
    map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 80, maxZoom: 15, duration: 0 });
  }, [vehicles, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    map.setFilter('vehicle-selected', ['==', ['get', 'id'], selected ?? '']);
    map.setLayoutProperty('vehicles-icon', 'icon-size', ['case', ['==', ['get', 'id'], selected ?? ''], 0.7, 0.5] as never);
    const v = vehicles.find((x) => x.id === selected);
    const pulse = pulseRef.current;
    if (v && pulse) pulse.setLngLat([v.lng, v.lat]).addTo(map);
    else pulse?.remove();
    if (v && !replay) map.easeTo({ center: [v.lng, v.lat], zoom: Math.max(map.getZoom(), 15), duration: prefersReducedMotion() ? 0 : 600 });
    // Centraliza só ao trocar de moto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, mapReady]);

  // Mapa de calor de demanda (últimos 7 dias).
  const canHeat = canOpen(groups, 'zones') || groups.includes('admin') || groups.includes('operacao');
  const heat = useQuery({
    queryKey: ['heatmap'],
    enabled: canHeat && showHeat,
    queryFn: () => {
      const to = new Date();
      const from = new Date(to.getTime() - 7 * 86400_000);
      return unwrap(api.GET('/reports/demand-heatmap', { params: { query: { from: from.toISOString(), to: to.toISOString() } } }));
    },
  });
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    if (map.getLayer('heat')) map.removeLayer('heat');
    if (map.getSource('heat')) map.removeSource('heat');
    if (!showHeat || !heat.data) return;
    map.addSource('heat', { type: 'geojson', data: { type: 'FeatureCollection', features: heat.data.points.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { weight: p.weight } })) } });
    map.addLayer({ id: 'heat', type: 'heatmap', source: 'heat', paint: { 'heatmap-weight': ['get', 'weight'], 'heatmap-radius': 28, 'heatmap-opacity': 0.7, 'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(52,194,92,0)', 0.3, '#A8E4BA', 0.6, '#FBC531', 1, '#E04E42'] } }, 'clusters');
  }, [showHeat, heat.data, mapReady]);

  // Galpões ativos no mapa (GET /depots: todos os grupos que abrem a frota).
  const depotsQ = useQuery({ queryKey: ['depots', 'active'], queryFn: () => unwrap(api.GET('/depots')) });
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    setDepots(map, depotsQ.data?.items ?? []);
  }, [depotsQ.data, mapReady]);

  const dash = useQuery({ queryKey: ['dashboard'], queryFn: () => unwrap(api.GET('/reports/dashboard')), refetchInterval: 30_000 });

  return (
    <div className="split" style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 320 }}>
        <MapView onReady={onReady} onDestroy={() => { imagesOff.current(); imagesOff.current = () => {}; pulseRef.current?.remove(); pulseRef.current = null; mapRef.current = null; drawn.current = new Map(); setMapReady(false); }} />
        {/* No celular, com uma moto selecionada no mapa, KPIs e filtros recolhem para o pin não ficar escondido (ver .fleet-overlay em globals.css). */}
        <div data-view={view} className="fleet-overlay" data-collapsed={(!!selected && view === 'map') || undefined} style={view === 'list'
          ? { position: 'absolute', inset: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto', background: 'var(--surface-app)', zIndex: 3 }
          : { position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
          {dash.data ? (
            <div data-testid="dashboard-strip" className="vt-stagger kpi-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, pointerEvents: 'auto', maxWidth: 880 }}>
              <StatTile icon="Gauge" label="Ocupação" numeric={Math.round(dash.data.occupancyPct)} format={pct} />
              <StatTile icon="Bike" label="Aluguéis ativos" numeric={dash.data.activeRentals} />
              {/* A API zera a receita para quem não é admin/financeiro: melhor ocultar do que mostrar R$ 0,00. */}
              {groups.some((g) => REVENUE_GROUPS.includes(g)) && <StatTile icon="Wallet" label="Receita do dia" numeric={dash.data.revenueTodayCents} format={formatBRL} />}
              {/* Alertas vêm do tempo real (alert.created), não só do refresh de 30 s do dashboard. */}
              <StatTile icon="Siren" label="Alertas pendentes" numeric={openAlerts} goodWhen="down" />
            </div>
          ) : dash.isLoading ? (
            <div aria-hidden className="kpi-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, maxWidth: 880 }}>
              {[0, 1, 2, 3].map((i) => <StatTileSkeleton key={i} />)}
            </div>
          ) : null}
          <div role="group" aria-label="Filtrar motos por status" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'auto' }}>
            {VEHICLE_STATUSES.map((s) => (
              <FleetStatus key={s} status={s} count={vehiclesReady ? (counts[s] ?? 0) : '—'} selected={filter === s} onClick={() => setFilter(filter === s ? null : s)} style={{ boxShadow: 'var(--shadow-1)' }} />
            ))}
            {filter && (
              <button type="button" className="chip-clear" onClick={() => setFilter(null)} aria-label="Limpar filtro de status">Limpar filtro</button>
            )}
          </div>
          {/* Controles em linha própria: não se misturam com os chips quando estes quebram de linha (1366 px, painel aberto). */}
          <div role="group" aria-label="Controles da frota" data-testid="fleet-controls" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', pointerEvents: 'auto' }}>
            <SegmentedControl label="Ver frota como" options={[{ value: 'map', label: 'Mapa' }, { value: 'list', label: 'Lista' }]} value={view} onChange={changeView} style={{ width: 170, boxShadow: 'var(--shadow-1)' }} />
            {can(groups, 'vehicle.edit') && (
              <Button size="sm" variant="secondary" icon="Plus" testId="vehicle-new" style={{ height: 30, background: '#fff', color: 'var(--text-primary)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-1)' }} onClick={() => router.push('/motos?new=1')}>Nova moto</Button>
            )}
            {canHeat && view === 'map' && (
              <Button size="sm" variant={showHeat ? 'dark' : 'secondary'} icon="Flame" testId="heat-toggle" style={{ height: 30, background: showHeat ? undefined : '#fff', color: showHeat ? undefined : 'var(--text-primary)', borderColor: showHeat ? 'transparent' : 'var(--border-subtle)', boxShadow: 'var(--shadow-1)' }} onClick={() => setShowHeat(!showHeat)}>Demanda</Button>
            )}
          </div>
          {view === 'list' && <div className="section-in"><FleetList vehicles={shown} selected={selected} onSelect={(id) => select(id)} onlyFixed={onlyFixed} onToggleFixed={() => setOnlyFixed((x) => !x)} /></div>}
        </div>
        {view === 'map' && !(selected && replay) && <div data-testid="map-legend" aria-label="Legenda do mapa" role="group" className="map-legend"
          style={{ position: 'absolute', left: 16, bottom: 24, display: 'flex', gap: 14, alignItems: 'center', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--glass-bg)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-1)', font: 'var(--type-caption)', fontWeight: 600 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--ink-900)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="Warehouse" size={12} /></span>
            Galpão
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden style={{ width: 18, height: 18, borderRadius: '50%', background: 'color-mix(in srgb, var(--status-awaiting-pickup) 22%, transparent)', border: '2px solid var(--status-awaiting-pickup)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-awaiting-pickup)' }} />
            </span>
            Aguardando recolhimento ({counts.awaiting_pickup ?? 0})
          </span>
        </div>}
        {selected && replay && view === 'map' && <ReplayBar vehicleId={selected} mapRef={mapRef} mapReady={mapReady} />}
      </div>
      {selected && <VehicleSheet vehicleId={selected} onClose={() => select(null)} onReplay={() => setReplay((r) => !r)} replayActive={replay} />}
    </div>
  );
}

const SPEEDS = [1, 4, 16] as const;

/**
 * Replay de trajeto: a rota se desenha ao carregar, o trecho percorrido fica forte e o resto claro;
 * play/pausa anima o marcador pela linha do tempo (velocidade 1x, 4x, 16x).
 */
function ReplayBar({ vehicleId, mapRef, mapReady }: { vehicleId: string; mapRef: React.MutableRefObject<MlMap | null>; mapReady: boolean }) {
  // Período (2 h, 24 h, 7 dias) ou aluguel da moto ("rental:<id>").
  const [range, setRange] = useState<string>('24');
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(4);
  const rentals = useQuery({ queryKey: ['replay-rentals', vehicleId], queryFn: () => unwrap(api.GET('/rentals', { params: { query: { vehicleId, limit: 10 } } })) });
  const rentalItems = useMemo(() => rentals.data?.items ?? [], [rentals.data]);
  const fmtStart = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const rangeOptions = useMemo(() => [
    { value: '2', label: 'Últimas 2 h' }, { value: '24', label: 'Últimas 24 h' }, { value: '168', label: 'Últimos 7 dias' },
    ...rentalItems.map((r) => ({ value: `rental:${r.id}`, label: `Aluguel de ${fmtStart(r.startedAt)}` })),
  ], [rentalItems]);
  const rentalSel = range.startsWith('rental:') ? rentalItems.find((r) => `rental:${r.id}` === range) : undefined;
  const waitingRental = range.startsWith('rental:') && !rentalSel;
  const track = useQuery({
    queryKey: ['track', vehicleId, range, rentalSel?.endedAt ?? null],
    enabled: !waitingRental,
    queryFn: () => {
      const w = rentalSel ? rentalWindow(rentalSel) : (() => { const to = new Date(); return { from: new Date(to.getTime() - Number(range) * 3600_000).toISOString(), to: to.toISOString() }; })();
      return unwrap(api.GET('/vehicles/{id}/track', { params: { path: { id: vehicleId }, query: w } }));
    },
  });
  const points = useMemo(() => track.data?.points ?? [], [track.data]);
  useEffect(() => { setIdx(0); setPlaying(false); }, [points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const ids = ['replay-line', 'replay-done', 'replay-pos'];
    const clean = () => {
      for (const l of ids) if (map.getLayer(l)) map.removeLayer(l);
      for (const s of ids) if (map.getSource(s)) map.removeSource(s);
    };
    clean();
    if (points.length === 0) return clean;
    const coords = points.map((p) => [p.lng, p.lat]);
    const line = (c: number[][]): GeoJSON.Feature => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: c.length > 1 ? c : [c[0], c[0]] } });
    map.addSource('replay-line', { type: 'geojson', data: line(coords.slice(0, 1)) });
    map.addLayer({ id: 'replay-line', type: 'line', source: 'replay-line', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#2F7FE0', 'line-width': 4, 'line-opacity': 0.35 } });
    map.addSource('replay-done', { type: 'geojson', data: line(coords.slice(0, 1)) });
    map.addLayer({ id: 'replay-done', type: 'line', source: 'replay-done', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#2F7FE0', 'line-width': 4.5 } });
    map.addSource('replay-pos', { type: 'geojson', data: { type: 'Point', coordinates: coords[0] } });
    map.addLayer({ id: 'replay-pos', type: 'circle', source: 'replay-pos', paint: { 'circle-radius': 9, 'circle-color': '#fff', 'circle-stroke-color': '#2F7FE0', 'circle-stroke-width': 4 } });
    // A rota "se desenha" (700ms) e o mapa enquadra o trajeto.
    const stop = tween({ duration: 700, reduced: prefersReducedMotion(), onUpdate: (t) => {
      const n = Math.max(1, Math.ceil(coords.length * t));
      (map.getSource('replay-line') as GeoJSONSource | undefined)?.setData(line(coords.slice(0, n)));
    } });
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    if (coords.length > 1) map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: { top: 140, bottom: 140, left: 60, right: 60 }, maxZoom: 16, duration: prefersReducedMotion() ? 0 : 600 });
    return () => { stop(); clean(); };
  }, [points, mapReady, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    const p = points[idx];
    if (!map || !p) return;
    (map.getSource('replay-pos') as GeoJSONSource | undefined)?.setData({ type: 'Point', coordinates: [p.lng, p.lat] });
    const done = points.slice(0, idx + 1).map((x) => [x.lng, x.lat]);
    (map.getSource('replay-done') as GeoJSONSource | undefined)?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: done.length > 1 ? done : [done[0], done[0]] } });
  }, [idx, points, mapRef]);

  // Reprodução: ~8 pontos por segundo em 1x.
  useEffect(() => {
    if (!playing || points.length === 0) return;
    const h = setInterval(() => {
      setIdx((i) => {
        if (i >= points.length - 1) { setPlaying(false); return i; }
        return Math.min(points.length - 1, i + 1);
      });
    }, 125 / speed);
    return () => clearInterval(h);
  }, [playing, speed, points.length]);

  const p = points[idx];
  const progress = points.length > 1 ? idx / (points.length - 1) : 0;
  return (
    <div data-testid="replay-bar" className="replay-bar" style={{ position: 'absolute', left: 16, right: 60, bottom: 24, background: 'var(--glass-bg)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', borderRadius: 'var(--radius-lg)', padding: 14, boxShadow: 'var(--shadow-2)', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ width: 190 }}>
        <Field label="Período ou aluguel">
          <Select testId="replay-range" value={range} onChange={setRange} options={rangeOptions} />
        </Field>
      </div>
      {points.length === 0 ? (
        <span role="status" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{track.isLoading || waitingRental ? 'Carregando trajeto...' : (rentalSel ? 'Sem trajeto neste aluguel.' : 'Sem trajeto no período. Tente um período maior.')}</span>
      ) : (
        <>
          <IconButton icon={playing ? 'Pause' : 'Play'} variant="dark" size={40} label={playing ? 'Pausar replay' : 'Reproduzir replay'}
            onClick={() => { if (!playing && idx >= points.length - 1) setIdx(0); setPlaying(!playing); }} />
          <button type="button" className="speed-chip" onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])} aria-label={`Velocidade ${speed}x. Trocar`}>{speed}x</button>
          <input type="range" className="replay-range" aria-label="Linha do tempo" min={0} max={points.length - 1} value={idx}
            onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)); }}
            style={{ flex: 1, minWidth: 160, ['--progress' as string]: `${progress * 100}%` }} />
          <span style={{ font: '500 12px/1.3 var(--font-mono)', color: 'var(--text-secondary)', minWidth: 190, textAlign: 'right' }}>
            {p ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(p.recordedAt)) : ''} · {p ? Math.round(p.speedKmh) : 0} km/h
          </span>
        </>
      )}
    </div>
  );
}
