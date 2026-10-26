'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { GROUP_LABEL } from '@/lib/labels';
import { dayEndIso, dayStartIso, formatDateTime, timeAgo } from '@/lib/format';
import type { S, StaffGroup } from '@/lib/types';
import { DataTable, ErrorNote, Field, Modal, Page, PageHeader, Pill, TabPanel, TextInput, usePagedQuery, useToast } from '@/components/ui';
import { Badge } from '@/ds/Badge';
import { Button } from '@/ds/Button';
import { SegmentedControl } from '@/ds/SegmentedControl';
import { Switch } from '@/ds/Switch';

const GROUPS: StaffGroup[] = ['admin', 'operacao', 'financeiro', 'suporte', 'campo'];
const TONE: Record<StaffGroup, 'dark' | 'success' | 'info' | 'warning' | 'neutral'> = { admin: 'dark', operacao: 'success', financeiro: 'info', suporte: 'warning', campo: 'neutral' };
const ROLE_CARDS: [StaffGroup, string][] = [
  ['admin', 'Tudo, incluindo acessos e auditoria'],
  ['operacao', 'Frota, cercas, alertas, tarefas'],
  ['financeiro', 'Receita, preços, estornos'],
  ['suporte', 'Clientes, chat, sinistros'],
];

export default function TeamPage() {
  const [tab, setTab] = useState<'team' | 'audit'>('team');
  return (
    <Page>
      <PageHeader subtitle="Cada perfil vê só o que precisa · 2FA obrigatório">
        <SegmentedControl options={[{ value: 'team', label: 'Equipe' }, { value: 'audit', label: 'Auditoria' }]} value={tab} onChange={setTab} style={{ width: 260 }} />
      </PageHeader>
      <TabPanel k={tab}>{tab === 'team' ? <Team /> : <Audit />}</TabPanel>
    </Page>
  );
}

function Team() {
  const qc = useQueryClient();
  const toast = useToast();
  const [invite, setInvite] = useState(false);
  const [edit, setEdit] = useState<S<'StaffUser'> | null>(null);
  const { rows, loading, error, pager } = usePagedQuery<S<'StaffUser'>>(['staff'], (cursor) => unwrap(api.GET('/staff', { params: { query: { cursor, limit: 15 } } })));
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button size="sm" icon="UserPlus" testId="invite-staff" onClick={() => setInvite(true)}>Convidar</Button></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {ROLE_CARDS.map(([g, d]) => (
          <div key={g} style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', padding: 16, boxShadow: 'var(--shadow-1)' }}>
            <Badge size="sm" tone={TONE[g]}>{GROUP_LABEL[g]}</Badge>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10 }}>{d}</div>
          </div>
        ))}
      </div>
      <ErrorNote error={error} />
      <DataTable<S<'StaffUser'>> rows={rows} loading={loading} pager={pager} onRowClick={setEdit} empty="Nenhuma pessoa na equipe" emptyIcon="Users"
        columns={[
          { key: 'name', label: 'Pessoa', render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
          { key: 'email', label: 'E-mail' },
          { key: 'groups', label: 'Perfil', render: (r) => <span style={{ display: 'inline-flex', gap: 4 }}>{r.groups.map((g) => <Badge key={g} size="sm" tone={TONE[g]}>{GROUP_LABEL[g]}</Badge>)}</span> },
          { key: 'mfa', label: '2FA', render: (r) => (r.mfaEnabled === false ? <Badge size="sm" tone="warning">Pendente</Badge> : <Badge size="sm" tone="success" icon="ShieldCheck">Ativo</Badge>) },
          { key: 'active', label: 'Conta', render: (r) => <Pill tone={r.active ? 'success' : 'neutral'}>{r.active ? 'Ativa' : 'Inativa'}</Pill> },
          { key: 'lastLoginAt', label: 'Último acesso', align: 'right', render: (r) => (r.lastLoginAt ? timeAgo(r.lastLoginAt) : 'nunca') },
        ]} />
      {invite && <StaffModal onClose={() => setInvite(false)} onSaved={() => { toast('Convite enviado'); qc.invalidateQueries({ queryKey: ['staff'] }); }} />}
      {edit && <StaffModal user={edit} onClose={() => setEdit(null)} onSaved={() => { toast('Acesso atualizado'); qc.invalidateQueries({ queryKey: ['staff'] }); }} />}
    </>
  );
}

