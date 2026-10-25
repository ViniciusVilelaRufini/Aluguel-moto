'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { BATTERY_STATUS, BATTERY_STATUSES, batteryActions, batteryLocation, buildBatteryCreate, chargeTone, countsFromPage, movementTitle, parseSerials, validateReason, type Battery, type BatteryStatus } from '@/lib/batteries';
import { formatDateTimeIn, timeAgo } from '@/lib/format';
import { loadAllPages } from '@/lib/paging';
import type { S } from '@/lib/types';
import { Alert } from '@/ds/Alert';
import { Button } from '@/ds/Button';
import { Card } from '@/ds/Card';
import { Input } from '@/ds/Input';
import { StationSwapsModal } from './StationSwapsModal';
import { DataTable, ErrorNote, Field, Modal, Pill, SectionTitle, Select, Skeleton, TextArea, TextInput, usePagedQuery, useToast } from './ui';

const ME = 'me';
const ALL = 'all';
const ghost = { color: 'var(--text-primary)', borderColor: 'var(--border-strong)' };

/** Todas as baterias para as contagens (até 20 páginas de 100 = 2000; acima disso a tela avisa). */
function loadAllBatteries() {
  return loadAllPages<Battery>((cursor) => unwrap(api.GET('/batteries', { params: { query: { limit: 100, cursor } } })));
}

/**
 * Operação > Baterias: estoque por situação, estações (carregadas/vagas), van de cada operador de campo,
 * carregar/descarregar a van (transferência por série) e a lista com série, carga e ciclos.
 */
/** Censo completo das baterias (todas as páginas), fora do prefixo 'batteries' das mutações (QA-18). */
export const BATTERY_CENSUS_KEY = 'battery-census';

/** QA-20: nos cartões, "Carregada" é a do galpão e "Na estação" é a do cadastro (a estação informa as vagas à parte). */
export function countCardLabel(s: BatteryStatus): string {
  if (s === 'charged') return 'Carregada no galpão';
  if (s === 'in_station') return 'Na estação (cadastro)';
  return BATTERY_STATUS[s][0];
}

