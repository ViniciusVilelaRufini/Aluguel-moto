'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { PRIORITY_LABEL, PRIORITY_ORDER, priorityTone } from '@/lib/status';
import { timeAgo } from '@/lib/format';
import { ALERT_TYPE } from '@/lib/labels';
import { criticalBanner } from '@/lib/fleet-copy';
import { useRealtimeEvent } from '@/lib/realtime';
import type { S } from '@/lib/types';
import { DataTable, ErrorNote, Field, Modal, Page, PageHeader, Pill, ReasonDialog, Select, usePagedQuery, useToast } from '@/components/ui';
import { Alert } from '@/ds/Alert';
import { Badge } from '@/ds/Badge';
import { Button } from '@/ds/Button';
import { SegmentedControl } from '@/ds/SegmentedControl';

const TYPE_INFO = ALERT_TYPE;

type Tab = 'open' | 'assigned' | 'resolved';
const TABS: { value: Tab; label: string }[] = [
  { value: 'open', label: 'Abertos' },
  { value: 'assigned', label: 'Atribuídos' },
  { value: 'resolved', label: 'Resolvidos' },
];

export default function AlertsPage() {
  const { groups, me } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('open');
  const [resolving, setResolving] = useState<S<'Alert'> | null>(null);
  const [assigning, setAssigning] = useState<S<'Alert'> | null>(null);
  const canManage = can(groups, 'alert.manage');
  // Alertas que chegaram pelo tempo real nesta visita piscam em coral ao entrar na fila.
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  useRealtimeEvent('alert.created', (p) => setFresh((s) => new Set(s).add(p.alertId)));

  const { rows, loading, error, pager } = usePagedQuery<S<'Alert'>>(['alerts', tab], (cursor) =>
    unwrap(api.GET('/alerts', { params: { query: { status: tab, limit: 20, cursor } } })),
  );
  const sorted = useMemo(() => [...rows].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt.localeCompare(a.createdAt)), [rows]);
  const criticalRows = tab === 'open' ? sorted.filter((a) => a.priority === 'critical') : [];
  const critical = criticalRows.length;

  const assign = useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string; name?: string }) => unwrap(api.POST('/alerts/{id}/assign', { params: { path: { id } }, body: { assigneeId } })),
    onSuccess: (_a, v) => { toast(v.assigneeId === me?.id ? 'Alerta atribuído a você' : `Alerta atribuído a ${v.name ?? 'outra pessoa'}`); qc.invalidateQueries({ queryKey: ['alerts'] }); setAssigning(null); },
  });

  return (
    <Page>
      <PageHeader title="Alertas" subtitle="Gerados pelo rastreador e pelas regras de área">
        <SegmentedControl options={TABS} value={tab} onChange={setTab} style={{ width: 340 }} />
      </PageHeader>
      {critical > 0 && (
        <Alert tone="danger" title={`${critical} ${critical === 1 ? 'alerta crítico' : 'alertas críticos'}`} icon="Siren">{criticalBanner(criticalRows.map((a) => a.type))}</Alert>
      )}
      <ErrorNote error={error ?? assign.error} />
      <DataTable
        testId="alerts-table" sticky
        rows={sorted}
        loading={loading}
        pager={pager}
        label="Fila de alertas"
        rowClassName={(r) => (fresh.has(r.id) ? 'row-new' : undefined)}
        empty={tab === 'open' ? 'Nenhum alerta aberto' : tab === 'assigned' ? 'Nenhum alerta atribuído' : 'Nenhum alerta resolvido ainda'}
        emptyIcon={tab === 'open' ? 'CircleCheck' : 'Siren'}
        emptyHint={tab === 'open' ? 'A frota está em ordem. Alertas novos aparecem aqui na hora.' : undefined}
        columns={[
          { key: 'priority', label: 'Nível', render: (r) => <Badge size="sm" tone={priorityTone(r.priority)} icon={TYPE_INFO[r.type]?.[1] ?? 'Info'}>{PRIORITY_LABEL[r.priority]}</Badge> },
          { key: 'type', label: 'Alerta', render: (r) => (
            <div>
              <div style={{ fontWeight: 600 }}>{TYPE_INFO[r.type]?.[0] ?? r.type}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'normal', maxWidth: 420 }}>{r.message}{r.assigneeName ? ` · ${r.assigneeName}` : ''}</div>
            </div>
          ) },
          { key: 'vehicleCode', label: 'Moto', mono: true, render: (r) => r.vehicleCode ?? '—' },
          { key: 'createdAt', label: 'Quando', align: 'right', render: (r) => timeAgo(r.createdAt) },
          { key: 'a', label: '', align: 'right', render: (r) => r.status === 'resolved' ? <Pill>Resolvido</Pill> : (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              {r.vehicleId && <Button size="sm" variant="secondary" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => router.push(`/fleet?vehicle=${r.vehicleId}`)}>Ver no mapa</Button>}
              {canManage && <Button size="sm" variant="secondary" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => setAssigning(r)}>{r.assigneeId ? 'Reatribuir' : 'Atribuir'}</Button>}
              {canManage && <Button size="sm" variant="dark" onClick={() => setResolving(r)}>Resolver</Button>}
            </div>
          ) },
        ]}
      />
      {assigning && <AssignModal alert={assigning} meId={me?.id} busy={assign.isPending} onClose={() => setAssigning(null)} onAssign={(assigneeId, name) => assign.mutate({ id: assigning.id, assigneeId, name })} />}
      <ReasonDialog
        open={!!resolving}
        title="Resolver alerta"
        description={resolving ? `${TYPE_INFO[resolving.type]?.[0] ?? resolving.type}${resolving.vehicleCode ? ` · ${resolving.vehicleCode}` : ''}` : undefined}
        confirmLabel="Resolver"
        onClose={() => setResolving(null)}
        onConfirm={async (resolution) => {
          await unwrap(api.POST('/alerts/{id}/resolve', { params: { path: { id: resolving!.id } }, body: { resolution } }));
          toast('Alerta resolvido');
          qc.invalidateQueries({ queryKey: ['alerts'] });
        }}
      />
    </Page>
  );
}

/** Escolhe quem assume o alerta (lista de usuários internos ativos; padrão: quem está logado). */
function AssignModal({ alert, meId, busy, onClose, onAssign }: { alert: S<'Alert'>; meId?: string; busy: boolean; onClose: () => void; onAssign: (assigneeId: string, name: string) => void }) {
  const staff = useQuery({ queryKey: ['staff-assignees'], queryFn: () => unwrap(api.GET('/staff', { params: { query: { active: true, limit: 100 } } })) });
  const people = staff.data?.items ?? [];
  const [pick, setPick] = useState<string>('');
  const value = pick || (people.some((x) => x.id === meId) ? meId! : people[0]?.id) || '';
  const chosen = people.find((x) => x.id === value);
  return (
    <Modal open title="Atribuir alerta" onClose={onClose} testId="assign-dialog"
      actions={<>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button size="sm" variant="dark" testId="assign-confirm" disabled={busy || !chosen} onClick={() => chosen && onAssign(chosen.id, chosen.name)}>{busy ? 'Atribuindo...' : 'Atribuir'}</Button>
      </>}>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{TYPE_INFO[alert.type]?.[0] ?? alert.type}{alert.vehicleCode ? ` · ${alert.vehicleCode}` : ''}</div>
      <ErrorNote error={staff.error} />
      <Field label="Responsável">
        <Select testId="assign-select" value={value} onChange={setPick} options={people.map((x) => ({ value: x.id, label: x.id === meId ? `${x.name} (você)` : x.name }))} />
      </Field>
    </Modal>
  );
}
