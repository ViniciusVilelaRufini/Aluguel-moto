'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { can } from '@/lib/permissions';
import type { S, StaffGroup } from '@/lib/types';
import { Button } from '@/ds/Button';
import { Field, KV, Modal, Pill, SectionTitle, Select, TextArea, TextInput, ErrorNote } from '../ui';

const STATUS_LABEL: Record<S<'SimCardStatus'>, string> = { active: 'Ativo', suspended: 'Suspenso', cancelled: 'Cancelado' };
const STATUS_TONE: Record<S<'SimCardStatus'>, 'success' | 'warning' | 'danger'> = { active: 'success', suspended: 'warning', cancelled: 'danger' };
const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as S<'SimCardStatus'>[]).map((value) => ({ value, label: STATUS_LABEL[value] }));

/** Formato do ICCID e da linha (mesmas regras do contrato), compartilhado com o assistente de rastreador. */
export const SIM_ICCID_RE = /^[0-9]{18,22}$/;
export const SIM_MSISDN_RE = /^\+?[0-9]{10,15}$/;

/** Limite de `notes` no contrato (`SimCard.notes`, maxLength 500). */
export const SIM_NOTES_MAX = 500;

/** Corpo de criação/edição. `notes: null` = campo não tocado (não vai no corpo); string = trim, vazio vira `null`. */
export function simCardBody(f: { iccid: string; carrier: string; msisdn: string; apn: string; status: S<'SimCardStatus'>; notes: string | null }) {
  const body = { iccid: f.iccid, carrier: f.carrier.trim(), msisdn: f.msisdn || null, apn: f.apn.trim() || null, status: f.status };
  return f.notes === null ? body : { ...body, notes: f.notes.trim() || null };
}

/**
 * Chip (SIM) do rastreador da moto. Qualquer perfil com acesso à ficha vê; só o admin vincula, edita e desvincula.
 * `embedded`: dentro do bloco "Rastreador e chip" da ficha (sem título próprio, chip resumido numa linha) — o chip aparece num
 * lugar só, com as mesmas ações.
 */
export function SimCardSection({ vehicleId, simCard, groups, embedded = false }: { vehicleId: string; simCard: S<'SimCardSummary'> | null | undefined; groups: StaffGroup[]; embedded?: boolean }) {
  const canEdit = can(groups, 'simCard.manage');
  const [linking, setLinking] = useState(false);
  const [editing, setEditing] = useState(false);
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
    qc.invalidateQueries({ queryKey: ['sim-cards'] });
    qc.invalidateQueries({ queryKey: ['trackers'] });
  };
  const unlink = useMutation({
    mutationFn: async () => unwrap(api.PATCH('/sim-cards/{id}', { params: { path: { id: simCard!.id } }, body: { vehicleId: null } })),
    onSuccess: refresh,
  });

  return (
    <div data-testid={embedded ? 'tracker-chip' : 'sim-card-section'}>
      {!embedded && <SectionTitle>Chip</SectionTitle>}
      {simCard ? (
        <>
          {embedded ? (
            <>
              <KV k="Chip" v={`${simCard.carrier} · ${simCard.iccid}`} mono />
              {simCard.msisdn && <KV k="Linha" v={simCard.msisdn} mono />}
              <KV k="APN esperado" v={simCard.apn ?? '—'} mono />
              <KV k="Situação do chip" v={<Pill tone={STATUS_TONE[simCard.status]}>{STATUS_LABEL[simCard.status]}</Pill>} />
            </>
          ) : (
            <>
              <KV k="ICCID" v={simCard.iccid} mono />
              <KV k="Linha" v={simCard.msisdn ?? '—'} mono />
              <KV k="Operadora" v={simCard.carrier} />
              <KV k="APN esperado" v={simCard.apn ?? '—'} mono />
              <KV k="Situação" v={<Pill tone={STATUS_TONE[simCard.status]}>{STATUS_LABEL[simCard.status]}</Pill>} />
            </>
          )}
          {canEdit && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <Button size="sm" variant="secondary" icon="Pencil" testId="sim-edit" onClick={() => setEditing(true)}>Editar chip</Button>
              <Button size="sm" variant="ghost" icon="Unlink" testId="sim-unlink" busy={unlink.isPending} disabled={unlink.isPending} onClick={() => unlink.mutate()}>Desvincular</Button>
            </div>
          )}
          {unlink.error && <ErrorNote error={unlink.error} />}
        </>
      ) : (
        <>
          {embedded ? <KV k="Chip" v="Sem chip" /> : <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Nenhum chip vinculado</div>}
          {canEdit && <Button size="sm" variant="secondary" icon="Link" testId="sim-link" style={{ marginTop: 8 }} onClick={() => setLinking(true)}>Vincular chip</Button>}
        </>
      )}
      {canEdit && linking && <LinkSimModal vehicleId={vehicleId} onClose={() => setLinking(false)} onDone={refresh} />}
      {canEdit && editing && simCard && <SimFormModal title="Editar chip" initial={simCard} simId={simCard.id} onClose={() => setEditing(false)} onDone={refresh} />}
    </div>
  );
}