export function BatteriesPanel() {
  const { groups } = useAuth();
  const canTransfer = can(groups, 'battery.transfer');
  const canSwaps = can(groups, 'station.swaps');
  const canCreate = can(groups, 'battery.create');
  const [swapsOf, setSwapsOf] = useState<S<'SwapStation'> | null>(null);
  // QA-18 (Task 14): o censo completo (todas as páginas) só alimenta "Cadastradas na estação". Fica fora do prefixo
  // 'batteries' (as mutações da lista não o refazem), vale 1 min ao voltar para a aba e é refeito nas transferências.
  const all = useQuery({ queryKey: [BATTERY_CENSUS_KEY], queryFn: loadAllBatteries, refetchInterval: 120_000, staleTime: 60_000 });
  const stations = useQuery({ queryKey: ['swap-stations'], queryFn: () => unwrap(api.GET('/swap-stations')) });
  const staff = useQuery({ queryKey: ['staff', 'campo'], queryFn: () => unwrap(api.GET('/staff', { params: { query: { group: 'campo', active: true, limit: 100 } } })) });
  const stationNames = useMemo(() => new Map((stations.data?.items ?? []).map((s) => [s.id, s.name])), [stations.data]);
  const staffNames = useMemo(() => new Map((staff.data?.items ?? []).map((s) => [s.id, s.name])), [staff.data]);
  const depots = useQuery({ queryKey: ['depots', 'all'], queryFn: () => unwrap(api.GET('/depots', { params: { query: { includeInactive: true } } })) });
  const depotNames = useMemo(() => new Map((depots.data?.items ?? []).map((d) => [d.id, d.name])), [depots.data]);
  const [depotId, setDepotId] = useState<string>(ALL);
  const [creating, setCreating] = useState(false);
  // Resumo do servidor (`statusCounts`): respeita o galpão escolhido e não depende do limite de páginas.
  const summary = useQuery({
    queryKey: ['batteries-counts', depotId],
    queryFn: () => unwrap(api.GET('/batteries', { params: { query: { limit: 1, depotId: depotId === ALL ? undefined : depotId } } })),
    refetchInterval: 120_000,
  });
  const counts = useMemo(() => countsFromPage(summary.data?.statusCounts), [summary.data]);
  const inStation = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of all.data?.items ?? []) if (b.status === 'in_station' && b.stationId) m.set(b.stationId, (m.get(b.stationId) ?? 0) + 1);
    return m;
  }, [all.data]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <ErrorNote error={all.error ?? stations.error ?? summary.error} onRetry={() => { all.refetch(); stations.refetch(); summary.refetch(); }} />
      {all.data?.capped && <Alert tone="warning" icon="TriangleAlert">Mais de 2.000 baterias: o estoque por estação considera só as 2.000 primeiras. Use a lista filtrada para o restante.</Alert>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
        <div style={{ width: 260 }}><Field label="Galpão"><Select testId="battery-depot" value={depotId} onChange={setDepotId} options={[{ value: ALL, label: 'Todos os galpões' }, ...(depots.data?.items ?? []).map((d) => ({ value: d.id, label: d.name }))]} /></Field></div>
        <div style={{ flex: 1 }} />
        {canCreate && <Button size="sm" variant="dark" icon="Plus" testId="battery-new" onClick={() => setCreating(true)}>Cadastrar bateria</Button>}
      </div>
      <div data-testid="battery-counts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {BATTERY_STATUSES.map((s) => (
          <Card key={s} padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{countCardLabel(s)}</span>
            {summary.isLoading ? <Skeleton w={40} h={22} /> : <span style={{ font: '700 22px/1.1 var(--font-mono)' }}>{counts[s]}</span>}
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18, alignItems: 'start' }}>
        <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
          <SectionTitle>Estações de troca</SectionTitle>
          {/* QA-20: duas fontes diferentes, com nomes diferentes (a estação informa as vagas; o cadastro conta as baterias). */}
          <div data-testid="stations-legend" style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Prontas para troca: baterias carregadas nas vagas, informadas pela própria estação. Cadastradas na estação: baterias com a situação “Na estação” no cadastro.
          </div>
          <DataTable<S<'SwapStation'>> dense testId="stations-table" rows={stations.data?.items ?? []} loading={stations.isLoading} empty="Nenhuma estação cadastrada" emptyIcon="Warehouse"
            columns={[
              { key: 'name', label: 'Estação', render: (s) => <div><div style={{ fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'normal' }}>{s.address}</div></div> },
              { key: 'available', label: 'Prontas para troca', align: 'right', render: (s) => <span style={{ fontFamily: 'var(--font-mono)' }}>{s.availableBatteries}/{s.totalSlots}</span> },
              { key: 'stock', label: 'Cadastradas na estação', align: 'right', render: (s) => inStation.get(s.id) ?? 0 },
              { key: 'hours', label: 'Horário', wrap: true, render: (s) => <span style={{ fontSize: 12 }}>{s.open24h ? '24 h' : s.openingHours}</span> },
              ...(canSwaps ? [{ key: 'swaps', label: '', align: 'right' as const, pin: true, render: (s: S<'SwapStation'>) => <Button size="sm" variant="ghost" icon="History" testId={`station-swaps-${s.id}`} onClick={() => setSwapsOf(s)}>Trocas</Button> }] : []),
            ]} />
        </div>
        <VanStock staff={staff.data?.items ?? []} stations={stations.data?.items ?? []} depots={(depots.data?.items ?? []).filter((d) => d.active)} canTransfer={canTransfer} />
      </div>

      <BatteryList stationNames={stationNames} staffNames={staffNames} depotNames={depotNames} depots={depots.data?.items ?? []} depotId={depotId === ALL ? undefined : depotId} />
      {creating && <CreateBatteryModal depots={(depots.data?.items ?? []).filter((d) => d.active)} defaultDepotId={depotId === ALL ? undefined : depotId} onClose={() => setCreating(false)} />}
      {swapsOf && <StationSwapsModal station={swapsOf} onClose={() => setSwapsOf(null)} />}
    </div>
  );
}

