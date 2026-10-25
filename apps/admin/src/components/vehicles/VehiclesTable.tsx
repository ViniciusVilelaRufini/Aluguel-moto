'use client';

import type { S } from '@/lib/types';
import { depotName, signalSummary } from '@/lib/vehicles-admin';
import { formatKm } from '@/lib/maintenance';
import { BatteryPill } from '@/ds/BatteryPill';
import { FleetStatus } from '@/ds/FleetStatus';
import { DataTable, Pill, type Pager } from '../ui';

type Vehicle = S<'Vehicle'>;

/** Foto pequena do modelo do catálogo (quando houver) ao lado do nome. */
export function ModelCell({ v, models }: { v: Pick<Vehicle, 'model' | 'vehicleModelId'>; models: readonly Pick<S<'VehicleModel'>, 'id' | 'photoUrl'>[] }) {
  const photo = v.vehicleModelId ? models.find((m) => m.id === v.vehicleModelId)?.photoUrl : undefined;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- link assinado do catálogo (build estático, sem otimizador de imagem)
        <img src={photo} alt="" width={32} height={32} data-testid="model-photo" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 8, background: 'var(--ink-50)' }} />
      ) : (
        <span aria-hidden style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--ink-50)', display: 'inline-block' }} />
      )}
      {v.model}
    </span>
  );
}

/**
 * Lista de motos da seção Motos: código, modelo (com a foto do catálogo), galpão, situação, bateria, sinal e odômetro.
 * Só apresentação (paginação por cursor e filtros ficam na página), para renderizar nos testes sem consulta.
 */
export function VehiclesTable({ rows, depots, models, loading, selectedId, onSelect, pager, filtered }: {
  rows: Vehicle[];
  depots: readonly Pick<S<'Depot'>, 'id' | 'name'>[];
  models: readonly Pick<S<'VehicleModel'>, 'id' | 'photoUrl'>[];
  loading?: boolean;
  selectedId?: string | null;
  onSelect: (v: Vehicle) => void;
  pager?: Pager;
  filtered?: boolean;
}) {
  return (
    <DataTable<Vehicle> testId="vehicles-table" label="Motos" rows={rows} loading={loading} selectedKey={selectedId} onRowClick={onSelect} pager={pager}
      empty={filtered ? 'Nenhuma moto com estes filtros' : 'Nenhuma moto cadastrada'} emptyIcon={filtered ? 'Search' : 'Bike'}
      emptyHint={filtered ? 'Mude a busca ou limpe os filtros.' : 'Cadastre a primeira moto pelo botão "Cadastrar moto".'}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        { key: 'model', label: 'Modelo', render: (v) => <ModelCell v={v} models={models} /> },
        { key: 'depotId', label: 'Galpão', render: (v) => <span style={{ color: v.depotId ? undefined : 'var(--text-secondary)' }}>{depotName(depots, v.depotId)}</span> },
        { key: 'status', label: 'Situação', render: (v) => <FleetStatus status={v.status} variant="dot" /> },
        { key: 'batteryPct', label: 'Bateria', render: (v) => <BatteryPill level={v.batteryPct} range={Math.round(v.estimatedRangeKm)} /> },
        { key: 'online', label: 'Sinal', render: (v) => <Pill tone={v.online ? 'success' : 'neutral'} icon={v.online ? 'Wifi' : 'WifiOff'}>{signalSummary(v)}</Pill> },
        { key: 'odometerKm', label: 'Odômetro', align: 'right', render: (v) => formatKm(v.odometerKm) },
      ]}
    />
  );
}
