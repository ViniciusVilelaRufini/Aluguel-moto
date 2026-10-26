'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { TASK_PRIORITY, TASK_TYPE } from '@/lib/labels';
import { formatDate } from '@/lib/format';
import type { S } from '@/lib/types';
import { Empty, ErrorNote, Field, Modal, Page, PageHeader, Select, Skeleton, TabPanel, TextArea, TextInput, useToast } from '@/components/ui';
import { MaintenancePanel, NewMaintenanceModal } from '@/components/MaintenancePanel';
import { BatteriesPanel } from '@/components/BatteriesPanel';
import { shortAddress } from '@/lib/fleet-search';
import { Badge } from '@/ds/Badge';
import { Button } from '@/ds/Button';
import { Card } from '@/ds/Card';
import { Icon } from '@/ds/Icon';
import { SegmentedControl } from '@/ds/SegmentedControl';

type Task = S<'FieldTask'>;
const COLUMNS: { key: string; label: string; statuses: S<'FieldTaskStatus'>[] }[] = [
  { key: 'pending', label: 'Pendente', statuses: ['open', 'assigned'] },
  { key: 'doing', label: 'Em andamento', statuses: ['in_progress'] },
  { key: 'done', label: 'Concluída', statuses: ['done'] },
];

export default function TasksPage() {
  const { groups } = useAuth();
  const [view, setView] = useState<'tasks' | 'maintenance' | 'batteries'>('tasks');
  const [newTask, setNewTask] = useState(false);
  const [newMaint, setNewMaint] = useState(false);
  const canCreate = can(groups, 'task.create');
  return (
    <Page>
      <PageHeader subtitle="Tarefas da equipe de campo e manutenção preventiva">
        <SegmentedControl options={[{ value: 'tasks', label: 'Tarefas' }, { value: 'maintenance', label: 'Manutenção' }, { value: 'batteries', label: 'Baterias' }]} value={view} onChange={setView} style={{ width: 380 }} />
        {canCreate && view === 'tasks' && <Button size="sm" icon="Plus" testId="new-task" onClick={() => setNewTask(true)}>Nova tarefa</Button>}
        {can(groups, 'maintenance.schedule') && view === 'maintenance' && <Button size="sm" icon="Plus" onClick={() => setNewMaint(true)}>Agendar manutenção</Button>}
      </PageHeader>
      <TabPanel k={view}>
        {view === 'tasks' && <Kanban canEdit={canCreate} onCreate={() => setNewTask(true)} />}
        {view === 'maintenance' && <MaintenancePanel />}
        {view === 'batteries' && <BatteriesPanel />}
      </TabPanel>
      {newTask && <NewTaskModal onClose={() => setNewTask(false)} />}
      {newMaint && <NewMaintenanceModal onClose={() => setNewMaint(false)} />}
    </Page>
  );
}

function useFieldStaff() {
  return useQuery({ queryKey: ['staff', 'campo'], queryFn: () => unwrap(api.GET('/staff', { params: { query: { group: 'campo', active: true, limit: 100 } } })) });
}