function LinkSimModal({ vehicleId, onClose, onDone }: { vehicleId: string; onClose: () => void; onDone: () => void }) {
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const list = useQuery({
    queryKey: ['sim-cards', 'unlinked', q],
    queryFn: () => unwrap(api.GET('/sim-cards', { params: { query: { unlinked: true, ...(q.trim() ? { q: q.trim() } : {}) } } })),
  });
  const link = useMutation({
    mutationFn: async (id: string) => unwrap(api.PATCH('/sim-cards/{id}', { params: { path: { id } }, body: { vehicleId } })),
    onSuccess: () => { onDone(); onClose(); },
  });
  if (creating) return <SimFormModal title="Cadastrar chip" vehicleId={vehicleId} onClose={onClose} onDone={onDone} />;
  const items = list.data?.items ?? [];
  return (
    <Modal open title="Vincular chip" onClose={onClose} testId="sim-link-modal" actions={<>
      <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
      <Button size="sm" variant="secondary" icon="Plus" testId="sim-create-new" onClick={() => setCreating(true)}>Cadastrar novo</Button>
    </>}>
      <Field label="Buscar por ICCID ou linha"><TextInput value={q} onChange={setQ} placeholder="Ex.: 8955… ou +5511…" testId="sim-search" /></Field>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflow: 'auto' }}>
        {items.length === 0 && !list.isLoading && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nenhum chip livre encontrado.</div>}
        {items.map((s) => (
          <button key={s.id} type="button" data-testid="sim-option" disabled={link.isPending} onClick={() => link.mutate(s.id)}
            style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--surface-card)', cursor: 'pointer' }}>
            <div style={{ font: '600 13px/1.3 var(--font-mono)' }}>{s.iccid}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.carrier}{s.msisdn ? ` · ${s.msisdn}` : ''}</div>
          </button>
        ))}
      </div>
      {link.error && <ErrorNote error={link.error} />}
    </Modal>
  );
}

export function SimFormModal({ title, initial, simId, vehicleId, onClose, onDone }: {
  title: string; initial?: S<'SimCardSummary'>; simId?: string; vehicleId?: string; onClose: () => void; onDone: () => void;
}) {
  const [iccid, setIccid] = useState(initial?.iccid ?? '');
  const [msisdn, setMsisdn] = useState(initial?.msisdn ?? '');
  const [carrier, setCarrier] = useState(initial?.carrier ?? '');
  const [apn, setApn] = useState(initial?.apn ?? '');
  const [status, setStatus] = useState<S<'SimCardStatus'>>(initial?.status ?? 'active');
  // `null` = não tocado. Na edição, o resumo do chip não traz `notes`: vem da lista de chips (busca pelo ICCID).
  const [notes, setNotes] = useState<string | null>(simId ? null : '');
  const full = useQuery({
    queryKey: ['sim-cards', 'by-iccid', initial?.iccid],
    enabled: !!simId && !!initial?.iccid,
    queryFn: () => unwrap(api.GET('/sim-cards', { params: { query: { q: initial!.iccid } } })),
  });
  const savedNotes = simId ? (full.data?.items.find((s) => s.id === simId)?.notes ?? '') : '';
  const notesValue = notes ?? savedNotes;
  const [touched, setTouched] = useState(false);
  const iccidOk = SIM_ICCID_RE.test(iccid);
  const msisdnOk = msisdn === '' || SIM_MSISDN_RE.test(msisdn);
  const carrierOk = carrier.trim().length >= 1 && carrier.trim().length <= 40;
  const notesOk = notesValue.trim().length <= SIM_NOTES_MAX;
  const valid = iccidOk && msisdnOk && carrierOk && notesOk;
  const save = useMutation({
    mutationFn: async () => {
      const fields = simCardBody({ iccid, carrier, msisdn, apn, status, notes });
      if (simId) return unwrap(api.PATCH('/sim-cards/{id}', { params: { path: { id: simId } }, body: fields }));
      return unwrap(api.POST('/sim-cards', { body: { ...fields, ...(vehicleId ? { vehicleId } : {}) } }));
    },
    onSuccess: () => { onDone(); onClose(); },
  });
  return (
    <Modal open title={title} onClose={onClose} testId="sim-form-modal" actions={<>
      <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
      <Button size="sm" testId="sim-save" busy={save.isPending} disabled={save.isPending} onClick={() => { setTouched(true); if (valid) save.mutate(); }}>Salvar</Button>
    </>}>
      <Field label="ICCID" error={touched && !iccidOk ? 'Informe 18 a 22 dígitos' : undefined}><TextInput value={iccid} onChange={setIccid} testId="sim-iccid" /></Field>
      <Field label="Linha" error={touched && !msisdnOk ? 'Informe de 10 a 15 dígitos, com + opcional' : undefined}><TextInput value={msisdn} onChange={setMsisdn} placeholder="+5511999990000" testId="sim-msisdn" /></Field>
      <Field label="Operadora" error={touched && !carrierOk ? 'Informe a operadora (até 40 caracteres)' : undefined}><TextInput value={carrier} onChange={setCarrier} testId="sim-carrier" /></Field>
      <Field label="APN esperado"><TextInput value={apn} onChange={setApn} placeholder="indica.algar.br" testId="sim-apn" /></Field>
      <Field label="Situação"><Select value={status} onChange={setStatus} options={STATUS_OPTIONS} testId="sim-status" /></Field>
      <Field label="Observações" error={!notesOk ? `Até ${SIM_NOTES_MAX} caracteres` : undefined}><TextArea value={notesValue} onChange={setNotes} testId="sim-notes" /></Field>
      {save.error && <ErrorNote error={save.error} />}
    </Modal>
  );
}
