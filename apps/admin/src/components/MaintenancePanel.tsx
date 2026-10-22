'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { MAINTENANCE_STATUS } from '@/lib/labels';
import { SERVICE_STATUS, formatHours, formatKm, maintenanceOrigin, nextServiceLabel } from '@/lib/maintenance';
import { formatDate, formatDateTime } from '@/lib/format';
import type { S } from '@/lib/types';
import { Button } from '@/ds/Button';
import { Input } from '@/ds/Input';
import { SegmentedControl } from '@/ds/SegmentedControl';
import { DataTable, ErrorNote, Field, Modal, Pill, ReasonDialog, Select, TextInput, usePagedQuery, useToast } from './ui';

type Row = S<'VehicleServiceRow'>;
type Task = S<'MaintenanceTask'>;
type ServiceFilter = 'all' | S<'VehicleServiceStatus'>;
type TaskFilter = 'open' | S<'MaintenanceStatus'> | 'all';

const ghost = { color: 'var(--text-primary)', borderColor: 'var(--border-strong)' };

/**
 * Operação > Manutenção. "Revisões": preventiva por km/horas (`GET /maintenance/vehicles`), com "Agendar"
 * por linha. "Agenda": manutenções abertas pelo painel, pelo cliente do plano (pedido com horário) ou
 * automáticas, com iniciar/concluir/cancelar (concluir uma preventiva registra a revisão).
 */
export function MaintenancePanel() {
  const [sub, setSub] = useState<'service' | 'agenda'>('service');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SegmentedControl label="Manutenção" options={[{ value: 'service', label: 'Revisões por km/horas' }, { value: 'agenda', label: 'Agenda e pedidos' }]} value={sub} onChange={setSub} style={{ maxWidth: 420 }} />
      {sub === 'service' ? <ServiceTable /> : <Agenda />}
    </div>
  );
}

function useDebounced(v: string, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

function ServiceTable() {
  const { groups } = useAuth();
  const canSchedule = can(groups, 'maintenance.schedule');
  const [status, setStatus] = useState<ServiceFilter>('all');
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [schedule, setSchedule] = useState<Row | null>(null);
  const { rows, loading, error, pager } = usePagedQuery<Row>(['maintenance-vehicles', status, dq], (cursor) =>
    unwrap(api.GET('/maintenance/vehicles', { params: { query: { cursor, limit: 20, status: status === 'all' ? undefined : status, q: dq.trim() || undefined } } })));
  return (
    <>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}><Input placeholder="Buscar pelo código da moto" icon="Search" value={q} testId="service-search" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} /></div>
        <SegmentedControl label="Situação da revisão" options={[{ value: 'all', label: 'Todas' }, { value: 'overdue', label: 'Vencidas' }, { value: 'due_soon', label: 'Próximas' }, { value: 'ok', label: 'Em dia' }]} value={status} onChange={setStatus} style={{ width: 400 }} />
      </div>
      <ErrorNote error={error} />
      <DataTable<Row> testId="service-table" rowKey="vehicleId" rows={rows} loading={loading} pager={pager} empty="Nenhuma moto nesta situação" emptyIcon="Wrench"
        columns={[
          { key: 'vehicleCode', label: 'Moto', mono: true },
          { key: 'model', label: 'Modelo' },
          { key: 'km', label: 'Km desde revisão', align: 'right', render: (r) => formatKm(r.service.kmSinceService) },
          { key: 'h', label: 'Horas de uso', align: 'right', render: (r) => formatHours(r.service.hoursSinceService) },
          { key: 'next', label: 'Próxima revisão', render: (r) => nextServiceLabel(r.service) },
          { key: 'status', label: 'Situação', render: (r) => <Pill tone={SERVICE_STATUS[r.service.status][1]}>{SERVICE_STATUS[r.service.status][0]}</Pill> },
          { key: 'a', label: '', align: 'right', render: (r) => r.openMaintenanceTaskId
            ? <Pill tone="info" icon="CalendarClock">{r.scheduledFor ? `Agendada ${formatDate(r.scheduledFor)}` : 'Agendada'}</Pill>
            : canSchedule ? <Button size="sm" variant="secondary" style={ghost} testId="schedule-row" onClick={() => setSchedule(r)}>Agendar</Button> : null },
        ]} />
      {schedule && <NewMaintenanceModal initialCode={schedule.vehicleCode} onClose={() => setSchedule(null)} />}
    </>
  );
}

