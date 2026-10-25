'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { buildWalletAdjustment, walletAdjustFeedback, type AdjustDirection } from '@/lib/admin-forms';
import { formatBRL } from '@/lib/format';
import { Button } from '@/ds/Button';
import { ErrorNote, Field, Modal, Select, TextArea, TextInput, useToast } from './ui';

/**
 * Ajuste manual da carteira (`POST /customers/{id}/wallet/adjustments`): crédito ou débito em reais, motivo obrigatório.
 * QA-04 (Task 14): mostra o saldo atual (`Customer.walletBalanceCents`, só admin/financeiro) e não deixa debitar acima dele.
 */
export function WalletAdjustDialog({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const customer = useQuery({ queryKey: ['customer', customerId], queryFn: () => unwrap(api.GET('/customers/{id}', { params: { path: { id: customerId } } })) });
  const balance = customer.data?.walletBalanceCents;
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<AdjustDirection>('credit');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  // Uma chave por abertura do diálogo: repetir o envio (duplo clique, rede) não lança duas vezes.
  const key = useRef(crypto.randomUUID());
  // Débito só com o saldo carregado (sem ele não dá para conferir o limite).
  const debitBlocked = direction === 'debit' && balance === undefined;
  const submit = async () => {
    setErr(null);
    const built = buildWalletAdjustment(amount, direction, reason, balance);
    if (!built.ok) { setErr(new Error(built.error)); return; }
    setBusy(true);
    try {
      const entry = await unwrap(api.POST('/customers/{id}/wallet/adjustments', { params: { path: { id: customerId }, header: { 'Idempotency-Key': key.current } }, body: built.body }));
      const fb = walletAdjustFeedback(entry);
      toast(fb.message, fb.tone);
      qc.invalidateQueries({ queryKey: ['customer', customerId] });
      onClose();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  return (
    <Modal open title="Ajustar carteira" onClose={onClose} testId="wallet-adjust"
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" testId="wallet-adjust-save" disabled={busy || debitBlocked} onClick={submit}>{busy ? 'Lançando...' : 'Lançar ajuste'}</Button></>}>
      <div data-testid="wallet-balance" role="status" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        {balance !== undefined
          ? <>Saldo atual: <strong style={{ color: balance < 0 ? 'var(--danger-ink)' : 'var(--text-primary)' }}>{formatBRL(balance)}</strong></>
          : customer.isLoading ? 'Carregando o saldo...' : 'Saldo indisponível: só crédito pode ser lançado agora.'}
      </div>
      <Field label="Tipo">
        <Select<AdjustDirection> testId="wallet-direction" value={direction} onChange={setDirection} options={[{ value: 'credit', label: 'Crédito (soma ao saldo)' }, { value: 'debit', label: 'Débito (subtrai do saldo)' }]} />
      </Field>
      <Field label="Valor (R$)" hint={direction === 'debit' ? `Até R$ 1.000,00 por lançamento e no máximo o saldo${balance !== undefined ? ` (${formatBRL(Math.max(0, balance))})` : ''}.` : 'Até R$ 1.000,00 por lançamento'}>
        <TextInput testId="wallet-amount" value={amount} onChange={setAmount} placeholder="10,00" />
      </Field>
      <Field label="Motivo" hint="Fica registrado na auditoria.">
        <TextArea testId="wallet-reason" value={reason} onChange={setReason} placeholder="Descreva o motivo" />
      </Field>
      <ErrorNote error={err} />
    </Modal>
  );
}
