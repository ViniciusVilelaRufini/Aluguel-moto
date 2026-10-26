'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { BATTERY_STATUS, BATTERY_STATUSES, batteryLocation, chargeTone, countByStatus, parseSerials, type Battery, type BatteryStatus } from '@/lib/batteries';
import { timeAgo } from '@/lib/format';
import { loadAllPages } from '@/lib/paging';
import type { S } from '@/lib/types';
import { Alert } from '@/ds/Alert';
import { Button } from '@/ds/Button';
import { Card } from '@/ds/Card';
import { Input } from '@/ds/Input';
import { DataTable, ErrorNote, Field, Modal, Pill, SectionTitle, Select, Skeleton, TextArea, TextInput, usePagedQuery, useToast } from './ui';

const ME = 'me';
const ghost = { color: 'var(--text-primary)', borderColor: 'var(--border-strong)' };

/** Todas as baterias para as contagens (até 20 páginas de 100 = 2000; acima disso a tela avisa). */
function loadAllBatteries() {
  return loadAllPages<Battery>((cursor) => unwrap(api.GET('/batteries', { params: { query: { limit: 100, cursor } } })));
}

/**
 * Operação > Baterias: estoque por situação, estações (carregadas/vagas), van de cada operador de campo,
 * carregar/descarregar a van (transferência por série) e a lista com série, carga e ciclos.
 */
export function BatteriesPanel() {
  const { groups } = useAuth();
  const canTransfer = can(groups, 'battery.transfer');
  const all = useQuery({ queryKey: ['batteries', 'all'], queryFn: loadAllBatteries, refetchInterval: 120_000 });
  const stations = useQuery({ queryKey: ['swap-stations'], queryFn: () => unwrap(api.GET('/swap-stations')) });
  const staff = useQuery({ queryKey: ['staff', 'campo'], queryFn: () => unwrap(api.GET('/staff', { params: { query: { group: 'campo', active: true, limit: 100 } } })) });
  const stationNames = useMemo(() => new Map((stations.data?.items ?? []).map((s) => [s.id, s.name])), [stations.data]);
  const staffNames = useMemo(() => new Map((staff.data?.items ?? []).map((s) => [s.id, s.name])), [staff.data]);
  const counts = useMemo(() => countByStatus(all.data?.items ?? []), [all.data]);
  const inStation = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of all.data?.items ?? []) if (b.status === 'in_station' && b.stationId) m.set(b.stationId, (m.get(b.stationId) ?? 0) + 1);
    return m;
  }, [all.data]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <ErrorNote error={all.error ?? stations.error} />
      {all.data?.capped && <Alert tone="warning" icon="TriangleAlert">Mais de 2.000 baterias: as contagens abaixo consideram só as 2.000 primeiras. Use a lista filtrada para o restante.</Alert>}
      <div data-testid="battery-counts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {BATTERY_STATUSES.map((s) => (
          <Card key={s} padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{BATTERY_STATUS[s][0]}</span>
            {all.isLoading ? <Skeleton w={40} h={22} /> : <span style={{ font: '700 22px/1.1 var(--font-mono)' }}>{counts[s]}</span>}
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18, alignItems: 'start' }}>
        <div>
          <SectionTitle>Estações de troca</SectionTitle>
          <div className="stack-cells"><DataTable<S<'SwapStation'>> dense testId="stations-table" rows={stations.data?.items ?? []} loading={stations.isLoading} empty="Nenhuma estação cadastrada" emptyIcon="Warehouse"
            columns={[
              { key: 'name', label: 'Estação', render: (s) => <div><div style={{ fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'normal' }}>{s.address}</div></div> },
              { key: 'available', label: 'Carregadas', align: 'right', render: (s) => <span style={{ fontFamily: 'var(--font-mono)' }}>{s.availableBatteries}/{s.totalSlots}</span> },
              { key: 'stock', label: 'No estoque', align: 'right', render: (s) => inStation.get(s.id) ?? 0 },
              { key: 'hours', label: 'Horário', render: (s) => <span style={{ fontSize: 12 }}>{s.open24h ? '24 h' : s.openingHours}</span> },
            ]} /></div>
        </div>
        <VanStock staff={staff.data?.items ?? []} stations={stations.data?.items ?? []} canTransfer={canTransfer} />
      </div>

      <BatteryList stationNames={stationNames} staffNames={staffNames} />
    </div>
  );
}