function Agenda() {
  const { groups } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const canUpdate = can(groups, 'maintenance.update');
  const [status, setStatus] = useState<TaskFilter>('open');
  const [onlyCustomer, setOnlyCustomer] = useState(false);
  const [cancel, setCancel] = useState<Task | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const serverStatus = status === 'open' || status === 'all' ? undefined : status;
  const { rows, loading, error, pager } = usePagedQuery<Task>(['maintenance', status], (cursor) =>
    unwrap(api.GET('/maintenance/tasks', { params: { query: { cursor, limit: 20, status: serverStatus } } })));
  const shown = rows.filter((t) => (status !== 'open' || t.status === 'scheduled' || t.status === 'in_progress') && (!onlyCustomer || t.source === 'customer'));
  const patch = async (t: Task, body: S<'MaintenanceTaskUpdate'>, msg: string) => {
    setErr(null);
    try {
      await unwrap(api.PATCH('/maintenance/tasks/{id}', { params: { path: { id: t.id } }, body }));
      toast(msg);
      for (const k of ['maintenance', 'maintenance-vehicles', 'vehicle']) qc.invalidateQueries({ queryKey: [k] });
    } catch (e) { setErr(e); }
  };
  return (
    <>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <SegmentedControl label="Situação da manutenção" options={[{ value: 'open', label: 'Em aberto' }, { value: 'done', label: 'Concluídas' }, { value: 'canceled', label: 'Canceladas' }, { value: 'all', label: 'Todas' }]} value={status} onChange={setStatus} style={{ width: 420 }} />
        <Button size="sm" variant={onlyCustomer ? 'dark' : 'secondary'} icon="Users" testId="only-customer-requests" style={onlyCustomer ? undefined : ghost} onClick={() => setOnlyCustomer((x) => !x)}>Pedidos de clientes</Button>
      </div>
      <ErrorNote error={error ?? err} />
      <DataTable<Task> testId="agenda-table" rows={shown} loading={loading} pager={pager}
        empty={onlyCustomer ? 'Nenhum pedido de cliente nesta página' : 'Nenhuma manutenção nesta lista'} emptyIcon="CalendarClock"
        columns={[
          { key: 'vehicleCode', label: 'Moto', mono: true, render: (r) => r.vehicleCode ?? '—' },
          { key: 'title', label: 'Serviço', render: (r) => <span title={r.description} style={{ whiteSpace: 'normal' }}>{r.title}</span> },
          { key: 'kind', label: 'Tipo', render: (r) => (r.kind === 'preventive' ? 'Preventiva' : 'Corretiva') },
          { key: 'source', label: 'Origem', render: (r) => r.source === 'customer' ? <Pill tone="info" icon="Users">{maintenanceOrigin(r)}</Pill> : maintenanceOrigin(r) },
          { key: 'scheduledFor', label: 'Agendada para', render: (r) => formatDateTime(r.scheduledFor) },
          { key: 'status', label: 'Situação', render: (r) => <Pill tone={MAINTENANCE_STATUS[r.status][1]}>{MAINTENANCE_STATUS[r.status][0]}</Pill> },
          ...(canUpdate ? [{ key: 'a', label: '', align: 'right' as const, render: (r: Task) => (
            <div style={{ display: 'inline-flex', gap: 6 }}>
              {r.status === 'scheduled' && <Button size="sm" variant="ghost" onClick={() => patch(r, { status: 'in_progress' }, 'Manutenção iniciada')}>Iniciar</Button>}
              {(r.status === 'scheduled' || r.status === 'in_progress') && <Button size="sm" variant="secondary" style={ghost} testId="complete-maintenance" onClick={() => patch(r, { status: 'done' }, r.kind === 'preventive' ? 'Revisão registrada' : 'Manutenção concluída')}>Concluir</Button>}
              {(r.status === 'scheduled' || r.status === 'in_progress') && <Button size="sm" variant="ghost" style={{ color: 'var(--danger-ink)' }} onClick={() => setCancel(r)}>Cancelar</Button>}
            </div>
          ) }] : []),
        ]} />
      <ReasonDialog open={!!cancel} title={`Cancelar manutenção de ${cancel?.vehicleCode ?? ''}`} confirmLabel="Cancelar manutenção" danger
        description={cancel?.source === 'customer' ? 'O pedido foi feito pelo cliente do plano. Avise o cliente pelo chat.' : undefined}
        onClose={() => setCancel(null)} onConfirm={async (reason) => {
          await unwrap(api.PATCH('/maintenance/tasks/{id}', { params: { path: { id: cancel!.id } }, body: { status: 'canceled', notes: reason } }));
          toast('Manutenção cancelada');
          for (const k of ['maintenance', 'maintenance-vehicles']) qc.invalidateQueries({ queryKey: [k] });
        }} />
    </>
  );
}

export function NewMaintenanceModal({ onClose, initialCode = '' }: { onClose: () => void; initialCode?: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [code, setCode] = useState(initialCode);
  const [kind, setKind] = useState<S<'MaintenanceKind'>>('preventive');
  const [title, setTitle] = useState('Revisão preventiva');
  const [date, setDate] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const v = await unwrap(api.GET('/vehicles/by-code/{code}', { params: { path: { code: code.trim() } } }));
      await unwrap(api.POST('/maintenance/tasks', { body: { vehicleId: v.id, kind, title: title.trim(), ...(date ? { scheduledFor: new Date(`${date}T09:00:00-03:00`).toISOString() } : {}), createFieldTask: true } }));
      toast('Manutenção agendada');
      for (const k of ['maintenance', 'maintenance-vehicles', 'field-tasks']) qc.invalidateQueries({ queryKey: [k] });
      onClose();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  return (
    <Modal open title="Agendar manutenção" onClose={onClose} testId="maintenance-dialog"
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" testId="maintenance-save" disabled={busy || !code.trim() || title.trim().length < 3} onClick={submit}>Agendar</Button></>}>
      <Field label="Código da moto"><TextInput value={code} onChange={setCode} placeholder="VLT-0001" /></Field>
      <Field label="Tipo"><Select value={kind} onChange={setKind} options={[{ value: 'preventive', label: 'Preventiva' }, { value: 'corrective', label: 'Corretiva' }]} /></Field>
      <Field label="Serviço"><TextInput value={title} onChange={setTitle} /></Field>
      <Field label="Data" hint="Horário padrão: 9h (Brasília). Também cria a tarefa de campo para levar a moto."><TextInput type="date" value={date} onChange={setDate} /></Field>
      <ErrorNote error={err} />
    </Modal>
  );
}