function VanStock({ staff, stations, depots, canTransfer }: { staff: S<'StaffUser'>[]; stations: S<'SwapStation'>[]; depots: S<'Depot'>[]; canTransfer: boolean }) {
  const [operator, setOperator] = useState<string>(ME);
  const [transfer, setTransfer] = useState<'load' | 'unload' | null>(null);
  const van = useQuery({
    queryKey: ['van-stock', operator],
    queryFn: () => unwrap(api.GET('/batteries/van-stock', { params: { query: operator === ME ? {} : { operatorId: operator } } })),
  });
  const mine = operator === ME;
  return (
    <div>
      <SectionTitle>Estoque da van</SectionTitle>
      <Card padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Van de"><Select testId="van-operator" value={operator} onChange={setOperator} options={[{ value: ME, label: 'Minha van' }, ...staff.map((s) => ({ value: s.id, label: s.name }))]} /></Field>
        <ErrorNote error={van.error} onRetry={() => van.refetch()} />
        <div data-testid="van-summary" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill tone="neutral" icon="Package">{van.data ? `${van.data.total} no total` : '...'}</Pill>
          <Pill tone="success" icon="BatteryCharging">{van.data ? `${van.data.chargedCount} carregadas` : '...'}</Pill>
          <Pill tone="warning" icon="BatteryWarning">{van.data ? `${van.data.depletedCount} descarregadas` : '...'}</Pill>
        </div>
        {van.data && van.data.items.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {van.data.items.map((b) => <Pill key={b.id} tone={chargeTone(b.chargePct)}>{b.serial} · {b.chargePct}%</Pill>)}
          </div>
        )}
        {canTransfer && (
          mine ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="sm" variant="secondary" icon="ArrowDownToLine" style={ghost} testId="van-load" onClick={() => setTransfer('load')}>Carregar na van</Button>
              <Button size="sm" variant="secondary" icon="ArrowUpFromLine" style={ghost} testId="van-unload" disabled={!van.data?.total} onClick={() => setTransfer('unload')}>Descarregar</Button>
            </div>
          ) : <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Carregar e descarregar valem para a sua própria van; o operador faz a dele pelo app de campo.</div>
        )}
      </Card>
      {transfer && <TransferModal mode={transfer} stations={stations} depots={depots} onClose={() => setTransfer(null)} />}
    </div>
  );
}

/** Destino do descarregamento: `depot:<id>` → carregar no galpão; outro valor → estação; `charging` = padrão da API. */
function unloadDestination(dest: string): { stationId?: string; depotId?: string } {
  if (dest.startsWith('depot:')) return { depotId: dest.slice(6) };
  return dest === 'charging' ? {} : { stationId: dest };
}