function VanStock({ staff, stations, canTransfer }: { staff: S<'StaffUser'>[]; stations: S<'SwapStation'>[]; canTransfer: boolean }) {
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
        <ErrorNote error={van.error} />
        <div data-testid="van-summary" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill tone="neutral" icon="Package">{van.data ? `${van.data.total} no total` : van.isError ? '— no total' : '...'}</Pill>
          <Pill tone="success" icon="BatteryCharging">{van.data ? `${van.data.chargedCount} ${van.data.chargedCount === 1 ? 'carregada' : 'carregadas'}` : van.isError ? '— carregadas' : '...'}</Pill>
          <Pill tone="warning" icon="BatteryWarning">{van.data ? `${van.data.depletedCount} ${van.data.depletedCount === 1 ? 'descarregada' : 'descarregadas'}` : van.isError ? '— descarregadas' : '...'}</Pill>
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
      {transfer && <TransferModal mode={transfer} stations={stations} onClose={() => setTransfer(null)} />}
    </div>
  );
}

function TransferModal({ mode, stations, onClose }: { mode: 'load' | 'unload'; stations: S<'SwapStation'>[]; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState('');
  const [charge, setCharge] = useState('100');
  const [dest, setDest] = useState<string>('charging');
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
      else await unwrap(api.POST('/batteries/van-stock/unload', { body: { serials, ...(dest === 'charging' ? {} : { stationId: dest }) } }));
      toast(mode === 'load' ? `${serials.length} bateria(s) na van` : `${serials.length} bateria(s) descarregada(s)`);
      for (const k of ['van-stock', 'batteries', 'swap-stations']) qc.invalidateQueries({ queryKey: [k] });
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
        : <Field label="Destino"><Select testId="transfer-dest" value={dest} onChange={setDest} options={[{ value: 'charging', label: 'Carregador (sem estação)' }, ...stations.map((s) => ({ value: s.id, label: s.name }))]} /></Field>}
      {mode === 'load' && <Alert tone="info" icon="Info">Bateria instalada numa moto não pode ir para a van.</Alert>}
      <ErrorNote error={err} />
    </Modal>
  );
}

function BatteryList({ stationNames, staffNames }: { stationNames: Map<string, string>; staffNames: Map<string, string> }) {
  const [status, setStatus] = useState<'all' | BatteryStatus>('all');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  const { rows, loading, error, pager } = usePagedQuery<Battery>(['batteries', status, dq], (cursor) =>
    unwrap(api.GET('/batteries', { params: { query: { cursor, limit: 20, status: status === 'all' ? undefined : status, q: dq.trim() || undefined } } })));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionTitle>Baterias</SectionTitle>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}><Input placeholder="Buscar pelo número de série" icon="Search" value={q} testId="battery-search" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} /></div>
        <div style={{ width: 220 }}><Select testId="battery-status" value={status} onChange={setStatus} options={[{ value: 'all', label: 'Todas as situações' }, ...BATTERY_STATUSES.map((s) => ({ value: s, label: BATTERY_STATUS[s][0] }))]} /></div>
      </div>
      <ErrorNote error={error} />
      <DataTable<Battery> testId="batteries-table" rows={rows} loading={loading} pager={pager} empty={dq ? `Nenhuma bateria com "${dq}"` : 'Nenhuma bateria nesta situação'} emptyIcon="Battery"
        columns={[
          { key: 'serial', label: 'Série', mono: true },
          { key: 'chargePct', label: 'Carga', align: 'right', render: (b) => <Pill tone={chargeTone(b.chargePct)}>{b.chargePct}%</Pill> },
          { key: 'cycleCount', label: 'Ciclos', align: 'right', render: (b) => <span style={{ fontFamily: 'var(--font-mono)' }}>{b.cycleCount}</span> },
          { key: 'status', label: 'Situação', render: (b) => <Pill tone={BATTERY_STATUS[b.status][1]}>{BATTERY_STATUS[b.status][0]}</Pill> },
          { key: 'where', label: 'Onde', render: (b) => batteryLocation(b, { stations: stationNames, staff: staffNames }) },
          { key: 'updatedAt', label: 'Atualizada', render: (b) => timeAgo(b.updatedAt) },
        ]} />
    </div>
  );
}
