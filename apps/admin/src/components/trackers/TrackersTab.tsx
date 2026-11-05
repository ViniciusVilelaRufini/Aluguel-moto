'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { can } from '@/lib/permissions';
import { imeiQuery, trackerStatusLabel, type TrackerDevice } from '@/lib/trackers';
import { useNow } from '@/lib/use-now';
import type { StaffGroup } from '@/lib/types';
import { Button } from '@/ds/Button';
import { Input } from '@/ds/Input';
import { SegmentedControl } from '@/ds/SegmentedControl';
import { DataTable, ErrorNote, Pill, type Column } from '../ui';
import { CreateTrackerWizard } from './CreateTrackerWizard';

type Filter = 'all' | 'installed' | 'stock';
const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' }, { value: 'installed', label: 'Instalados' }, { value: 'stock', label: 'No estoque' },
];

/** Aba "Rastreadores" da área Motos: estoque e instalados, com busca por IMEI e cadastro em 2 passos. */
export function TrackersTab({ groups }: { groups: StaffGroup[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const now = useNow();
  useEffect(() => {
    const t = setTimeout(() => setQ(imeiQuery(search)), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useQuery({
    queryKey: ['trackers', 'list', filter, q],
    queryFn: () => unwrap(api.GET('/trackers', { params: { query: { ...(q ? { q } : {}), ...(filter === 'all' ? {} : { installed: filter === 'installed' }) } } })),
  });
  const items = list.data?.items ?? [];
  const manage = can(groups, 'tracker.manage');
  const filtered = filter !== 'all' || q !== '';

  const columns: Column<TrackerDevice>[] = [
    { key: 'imei', label: 'IMEI', mono: true },
    { key: 'model', label: 'Modelo' },
    { key: 'chip', label: 'Chip', render: (t) => (t.simCard ? `${t.simCard.carrier} · ${t.simCard.iccid.slice(-6)}` : 'Sem chip') },
    { key: 'vehicleCode', label: 'Instalado em', render: (t) => (t.vehicleCode ?? <Pill>No estoque</Pill>) },
    { key: 'signal', label: 'Sinal', render: (t) => <Pill tone={t.online ? 'success' : 'neutral'}>{trackerStatusLabel(t, now)}</Pill> },
  ];
  const addButton = manage ? <Button size="sm" variant="dark" icon="Plus" testId="tracker-create" onClick={() => setCreating(true)}>Cadastrar rastreador</Button> : undefined;

  return (
    <div data-testid="trackers-tab" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', minWidth: 200 }}>
          <Input placeholder="Buscar por IMEI" icon="Search" value={search} testId="trackers-search"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
        </div>
        <SegmentedControl<Filter> label="Filtrar rastreadores" options={FILTER_OPTIONS} value={filter} onChange={setFilter} style={{ width: 330 }} />
        {addButton}
      </div>
      {list.error ? <ErrorNote error={list.error} onRetry={() => list.refetch()} /> : (
        <DataTable<TrackerDevice> label="Rastreadores" testId="trackers-table" columns={columns} rows={items} loading={list.isLoading}
          empty={filtered ? 'Nenhum rastreador encontrado.' : 'Nenhum rastreador cadastrado. Cadastre o primeiro para poder instalar nas motos.'} />
      )}
      {creating && <CreateTrackerWizard onClose={() => setCreating(false)} onCreated={() => {}} />}
    </div>
  );
}
