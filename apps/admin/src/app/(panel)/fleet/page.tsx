'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';
import { STATUS_COLOR, VEHICLE_STATUSES } from '@/lib/status';
import { formatBRL } from '@/lib/format';
import { MapView } from '@/components/MapView';
import { VehicleSheet } from '@/components/VehicleSheet';
import { Field, Select } from '@/components/ui';
import { FleetStatus } from '@/ds/FleetStatus';
import { StatTile, StatTileSkeleton } from '@/ds/StatTile';
import { Button } from '@/ds/Button';
import { canOpen } from '@/lib/permissions';
import type { VehicleStatus } from '@/lib/types';

const FLEET_SRC = 'fleet';
const pct = (n: number) => `${n}%`;
const colorExpr = ['match', ['get', 'status'], ...VEHICLE_STATUSES.flatMap((s) => [s, STATUS_COLOR[s]]), '#9AA0A6'] as never;

export default function FleetPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { groups } = useAuth();
  const { vehicles, openAlerts } = useRealtime();
  const [filter, setFilter] = useState<VehicleStatus | null>(null);
  const [selected, setSelected] = useState<string | null>(params.get('vehicle'));
  const [mapReady, setMapReady] = useState(false);
  const [showHeat, setShowHeat] = useState(false);
  const [replay, setReplay] = useState(false);
  const mapRef = useRef<MlMap | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

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

  // Mapa: fonte com cluster, camadas e interação.
  const onReady = useCallback((map: MlMap) => {
    mapRef.current = map;
    map.addSource(FLEET_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 44, clusterMaxZoom: 14 });
    map.addLayer({ id: 'clusters', type: 'circle', source: FLEET_SRC, filter: ['has', 'point_count'], paint: { 'circle-color': '#15181A', 'circle-radius': ['step', ['get', 'point_count'], 12, 5, 16, 15, 20, 40, 26], 'circle-opacity': 0.85, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
    map.addLayer({ id: 'vehicles', type: 'circle', source: FLEET_SRC, filter: ['!', ['has', 'point_count']], paint: { 'circle-color': colorExpr, 'circle-radius': 8, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
    map.addLayer({ id: 'vehicle-selected', type: 'circle', source: FLEET_SRC, filter: ['==', ['get', 'id'], ''], paint: { 'circle-color': colorExpr, 'circle-radius': 12, 'circle-stroke-color': '#15181A', 'circle-stroke-width': 3 } });
    map.on('click', 'vehicles', (e) => { const id = e.features?.[0]?.properties?.id as string | undefined; if (id) select(id); });
    map.on('click', 'clusters', async (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const src = map.getSource(FLEET_SRC) as GeoJSONSource;
      const zoom = await src.getClusterExpansionZoom(f.properties?.cluster_id as number);
      map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
    });
    for (const l of ['vehicles', 'clusters']) {
      map.on('mouseenter', l, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', l, () => (map.getCanvas().style.cursor = ''));
    }
    setMapReady(true);
  }, [select]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const src = map.getSource(FLEET_SRC) as GeoJSONSource | undefined;
    src?.setData({
      type: 'FeatureCollection',
      features: shown.map((v) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [v.lng, v.lat] }, properties: { id: v.id, code: v.code, status: v.status } })),
    });
  }, [shown, mapReady]);

  // Enquadra a frota uma vez, quando os dados chegam (sem moto selecionada).
  const fitted = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || fitted.current || vehicles.length === 0 || selectedRef.current) return;
    fitted.current = true;
    const lngs = vehicles.map((v) => v.lng);
    const lats = vehicles.map((v) => v.lat);
    map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 80, maxZoom: 15, duration: 0 });
  }, [vehicles, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    map.setFilter('vehicle-selected', ['==', ['get', 'id'], selected ?? '']);
    const v = vehicles.find((x) => x.id === selected);
    if (v && !replay) map.easeTo({ center: [v.lng, v.lat], zoom: Math.max(map.getZoom(), 15), duration: 600 });
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

  const dash = useQuery({ queryKey: ['dashboard'], queryFn: () => unwrap(api.GET('/reports/dashboard')), refetchInterval: 30_000 });

  return (
    <div className="split" style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 320 }}>
        <MapView onReady={onReady} onDestroy={() => { mapRef.current = null; setMapReady(false); }} />
        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
          {dash.data ? (
            <div data-testid="dashboard-strip" className="vt-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, pointerEvents: 'auto', maxWidth: 760 }}>
              <StatTile icon="Gauge" label="Ocupação" numeric={Math.round(dash.data.occupancyPct)} format={pct} />
              <StatTile icon="Bike" label="Aluguéis ativos" numeric={dash.data.activeRentals} />
              <StatTile icon="Wallet" label="Receita do dia" numeric={dash.data.revenueTodayCents} format={formatBRL} />
              {/* Alertas vêm do tempo real (alert.created), não só do refresh de 30 s do dashboard. */}
              <StatTile icon="Siren" label="Alertas abertos" numeric={openAlerts} goodWhen="down" />
            </div>
          ) : dash.isLoading ? (
            <div aria-hidden style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, maxWidth: 760 }}>
              {[0, 1, 2, 3].map((i) => <StatTileSkeleton key={i} />)}
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'auto' }}>
            <FleetStatus status="free" count={counts.free ?? 0} selected={filter === 'free'} onClick={() => setFilter(filter === 'free' ? null : 'free')} style={{ boxShadow: 'var(--shadow-1)' }} />
            {VEHICLE_STATUSES.filter((s) => s !== 'free').map((s) => (
              <FleetStatus key={s} status={s} count={counts[s] ?? 0} selected={filter === s} onClick={() => setFilter(filter === s ? null : s)} style={{ boxShadow: 'var(--shadow-1)' }} />
            ))}
            {canHeat && (
              <Button size="sm" variant={showHeat ? 'dark' : 'secondary'} icon="Flame" testId="heat-toggle" style={{ height: 30, background: showHeat ? undefined : '#fff', color: showHeat ? undefined : 'var(--text-primary)', borderColor: 'var(--border-subtle)' }} onClick={() => setShowHeat(!showHeat)}>Demanda</Button>
            )}
          </div>
        </div>
        {selected && replay && <ReplayBar vehicleId={selected} mapRef={mapRef} mapReady={mapReady} />}
      </div>
      {selected && <VehicleSheet vehicleId={selected} onClose={() => select(null)} onReplay={() => setReplay((r) => !r)} replayActive={replay} />}
    </div>
  );
}

