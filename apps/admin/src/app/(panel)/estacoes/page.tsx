'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { prefersReducedMotion } from '@/lib/motion';
import {
  draftFromStation, emptyStationDraft, STATION_LAYER, STATION_SRC, stationCreateBody, stationFeatures, stationSummary, stationUpdateBody, validateStation,
  type StationDraft, type StationErrors,
} from '@/lib/stations';
import type { S } from '@/lib/types';
import { MapView } from '@/components/MapView';
import { StationQrModal } from '@/components/StationQrModal';
import { StationSwapsModal } from '@/components/StationSwapsModal';
import { Empty, ErrorNote, Field, KV, Modal, SectionTitle, SidePanel, Skeleton, TextInput, useToast } from '@/components/ui';
import { Alert } from '@/ds/Alert';
import { Badge } from '@/ds/Badge';
import { Button } from '@/ds/Button';
import { Card } from '@/ds/Card';
import { Icon } from '@/ds/Icon';
import { Switch } from '@/ds/Switch';

type Station = S<'SwapStationAdmin'>;
const DRAFT_SRC = 'station-draft';
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Estações de troca de bateria: cadastro, ponto no mapa, desativação, QR fixo para imprimir e histórico de trocas. */
export default function StationsPage() {
  const { groups } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const canEdit = can(groups, 'station.edit');
  const canQr = can(groups, 'station.qr');
  const canSwaps = can(groups, 'station.swaps');
  const mapRef = useRef<MlMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StationDraft | null>(null);
  const [errors, setErrors] = useState<StationErrors>({});
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [qrOf, setQrOf] = useState<Station | null>(null);
  const [swapsOf, setSwapsOf] = useState<Station | null>(null);
  const draftRef = useRef<StationDraft | null>(null);
  draftRef.current = draft;

  const stationsQ = useQuery({ queryKey: ['swap-stations', 'registry'], queryFn: () => unwrap(api.GET('/swap-stations/registry')) });
  const stations = useMemo(() => stationsQ.data?.items ?? [], [stationsQ.data]);
  const selected = stations.find((s) => s.id === selectedId) ?? null;
  const depotsQ = useQuery({ queryKey: ['depots', 'all'], queryFn: () => unwrap(api.GET('/depots', { params: { query: { includeInactive: true } } })) });
  const depotName = useMemo(() => new Map((depotsQ.data?.items ?? []).map((d) => [d.id, d.name])), [depotsQ.data]);

  const select = useCallback((s: Station | null) => {
    setSelectedId(s?.id ?? null);
    setErrors({});
    setDraft(s && canEdit ? draftFromStation(s) : null);
  }, [canEdit]);

  const startNew = () => { setSelectedId(null); setErrors({}); setDraft(emptyStationDraft()); };
  const close = () => { setDraft(null); setErrors({}); setSelectedId(null); };
  const patch = (p: Partial<StationDraft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const onReady = useCallback((map: MlMap) => {
    mapRef.current = map;
    map.addSource(STATION_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: STATION_LAYER, type: 'circle', source: STATION_SRC,
      paint: {
        'circle-radius': 9,
        'circle-color': ['case', ['==', ['get', 'active'], false], '#9AA09A', ['==', ['get', 'empty'], true], '#E5484D', '#1F2A24'] as never,
        'circle-stroke-color': '#fff', 'circle-stroke-width': 3,
      },
    });
    map.addSource(DRAFT_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: DRAFT_SRC, type: 'circle', source: DRAFT_SRC, paint: { 'circle-color': '#34C25C', 'circle-radius': 10, 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
    // Editando: o clique marca o ponto da estação. Fora da edição, o clique no ponto abre a estação.
    map.on('click', (e) => {
      if (!draftRef.current) return;
      setDraft((d) => (d ? { ...d, lat: round6(e.lngLat.lat), lng: round6(e.lngLat.lng) } : d));
    });
    map.on('mouseenter', STATION_LAYER, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', STATION_LAYER, () => (map.getCanvas().style.cursor = ''));
    setMapReady(true);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const h = (e: { features?: GeoJSON.Feature[] }) => {
      if (draftRef.current) return;
      const id = e.features?.[0]?.properties?.id as string | undefined;
      const s = stations.find((x) => x.id === id);
      if (s) select(s);
    };
    map.on('click', STATION_LAYER, h);
    return () => { map.off('click', STATION_LAYER, h); };
  }, [mapReady, stations, select]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    // A estação em edição sai da camada das salvas: o ponto verde mostra o ponto novo.
    (map.getSource(STATION_SRC) as GeoJSONSource | undefined)?.setData(stationFeatures(stations.filter((s) => s.id !== draft?.id)));
  }, [stations, mapReady, draft?.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const has = draft && draft.lat != null && draft.lng != null;
    (map.getSource(DRAFT_SRC) as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: has ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [draft.lng!, draft.lat!] } }] : [] });
  }, [draft, mapReady]);

  const fitted = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || fitted.current || stations.length === 0) return;
    fitted.current = true;
    const lngs = stations.map((s) => s.lng);
    const lats = stations.map((s) => s.lat);
    map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 120, maxZoom: 15, duration: 0 });
  }, [stations, mapReady]);
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !selected) return;
    map.easeTo({ center: [selected.lng, selected.lat], zoom: Math.max(map.getZoom(), 15), duration: prefersReducedMotion() ? 0 : 600 });
  }, [selected, mapReady]);

  const save = useMutation({
    mutationFn: (d: StationDraft) => {
      if (d.id) return unwrap(api.PATCH('/swap-stations/{id}', { params: { path: { id: d.id } }, body: stationUpdateBody(d) }));
      return unwrap(api.POST('/swap-stations', { body: stationCreateBody(d) }));
    },
    onSuccess: (saved, d) => {
      toast(d.id ? 'Estação atualizada' : 'Estação criada. O QR já pode ser impresso.');
      qc.invalidateQueries({ queryKey: ['swap-stations'] });
      setSelectedId(saved.id);
      setDraft(draftFromStation(saved));
    },
  });

  const toggleActive = useMutation({
    mutationFn: (s: Station) => unwrap(api.PATCH('/swap-stations/{id}', { params: { path: { id: s.id } }, body: { active: !s.active } })),
    onSuccess: (saved) => {
      toast(saved.active ? 'Estação reativada' : 'Estação desativada');
      qc.invalidateQueries({ queryKey: ['swap-stations'] });
      setConfirmToggle(false);
      setDraft(canEdit ? draftFromStation(saved) : null);
    },
  });

  const submit = () => {
    if (!draft) return;
    const e = validateStation(draft);
    setErrors(e);
    save.reset();
    if (Object.keys(e).length === 0) save.mutate(draft);
  };

  const linkedDepots = (s: Station) => (s.depotIds.length ? s.depotIds.map((id) => depotName.get(id) ?? 'Galpão').join(', ') : 'Nenhum');

  return (
    <div className="split" style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
      <div style={{ flex: 1, position: 'relative', minHeight: 320 }}>
        <MapView onReady={onReady} onDestroy={() => { mapRef.current = null; setMapReady(false); }} />
        {draft && (
          <div role="status" data-testid="map-hint" style={{ position: 'absolute', top: 16, left: 16, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--glass-bg)', backdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-1)', fontSize: 13, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icon name="MapPin" size={16} />Clique no mapa para marcar o ponto da estação
          </div>
        )}
      </div>

      <SidePanel width={400} testId="stations-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ font: '700 18px/1.25 var(--font-sans)', flex: 1 }}>Estações de troca</div>
          {canEdit && !draft && <Button size="sm" variant="dark" icon="Plus" testId="station-new" onClick={startNew}>Nova estação</Button>}
        </div>

        {draft ? (
          <Card variant="outline" padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div data-testid="station-form-title" style={{ fontWeight: 700, flex: 1 }}>{draft.id ? 'Editar estação' : 'Nova estação'}</div>
              {draft.id && <Badge size="sm" tone={draft.active ? 'success' : 'neutral'}>{draft.active ? 'Ativa' : 'Inativa'}</Badge>}
            </div>
            <Field label="Nome" error={errors.name}>
              <TextInput testId="station-name" value={draft.name} onChange={(v) => patch({ name: v })} placeholder="Ex.: Estação Largo da Batata" />
            </Field>
            <Field label="Endereço" error={errors.address}>
              <TextInput testId="station-address" value={draft.address} onChange={(v) => patch({ address: v })} placeholder="Rua, número · bairro, cidade" />
            </Field>
            <div>
              <SectionTitle>Ponto no mapa</SectionTitle>
              {draft.lat != null && draft.lng != null ? (
                <div data-testid="station-point" style={{ font: '500 13px/1.3 var(--font-mono)' }}>{draft.lat.toFixed(6)}, {draft.lng.toFixed(6)}</div>
              ) : (
                <div style={{ fontSize: 12, color: errors.point ? 'var(--danger-ink)' : 'var(--text-secondary)' }} role={errors.point ? 'alert' : undefined} data-testid="station-point-hint">
                  {errors.point ?? 'Clique no mapa para marcar o ponto da estação'}
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>O cliente só troca a bateria a até 50 m deste ponto.</div>
            </div>
            <div>
              <SectionTitle>Horário de funcionamento</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Switch testId="station-24h" checked={draft.open24h} onChange={(v: boolean) => patch({ open24h: v })} label="Aberta 24 horas" />
                <Field label="Horário" error={errors.openingHours} hint='No fuso de São Paulo, como o app mostra. Ex.: "Seg a sáb, 7h às 22h".'>
                  <TextInput testId="station-hours" value={draft.openingHours} onChange={(v) => patch({ openingHours: v })} placeholder={draft.open24h ? 'Todos os dias, 24 h' : 'Seg a sáb, 7h às 22h'} />
                </Field>
              </div>
            </div>
            <Field label="Vagas no armário" error={errors.totalSlots} hint={draft.occupied ? `Hoje há ${draft.occupied} bateria(s) na estação.` : 'Quantas baterias o armário comporta.'}>
              <TextInput testId="station-slots" type="number" min={1} max={200} value={draft.totalSlots} onChange={(v) => patch({ totalSlots: v })} />
            </Field>
            <Field label="Armário no IoT (thing)" error={errors.thingName} hint="Vazio = padrão station-<id da estação>. Troque só se o armário foi provisionado com outro id.">
              <TextInput testId="station-thing" value={draft.thingName} onChange={(v) => patch({ thingName: v })} placeholder={draft.id ? `station-${draft.id}` : 'station-<id da estação>'} />
            </Field>
            <ErrorNote error={save.error} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="sm" icon="Check" testId="station-save" disabled={save.isPending} onClick={submit}>{save.isPending ? 'Salvando...' : 'Salvar estação'}</Button>
              <Button size="sm" variant="ghost" onClick={close}>Fechar</Button>
              {draft.id && selected && (
                <Button size="sm" variant="ghost" icon={selected.active ? 'Ban' : 'RefreshCw'} testId="station-deactivate" style={{ color: selected.active ? 'var(--danger-ink)' : undefined }} onClick={() => { toggleActive.reset(); setConfirmToggle(true); }}>
                  {selected.active ? 'Desativar' : 'Reativar'}
                </Button>
              )}
            </div>
          </Card>
        ) : null}

        {selected && (
          <Card variant="sunken" padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!draft && <div style={{ fontWeight: 700 }}>{selected.name}</div>}
            <KV k="Carregadas" v={`${selected.availableBatteries} de ${selected.totalSlots} vagas`} />
            <KV k="Baterias na estação" v={String(selected.batteriesInStation)} />
            <KV k="Trocas em andamento" v={String(selected.openSwaps)} />
            <KV k="Galpões ligados" v={linkedDepots(selected)} />
            <KV k="Armário (thing)" v={selected.thingName} mono />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {canQr && <Button size="sm" variant="dark" icon="Download" testId="station-qr" onClick={() => setQrOf(selected)}>QR para imprimir</Button>}
              {canSwaps && <Button size="sm" variant="ghost" icon="History" testId="station-swaps" onClick={() => setSwapsOf(selected)}>Trocas</Button>}
            </div>
          </Card>
        )}

        {!draft && (
          <Card variant="sunken" padding={4}>
            {stationsQ.isLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 12 }}>{[0, 1].map((i) => <Skeleton key={i} h={40} />)}</div>}
            <ErrorNote error={stationsQ.error} onRetry={() => stationsQ.refetch()} />
            {!stationsQ.isLoading && !stationsQ.error && stations.length === 0 && (
              <Empty compact icon="BatteryCharging" action={canEdit ? <Button size="sm" variant="ghost" icon="Plus" onClick={startNew}>Nova estação</Button> : undefined}>Nenhuma estação cadastrada</Empty>
            )}
            {stations.map((s) => (
              <button type="button" key={s.id} data-testid="station-item" className="zone-item" data-on={selectedId === s.id || undefined}
                aria-label={`${s.name}${s.active ? '' : ', inativa'}. ${canEdit ? 'Editar' : 'Ver'}`} onClick={() => select(s)}>
                <Icon name="BatteryCharging" size={18} color={s.active ? 'var(--text-primary)' : 'var(--text-tertiary)'} />
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{stationSummary(s)}</div>
                </div>
                {s.openSwaps > 0 && <Badge size="sm" tone="info">{s.openSwaps === 1 ? '1 troca' : `${s.openSwaps} trocas`}</Badge>}
                {!s.active && <Badge size="sm" tone="neutral">Inativa</Badge>}
                <Icon name="ChevronRight" size={16} color="var(--text-tertiary)" />
              </button>
            ))}
          </Card>
        )}

        {!canEdit && <Alert tone="info" icon="Info">Seu perfil só visualiza as estações.</Alert>}
      </SidePanel>

      <Modal open={confirmToggle && !!selected} title={selected?.active ? 'Desativar estação' : 'Reativar estação'} onClose={() => setConfirmToggle(false)} testId="station-toggle-dialog"
        actions={<>
          <Button size="sm" variant="ghost" onClick={() => setConfirmToggle(false)}>Cancelar</Button>
          <Button size="sm" variant={selected?.active ? 'danger' : 'dark'} testId="station-toggle-confirm" disabled={toggleActive.isPending} onClick={() => selected && toggleActive.mutate(selected)}>
            {selected?.active ? 'Desativar estação' : 'Reativar estação'}
          </Button>
        </>}>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {selected?.active
            ? `"${selected?.name}" some do mapa do app e não aceita novas trocas. Com troca em andamento, a desativação é recusada: espere terminar.`
            : `"${selected?.name}" volta ao mapa do app e aceita trocas de novo.`}
        </div>
        <ErrorNote error={toggleActive.error} />
      </Modal>

      {qrOf && <StationQrModal station={qrOf} onClose={() => setQrOf(null)} />}
      {swapsOf && <StationSwapsModal station={swapsOf} onClose={() => setSwapsOf(null)} />}
    </div>
  );
}
