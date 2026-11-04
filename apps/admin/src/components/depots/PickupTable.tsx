'use client';

import { useState } from 'react';
import { DataTable, Pill } from '@/components/ui';
import { CounterCheckoutDialog } from '@/components/CounterCheckoutDialog';
import { PickupHandoverDialog } from './PickupHandoverDialog';
import { Button } from '@/ds/Button';
import { toPickupRows, type PickupModeFilter, type PickupRow } from '@/lib/pickups';
import type { S } from '@/lib/types';

/**
 * Agenda de retiradas do dia (`GET /depots/{id}/pickups`): horário em São Paulo, modo, só o primeiro nome do
 * cliente, moto, status e prazo. O `pickupCode` nunca é mostrado. Reserva aguardando (`active`) oferece "Entregar moto"
 * a quem tem `handover.create` (QR do cliente, checklist, fotos e bateria; sem QR só o admin), que ao criar a entrega
 * abre direto o "Contrato e pagamento". Reserva em entrega (`handover`) oferece "Contrato e pagamento" (balcão) a quem
 * tem `counter.checkout`, que inicia o aluguel.
 */
export function PickupTable({ items, mode, loading, canCheckout = false, canDeliver = false, canDeliverWithoutCode = false }: {
  items: S<'Reservation'>[]; mode: PickupModeFilter; loading?: boolean; canCheckout?: boolean; canDeliver?: boolean; canDeliverWithoutCode?: boolean;
}) {
  const [checkout, setCheckout] = useState<string | null>(null);
  const [deliver, setDeliver] = useState<string | null>(null);
  const rows = toPickupRows(items, mode);
  const delivering = deliver ? items.find((r) => r.id === deliver) : undefined;
  const actions = canCheckout || canDeliver;
  return (
    <>
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
          ...(actions ? [{
            key: 'actions', label: '', align: 'right' as const, pin: true,
            render: (r: PickupRow) => canCheckout && r.status === 'handover' && r.handoverId
              ? <Button size="sm" variant="dark" icon="FileText" testId="pickup-counter-checkout" onClick={() => setCheckout(r.handoverId!)}>Contrato e pagamento</Button>
              : canDeliver && r.status === 'active'
                ? <Button size="sm" variant="secondary" icon="PackageCheck" testId="pickup-deliver" onClick={() => setDeliver(r.id)}>Entregar moto</Button>
                : null,
          }] : []),
        ]}
      />
      {delivering && (
        <PickupHandoverDialog reservation={delivering} canWithoutCode={canDeliverWithoutCode} onClose={() => setDeliver(null)}
          onCreated={(handoverId) => { setDeliver(null); if (canCheckout) setCheckout(handoverId); }} />
      )}
      {checkout && <CounterCheckoutDialog handoverId={checkout} onClose={() => setCheckout(null)} />}
    </>
  );
}