/** Replay de trajeto: linha no mapa e linha do tempo para mover o marcador. */
function ReplayBar({ vehicleId, mapRef, mapReady }: { vehicleId: string; mapRef: React.MutableRefObject<MlMap | null>; mapReady: boolean }) {
  const [hours, setHours] = useState<'2' | '24' | '168'>('24');
  const [idx, setIdx] = useState(0);
  const track = useQuery({
    queryKey: ['track', vehicleId, hours],
    queryFn: () => {
      const to = new Date();
      const from = new Date(to.getTime() - Number(hours) * 3600_000);
      return unwrap(api.GET('/vehicles/{id}/track', { params: { path: { id: vehicleId }, query: { from: from.toISOString(), to: to.toISOString() } } }));
    },
  });
  const points = useMemo(() => track.data?.points ?? [], [track.data]);
  useEffect(() => setIdx(0), [points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const clean = () => {
      for (const l of ['replay-line', 'replay-pos']) if (map.getLayer(l)) map.removeLayer(l);
      for (const s of ['replay-line', 'replay-pos']) if (map.getSource(s)) map.removeSource(s);
    };
    clean();
    if (points.length === 0) return clean;
    map.addSource('replay-line', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points.map((p) => [p.lng, p.lat]) } } });
    map.addLayer({ id: 'replay-line', type: 'line', source: 'replay-line', paint: { 'line-color': '#2F7FE0', 'line-width': 4 } });
    map.addSource('replay-pos', { type: 'geojson', data: { type: 'Point', coordinates: [points[0].lng, points[0].lat] } });
    map.addLayer({ id: 'replay-pos', type: 'circle', source: 'replay-pos', paint: { 'circle-radius': 9, 'circle-color': '#fff', 'circle-stroke-color': '#2F7FE0', 'circle-stroke-width': 4 } });
    return clean;
  }, [points, mapReady, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    const p = points[idx];
    if (!map || !p) return;
    (map.getSource('replay-pos') as GeoJSONSource | undefined)?.setData({ type: 'Point', coordinates: [p.lng, p.lat] });
  }, [idx, points, mapRef]);

  const p = points[idx];
  return (
    <div data-testid="replay-bar" style={{ position: 'absolute', left: 16, right: 16, bottom: 24, background: 'var(--glass-bg, rgba(255,255,255,.9))', backdropFilter: 'blur(16px)', borderRadius: 'var(--radius-lg)', padding: 14, boxShadow: 'var(--shadow-2)', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ width: 150 }}>
        <Field label="Período">
          <Select value={hours} onChange={setHours} options={[{ value: '2', label: 'Últimas 2 h' }, { value: '24', label: 'Últimas 24 h' }, { value: '168', label: 'Últimos 7 dias' }]} />
        </Field>
      </div>
      {points.length === 0 ? (
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{track.isLoading ? 'Carregando trajeto...' : 'Sem trajeto no período.'}</span>
      ) : (
        <>
          <input type="range" aria-label="Linha do tempo" min={0} max={points.length - 1} value={idx} onChange={(e) => setIdx(Number(e.target.value))} style={{ flex: 1, minWidth: 160 }} />
          <span style={{ font: '500 12px/1.3 var(--font-mono)', color: 'var(--text-secondary)' }}>
            {p ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(p.recordedAt)) : ''} · {p ? Math.round(p.speedKmh) : 0} km/h
          </span>
        </>
      )}
    </div>
  );
}
