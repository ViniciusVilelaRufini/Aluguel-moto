'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { localDay } from '@/lib/format';
import { RESERVATION_STATUS, RESERVATION_STATUSES, toPickupRows, type PickupModeFilter, type ReservationStatus } from '@/lib/pickups';
import { summarizeHours } from '@/lib/depot-hours';
import { PickupTable } from '@/components/depots/PickupTable';
import { Empty, ErrorNote, Field, Page, PageHeader, Select, TextInput } from '@/components/ui';
import { SegmentedControl } from '@/ds/SegmentedControl';
import { StatTile } from '@/ds/StatTile';

const MODES: { value: PickupModeFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'now', label: 'Agora' },
  { value: 'scheduled', label: 'Agendadas' },
];
type StatusFilter = ReservationStatus | 'all';
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos os status' },
  ...RESERVATION_STATUSES.map((s) => ({ value: s, label: RESERVATION_STATUS[s].label })),
];

/** Agenda de retiradas do dia por galpão (`GET /depots/{id}/pickups`), em America/Sao_Paulo. */
export default function PickupsPage() {
  const [depotId, setDepotId] = useState('');
  const [date, setDate] = useState(() => localDay());
  const [mode, setMode] = useState<PickupModeFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const depotsQ = useQuery({ queryKey: ['depots', 'all'], queryFn: () => unwrap(api.GET('/depots', { params: { query: { includeInactive: true } } })) });
  const depots = useMemo(() => depotsQ.data?.items ?? [], [depotsQ.data]);
  useEffect(() => {
    if (!depotId && depots.length > 0) setDepotId((depots.find((d) => d.active) ?? depots[0]).id);
  }, [depots, depotId]);
  const depot = depots.find((d) => d.id === depotId);

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const pickupsQ = useQuery({
    queryKey: ['depot-pickups', depotId, date, status],
    enabled: !!depotId && validDate,
    refetchInterval: 30_000,
    queryFn: () => unwrap(api.GET('/depots/{id}/pickups', { params: { path: { id: depotId }, query: { date, ...(status !== 'all' ? { status } : {}) } } })),
  });
  const items = useMemo(() => pickupsQ.data?.items ?? [], [pickupsQ.data]);
  // Indicadores do dia inteiro: consulta sem filtro de status (com "Todos os status", o React Query reaproveita a mesma).
  const dayQ = useQuery({
    queryKey: ['depot-pickups', depotId, date, 'all'],
    enabled: !!depotId && validDate,
    refetchInterval: 30_000,
    queryFn: () => unwrap(api.GET('/depots/{id}/pickups', { params: { path: { id: depotId }, query: { date } } })),
  });
  const all = useMemo(() => toPickupRows(dayQ.data?.items ?? [], 'all'), [dayQ.data]);
  const waiting = all.filter((r) => r.status === 'active').length;
  const inHandover = all.filter((r) => r.status === 'handover').length;
  const done = all.filter((r) => r.status === 'converted').length;

  return (
    <Page>
      <PageHeader title="Agenda de retiradas" subtitle={depot ? `${depot.name} · ${summarizeHours(depot.openingHours)} · horários de São Paulo` : 'Horários de São Paulo'}>
        <div style={{ width: 260 }}>
          <Field label="Galpão">
            <Select testId="pickups-depot" value={depotId} onChange={setDepotId}
              options={depots.length ? depots.map((d) => ({ value: d.id, label: d.active ? d.name : `${d.name} (inativo)` })) : [{ value: '', label: depotsQ.isLoading ? 'Carregando...' : 'Nenhum galpão' }]} />
          </Field>
        </div>
        <div style={{ width: 180 }}>
          <Field label="Dia">
            <TextInput testId="pickups-date" type="date" value={date} onChange={setDate} />
          </Field>
        </div>
      </PageHeader>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <SegmentedControl label="Modo de retirada" options={MODES} value={mode} onChange={setMode} style={{ width: 340 }} />
        <div style={{ width: 220 }}>
          <Select testId="pickups-status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </div>
      </div>

      {dayQ.data && (
        <div data-testid="pickups-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, maxWidth: 720 }}>
          <StatTile icon="CalendarClock" label="Reservas no dia (todas)" numeric={all.length} />
          <StatTile icon="Hourglass" label="Aguardando" numeric={waiting} />
          <StatTile icon="PackageCheck" label="Em entrega" numeric={inHandover} />
          <StatTile icon="Bike" label="Retiradas" numeric={done} />
        </div>
      )}

      <ErrorNote error={depotsQ.error ?? pickupsQ.error} onRetry={() => { depotsQ.refetch(); pickupsQ.refetch(); }} />
      {!depotsQ.isLoading && depots.length === 0 ? (
        <Empty icon="Warehouse" hint="Cadastre um galpão em Galpões para ver a agenda.">Nenhum galpão cadastrado</Empty>
      ) : (
        <PickupTable items={items} mode={mode} loading={pickupsQ.isLoading || depotsQ.isLoading} />
      )}
    </Page>
  );
}
