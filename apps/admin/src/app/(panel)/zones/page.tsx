'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import { api, problemMessage, unwrap, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { validateZone, type ZoneErrors } from '@/lib/zone-validation';
import { MAX_REDUCED_SPEED_KMH, type S, type ZoneType } from '@/lib/types';
import { MapView } from '@/components/MapView';
import { ErrorNote, Field, Modal, Select, SidePanel, SectionTitle, TextInput, useToast } from '@/components/ui';
import { Alert } from '@/ds/Alert';
import { Button } from '@/ds/Button';
import { Card } from '@/ds/Card';
import { Icon } from '@/ds/Icon';
import { Badge } from '@/ds/Badge';

type Zone = S<'GeoZone'>;
type Polygon = S<'GeoJsonPolygon'>;

const ZONE_COLOR: Record<ZoneType, string> = { operation: '#15181A', return: '#34C25C', forbidden: '#F2665A', reduced_speed: '#F07A2A' };
const ZONE_LABEL: Record<ZoneType, string> = { operation: 'Área de operação', return: 'Ponto de devolução', forbidden: 'Zona proibida', reduced_speed: 'Velocidade reduzida' };
const TYPE_OPTIONS = (Object.keys(ZONE_LABEL) as ZoneType[]).map((v) => ({ value: v, label: ZONE_LABEL[v] }));

interface Draft { id?: string; name: string; type: ZoneType; limit: string; geometry?: Polygon }
const emptyDraft = (): Draft => ({ name: '', type: 'return', limit: '', geometry: undefined });

const colorExpr = ['match', ['get', 'type'], 'operation', ZONE_COLOR.operation, 'return', ZONE_COLOR.return, 'forbidden', ZONE_COLOR.forbidden, 'reduced_speed', ZONE_COLOR.reduced_speed, '#9AA0A6'] as never;

