'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { STATUS_LABEL, VEHICLE_STATUSES } from '@/lib/status';
import { EMPTY_FILTERS, vehicleListQuery, type VehicleFilters } from '@/lib/vehicles-admin';
import type { VehicleStatus } from '@/lib/types';
import { Button } from '@/ds/Button';
import { Input } from '@/ds/Input';
import { VehicleFormModal } from '@/components/VehicleFormModal';
import { VehicleDetailPanel } from '@/components/vehicles/VehicleDetailPanel';
import { VehiclesTable } from '@/components/vehicles/VehiclesTable';
import { ErrorNote, Page, PageHeader, Select, usePagedQuery } from '@/components/ui';

/**
 * Seção Motos (admin, operação): lista paginada com busca e filtros, cadastro com galpão, ficha com edição,
 * transferência de galpão e mudança de status. `?new=1` abre o cadastro (atalho da Frota ao vivo); `?vehicle=` a ficha.
 */
export default function VehiclesPage() {
  const { groups } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const [filters, setFilters] = useState<VehicleFilters>(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(params.get('vehicle'));
  const [creating, setCreating] = useState(params.get('new') === '1' && can(groups, 'vehicle.edit'));
  const savedRef = useRef(false);

  // Busca com espera curta para não consultar a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === search ? f : { ...f, q: search })), 300);
    return () => clearTimeout(t);
  }, [search]);

  const depotsQ = useQuery({ queryKey: ['depots', 'all'], queryFn: () => unwrap(api.GET('/depots', { params: { query: { includeInactive: true } } })) });
  const depots = useMemo(() => depotsQ.data?.items ?? [], [depotsQ.data]);
  const modelsQ = useQuery({ queryKey: ['vehicle-models', 'active'], queryFn: () => unwrap(api.GET('/vehicle-models')) });
  const models = useMemo(() => modelsQ.data?.items ?? [], [modelsQ.data]);

  const { rows, loading, error, pager, refetch } = usePagedQuery(['vehicles', 'motos', filters], (cursor) =>
    unwrap(api.GET('/vehicles', { params: { query: vehicleListQuery(filters, cursor) } })));

  const select = useCallback((id: string | null) => {
    setSelected(id);
    router.replace(id ? `/motos?vehicle=${id}` : '/motos', { scroll: false });
  }, [router]);

  const patch = (p: Partial<VehicleFilters>) => setFilters((f) => ({ ...f, ...p }));
  const filtered = !!(filters.q || filters.depotId || filters.status || filters.vehicleModelId);

  return (
    <div className="split" style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
      <Page>
        <PageHeader subtitle="Cadastro da frota: galpão, modelo, rastreador e bateria de cada moto.">
          {can(groups, 'vehicle.edit') && <Button size="sm" variant="dark" icon="Plus" testId="vehicle-create" onClick={() => setCreating(true)}>Cadastrar moto</Button>}
        </PageHeader>
        <div role="group" aria-label="Filtrar motos" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) repeat(3, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }} className="filters-grid">
          <Input placeholder="Buscar por código, QR ou rastreador" icon="Search" value={search} testId="vehicles-search"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
          <Select testId="vehicles-filter-depot" value={filters.depotId} onChange={(depotId) => patch({ depotId })}
            options={[{ value: '', label: 'Todos os galpões' }, ...depots.map((d) => ({ value: d.id, label: d.active ? d.name : `${d.name} (inativo)` }))]} />
          <Select<VehicleStatus | ''> testId="vehicles-filter-status" value={filters.status} onChange={(status) => patch({ status })}
            options={[{ value: '', label: 'Todas as situações' }, ...VEHICLE_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]} />
          <Select testId="vehicles-filter-model" value={filters.vehicleModelId} onChange={(vehicleModelId) => patch({ vehicleModelId })}
            options={[{ value: '', label: 'Todos os modelos' }, ...models.map((m) => ({ value: m.id, label: m.name }))]} />
        </div>
        {filtered && (
          <div><button type="button" className="chip-clear" data-testid="vehicles-clear" onClick={() => { setSearch(''); setFilters(EMPTY_FILTERS); }}>Limpar filtros</button></div>
        )}
        {error ? <ErrorNote error={error} onRetry={() => refetch()} /> : (
          <VehiclesTable rows={rows} depots={depots} models={models} loading={loading} selectedId={selected} onSelect={(v) => select(v.id)} pager={pager} filtered={filtered} />
        )}
      </Page>
      {selected && <VehicleDetailPanel key={selected} vehicleId={selected} depots={depots} models={models} onClose={() => select(null)} />}
      {creating && (
        <VehicleFormModal
          onSaved={(v) => { savedRef.current = true; select(v.id); }}
          onClose={() => {
            setCreating(false);
            // Cancelou o cadastro aberto pelo atalho (?new=1): tira o parâmetro para não reabrir ao recarregar.
            if (!savedRef.current && params.get('new')) router.replace('/motos', { scroll: false });
            savedRef.current = false;
          }} />
      )}
    </div>
  );
}
