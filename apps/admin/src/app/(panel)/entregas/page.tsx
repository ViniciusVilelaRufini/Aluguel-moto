'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can, rentalHref } from '@/lib/permissions';
import { canCancelHandover } from '@/lib/admin-forms';
import { HANDOVER_STATUS, HANDOVER_STATUSES, HANDOVER_TYPE_LABEL, supportHref, type HandoverStatus, type HandoverType } from '@/lib/handovers';
import type { S } from '@/lib/types';
import { HandoverDetail, HandoverTable } from '@/components/depots/HandoverViews';
import { CancelHandoverDialog } from '@/components/CancelHandoverDialog';
import { ErrorNote, Page, PageHeader, PanelSkeleton, Select, SidePanel, usePagedQuery } from '@/components/ui';
import { SegmentedControl } from '@/ds/SegmentedControl';

type View = 'all' | 'disputes';
type StatusFilter = HandoverStatus | 'all';
type TypeFilter = HandoverType | 'all';

/**
 * Entregas no galpão (`GET /handovers`): saídas e chegadas com fotos e checklist. A aba Disputas é a fila do
 * suporte (`status=disputed`).
 */
export default function HandoversPage() {
  const { groups } = useAuth();
  const onlySupport = groups.includes('suporte') && !groups.includes('admin') && !groups.includes('operacao');
  const [view, setView] = useState<View>(onlySupport ? 'disputes' : 'all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [depotId, setDepotId] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<S<'Handover'> | null>(null);

  const depotsQ = useQuery({ queryKey: ['depots', 'all'], queryFn: () => unwrap(api.GET('/depots', { params: { query: { includeInactive: true } } })) });
  const depots = useMemo(() => depotsQ.data?.items ?? [], [depotsQ.data]);

  const effStatus = view === 'disputes' ? 'disputed' : status === 'all' ? undefined : status;
  const query = { status: effStatus, type: type === 'all' ? undefined : type, depotId: depotId === 'all' ? undefined : depotId };
  const page = usePagedQuery(['handovers', query], (cursor) => unwrap(api.GET('/handovers', { params: { query: { ...query, cursor, limit: 25 } } })));

  const detail = useQuery({
    queryKey: ['handover', selected],
    enabled: !!selected,
    queryFn: () => unwrap(api.GET('/handovers/{id}', { params: { path: { id: selected! } } })),
  });
  const row = page.rows.find((h) => h.id === selected);
  const shown: S<'Handover'> | undefined = detail.data ?? row;

  return (
    <div className="split" style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
      <Page>
        <PageHeader title="Entregas no galpão" subtitle="Saídas e chegadas registradas pela operação, com fotos e checklist. Horários de São Paulo.">
          <SegmentedControl label="Ver" options={[{ value: 'all', label: 'Todas' }, { value: 'disputes', label: 'Disputas' }]} value={view}
            onChange={(v: View) => { setView(v); setSelected(null); }} style={{ width: 260 }} />
        </PageHeader>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 240 }}>
            <Select testId="handovers-depot" value={depotId} onChange={setDepotId} options={[{ value: 'all', label: 'Todos os galpões' }, ...depots.map((d) => ({ value: d.id, label: d.name }))]} />
          </div>
          <div style={{ width: 220 }}>
            <Select<TypeFilter> testId="handovers-type" value={type} onChange={setType}
              options={[{ value: 'all', label: 'Saídas e chegadas' }, { value: 'pickup', label: HANDOVER_TYPE_LABEL.pickup }, { value: 'return_depot', label: HANDOVER_TYPE_LABEL.return_depot }]} />
          </div>
          {view === 'all' && (
            <div style={{ width: 220 }}>
              <Select<StatusFilter> testId="handovers-status" value={status} onChange={setStatus}
                options={[{ value: 'all', label: 'Todos os status' }, ...HANDOVER_STATUSES.map((s) => ({ value: s, label: HANDOVER_STATUS[s].label }))]} />
            </div>
          )}
        </div>
        <ErrorNote error={page.error} onRetry={() => page.refetch()} />
        <HandoverTable rows={page.rows} loading={page.loading} pager={page.pager} selectedId={selected} onSelect={(h) => setSelected(h.id)} compact={!!selected}
          empty={view === 'disputes' ? 'Nenhuma disputa aberta' : undefined} />
      </Page>
      {selected && (
        <SidePanel width={400} testId="handover-panel" onClose={() => setSelected(null)}
          title={<div style={{ font: '700 18px/1.25 var(--font-sans)' }}>Entrega {shown?.vehicleCode ? `· ${shown.vehicleCode}` : ''}</div>}>
          <ErrorNote error={detail.error} onRetry={() => detail.refetch()} />
          {shown ? (
            <HandoverDetail handover={shown} photosLoading={detail.isLoading} supportHref={supportHref(groups)} rentalHref={shown.rentalId ? rentalHref(groups, shown.rentalId) : null}
              onCancel={can(groups, 'handover.cancel') && canCancelHandover(shown) ? () => setCanceling(shown) : undefined} />
          ) : (
            <PanelSkeleton />
          )}
        </SidePanel>
      )}
      <CancelHandoverDialog handover={canceling} onClose={() => setCanceling(null)} />
    </div>
  );
}
