'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import type { TrackerDevice } from '@/lib/trackers';
import { Button } from '@/ds/Button';
import { Field, Modal, Select, TextInput, ErrorNote } from '../ui';
import { SIM_ICCID_RE, SIM_MSISDN_RE, simCardBody } from '../tracker/SimCardSection';

type ChipMode = 'stock' | 'new' | 'skip';

const IMEI_RE = /^[0-9]{15}$/;
const MODEL_OPTIONS = [{ value: 'J16' as const, label: 'J16' }];
const CHIP_OPTIONS: { value: ChipMode; label: string }[] = [
  { value: 'stock', label: 'Escolher um chip do estoque' },
  { value: 'new', label: 'Cadastrar chip novo' },
  { value: 'skip', label: 'Pular — vincular depois' },
];

/**
 * Cadastro de rastreador em 2 passos: 1. Aparelho (IMEI e modelo) e 2. Chip (do estoque, novo ou depois).
 * Se o chip novo é criado e o rastreador falha (ex.: IMEI repetido), o chip fica guardado e é reaproveitado na nova tentativa.
 */
export function CreateTrackerWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (t: TrackerDevice) => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [imei, setImei] = useState('');
  const [model, setModel] = useState<'J16'>('J16');
  const [mode, setMode] = useState<ChipMode>('stock');
  const [simId, setSimId] = useState('');
  const [iccid, setIccid] = useState('');
  const [carrier, setCarrier] = useState('');
  const [msisdn, setMsisdn] = useState('');
  const [apn, setApn] = useState('');
  const [touched, setTouched] = useState(false);
  const createdSim = useRef<string | null>(null);

  const stock = useQuery({
    queryKey: ['sim-cards', 'unlinked', ''],
    queryFn: () => unwrap(api.GET('/sim-cards', { params: { query: { unlinked: true } } })),
  });
  // Chip "livre" = sem moto e sem rastreador.
  const freeChips = (stock.data?.items ?? []).filter((s) => !(s as { trackerId?: string | null }).trackerId);

  const imeiOk = IMEI_RE.test(imei);
  const iccidOk = SIM_ICCID_RE.test(iccid);
  const msisdnOk = msisdn === '' || SIM_MSISDN_RE.test(msisdn);
  const carrierOk = carrier.trim().length >= 1 && carrier.trim().length <= 40;
  const chipOk = mode === 'skip' || (mode === 'stock' ? simId !== '' : iccidOk && msisdnOk && carrierOk);

  const save = useMutation({
    mutationFn: async () => {
      let simCardId: string | undefined = mode === 'stock' ? simId : undefined;
      if (mode === 'new') {
        if (!createdSim.current) {
          const sim = await unwrap(api.POST('/sim-cards', { body: simCardBody({ iccid, carrier, msisdn, apn, status: 'active', notes: null }) }));
          createdSim.current = sim.id;
        }
        simCardId = createdSim.current;
      }
      return unwrap(api.POST('/trackers', { body: { imei, model, ...(simCardId ? { simCardId } : {}) } }));
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ['trackers'] });
      qc.invalidateQueries({ queryKey: ['sim-cards'] });
      onCreated(t);
      onClose();
    },
  });

  const stepStyle = (on: boolean) => ({ fontWeight: on ? 700 : 500, color: on ? 'var(--text-primary)' : 'var(--text-secondary)' });

  return (
    <Modal open title="Cadastrar rastreador" onClose={onClose} testId="tracker-wizard" actions={step === 1 ? (
      <>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button size="sm" testId="wizard-next" onClick={() => { setTouched(true); if (imeiOk) { setTouched(false); setStep(2); } }}>Continuar</Button>
      </>
    ) : (
      <>
        <Button size="sm" variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
        <Button size="sm" testId="wizard-save" busy={save.isPending} disabled={save.isPending} onClick={() => { setTouched(true); if (chipOk) save.mutate(); }}>Cadastrar</Button>
      </>
    )}>
      <div style={{ display: 'flex', gap: 16, fontSize: 14 }} data-testid="wizard-steps">
        <span style={stepStyle(step === 1)}>1. Aparelho</span>
        <span style={stepStyle(step === 2)}>2. Chip</span>
      </div>
      {step === 1 ? (
        <>
          <Field label="IMEI" hint="15 números. Está na etiqueta do aparelho ou na resposta do comando PARAM#." error={touched && !imeiOk ? 'Digite os 15 números do IMEI' : undefined}>
            <TextInput value={imei} onChange={(v) => setImei(v.replace(/\D/g, '').slice(0, 15))} testId="tracker-imei" placeholder="869890080273430" />
          </Field>
          <Field label="Modelo"><Select value={model} onChange={setModel} options={MODEL_OPTIONS} testId="tracker-model" /></Field>
        </>
      ) : (
        <>
          <div role="radiogroup" aria-label="Chip do rastreador" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CHIP_OPTIONS.map((o) => (
              <label key={o.value} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}>
                <input type="radio" name="chip-mode" value={o.value} checked={mode === o.value} onChange={() => setMode(o.value)} data-testid={`chip-mode-${o.value}`} />
                {o.label}
              </label>
            ))}
          </div>
          {mode === 'stock' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }} data-testid="chip-stock">
              {freeChips.length === 0 && !stock.isLoading && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nenhum chip livre no estoque. Cadastre um chip novo.</div>}
              {freeChips.map((s) => (
                <button key={s.id} type="button" data-testid="chip-option" aria-pressed={s.id === simId} onClick={() => setSimId(s.id)}
                  style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${s.id === simId ? 'var(--border-focus)' : 'var(--border-subtle)'}`, background: 'var(--surface-card)', cursor: 'pointer' }}>
                  <div style={{ font: '600 13px/1.3 var(--font-mono)' }}>{s.iccid}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.carrier}{s.msisdn ? ` · ${s.msisdn}` : ''}</div>
                </button>
              ))}
              {touched && !chipOk && <div style={{ fontSize: 12, color: 'var(--danger-ink)' }}>Escolha um chip ou use outra opção.</div>}
            </div>
          )}
          {mode === 'new' && (
            <>
              <Field label="ICCID" hint="Número impresso no chip (18 a 22 números)." error={touched && !iccidOk ? 'Informe 18 a 22 dígitos' : undefined}><TextInput value={iccid} onChange={setIccid} testId="sim-iccid" /></Field>
              <Field label="Operadora" error={touched && !carrierOk ? 'Informe a operadora (até 40 caracteres)' : undefined}><TextInput value={carrier} onChange={setCarrier} testId="sim-carrier" /></Field>
              <Field label="Linha (opcional)" error={touched && !msisdnOk ? 'Informe de 10 a 15 dígitos, com + opcional' : undefined}><TextInput value={msisdn} onChange={setMsisdn} placeholder="+5511999990000" testId="sim-msisdn" /></Field>
              <Field label="APN (opcional)"><TextInput value={apn} onChange={setApn} placeholder="indica.algar.br" testId="sim-apn" /></Field>
            </>
          )}
        </>
      )}
      {save.error && <ErrorNote error={save.error} />}
    </Modal>
  );
}