function TransferModal({ mode, stations, depots, onClose }: { mode: 'load' | 'unload'; stations: S<'SwapStation'>[]; depots: S<'Depot'>[]; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState('');
  const [charge, setCharge] = useState('100');
  const [dest, setDest] = useState<string>(depots.length === 1 ? `depot:${depots[0].id}` : 'charging');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const submit = async () => {
    setErr(null);
    const { serials, error } = parseSerials(text);
    if (error) { setErr(new Error(error)); return; }
    const pct = Number(charge);
    if (mode === 'load' && (!/^\d+$/.test(charge.trim()) || pct < 0 || pct > 100)) { setErr(new Error('Carga de 0 a 100%')); return; }
    setBusy(true);
    try {
      if (mode === 'load') await unwrap(api.POST('/batteries/van-stock/load', { body: { serials, chargePct: pct } }));
      else await unwrap(api.POST('/batteries/van-stock/unload', { body: { serials, ...unloadDestination(dest) } }));
      toast(mode === 'load' ? `${serials.length} bateria(s) na van` : `${serials.length} bateria(s) descarregada(s)`);
      for (const k of ['van-stock', 'batteries', 'batteries-counts', 'swap-stations', BATTERY_CENSUS_KEY]) qc.invalidateQueries({ queryKey: [k] });
      onClose();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  return (
    <Modal open title={mode === 'load' ? 'Carregar baterias na van' : 'Descarregar baterias da van'} onClose={onClose} testId="transfer-dialog"
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" testId="transfer-save" disabled={busy || !text.trim()} onClick={submit}>{busy ? 'Enviando...' : 'Confirmar'}</Button></>}>
      <Field label="Números de série" hint="Um por linha ou separados por vírgula (até 50). Série nova é cadastrada ao carregar.">
        <TextArea testId="transfer-serials" value={text} onChange={setText} placeholder={'BT-190577\nBT-190578'} rows={4} />
      </Field>
      {mode === 'load'
        ? <Field label="Carga informada (%)"><TextInput type="number" min={0} max={100} value={charge} onChange={setCharge} /></Field>
        : <Field label="Destino"><Select testId="transfer-dest" value={dest} onChange={setDest} options={[{ value: 'charging', label: depots.length > 1 ? 'Escolha o destino' : 'Carregador do galpão' }, ...depots.map((d) => ({ value: `depot:${d.id}`, label: `Carregar no galpão · ${d.name}` })), ...stations.map((s) => ({ value: s.id, label: s.name }))]} /></Field>}
      {mode === 'load' && <Alert tone="info" icon="Info">Bateria instalada numa moto não pode ir para a van.</Alert>}
      <ErrorNote error={err} />
    </Modal>
  );
}

/** Mutações de uma bateria: a página atual da lista, as contagens, a van, as estações e os alertas (estoque mínimo). */
const REFRESH_KEYS = ['batteries', 'batteries-counts', 'van-stock', 'swap-stations', 'alerts'];

function CreateBatteryModal({ depots, defaultDepotId, onClose }: { depots: S<'Depot'>[]; defaultDepotId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [serial, setSerial] = useState('');
  const [status, setStatus] = useState<'charging' | 'charged'>('charging');
  const [depotId, setDepotId] = useState(defaultDepotId ?? (depots.length === 1 ? depots[0].id : ''));
  const [chargePct, setChargePct] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const submit = async () => {
    const r = buildBatteryCreate({ serial, status, depotId, chargePct });
    if (!r.ok) { setErr(new Error(r.error)); return; }
    setBusy(true); setErr(null);
    try {
      await unwrap(api.POST('/batteries', { body: r.body }));
      toast(`Bateria ${r.body.serial} cadastrada`);
      for (const k of REFRESH_KEYS) qc.invalidateQueries({ queryKey: [k] });
      onClose();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  return (
    <Modal open title="Cadastrar bateria" onClose={onClose} testId="battery-create-dialog"
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" testId="battery-create-save" disabled={busy || !serial.trim()} onClick={submit}>{busy ? 'Salvando...' : 'Cadastrar'}</Button></>}>
      <Field label="Número de série"><TextInput testId="battery-create-serial" value={serial} onChange={setSerial} placeholder="BT-200001" /></Field>
      <Field label="Galpão"><Select testId="battery-create-depot" value={depotId} onChange={setDepotId} options={[{ value: '', label: 'Escolha o galpão' }, ...depots.map((d) => ({ value: d.id, label: d.name }))]} /></Field>
      <Field label="Situação inicial"><Select testId="battery-create-status" value={status} onChange={setStatus} options={[{ value: 'charging', label: 'Carregando' }, { value: 'charged', label: 'Carregada (100%)' }]} /></Field>
      {status === 'charging' && <Field label="Carga atual (%)" hint="Vazio = 0%."><TextInput testId="battery-create-charge" type="number" min={0} max={100} value={chargePct} onChange={setChargePct} /></Field>}
      <ErrorNote error={err} />
    </Modal>
  );
}

/** Apontar defeito (motivo obrigatório) ou dar baixa (motivo opcional). */
function ReasonModal({ battery, kind, onClose }: { battery: Battery; kind: 'defect' | 'retire'; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const defect = kind === 'defect';
  const submit = async () => {
    const v = validateReason(text, defect);
    if (v.error) { setErr(new Error(v.error)); return; }
    setBusy(true); setErr(null);
    try {
      const params = { path: { id: battery.id } };
      if (defect) await unwrap(api.POST('/batteries/{id}/report-defect', { params, body: { reason: v.reason! } }));
      else await unwrap(api.POST('/batteries/{id}/retire', { params, body: v.reason ? { reason: v.reason } : {} }));
      toast(defect ? `Defeito registrado em ${battery.serial}` : `${battery.serial} baixada`);
      for (const k of REFRESH_KEYS) qc.invalidateQueries({ queryKey: [k] });
      onClose();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  return (
    <Modal open title={defect ? `Apontar defeito · ${battery.serial}` : `Dar baixa · ${battery.serial}`} onClose={onClose} testId="battery-reason-dialog"
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" testId="battery-reason-save" disabled={busy || (defect && !text.trim())} onClick={submit}>{busy ? 'Enviando...' : 'Confirmar'}</Button></>}>
      <Field label={defect ? 'Motivo do defeito' : 'Motivo (opcional)'} hint={defect ? 'A bateria sai de uso até ser baixada.' : 'A baixa é definitiva.'}>
        <TextArea testId="battery-reason" value={text} onChange={setText} rows={3} placeholder={defect ? 'Ex.: carcaça trincada' : undefined} />
      </Field>
      <ErrorNote error={err} />
    </Modal>
  );
}

/** Histórico de movimentações, mais recente primeiro, paginado; horário no fuso do galpão quando houver. */
function MovementsModal({ battery, depotNames, depots, onClose }: { battery: Battery; depotNames: Map<string, string>; depots: S<'Depot'>[]; onClose: () => void }) {
  const zones = useMemo(() => new Map(depots.map((d) => [d.id, d.timezone])), [depots]);
  const { rows, loading, error, pager, refetch } = usePagedQuery<S<'BatteryMovement'>>(['battery-movements', battery.id], (cursor) =>
    unwrap(api.GET('/batteries/{id}/movements', { params: { path: { id: battery.id }, query: { cursor, limit: 10 } } })));
  return (
    <Modal open title={`Movimentações · ${battery.serial}`} onClose={onClose} width={820} testId="battery-movements-dialog" actions={<Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>}>
      <ErrorNote error={error} onRetry={() => refetch()} />
      <DataTable<S<'BatteryMovement'>> dense testId="battery-movements-table" rows={rows} loading={loading} pager={pager} empty="Nenhuma movimentação registrada" emptyIcon="History"
        columns={[
          { key: 'at', label: 'Quando', render: (m) => formatDateTimeIn(m.at, m.depotId ? zones.get(m.depotId) : undefined) },
          { key: 'to', label: 'Mudança', render: (m) => movementTitle(m) },
          { key: 'depotId', label: 'Galpão', render: (m) => (m.depotId && depotNames.get(m.depotId)) || '—' },
          { key: 'reason', label: 'Motivo', wrap: true, render: (m) => m.reason ?? '—' },
        ]} />
    </Modal>
  );
}

/** Botões de linha mais compactos: as quatro ações cabem na tabela a 1366 px sem rolagem horizontal. */
const ACTION_BTN = { padding: '0 8px', gap: 6 } as const;

function BatteryList({ stationNames, staffNames, depotNames, depots, depotId }: { stationNames: Map<string, string>; staffNames: Map<string, string>; depotNames: Map<string, string>; depots: S<'Depot'>[]; depotId?: string }) {
  const { groups } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const canMark = can(groups, 'battery.markCharged');
  const canDefect = can(groups, 'battery.reportDefect');
  const canRetire = can(groups, 'battery.retire');
  const canHistory = can(groups, 'battery.movements');
  const [status, setStatus] = useState<'all' | BatteryStatus>('all');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [reasonFor, setReasonFor] = useState<{ battery: Battery; kind: 'defect' | 'retire' } | null>(null);
  const [historyOf, setHistoryOf] = useState<Battery | null>(null);
  const [actionErr, setActionErr] = useState<unknown>(null);
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  const { rows, loading, error, pager, refetch } = usePagedQuery<Battery>(['batteries', status, dq, depotId ?? ALL], (cursor) =>
    unwrap(api.GET('/batteries', { params: { query: { cursor, limit: 20, status: status === 'all' ? undefined : status, depotId, q: dq.trim() || undefined } } })));
  const markCharged = async (b: Battery) => {
    setActionErr(null);
    try {
      await unwrap(api.POST('/batteries/{id}/mark-charged', { params: { path: { id: b.id } } }));
      toast(`${b.serial} marcada como carregada`);
      for (const k of REFRESH_KEYS) qc.invalidateQueries({ queryKey: [k] });
    } catch (e) { setActionErr(e); }
  };
  const hasActions = canMark || canDefect || canRetire || canHistory;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionTitle>Baterias</SectionTitle>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}><Input placeholder="Buscar pelo número de série" icon="Search" value={q} testId="battery-search" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} /></div>
        <div style={{ width: 220 }}><Select testId="battery-status" value={status} onChange={setStatus} options={[{ value: 'all', label: 'Todas as situações' }, ...BATTERY_STATUSES.map((s) => ({ value: s, label: BATTERY_STATUS[s][0] }))]} /></div>
      </div>
      <ErrorNote error={error ?? actionErr} onRetry={error ? () => refetch() : undefined} />
      <DataTable<Battery> dense testId="batteries-table" rows={rows} loading={loading} pager={pager} empty={dq ? `Nenhuma bateria com "${dq}"` : 'Nenhuma bateria nesta situação'} emptyIcon="Battery"
        columns={[
          { key: 'serial', label: 'Série', mono: true },
          { key: 'chargePct', label: 'Carga', align: 'right', render: (b) => <Pill tone={chargeTone(b.chargePct)}>{b.chargePct}%</Pill> },
          { key: 'cycleCount', label: 'Ciclos', align: 'right', render: (b) => <span style={{ fontFamily: 'var(--font-mono)' }}>{b.cycleCount}</span> },
          { key: 'status', label: 'Situação', render: (b) => <Pill tone={BATTERY_STATUS[b.status][1]}>{BATTERY_STATUS[b.status][0]}</Pill> },
          { key: 'where', label: 'Onde', wrap: true, render: (b) => batteryLocation(b, { stations: stationNames, staff: staffNames, depots: depotNames }) },
          { key: 'updatedAt', label: 'Atualizada', render: (b) => timeAgo(b.updatedAt) },
          ...(hasActions ? [{
            key: 'actions', label: '', align: 'right' as const, pin: true, render: (b: Battery) => {
              const a = batteryActions(b.status);
              return (
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                  {canMark && a.markCharged && <Button size="sm" variant="ghost" icon="BatteryCharging" style={ACTION_BTN} testId={`battery-charged-${b.id}`} onClick={() => markCharged(b)}>Carregada</Button>}
                  {canDefect && a.reportDefect && <Button size="sm" variant="ghost" icon="TriangleAlert" style={ACTION_BTN} testId={`battery-defect-${b.id}`} onClick={() => setReasonFor({ battery: b, kind: 'defect' })}>Defeito</Button>}
                  {canRetire && a.retire && <Button size="sm" variant="ghost" icon="Trash2" testId={`battery-retire-${b.id}`} style={{ ...ACTION_BTN, color: 'var(--danger-ink)' }} onClick={() => setReasonFor({ battery: b, kind: 'retire' })}>Dar baixa</Button>}
                  {canHistory && <Button size="sm" variant="ghost" icon="History" style={ACTION_BTN} testId={`battery-history-${b.id}`} onClick={() => setHistoryOf(b)}>Histórico</Button>}
                </div>
              );
            },
          }] : []),
        ]} />
      {reasonFor && <ReasonModal battery={reasonFor.battery} kind={reasonFor.kind} onClose={() => setReasonFor(null)} />}
      {historyOf && <MovementsModal battery={historyOf} depotNames={depotNames} depots={depots} onClose={() => setHistoryOf(null)} />}
    </div>
  );
}
