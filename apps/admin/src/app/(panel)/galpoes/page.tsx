'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { addDepotLayer, DEPOT_LAYER, setDepots } from '@/lib/depot-layer';
import {
  depotToBody, draftFromDepot, emptyDepotDraft, summarizeHours, validateDepot, type DepotDraft, type DepotErrors,
} from '@/lib/depot-hours';
import { VEHICLE_STATUSES } from '@/lib/status';
import { prefersReducedMotion } from '@/lib/motion';
import type { S } from '@/lib/types';
import { MapView } from '@/components/MapView';
import { OpeningHoursEditor } from '@/components/depots/OpeningHoursEditor';
import { Empty, ErrorNote, Field, KV, Modal, SectionTitle, SidePanel, Skeleton, TextInput, useToast } from '@/components/ui';
import { Alert } from '@/ds/Alert';
import { Badge } from '@/ds/Badge';
import { Button } from '@/ds/Button';
import { Card } from '@/ds/Card';
import { FleetStatus } from '@/ds/FleetStatus';
import { Icon } from '@/ds/Icon';

type Depot = S<'Depot'>;
const DRAFT_SRC = 'depot-draft';
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export default function DepotsPage() {
  const { groups } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const canEdit = can(groups, 'depot.edit');
  const canDeactivate = can(groups, 'depot.deactivate');
  const mapRef = useRef<MlMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DepotDraft | null>(null);
  const [errors, setErrors] = useState<DepotErrors>({});
  const [confirmToggle, setConfirmToggle] = useState(false);
  const draftRef = useRef<DepotDraft | null>(null);
  draftRef.current = draft;

  const depotsQ = useQuery({ queryKey: ['depots', 'all'], queryFn: () => unwrap(api.GET('/depots', { params: { query: { includeInactive: true } } })) });
  const depots = useMemo(() => depotsQ.data?.items ?? [], [depotsQ.data]);
  const selected = depots.find((d) => d.id === selectedId) ?? null;

  const vehiclesQ = useQuery({
    queryKey: ['depot-vehicles', selectedId],
    enabled: !!selectedId,
    queryFn: () => unwrap(api.GET('/depots/{id}/vehicles', { params: { path: { id: selectedId! } } })),
  });
  const counts = useMemo(() => (vehiclesQ.data?.items ?? []).reduce<Record<string, number>>((a, v) => { a[v.status] = (a[v.status] ?? 0) + 1; return a; }, {}), [vehiclesQ.data]);

  const select = useCallback((d: Depot | null) => {
    setSelectedId(d?.id ?? null);
    setErrors({});
    setDraft(d && canEdit ? draftFromDepot(d) : null);
  }, [canEdit]);

  const startNew = () => { setSelectedId(null); setErrors({}); setDraft(emptyDepotDraft()); };
  const cancel = () => { setDraft(null); setErrors({}); setSelectedId(null); };
  const patch = (p: Partial<DepotDraft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const onReady = useCallback((map: MlMap) => {
    mapRef.current = map;
    addDepotLayer(map);
    map.addSource(DRAFT_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: DRAFT_SRC, type: 'circle', source: DRAFT_SRC, paint: { 'circle-color': '#34C25C', 'circle-radius': 10, 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
    // Editando: o clique marca o ponto do galpão. Fora da edição, o clique no pino abre o galpão.
    map.on('click', (e) => {
      if (!draftRef.current) return;
      setDraft((d) => (d ? { ...d, lat: round6(e.lngLat.lat), lng: round6(e.lngLat.lng) } : d));
    });
    map.on('mouseenter', DEPOT_LAYER, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', DEPOT_LAYER, () => (map.getCanvas().style.cursor = ''));
    setMapReady(true);
  }, []);

  // Clique no pino de um galpão (fora da edição) seleciona.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const h = (e: { features?: GeoJSON.Feature[] }) => {
      if (draftRef.current) return;
      const id = e.features?.[0]?.properties?.id as string | undefined;
      const d = depots.find((x) => x.id === id);
      if (d) select(d);
    };
    map.on('click', DEPOT_LAYER, h);
    return () => { map.off('click', DEPOT_LAYER, h); };
  }, [mapReady, depots, select]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    // O galpão em edição sai da camada dos salvos: o pino verde mostra o ponto novo.
    setDepots(map, depots.filter((d) => d.id !== draft?.id));
  }, [depots, mapReady, draft?.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const src = map.getSource(DRAFT_SRC) as GeoJSONSource | undefined;
    const has = draft && draft.lat != null && draft.lng != null;
    src?.setData({ type: 'FeatureCollection', features: has ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [draft.lng!, draft.lat!] } }] : [] });
  }, [draft, mapReady]);

  // Enquadra os galpões ao carregar e centraliza no galpão escolhido.
  const fitted = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || fitted.current || depots.length === 0) return;
    fitted.current = true;
    const lngs = depots.map((d) => d.lng);
    const lats = depots.map((d) => d.lat);
    map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 120, maxZoom: 15, duration: 0 });
  }, [depots, mapReady]);
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !selected) return;
    map.easeTo({ center: [selected.lng, selected.lat], zoom: Math.max(map.getZoom(), 15), duration: prefersReducedMotion() ? 0 : 600 });
  }, [selected, mapReady]);

  const save = useMutation({
    mutationFn: (d: DepotDraft) => {
      const body = depotToBody(d);
      if (d.id) return unwrap(api.PATCH('/depots/{id}', { params: { path: { id: d.id } }, body }));
      return unwrap(api.POST('/depots', { body }));
    },
    onSuccess: (saved, d) => {
      toast(d.id ? 'Galpão atualizado' : 'Galpão criado');
      qc.invalidateQueries({ queryKey: ['depots'] });
      setSelectedId(saved.id);
      setDraft(draftFromDepot(saved));
    },
  });

  const toggleActive = useMutation({
    mutationFn: (d: Depot) => unwrap(api.PATCH('/depots/{id}', { params: { path: { id: d.id } }, body: { active: !d.active } })),
    onSuccess: (saved) => {
      toast(saved.active ? 'Galpão reativado' : 'Galpão desativado');
      qc.invalidateQueries({ queryKey: ['depots'] });
      setConfirmToggle(false);
      setDraft(canEdit ? draftFromDepot(saved) : null);
    },
  });

  const submit = () => {
    if (!draft) return;
    const e = validateDepot(draft);
    setErrors(e);
    save.reset();
    if (Object.keys(e).length === 0) save.mutate(draft);
  };

  const windowField = (key: 'pickupNowWindowMinutes' | 'maxScheduleDays' | 'scheduledGraceMinutes', label: string, hint: string, testId: string) => (
    <Field label={label} error={errors[key]} hint={hint}>
      <TextInput testId={testId} type="number" value={draft![key]} onChange={(v) => patch({ [key]: v } as Partial<DepotDraft>)} />
    </Field>
  );

  return (
    <div className="split" style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
      <div style={{ flex: 1, position: 'relative', minHeight: 320 }}>
        <MapView onReady={onReady} onDestroy={() => { mapRef.current = null; setMapReady(false); }} />
        {draft && (
          <div role="status" data-testid="map-hint" style={{ position: 'absolute', top: 16, left: 16, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--glass-bg)', backdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-1)', fontSize: 13, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icon name="MapPin" size={16} />Clique no mapa para marcar o ponto do galpão
          </div>
        )}
      </div>

      <SidePanel width={400} testId="depots-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ font: '700 18px/1.25 var(--font-sans)', flex: 1 }}>Galpões</div>
          {canEdit && !draft && <Button size="sm" variant="dark" icon="Plus" testId="depot-new" onClick={startNew}>Novo galpão</Button>}
        </div>

        {draft ? (
          <Card variant="outline" padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div data-testid="depot-form-title" style={{ fontWeight: 700, flex: 1 }}>{draft.id ? 'Editar galpão' : 'Novo galpão'}</div>
              {draft.id && <Badge size="sm" tone={draft.active ? 'success' : 'neutral'}>{draft.active ? 'Ativo' : 'Inativo'}</Badge>}
            </div>
            <Field label="Nome" error={errors.name}>
              <TextInput testId="depot-name" value={draft.name} onChange={(v) => patch({ name: v })} placeholder="Ex.: Galpão Volti — Pinheiros" />
            </Field>
            <Field label="Endereço" error={errors.address}>
              <TextInput testId="depot-address" value={draft.address} onChange={(v) => patch({ address: v })} placeholder="Rua, número · bairro, cidade" />
            </Field>
            <Field label="Bairro" hint="Aparece no cartão da home do app.">
              <TextInput testId="depot-district" value={draft.district} onChange={(v) => patch({ district: v })} />
            </Field>
            <div>
              <SectionTitle>Ponto no mapa</SectionTitle>
              {draft.lat != null && draft.lng != null ? (
                <div data-testid="depot-point" style={{ font: '500 13px/1.3 var(--font-mono)' }}>{draft.lat.toFixed(6)}, {draft.lng.toFixed(6)}</div>
              ) : (
                <div style={{ fontSize: 12, color: errors.point ? 'var(--danger-ink)' : 'var(--text-secondary)' }} role={errors.point ? 'alert' : undefined} data-testid="depot-point-hint">
                  {errors.point ?? 'Clique no mapa para marcar o ponto do galpão'}
                </div>
              )}
            </div>
            <div>
              <SectionTitle>Horário de funcionamento</SectionTitle>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No fuso de São Paulo. Dia desligado = fechado.</div>
              <OpeningHoursEditor value={draft.hours} onChange={(hours) => patch({ hours })} errors={errors.days} />
            </div>
            <div>
              <SectionTitle>Prazos de retirada</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {windowField('pickupNowWindowMinutes', 'Retirar agora (minutos)', 'Quanto tempo a moto fica separada depois da reserva.', 'depot-pickup-now')}
                {windowField('maxScheduleDays', 'Agendar até (dias à frente)', 'Até quantos dias o cliente pode agendar.', 'depot-max-days')}
                {windowField('scheduledGraceMinutes', 'Tolerância do agendamento (minutos)', 'Depois do horário agendado, antes de a reserva vencer.', 'depot-grace')}
              </div>
            </div>
            <ErrorNote error={save.error} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="sm" icon="Check" testId="depot-save" disabled={save.isPending} onClick={submit}>{save.isPending ? 'Salvando...' : 'Salvar galpão'}</Button>
              <Button size="sm" variant="ghost" onClick={cancel}>Fechar</Button>
              {draft.id && canDeactivate && selected && (
                <Button size="sm" variant="ghost" icon={selected.active ? 'Ban' : 'RefreshCw'} testId="depot-deactivate" style={{ color: selected.active ? 'var(--danger-ink)' : undefined }} onClick={() => setConfirmToggle(true)}>
                  {selected.active ? 'Desativar' : 'Reativar'}
                </Button>
              )}
            </div>
          </Card>
        ) : selected ? (
          <Card variant="outline" padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 10 }} >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 700, flex: 1 }}>{selected.name}</div>
              <Button size="sm" variant="ghost" icon="X" onClick={cancel}>Fechar</Button>
            </div>
            <KV k="Endereço" v={selected.address} />
            <KV k="Retirar agora" v={`${selected.pickupNowWindowMinutes} min`} />
            <KV k="Agendar até" v={`${selected.maxScheduleDays} dias`} />
            <KV k="Tolerância" v={`${selected.scheduledGraceMinutes} min`} />
            <SectionTitle>Horário de funcionamento</SectionTitle>
            <OpeningHoursEditor value={draftFromDepot(selected).hours} onChange={() => {}} disabled />
          </Card>
        ) : null}

        {selectedId && (
          <div data-testid="depot-vehicles">
            <SectionTitle>Motos do galpão por status</SectionTitle>
            {vehiclesQ.isLoading ? <Skeleton h={30} /> : (vehiclesQ.data?.items.length ?? 0) === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nenhuma moto neste galpão.</div>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {VEHICLE_STATUSES.filter((s) => counts[s]).map((s) => <FleetStatus key={s} status={s} count={counts[s]} />)}
              </div>
            )}
          </div>
        )}

        {!draft && (
          <Card variant="sunken" padding={4}>
            {depotsQ.isLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 12 }}>{[0, 1].map((i) => <Skeleton key={i} h={40} />)}</div>}
            <ErrorNote error={depotsQ.error} />
            {!depotsQ.isLoading && depots.length === 0 && (
              <Empty compact icon="Warehouse" action={canEdit ? <Button size="sm" variant="ghost" icon="Plus" onClick={startNew}>Novo galpão</Button> : undefined}>Nenhum galpão cadastrado</Empty>
            )}
            {depots.map((d) => (
              <button type="button" key={d.id} data-testid="depot-item" className="zone-item" data-on={selectedId === d.id || undefined}
                aria-label={`${d.name}${d.active ? '' : ', inativo'}. ${canEdit ? 'Editar' : 'Ver'}`} onClick={() => select(d)}>
                <Icon name="Warehouse" size={18} color={d.active ? 'var(--text-primary)' : 'var(--text-tertiary)'} />
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{summarizeHours(d.openingHours)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.availableVehicleCount ?? 0} motos disponíveis</div>
                </div>
                {!d.active && <Badge size="sm" tone="neutral">Inativo</Badge>}
                <Icon name="ChevronRight" size={16} color="var(--text-tertiary)" />
              </button>
            ))}
          </Card>
        )}

        {!canEdit && <Alert tone="info" icon="Info">Seu perfil só visualiza os galpões.</Alert>}
      </SidePanel>

      <Modal open={confirmToggle && !!selected} title={selected?.active ? 'Desativar galpão' : 'Reativar galpão'} onClose={() => setConfirmToggle(false)} testId="depot-toggle-dialog"
        actions={<>
          <Button size="sm" variant="ghost" onClick={() => setConfirmToggle(false)}>Cancelar</Button>
          <Button size="sm" variant={selected?.active ? 'danger' : 'dark'} testId="depot-toggle-confirm" disabled={toggleActive.isPending} onClick={() => selected && toggleActive.mutate(selected)}>
            {selected?.active ? 'Desativar galpão' : 'Reativar galpão'}
          </Button>
        </>}>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {selected?.active
            ? `"${selected?.name}" some do app do cliente e não recebe novas reservas. Reservas já feitas continuam valendo.`
            : `"${selected?.name}" volta a aparecer no app do cliente.`}
        </div>
        <ErrorNote error={toggleActive.error} />
      </Modal>
    </div>
  );
}
