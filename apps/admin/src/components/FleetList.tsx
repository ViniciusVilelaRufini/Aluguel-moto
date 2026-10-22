'use client';

import { useMemo, useState } from 'react';
import type { FleetVehicle } from '@/lib/realtime';
import { matchesVehicle } from '@/lib/fleet-search';
import { SERVICE_STATUS, formatKm } from '@/lib/maintenance';
import { timeAgo } from '@/lib/format';
import { FleetStatus } from '@/ds/FleetStatus';
import { Input } from '@/ds/Input';
import { Button } from '@/ds/Button';
import { DataTable, Pill } from './ui';

const MAX_ROWS = 200;

/**
 * Lista da frota (alternativa ao mapa): código, situação, bateria, endereço aproximado, modelo e revisão.
 * A busca casa código, endereço, modelo e série da bateria; o filtro de status do mapa vale aqui também.
 */
export function FleetList({ vehicles, selected, onSelect, onlyFixed, onToggleFixed }: {
  vehicles: FleetVehicle[]; selected: string | null; onSelect: (id: string) => void; onlyFixed: boolean; onToggleFixed: () => void;
}) {
  const [q, setQ] = useState('');
  const rows = useMemo(() => vehicles
    .filter((v) => (!onlyFixed || !!v.assignedSubscriptionId) && matchesVehicle(v, q))
    .sort((a, b) => a.code.localeCompare(b.code, 'pt-BR')), [vehicles, q, onlyFixed]);
  return (
    <div data-testid="fleet-list" style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input placeholder="Buscar por código, endereço, modelo ou bateria" icon="Search" value={q} testId="fleet-search"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} />
        </div>
        <Button size="sm" variant={onlyFixed ? 'dark' : 'secondary'} icon="Repeat" testId="fleet-only-fixed" onClick={onToggleFixed}
          style={onlyFixed ? undefined : { color: 'var(--text-primary)', borderColor: 'var(--border-strong)', background: '#fff' }}>Motos fixas de plano</Button>
      </div>
      <DataTable<FleetVehicle> dense sticky label="Motos" rows={rows.slice(0, MAX_ROWS)} selectedKey={selected} onRowClick={(r) => onSelect(r.id)}
        empty={q ? `Nenhuma moto para "${q}"` : 'Nenhuma moto neste filtro'} emptyIcon={q ? 'Search' : 'Bike'}
        columns={[
          { key: 'code', label: 'Moto', mono: true },
          { key: 'status', label: 'Situação', render: (v) => <FleetStatus status={v.status} variant="dot" /> },
          { key: 'batteryPct', label: 'Bateria', align: 'right', render: (v) => `${v.batteryPct}%` },
          { key: 'address', label: 'Endereço', render: (v) => <span title={v.address} style={{ display: 'inline-block', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'bottom' }}>{v.address ?? '—'}</span> },
          { key: 'model', label: 'Modelo', render: (v) => v.categoryLabel ? `${v.model} · ${v.categoryLabel}` : v.model },
          { key: 'service', label: 'Revisão', render: (v) => v.service ? <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Pill tone={SERVICE_STATUS[v.service.status][1]}>{SERVICE_STATUS[v.service.status][0]}</Pill><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatKm(v.service.kmSinceService)}</span></span> : '—' },
          { key: 'lastSeenAt', label: 'Último sinal', render: (v) => timeAgo(v.lastSeenAt) },
        ]} />
      {rows.length > MAX_ROWS && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Mostrando {MAX_ROWS} de {rows.length}. Refine a busca para ver as demais.</div>}
    </div>
  );
}
