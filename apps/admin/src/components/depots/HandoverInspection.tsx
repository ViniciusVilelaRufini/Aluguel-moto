'use client';

import { useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { MAX_HANDOVER_PHOTOS, uploadHandoverPhoto, type ChecklistItem, type ChecklistState } from '@/lib/pickup-handover';
import { Field, TextInput } from '@/components/ui';
import { Button } from '@/ds/Button';

/**
 * Partes da vistoria comuns à saída ("Entregar moto") e à chegada ("Receber no galpão"): checklist OK/Problema com
 * nota, fotos (`POST /handovers/uploads` + envio direto ao bucket) e bateria. `prefix` monta os `data-testid`
 * (`<prefix>-check-<código>-ok`, `<prefix>-photos`, `<prefix>-battery`...).
 */

/** Como `Field`, mas sem `<label>` em volta: aqui há vários botões (um clique no rótulo acionaria o primeiro). */
export function InspectionSection({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ font: 'var(--type-label)', fontWeight: 600 }}>{label}</span>
      {children}
      {(error || hint) && (
        <span role={error ? 'alert' : undefined} style={{ fontSize: 12, color: error ? 'var(--danger-ink)' : 'var(--text-secondary)' }}>{error || hint}</span>
      )}
    </div>
  );
}

export function ChecklistFields({ prefix, label, items, value, onChange }: {
  prefix: string; label: string; items: ChecklistItem[]; value: ChecklistState; onChange: Dispatch<SetStateAction<ChecklistState>>;
}) {
  const answer = (code: string, ok: boolean) => onChange((c) => ({ ...c, [code]: { ...c[code]!, ok } }));
  const note = (code: string, v: string) => onChange((c) => ({ ...c, [code]: { ...c[code]!, note: v.slice(0, 500) } }));
  return (
    <InspectionSection label={label}>
      <div data-testid={`${prefix}-checklist`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => {
          const a = value[item.code]!;
          return (
            <div key={item.code} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
                <Button size="sm" variant={a.ok === true ? 'dark' : 'secondary'} testId={`${prefix}-check-${item.code}-ok`} onClick={() => answer(item.code, true)}>OK</Button>
                <Button size="sm" variant={a.ok === false ? 'dark' : 'secondary'} testId={`${prefix}-check-${item.code}-issue`} onClick={() => answer(item.code, false)}>Problema</Button>
              </div>
              {a.ok === false && <TextInput testId={`${prefix}-check-${item.code}-note`} value={a.note} onChange={(v) => note(item.code, v)} placeholder="O que foi visto (opcional)" />}
            </div>
          );
        })}
      </div>
    </InspectionSection>
  );
}

export type HandoverPhoto = { key: string; name: string };

/** Fotos da vistoria: envia uma a uma e guarda as `objectKey`; o erro vai para `onError` (o alerta do diálogo). */
export function useHandoverPhotos(onError: (message: string | null) => void) {
  const [photos, setPhotos] = useState<HandoverPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const add = async (files: FileList | null) => {
    const list = Array.from(files ?? []).slice(0, MAX_HANDOVER_PHOTOS - photos.length);
    if (list.length === 0) return;
    setUploading(true); onError(null);
    try {
      for (const f of list) {
        const key = await uploadHandoverPhoto(f);
        setPhotos((xs) => [...xs, { key, name: f.name }]);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Falha ao enviar a foto');
    } finally {
      setUploading(false);
    }
  };
  const remove = (i: number) => setPhotos((xs) => xs.filter((_, j) => j !== i));
  return { photos, uploading, add, remove };
}

export function PhotoFields({ prefix, state }: { prefix: string; state: ReturnType<typeof useHandoverPhotos> }) {
  const file = useRef<HTMLInputElement>(null);
  const { photos, uploading } = state;
  return (
    <InspectionSection label="Fotos da moto" hint={`JPG ou PNG, até 10 MB cada; de 1 a ${MAX_HANDOVER_PHOTOS} fotos (frente, trás e lados).`}>
      <div data-testid={`${prefix}-photos`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input ref={file} type="file" multiple accept="image/jpeg,image/png" data-testid={`${prefix}-photo-input`} style={{ display: 'none' }}
          onChange={async (e) => { await state.add(e.target.files); if (file.current) file.current.value = ''; }} />
        {photos.map((p, i) => (
          <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
            <Button size="sm" variant="ghost" icon="X" title="Remover foto" onClick={() => state.remove(i)} />
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button size="sm" variant="secondary" icon="Camera" disabled={uploading || photos.length >= MAX_HANDOVER_PHOTOS} onClick={() => file.current?.click()}>
            {uploading ? 'Enviando foto...' : 'Adicionar fotos'}
          </Button>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{photos.length} de {MAX_HANDOVER_PHOTOS}</span>
        </div>
      </div>
    </InspectionSection>
  );
}

/** Bateria (%) e nº de série opcional. `known: false` (moto sem leitura) pede a leitura do painel da moto. */
export function BatteryFields({ prefix, known, battery, onBattery, serial, onSerial }: {
  prefix: string; known: boolean; battery: string; onBattery: (v: string) => void; serial: string; onSerial: (v: string) => void;
}) {
  return (
    <div className="form-2col">
      <Field label="Bateria (%)" hint={known ? 'Leitura da moto; confira no painel dela.' : 'A moto está sem leitura de bateria: informe a do painel.'}>
        <TextInput testId={`${prefix}-battery`} type="number" min={0} max={100} value={battery} onChange={onBattery} />
      </Field>
      <Field label="Nº de série da bateria (opcional)">
        <TextInput testId={`${prefix}-battery-serial`} value={serial} onChange={(v) => onSerial(v.slice(0, 64))} />
      </Field>
    </div>
  );
}