function Kanban({ canEdit, onCreate }: { canEdit: boolean; onCreate: () => void }) {
  const q = useQuery({ queryKey: ['field-tasks'], queryFn: () => unwrap(api.GET('/field-tasks', { params: { query: { limit: 100 } } })), refetchInterval: 20_000 });
  const [assign, setAssign] = useState<Task | null>(null);
  const items = q.data?.items ?? [];
  return (
    <>
      <ErrorNote error={q.error} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, alignItems: 'start' }}>
        {COLUMNS.map((c) => {
          const col = items.filter((t) => c.statuses.includes(t.status));
          return (
            <div key={c.key} style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-lg)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{c.label}</span>
                <span style={{ font: '700 12px/1 var(--font-mono)', color: 'var(--text-secondary)' }}>{col.length}</span>
              </div>
              {col.map((t) => (
                <Card key={t.id} padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'vt-fade-up 320ms var(--ease-out) backwards' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={TASK_TYPE[t.type][1]} size={16} /></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{TASK_TYPE[t.type][0]}</div>
                      <div style={{ font: '500 12px/1.3 var(--font-mono)', color: 'var(--text-secondary)' }}>{t.vehicleCode}</div>
                    </div>
                  </div>
                  {(t.vehicleAddress || t.targetAddress) && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <Icon name="MapPin" size={13} style={{ marginTop: 2 }} />
                      <span>{shortAddress(t.vehicleAddress)}{t.targetAddress ? ` → ${shortAddress(t.targetAddress)}` : ''}</span>
                    </div>
                  )}
                  {t.type === 'battery_swap' && t.vehicleBatterySerial && (
                    <div style={{ font: '500 12px/1.3 var(--font-mono)', color: 'var(--text-secondary)' }}>
                      Retirada: {t.vehicleBatterySerial}{t.vehicleBatteryPct !== undefined ? ` · ${t.vehicleBatteryPct}%` : ''}{t.vehicleBatteryCycleCount !== undefined ? ` · ${t.vehicleBatteryCycleCount} ciclos` : ''}
                    </div>
                  )}
                  {t.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.notes}</div>}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Badge size="sm" tone={TASK_PRIORITY[t.priority][1]}>{TASK_PRIORITY[t.priority][0]}</Badge>
                    {t.dueAt && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>até {formatDate(t.dueAt)}</span>}
                    <span style={{ flex: 1 }} />
                    {t.assigneeName ? <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.assigneeName}</span>
                      : canEdit && c.key === 'pending' && <Button size="sm" variant="ghost" icon="UserPlus" style={{ height: 28, padding: '0 8px' }} onClick={() => setAssign(t)}>Atribuir</Button>}
                  </div>
                </Card>
              ))}
              {q.isLoading && [0, 1].map((i) => <Skeleton key={i} h={96} r={20} />)}
              {!q.isLoading && col.length === 0 && (
                <Empty compact icon={c.key === 'done' ? 'CircleCheck' : 'ClipboardList'}
                  action={c.key === 'pending' && canEdit ? <Button size="sm" variant="ghost" icon="Plus" onClick={onCreate}>Nova tarefa</Button> : undefined}>
                  {c.key === 'pending' ? 'Nenhuma tarefa pendente' : c.key === 'doing' ? 'Nada em andamento' : 'Nenhuma tarefa concluída'}
                </Empty>
              )}
            </div>
          );
        })}
      </div>
      {assign && <AssignModal task={assign} onClose={() => setAssign(null)} />}
    </>
  );
}

function AssignModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const staff = useFieldStaff();
  const [who, setWho] = useState('');
  const save = useMutation({
    mutationFn: () => unwrap(api.PATCH('/field-tasks/{id}', { params: { path: { id: task.id } }, body: { assigneeId: who } })),
    onSuccess: () => { toast('Tarefa atribuída'); qc.invalidateQueries({ queryKey: ['field-tasks'] }); onClose(); },
  });
  const options = [{ value: '', label: 'Selecione a pessoa' }, ...(staff.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }))];
  return (
    <Modal open title={`Atribuir tarefa de ${task.vehicleCode}`} onClose={onClose}
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" disabled={!who || save.isPending} onClick={() => save.mutate()}>Atribuir</Button></>}>
      <Field label="Operador de campo"><Select value={who} onChange={setWho} options={options} /></Field>
      <ErrorNote error={save.error} />
    </Modal>
  );
}

function NewTaskModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const staff = useFieldStaff();
  const [type, setType] = useState<S<'FieldTaskType'>>('battery_swap');
  const [code, setCode] = useState('');
  const [priority, setPriority] = useState<S<'TaskPriority'>>('medium');
  const [who, setWho] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const v = await unwrap(api.GET('/vehicles/by-code/{code}', { params: { path: { code: code.trim() } } }));
      await unwrap(api.POST('/field-tasks', { body: { type, vehicleId: v.id, priority, ...(who ? { assigneeId: who } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}) } }));
      toast('Tarefa criada'); qc.invalidateQueries({ queryKey: ['field-tasks'] }); onClose();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  return (
    <Modal open title="Nova tarefa" onClose={onClose} testId="new-task-dialog"
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" disabled={busy || !code.trim()} onClick={submit}>Criar tarefa</Button></>}>
      <Field label="Tipo"><Select value={type} onChange={setType} options={(Object.keys(TASK_TYPE) as S<'FieldTaskType'>[]).map((v) => ({ value: v, label: TASK_TYPE[v][0] }))} /></Field>
      <Field label="Código da moto"><TextInput value={code} onChange={setCode} placeholder="VLT-0001" /></Field>
      <Field label="Prioridade"><Select value={priority} onChange={setPriority} options={(Object.keys(TASK_PRIORITY) as S<'TaskPriority'>[]).map((v) => ({ value: v, label: TASK_PRIORITY[v][0] }))} /></Field>
      <Field label="Atribuir a (opcional)"><Select value={who} onChange={setWho} options={[{ value: '', label: 'Sem atribuição' }, ...(staff.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }))]} /></Field>
      <Field label="Observações"><TextArea value={notes} onChange={setNotes} /></Field>
      <ErrorNote error={err} />
    </Modal>
  );
}
