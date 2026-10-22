'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { draftFromModel, modelInputFromDraft, modelPatchFromDraft, slugify, unlockFeeLabel, validateModelDraft, validatePhoto, type ModelDraft, type VehicleModel } from '@/lib/catalog';
import { uploadModelPhoto } from '@/lib/catalog-upload';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { formatBRL } from '@/lib/format';
import { Button } from '@/ds/Button';
import { Icon } from '@/ds/Icon';
import { Switch } from '@/ds/Switch';
import { DataTable, ErrorNote, Field, Modal, Pill, TextArea, TextInput, useToast } from './ui';

const ghost = { color: 'var(--text-primary)', borderColor: 'var(--border-strong)' };

function Thumb({ url, size = 44 }: { url?: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 10, background: 'var(--surface-sunken)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="Bike" size={size * 0.45} color="var(--text-secondary)" />}
    </span>
  );
}

/**
 * Preços e planos > Modelos (catálogo "Escolha sua moto"): foto, categoria, preço por minuto próprio do modelo
 * e desbloqueio próprio ou herdado do plano por minuto. Edição só para admin (`POST/PATCH /vehicle-models`).
 */
export function ModelsSection({ minuteUnlockCents }: { minuteUnlockCents?: number }) {
  const { groups } = useAuth();
  const canEdit = can(groups, 'catalog.edit');
  const models = useQuery({ queryKey: ['vehicle-models', 'all'], queryFn: () => unwrap(api.GET('/vehicle-models', { params: { query: { includeInactive: true } } })) });
  const [edit, setEdit] = useState<VehicleModel | 'new' | null>(null);
  return (
    <>
      <ErrorNote error={models.error} />
      <DataTable<VehicleModel> testId="models-table" rows={models.data?.items ?? []} loading={models.isLoading} empty="Nenhum modelo no catálogo" emptyIcon="Bike"
        onRowClick={canEdit ? (m) => setEdit(m) : undefined}
        columns={[
          { key: 'name', label: 'Modelo', render: (m) => <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Thumb url={m.photoUrl} /><div><div style={{ fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.categoryLabel}</div></div></div> },
          { key: 'price', label: 'Preço/min', align: 'right', render: (m) => <span style={{ fontFamily: 'var(--font-mono)' }}>{formatBRL(m.pricePerMinuteCents)}</span> },
          { key: 'unlock', label: 'Desbloqueio', align: 'right', render: (m) => { const u = unlockFeeLabel(m, minuteUnlockCents); return <span style={{ fontFamily: 'var(--font-mono)', color: u.inherited ? 'var(--text-secondary)' : undefined }}>{u.text}</span>; } },
          { key: 'service', label: 'Revisão', render: (m) => <span style={{ fontSize: 12 }}>{m.serviceIntervalKm.toLocaleString('pt-BR')} km / {m.serviceIntervalHours} h</span> },
          { key: 'active', label: 'Situação', render: (m) => <Pill tone={m.active ? 'success' : 'neutral'}>{m.active ? 'Ativo' : 'Inativo'}</Pill> },
        ]} />
      {canEdit && <div><Button size="sm" variant="secondary" icon="Plus" style={ghost} testId="new-model" onClick={() => setEdit('new')}>Novo modelo</Button></div>}
      {edit && canEdit && <ModelModal model={edit === 'new' ? undefined : edit} minuteUnlockCents={minuteUnlockCents} onClose={() => setEdit(null)} />}
    </>
  );
}

function ModelModal({ model, minuteUnlockCents, onClose }: { model?: VehicleModel; minuteUnlockCents?: number; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const isNew = !model;
  const [d, setD] = useState<ModelDraft>(() => draftFromModel(model));
  const [preview, setPreview] = useState<string | undefined>(model?.photoUrl);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ModelDraft>(k: K, v: ModelDraft[K]) => setD((x) => ({ ...x, [k]: v }));

  const pick = async (f?: File) => {
    if (!f) return;
    const invalid = validatePhoto(f);
    if (invalid) { setErr(new Error(invalid)); return; }
    setErr(null); setUploading(true);
    try {
      const key = await uploadModelPhoto(f);
      set('photoObjectKey', key);
      setPreview(URL.createObjectURL(f));
    } catch (e) { setErr(e); } finally { setUploading(false); if (file.current) file.current.value = ''; }
  };

  const save = async () => {
    const invalid = validateModelDraft(d, isNew);
    if (invalid) { setErr(new Error(invalid)); return; }
    setBusy(true); setErr(null);
    try {
      if (isNew) await unwrap(api.POST('/vehicle-models', { body: modelInputFromDraft(d) }));
      else {
        const patch = modelPatchFromDraft(model!, d);
        if (Object.keys(patch).length > 0) await unwrap(api.PATCH('/vehicle-models/{id}', { params: { path: { id: model!.id } }, body: patch }));
      }
      toast(isNew ? 'Modelo cadastrado' : 'Modelo salvo · log de auditoria atualizado');
      qc.invalidateQueries({ queryKey: ['vehicle-models'] });
      onClose();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  return (
    <Modal open width={560} title={isNew ? 'Novo modelo' : `Editar ${model!.name}`} onClose={onClose} testId="model-dialog"
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" testId="model-save" disabled={busy || uploading} onClick={save}>{busy ? 'Salvando...' : 'Salvar'}</Button></>}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Thumb url={preview} size={72} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input ref={file} type="file" accept="image/jpeg,image/png" data-testid="model-photo-input" style={{ display: 'none' }} onChange={(e) => pick(e.target.files?.[0])} />
          <Button size="sm" variant="secondary" icon="Upload" style={ghost} disabled={uploading} onClick={() => file.current?.click()}>{uploading ? 'Enviando foto...' : preview ? 'Trocar foto' : 'Enviar foto'}</Button>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }} data-testid="model-photo-state">{d.photoObjectKey && d.photoObjectKey !== model?.photoObjectKey ? 'Foto nova enviada; salve para aplicar.' : 'JPG ou PNG, até 5 MB.'}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Nome"><TextInput testId="model-name" value={d.name} onChange={(v) => setD((x) => ({ ...x, name: v, ...(isNew && (x.slug === '' || x.slug === slugify(x.name)) ? { slug: slugify(v) } : {}) }))} /></Field>
        <Field label="Identificador" hint={isNew ? 'Letras minúsculas, números e hífen.' : 'Não pode ser alterado.'}>
          <TextInput testId="model-slug" value={d.slug} readOnly={!isNew} onChange={isNew ? (v) => set('slug', v) : undefined} />
        </Field>
        <Field label="Categoria"><TextInput testId="model-category" value={d.categoryLabel} onChange={(v) => set('categoryLabel', v)} placeholder="Urbana" /></Field>
        <Field label="Ordem no app"><TextInput type="number" value={d.sortOrder} onChange={(v) => set('sortOrder', v)} /></Field>
      </div>
      <Field label="Descrição"><TextArea value={d.description} onChange={(v) => set('description', v)} rows={2} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Preço por minuto (R$)" hint="Vale no plano por minuto para motos deste modelo."><TextInput testId="model-price" value={d.price} onChange={(v) => set('price', v)} /></Field>
        <Field label="Desbloqueio (R$)" hint={d.inheritUnlock ? `Usa o do plano por minuto${minuteUnlockCents !== undefined ? ` (${formatBRL(minuteUnlockCents)})` : ''}.` : 'Valor próprio do modelo.'}>
          {d.inheritUnlock ? <TextInput testId="model-unlock-inherited" readOnly value={minuteUnlockCents !== undefined ? formatBRL(minuteUnlockCents) : 'Do plano'} /> : <TextInput testId="model-unlock" value={d.unlock} onChange={(v) => set('unlock', v)} placeholder="3,00" />}
        </Field>
      </div>
      <Switch label="Usar o desbloqueio do plano" checked={d.inheritUnlock} onChange={(v: boolean) => setD((x) => ({ ...x, inheritUnlock: v, unlock: v ? x.unlock : x.unlock || (minuteUnlockCents !== undefined ? (minuteUnlockCents / 100).toFixed(2).replace('.', ',') : '') }))} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Revisão a cada (km)"><TextInput type="number" value={d.intervalKm} onChange={(v) => set('intervalKm', v)} /></Field>
        <Field label="Revisão a cada (horas)"><TextInput type="number" value={d.intervalHours} onChange={(v) => set('intervalHours', v)} /></Field>
      </div>
      <Switch label="Ativo no catálogo" checked={d.active} onChange={(v: boolean) => set('active', v)} />
      <ErrorNote error={err} />
    </Modal>
  );
}
