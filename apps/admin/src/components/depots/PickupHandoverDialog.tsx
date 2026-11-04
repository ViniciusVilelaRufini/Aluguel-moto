'use client';

import { useState, type KeyboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { firstName } from '@/lib/pickups';
import { useSubmitGuard } from '@/lib/submit-guard';
import {
  NO_CODE_REASON_MAX, NO_CODE_REASON_MIN, PICKUP_CHECKLIST, buildPickupBody, cameraScanSupported, checkPickupCode,
  emptyChecklist, initialBattery, missingForPickup, pickupErrorMessage, type ChecklistState, type Identification,
} from '@/lib/pickup-handover';
import type { S } from '@/lib/types';
import { Field, Modal, TextArea, fieldBox, useToast } from '@/components/ui';
import { Alert } from '@/ds/Alert';
import { Button } from '@/ds/Button';
import { SegmentedControl } from '@/ds/SegmentedControl';
import { QrCameraScanner } from './QrCameraScanner';
import { BatteryFields, ChecklistFields, InspectionSection as Section, PhotoFields, useHandoverPhotos } from './HandoverInspection';

type Mode = 'code' | 'noCode';

/**
 * "Entregar moto" de uma reserva aguardando (`active`): o atendente lê o QR do cliente pela câmera do computador
 * (`BarcodeDetector`, quando existe) ou pelo campo (leitor USB que digita e dá Enter, ou colar), faz o checklist de
 * saída (os mesmos itens do app do operador), envia as fotos e confere a bateria. `POST /handovers` cria a entrega e
 * `onCreated` abre o "Contrato e pagamento". Sem QR (só admin): motivo obrigatório, a API audita. O código lido nunca
 * aparece na tela: só "Código lido".
 */
export function PickupHandoverDialog({ reservation, canWithoutCode, cameraSupported, onClose, onCreated }: {
  reservation: S<'Reservation'>;
  canWithoutCode: boolean;
  /** Para testes; por padrão, `cameraScanSupported()`. */
  cameraSupported?: boolean;
  onClose: () => void;
  onCreated: (handoverId: string) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { busy, run } = useSubmitGuard();
  const [hasCamera] = useState(() => cameraSupported ?? cameraScanSupported());
  const [mode, setMode] = useState<Mode>('code');
  const [code, setCode] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [reason, setReason] = useState('');
  const [checklist, setChecklist] = useState<ChecklistState>(emptyChecklist);
  const [battery, setBattery] = useState(() => initialBattery(reservation.vehicle));
  const [serial, setSerial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const photoState = useHandoverPhotos(setError);
  const { photos, uploading } = photoState;
  const batteryKnown = !!reservation.vehicle && reservation.vehicle.batteryKnown !== false;

  const acceptCode = (raw: string) => {
    const r = checkPickupCode(raw, reservation.id);
    setTyped('');
    setScanning(false);
    if (!r.ok) { setCode(null); setCodeError(r.error); return; }
    setCode(r.code);
    setCodeError(null);
    setError(null);
  };
  const onCodeKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (typed.trim()) acceptCode(typed);
  };

  const id: Identification = mode === 'code' ? { kind: 'code', code } : { kind: 'noCode', reason };
  const depotId = reservation.depotId ?? '';
  const draft = { reservationId: reservation.id, depotId, id, checklist, photoKeys: photos.map((p) => p.key), battery, batterySerial: serial };
  const missing = missingForPickup(draft);
  const body = depotId ? buildPickupBody(draft) : null;

  const submit = () => run(async () => {
    if (!body) return;
    setError(null);
    try {
      const h = await unwrap(api.POST('/handovers', { body }));
      toast('Entrega registrada — agora o contrato e o pagamento');
      qc.invalidateQueries({ queryKey: ['depot-pickups'] });
      qc.invalidateQueries({ queryKey: ['handovers'] });
      onCreated(h.id);
    } catch (e) {
      qc.invalidateQueries({ queryKey: ['depot-pickups'] });
      // QR recusado: lê de novo (o código nunca é mostrado).
      if (mode === 'code') setCode(null);
      setError(pickupErrorMessage(e, mode === 'noCode'));
    }
  });

  const canSubmit = !!body && !uploading && !busy;

  return (
    <Modal open width={600} title="Entregar moto" onClose={onClose} testId="pickup-handover-dialog"
      actions={<>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button size="sm" variant="dark" icon="PackageCheck" testId="pickup-handover-submit" disabled={!canSubmit} busy={busy} onClick={submit}>{busy ? 'Registrando...' : 'Registrar entrega'}</Button>
      </>}>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        {firstName(reservation.customerFirstName)} · moto <strong style={{ fontFamily: 'var(--font-mono)' }}>{reservation.vehicle?.code ?? '—'}</strong>. Depois da vistoria, abre o contrato e o pagamento.
      </div>

      {canWithoutCode && (
        <div data-testid="pickup-mode">
          <SegmentedControl<Mode> label="Identificação" value={mode}
            options={[{ value: 'code', label: 'QR do cliente' }, { value: 'noCode', label: 'Sem QR (admin)' }]}
            onChange={(m) => { setMode(m); setScanning(false); setError(null); }} />
        </div>
      )}

      {mode === 'code' ? (
        <Section label="QR do cliente" hint={code ? undefined : 'Leitor USB: aponte para o QR (ele digita e dá Enter). Ou cole o código e confirme.'} error={codeError ?? undefined}>
          {code ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Alert tone="success" testId="pickup-code-read" style={{ flex: 1 }}>Código lido</Alert>
              <Button size="sm" variant="ghost" icon="RotateCcw" testId="pickup-code-reset" onClick={() => { setCode(null); setCodeError(null); }}>Ler outro</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* type=password: o código (segredo da reserva) não aparece enquanto é digitado ou colado. */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="field" type="password" data-testid="pickup-code-input" aria-label="Código do QR" autoComplete="off" spellCheck={false}
                  value={typed} onChange={(e) => setTyped(e.target.value.slice(0, 300))} onKeyDown={onCodeKey} placeholder="Leia ou cole o código"
                  style={{ ...fieldBox, height: 48, flex: 1 }} />
                <Button size="sm" variant="secondary" testId="pickup-code-confirm" disabled={!typed.trim()} onClick={() => acceptCode(typed)}>Confirmar</Button>
              </div>
              {hasCamera && (scanning
                ? <>
                  <QrCameraScanner onCode={acceptCode} />
                  <Button size="sm" variant="ghost" icon="X" testId="pickup-camera-stop" onClick={() => setScanning(false)}>Fechar câmera</Button>
                </>
                : <Button size="sm" variant="secondary" icon="Camera" testId="pickup-camera-start" onClick={() => { setCodeError(null); setScanning(true); }}>Ler com a câmera</Button>)}
            </div>
          )}
        </Section>
      ) : (
        <div data-testid="pickup-no-code" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Alert tone="warning">Confira o documento do cliente antes de entregar. A entrega sem QR fica registrada na auditoria com o motivo.</Alert>
          <Field label="Motivo da entrega sem QR" hint={`${reason.trim().length} de ${NO_CODE_REASON_MIN} a ${NO_CODE_REASON_MAX} caracteres. Ex.: celular do cliente sem bateria; documento conferido no balcão. Não digite números de documento.`}>
            <TextArea testId="pickup-no-code-reason" value={reason} onChange={(v) => setReason(v.slice(0, NO_CODE_REASON_MAX))} />
          </Field>
        </div>
      )}

      <ChecklistFields prefix="pickup" label="Checklist de saída" items={PICKUP_CHECKLIST} value={checklist} onChange={setChecklist} />
      <PhotoFields prefix="pickup" state={photoState} />
      <BatteryFields prefix="pickup" known={batteryKnown} battery={battery} onBattery={setBattery} serial={serial} onSerial={setSerial} />

      {!body && missing.length > 0 && (
        <div data-testid="pickup-missing" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Falta: {missing.join(' · ')}.</div>
      )}
      {error && <Alert tone="danger" testId="pickup-handover-error">{error}</Alert>}
    </Modal>
  );
}
