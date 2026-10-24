'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { buildWalletAdjustment, type AdjustDirection } from '@/lib/admin-forms';
import { Button } from '@/ds/Button';
import { ErrorNote, Field, Modal, Select, TextArea, TextInput, useToast } from './ui';

/** Ajuste manual da carteira (`POST /customers/{id}/wallet/adjustments`): crédito ou débito em reais, motivo obrigatório. */
export function WalletAdjustDialog({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<AdjustDirection>('credit');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  // Uma chave por abertura do diálogo: repetir o envio (duplo clique, rede) não lança duas vezes.
  const key = useRef(crypto.randomUUID());
  const submit = async () => {
    setErr(null);
    const built = buildWalletAdjustment(amount, direction, reason);
    if (!built.ok) { setErr(new Error(built.error)); return; }
    setBusy(true);
    try {
      await unwrap(api.POST('/customers/{id}/wallet/adjustments', { params: { path: { id: customerId }, header: { 'Idempotency-Key': key.current } }, body: built.body }));
      toast('Ajuste lançado na carteira');
      qc.invalidateQueries({ queryKey: ['customer', customerId] });
      onClose();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  return (
    <Modal open title="Ajustar carteira" onClose={onClose} testId="wallet-adjust"
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" testId="wallet-adjust-save" disabled={busy} onClick={submit}>{busy ? 'Lançando...' : 'Lançar ajuste'}</Button></>}>
      <Field label="Tipo">
        <Select<AdjustDirection> testId="wallet-direction" value={direction} onChange={setDirection} options={[{ value: 'credit', label: 'Crédito (soma ao saldo)' }, { value: 'debit', label: 'Débito (subtrai do saldo)' }]} />
      </Field>
      <Field label="Valor (R$)" hint="Até R$ 1.000,00 por lançamento">
        <TextInput testId="wallet-amount" value={amount} onChange={setAmount} placeholder="10,00" />
      </Field>
      <Field label="Motivo" hint="Fica registrado na auditoria.">
        <TextArea testId="wallet-reason" value={reason} onChange={setReason} placeholder="Descreva o motivo" />
      </Field>
      <ErrorNote error={err} />
    </Modal>
  );
}