export default function ZonesPage() {
  const { groups } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const canEdit = can(groups, 'zone.edit');
  const mapRef = useRef<MlMap | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<ZoneErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [serverError, setServerError] = useState<unknown>(null);
  const [layers, setLayers] = useState(true);
  draftRef.current = draft;

  const zonesQ = useQuery({ queryKey: ['zones'], queryFn: () => unwrap(api.GET('/zones')) });
  const zones = useMemo(() => (zonesQ.data?.items ?? []).filter((z) => z.active), [zonesQ.data]);

  const onReady = useCallback(async (map: MlMap) => {
    mapRef.current = map;
    map.addSource('zones', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', filter: ['!=', ['get', 'type'], 'operation'], paint: { 'fill-color': colorExpr, 'fill-opacity': 0.18 } });
    map.addLayer({ id: 'zones-line', type: 'line', source: 'zones', filter: ['!=', ['get', 'type'], 'operation'], paint: { 'line-color': colorExpr, 'line-width': 2.5 } });
    map.addLayer({ id: 'zones-operation', type: 'line', source: 'zones', filter: ['==', ['get', 'type'], 'operation'], paint: { 'line-color': ZONE_COLOR.operation, 'line-width': 2.5, 'line-dasharray': [3, 2] } });
    map.on('click', 'zones-fill', (e) => {
      if (draftRef.current || !canEditRef.current) return;
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id) pickRef.current(id);
    });

    const mod = await import('@mapbox/mapbox-gl-draw');
    const Draw = mod.default;
    const draw = new Draw({ displayControlsDefault: false, defaultMode: 'simple_select' });
    map.addControl(draw as never);
    drawRef.current = draw;
    const sync = (e: { features: GeoJSON.Feature[] }) => {
      const g = e.features[0]?.geometry;
      if (g?.type !== 'Polygon') return;
      setDraft((d) => ({ ...(d ?? emptyDraft()), geometry: { type: 'Polygon', coordinates: g.coordinates as number[][][] } }));
      setErrors((x) => ({ ...x, geometry: undefined }));
    };
    map.on('draw.create', sync as never);
    map.on('draw.update', sync as never);
    setMapReady(true);
  }, []);

  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;

  // Desenha as cercas salvas (a que está em edição fica a cargo do Draw).
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const src = map.getSource('zones') as GeoJSONSource | undefined;
    src?.setData({
      type: 'FeatureCollection',
      features: zones.filter((z) => z.id !== draft?.id).map((z) => ({ type: 'Feature', geometry: z.geometry as GeoJSON.Polygon, properties: { id: z.id, type: z.type, name: z.name } })),
    });
    for (const l of ['zones-fill', 'zones-line', 'zones-operation']) map.setLayoutProperty(l, 'visibility', layers ? 'visible' : 'none');
  }, [zones, draft?.id, mapReady, layers]);

  const startNew = () => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.deleteAll();
    setErrors({});
    setServerError(null);
    setDraft(emptyDraft());
    draw.changeMode('draw_polygon');
  };

  const pick = useCallback((id: string) => {
    const z = zonesRef.current.find((x) => x.id === id);
    const draw = drawRef.current;
    if (!z || !draw) return;
    draw.deleteAll();
    const [fid] = draw.add({ type: 'Feature', properties: {}, geometry: z.geometry as GeoJSON.Polygon });
    setErrors({});
    setServerError(null);
    setDraft({ id: z.id, name: z.name, type: z.type, limit: z.speedLimitKmh !== undefined ? String(z.speedLimitKmh) : '', geometry: z.geometry });
    draw.changeMode('direct_select', { featureId: String(fid) });
  }, []);
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const zonesRef = useRef(zones);
  zonesRef.current = zones;

  const cancel = () => {
    drawRef.current?.deleteAll();
    drawRef.current?.changeMode('simple_select');
    setDraft(null);
    setErrors({});
    setServerError(null);
  };

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const limit = d.limit.trim() === '' ? undefined : Number(d.limit);
      const body = {
        name: d.name.trim(),
        type: d.type,
        ...(d.type === 'reduced_speed' && limit !== undefined ? { speedLimitKmh: limit } : {}),
        geometry: d.geometry!,
        active: true,
      };
      if (d.id) return unwrap(api.PUT('/zones/{id}', { params: { path: { id: d.id } }, body }));
      return unwrap(api.POST('/zones', { body }));
    },
    onSuccess: (_z, d) => {
      toast(d.id ? 'Cerca atualizada' : 'Cerca criada');
      qc.invalidateQueries({ queryKey: ['zones'] });
      cancel();
    },
    onError: (e) => setServerError(e),
  });

  const remove = useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE('/zones/{id}', { params: { path: { id } } })),
    onSuccess: () => {
      toast('Cerca excluída');
      qc.invalidateQueries({ queryKey: ['zones'] });
      setConfirmDelete(false);
      cancel();
    },
    onError: (e) => { setServerError(e); setConfirmDelete(false); },
  });

  const submit = () => {
    if (!draft) return;
    const geometry = draft.geometry;
    const limit = draft.limit.trim() === '' ? undefined : Number(draft.limit);
    const e = validateZone({ name: draft.name, type: draft.type, speedLimitKmh: limit, geometry });
    setErrors(e);
    setServerError(null);
    if (Object.keys(e).length === 0) save.mutate(draft);
  };

  useEffect(() => () => { drawRef.current = null; }, []);

  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const serverMsg = serverError instanceof ApiError ? serverError.message : serverError ? problemMessage(serverError, 0).message : null;

  return (
    <div className="split" style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
      <div style={{ flex: 1, position: 'relative', minHeight: 320 }}>
        <MapView onReady={onReady} onDestroy={() => { mapRef.current = null; drawRef.current = null; setMapReady(false); }} />
        <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
          {canEdit && <Button size="sm" variant="dark" icon="PenTool" testId="draw-zone" disabled={!mapReady} onClick={startNew}>Desenhar área</Button>}
          <Button size="sm" variant="secondary" icon="Layers" style={{ background: '#fff' }} onClick={() => setLayers(!layers)}>{layers ? 'Ocultar camadas' : 'Mostrar camadas'}</Button>
        </div>
      </div>
      <SidePanel width={360} testId="zones-panel">
        <div style={{ font: '700 18px/1.25 var(--font-sans)' }}>Cercas e regras</div>

        {draft && canEdit && (
          <Card variant="outline" padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div data-testid="zone-form-title" style={{ fontWeight: 700 }}>{draft.id ? 'Editar cerca' : 'Nova cerca'}</div>
            <Field label="Nome" error={errors.name}>
              <TextInput testId="zone-name" value={draft.name} onChange={(v) => patch({ name: v })} placeholder="Ex.: Ciclovia da Faria Lima" />
            </Field>
            <Field label="Tipo">
              <Select testId="zone-type" value={draft.type} onChange={(v) => { patch({ type: v }); setErrors((x) => ({ ...x, speedLimitKmh: undefined })); }} options={TYPE_OPTIONS} />
            </Field>
            {draft.type === 'reduced_speed' && (
              <Field label="Limite de velocidade (km/h)" error={errors.speedLimitKmh} hint={`Até ${MAX_REDUCED_SPEED_KMH} km/h: 6 em áreas de pedestres, 20 em ciclovias.`}>
                <TextInput testId="zone-limit" type="number" value={draft.limit} onChange={(v) => patch({ limit: v })} />
              </Field>
            )}
            {errors.geometry && <div role="alert" data-testid="zone-geometry-error" style={{ fontSize: 12, color: 'var(--danger-ink)' }}>{errors.geometry}</div>}
            {!draft.geometry && !errors.geometry && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Clique no mapa para marcar os vértices e dê um duplo clique para fechar o polígono.</div>}
            {draft.geometry && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Polígono desenhado. Arraste os vértices para ajustar.</div>}
            {serverMsg && <ErrorNote error={new Error(serverMsg)} />}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="sm" icon="Check" testId="zone-save" disabled={save.isPending} onClick={submit}>Salvar cerca</Button>
              <Button size="sm" variant="ghost" onClick={cancel}>Cancelar</Button>
              {draft.id && <Button size="sm" variant="ghost" icon="Trash2" testId="zone-delete" style={{ color: 'var(--danger-ink)' }} onClick={() => setConfirmDelete(true)}>Excluir</Button>}
            </div>
          </Card>
        )}

        <Card variant="sunken" padding={4}>
          {zones.length === 0 && <div style={{ padding: 12, fontSize: 14, color: 'var(--text-secondary)' }}>{zonesQ.isLoading ? 'Carregando...' : 'Nenhuma cerca cadastrada.'}</div>}
          {zones.map((z) => (
            <div key={z.id} data-testid="zone-item" onClick={() => canEdit && !draft && pick(z.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: canEdit && !draft ? 'pointer' : 'default', borderRadius: 10, background: draft?.id === z.id ? 'var(--brand-soft)' : undefined }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: ZONE_COLOR[z.type], flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{z.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ZONE_LABEL[z.type]}{z.speedLimitKmh !== undefined ? ` · ${z.speedLimitKmh} km/h` : ''}</div>
              </div>
              <Icon name="ChevronRight" size={16} color="var(--text-tertiary)" />
            </div>
          ))}
        </Card>

        <SectionTitle>Regras automáticas</SectionTitle>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: -4 }}>Definidas pela plataforma; não são editáveis aqui.</div>
        {[
          ['Saiu da área de operação', 'Alerta imediato; reduz e bloqueia com segurança após 5 min'],
          ['Entrou em área de pedestres ou ciclovia', 'Limite de 6 km/h (pedestres) ou 20 km/h (ciclovia)'],
          ['Zona proibida', 'Não permite encerrar o aluguel'],
          ['Fora do ponto de devolução', 'Só o admin encerra à força, com taxa'],
        ].map(([t, d]) => (
          <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--ink-100)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d}</div>
            </div>
            <Badge size="sm" tone="neutral">Fixa</Badge>
          </div>
        ))}
        {!canEdit && <Alert tone="info" icon="Info">Seu perfil só visualiza as cercas.</Alert>}
      </SidePanel>

      <Modal open={confirmDelete} title="Excluir cerca" onClose={() => setConfirmDelete(false)} testId="delete-dialog"
        actions={<>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          <Button size="sm" variant="danger" testId="zone-delete-confirm" disabled={remove.isPending} onClick={() => draft?.id && remove.mutate(draft.id)}>Excluir cerca</Button>
        </>}>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>A cerca &quot;{draft?.name}&quot; deixa de valer para novos eventos. O histórico é mantido.</div>
      </Modal>
    </div>
  );
}