function StaffModal({ user, onClose, onSaved }: { user?: S<'StaffUser'>; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [groups, setGroups] = useState<StaffGroup[]>(user?.groups ?? ['operacao']);
  const [active, setActive] = useState(user?.active ?? true);
  const [err, setErr] = useState<unknown>(null);
  const toggle = (g: StaffGroup) => setGroups((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  const submit = async () => {
    try {
      if (groups.length === 0) throw new Error('Escolha ao menos um perfil');
      if (user) await unwrap(api.PATCH('/staff/{id}', { params: { path: { id: user.id } }, body: { name: name.trim(), groups, active } }));
      else await unwrap(api.POST('/staff', { body: { name: name.trim(), email: email.trim(), groups } }));
      onSaved(); onClose();
    } catch (e) { setErr(e); }
  };
  return (
    <Modal open title={user ? 'Editar acesso' : 'Convidar pessoa'} onClose={onClose}
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" disabled={!name.trim() || !email.trim()} onClick={submit}>{user ? 'Salvar' : 'Enviar convite'}</Button></>}>
      <Field label="Nome"><TextInput value={name} onChange={setName} /></Field>
      <Field label="E-mail"><TextInput type="email" value={email} onChange={setEmail} /></Field>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Perfis</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {GROUPS.map((g) => (
            <label key={g} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={groups.includes(g)} onChange={() => toggle(g)} /> {GROUP_LABEL[g]}
            </label>
          ))}
        </div>
      </div>
      {user && <Switch label="Conta ativa" checked={active} onChange={setActive} />}
      <ErrorNote error={err} />
    </Modal>
  );
}

function Audit() {
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { rows, loading, error, pager } = usePagedQuery<S<'AuditLog'>>(['audit', action, entity, from, to], (cursor) =>
    unwrap(api.GET('/audit-logs', { params: { query: { cursor, limit: 20, action: action || undefined, entityType: entity || undefined, from: from ? dayStartIso(from) : undefined, to: to ? dayEndIso(to) : undefined } } })),
  );
  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 200 }}><Field label="Ação"><TextInput value={action} onChange={setAction} placeholder="Ex.: vehicle.command" /></Field></div>
        <div style={{ width: 200 }}><Field label="Entidade"><TextInput value={entity} onChange={setEntity} placeholder="Ex.: vehicle" /></Field></div>
        <div style={{ width: 170 }}><Field label="De"><TextInput type="date" value={from} onChange={setFrom} /></Field></div>
        <div style={{ width: 170 }}><Field label="Até"><TextInput type="date" value={to} onChange={setTo} /></Field></div>
      </div>
      <ErrorNote error={error} />
      <DataTable<S<'AuditLog'>> testId="audit-table" sticky rows={rows} loading={loading} pager={pager} empty="Nenhum registro com esses filtros" emptyIcon="ScrollText"
        columns={[
          { key: 'createdAt', label: 'Quando', render: (r) => formatDateTime(r.createdAt) },
          { key: 'actorName', label: 'Quem', render: (r) => r.actorName ?? (r.actorType === 'system' ? 'Sistema' : '—') },
          { key: 'action', label: 'Ação', mono: true },
          { key: 'entityType', label: 'Entidade', render: (r) => `${r.entityType} · ${r.entityId.slice(0, 8)}` },
          { key: 'reason', label: 'Motivo', render: (r) => <span style={{ whiteSpace: 'normal' }}>{r.reason ?? '—'}</span> },
        ]} />
    </>
  );
}
