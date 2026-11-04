'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api, unwrap } from '@/lib/api';
import { formatBRL } from '@/lib/format';
import { useSubmitGuard } from '@/lib/submit-guard';
import {
  COUNTER_METHODS, COUNTER_METHOD_LABEL, COUNTER_PLANS, COUNTER_PLAN_LABEL, COUNTER_QUANTITY_MAX, MAX_CONTRACT_PHOTOS,
  checkoutErrorMessage, clampQuantity, counterKeys, reaisToCents, uploadContractPhoto, type CounterMethod, type CounterPlan,
} from '@/lib/counter';
import type { S } from '@/lib/types';
import { Field, KV, Modal, Select, Skeleton, TextInput, useToast } from './ui';
import { Alert } from '@/ds/Alert';
import { Button } from '@/ds/Button';
import { SegmentedControl } from '@/ds/SegmentedControl';

type Coverage = S<'InsuranceCoverage'>;

/**
 * "Contrato e pagamento" de uma reserva já em entrega (`handover`): plano do balcão × quantidade, seguro, fotos do
 * contrato assinado (1 a 4), método e referência (NSU / ID do Pix) e caução opcional. O valor vem sempre da API
 * (`GET /handovers/{id}/counter-quote`); `POST /handovers/{id}/counter-checkout` inicia o aluguel. Não há vistoria
 * no painel (ela é feita no app do operador). Nada de cartão é digitado aqui.
 */
