'use client';

import { DataTable, Pill } from '@/components/ui';
import { toPickupRows, type PickupModeFilter, type PickupRow } from '@/lib/pickups';
import type { S } from '@/lib/types';

/**
 * Agenda de retiradas do dia (`GET /depots/{id}/pickups`): horário em São Paulo, modo, só o primeiro nome do
 * cliente, moto, status e prazo. O `pickupCode` nunca é mostrado.
 */
export function PickupTable({ items, mode, loading }: { items: S<'Reservation'>[]; mode: PickupModeFilter; loading?: boolean }) {
  const rows = toPickupRows(items, mode);
  return (
    <DataTable<PickupRow>
      testId="pickups-table"
      label="Agenda de retiradas"
      loading={loading}
      rows={rows}
      empty="Nenhuma retirada neste dia"
      emptyIcon="CalendarClock"
      emptyHint="As reservas de retirada aparecem aqui assim que o cliente confirma no app."
      columns={[
        { key: 'time', label: 'Horário', mono: true },
        { key: 'mode', label: 'Modo', render: (r) => <Pill tone={r.mode === 'now' ? 'dark' : 'neutral'} icon={r.mode === 'now' ? 'Zap' : 'CalendarClock'}>{r.modeLabel}</Pill> },
        { key: 'customer', label: 'Cliente' },
        { key: 'vehicleCode', label: 'Moto', mono: true },
        { key: 'status', label: 'Status', render: (r) => <Pill tone={r.tone}>{r.statusLabel}</Pill> },
        { key: 'deadline', label: 'Retirar até', mono: true, align: 'right' },
      ]}
    />
  );
}