export function CounterCheckoutDialog({ handoverId, onClose }: { handoverId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { busy, run } = useSubmitGuard();
  const [plan, setPlan] = useState<CounterPlan>('day');
  const [quantity, setQuantity] = useState(1);
  const [coverage, setCoverage] = useState<Coverage>('basic');
  const [photos, setPhotos] = useState<{ key: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [method, setMethod] = useState<CounterMethod>('counter_card');
  const [reference, setReference] = useState('');
  const [depositText, setDepositText] = useState('');
  const [depositMethod, setDepositMethod] = useState<CounterMethod>('cash');
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const quote = useQuery({
    queryKey: ['counter-quote', handoverId, plan, coverage, quantity],
    queryFn: () => unwrap(api.GET('/handovers/{id}/counter-quote', { params: { path: { id: handoverId }, query: { planCode: plan, coverage, quantity } } })),
    placeholderData: (prev) => prev,
  });
  // Só vale o valor da combinação atual (o placeholder da anterior não é enviado).
  const q = quote.data && quote.data.planCode === plan && quote.data.coverage === coverage && quote.data.quantity === quantity ? quote.data : undefined;

  const depositCents = depositText.trim() === '' ? 0 : reaisToCents(depositText);
  const depositError = depositCents === null ? 'Informe um valor válido' : undefined;

  const body: S<'CounterCheckoutRequest'> | null = q && depositCents !== null ? {
    planCode: plan,
    quantity,
    coverage,
    contractPhotoKeys: photos.map((p) => p.key),
    payment: { method, amountCents: q.totalCents, ...(reference.trim() ? { reference: reference.trim() } : {}) },
    ...(depositCents > 0 ? { deposit: { method: depositMethod, amountCents: depositCents } } : {}),
  } : null;
  // Idempotency-Key por (entrega, conteúdo), no módulo: nova tentativa ou fechar e reabrir o diálogo depois de uma
  // falha de rede reusa a chave (a API devolve o já registrado). Sai só quando dá certo ou passa de 24 h.
  const signature = body ? JSON.stringify([handoverId, body]) : '';

  const max = COUNTER_QUANTITY_MAX[plan];
  const changePlan = (p: CounterPlan) => { setPlan(p); setQuantity((n) => clampQuantity(p, n)); setError(null); };
  const changeQuantity = (n: number) => { setQuantity(clampQuantity(plan, n)); setError(null); };

  const addPhotos = async (files: FileList | null) => {
    const list = Array.from(files ?? []).slice(0, MAX_CONTRACT_PHOTOS - photos.length);
    if (list.length === 0) return;
    setUploading(true); setError(null);
    try {
      for (const f of list) {
        const key = await uploadContractPhoto(f);
        setPhotos((xs) => [...xs, { key, name: f.name }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar a foto');
    } finally {
      setUploading(false);
      if (file.current) file.current.value = '';
    }
  };

  const start = () => run(async () => {
    if (!body) return;
    setError(null);
    try {
      await unwrap(api.POST('/handovers/{id}/counter-checkout', { params: { path: { id: handoverId }, header: { 'Idempotency-Key': counterKeys.keyFor(signature) } }, body }));
      counterKeys.clear(signature);
      toast('Aluguel iniciado — moto liberada');
      qc.invalidateQueries({ queryKey: ['depot-pickups'] });
      qc.invalidateQueries({ queryKey: ['handovers'] });
      qc.invalidateQueries({ queryKey: ['handover', handoverId] });
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.slug === 'counter-amount-mismatch') await quote.refetch();
      // A resposta pode ter se perdido depois do registro: a agenda recarrega para mostrar o estado real.
      qc.invalidateQueries({ queryKey: ['depot-pickups'] });
      qc.invalidateQueries({ queryKey: ['handover', handoverId] });
      setError(checkoutErrorMessage(e));
    }
  });

  const canStart = !!body && photos.length > 0 && !uploading && !busy && !depositError;

  return (
    <Modal open width={560} title="Contrato e pagamento" onClose={onClose} testId="counter-checkout-dialog"
      actions={<>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button size="sm" variant="dark" icon="KeyRound" testId="counter-start" disabled={!canStart} busy={busy} onClick={start}>{busy ? 'Iniciando...' : 'Iniciar aluguel'}</Button>
      </>}>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        Registre o contrato assinado e o pagamento recebido no balcão. A vistoria de saída é feita no app do operador.
      </div>

      <Field label="Plano">
        <SegmentedControl label="Plano" options={COUNTER_PLANS.map((p) => ({ value: p, label: COUNTER_PLAN_LABEL[p] }))} value={plan} onChange={changePlan} />
      </Field>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ width: 120 }}>
          <Field label="Quantidade" hint={`De 1 a ${max}`}>
            <TextInput testId="counter-quantity" type="number" min={1} max={max} value={quantity} onChange={(v) => changeQuantity(Number(v))} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 6, paddingBottom: 22 }}>
          <Button size="sm" variant="secondary" testId="counter-quantity-dec" title="Diminuir" disabled={quantity <= 1} onClick={() => changeQuantity(quantity - 1)}>−</Button>
          <Button size="sm" variant="secondary" testId="counter-quantity-inc" title="Aumentar" disabled={quantity >= max} onClick={() => changeQuantity(quantity + 1)}>+</Button>
        </div>
      </div>

      <Field label="Seguro" hint="O Básico é obrigatório; o Completo é opcional.">
        <SegmentedControl label="Seguro" options={[{ value: 'basic' as Coverage, label: 'Básico' }, { value: 'full' as Coverage, label: 'Completo' }]} value={coverage}
          onChange={(c) => { setCoverage(c); setError(null); }} />
      </Field>

      <div data-testid="counter-quote" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)' }}>
        {quote.error ? <span role="alert" style={{ fontSize: 13, color: 'var(--danger-ink)' }}>{checkoutErrorMessage(quote.error)}</span>
          : !q ? <Skeleton h={14} w="60%" />
            : <>
              <KV k={`${COUNTER_PLAN_LABEL[plan]} × ${quantity}`} v={formatBRL(q.planCents)} />
              <KV k="Seguro" v={formatBRL(q.insuranceCents)} />
              <KV k="Total a receber" v={<strong data-testid="counter-total" style={{ fontSize: 16 }}>{formatBRL(q.totalCents)}</strong>} />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                Período de {q.periodDays} {q.periodDays === 1 ? 'dia' : 'dias'}. Cada dia iniciado depois disso: {formatBRL(q.excessDayCents)}, acertado no galpão.
              </div>
            </>}
      </div>

      <Field label="Fotos do contrato assinado" hint="JPG ou PNG, de 1 a 4 fotos.">
        <div data-testid="counter-photos" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input ref={file} type="file" multiple accept="image/jpeg,image/png" data-testid="counter-contract-photo" style={{ display: 'none' }} onChange={(e) => addPhotos(e.target.files)} />
          {photos.map((p, i) => (
            <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              <Button size="sm" variant="ghost" icon="X" title="Remover foto" onClick={() => setPhotos((xs) => xs.filter((_, j) => j !== i))} />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button size="sm" variant="secondary" icon="Camera" disabled={uploading || photos.length >= MAX_CONTRACT_PHOTOS} onClick={() => file.current?.click()}>
              {uploading ? 'Enviando foto...' : 'Adicionar foto'}
            </Button>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{photos.length} de {MAX_CONTRACT_PHOTOS}</span>
          </div>
        </div>
      </Field>

      <div className="form-2col">
        <Field label="Pagamento">
          <Select<CounterMethod> testId="counter-method" value={method} onChange={setMethod} options={COUNTER_METHODS.map((m) => ({ value: m, label: COUNTER_METHOD_LABEL[m] }))} />
        </Field>
        <Field label="Referência (opcional)" hint="NSU da maquininha ou ID do Pix.">
          <TextInput testId="counter-reference" value={reference} onChange={(v) => setReference(v.slice(0, 64))} />
        </Field>
        <Field label="Caução (R$, opcional)" error={depositError}>
          <TextInput testId="counter-deposit" value={depositText} onChange={setDepositText} placeholder="0,00" />
        </Field>
        <Field label="Caução recebida em">
          <Select<CounterMethod> testId="counter-deposit-method" value={depositMethod} onChange={setDepositMethod} options={COUNTER_METHODS.map((m) => ({ value: m, label: COUNTER_METHOD_LABEL[m] }))} />
        </Field>
      </div>

      {error && <Alert tone="danger" testId="counter-checkout-error">{error}</Alert>}
    </Modal>
  );
}
