'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorText, unwrap } from '@/lib/api';
import { formatBRL } from '@/lib/format';
import { toReais } from '@/lib/money';
import { DEPOSIT_METHOD, PAYMENT_KIND, PAYMENT_METHOD } from '@/lib/labels';
import { useSubmitGuard } from '@/lib/submit-guard';
import { COUNTER_METHODS, COUNTER_METHOD_LABEL, isRentalOpen, reaisToCents, type CounterMethod } from '@/lib/counter';
import type { S } from '@/lib/types';
import { ErrorNote, Field, Modal, PanelSkeleton, SectionTitle, Select, TextInput, useToast } from './ui';
import { Alert } from '@/ds/Alert';
import { Button } from '@/ds/Button';

type Debt = S<'CounterDebt'>;
type Deposit = S<'CounterDepositBalance'>;

/** Ação em andamento: receber no balcão, abater da caução ou devolver a caução. Uma `Idempotency-Key` por ação. */
type ActionInput = { kind: 'receive' | 'deduct'; debt: Debt } | { kind: 'refund'; deposit: Deposit };
type Action = ActionInput & { key: string };

const row = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, padding: '10px 0', borderBottom: '1px solid var(--ink-100)' };

/**
 * Acerto no balcão (`GET /rentals/{id}/counter-balance`): dívidas em aberto do cliente (receber no balcão ou abater
 * da caução) e cauções de balcão com saldo (devolver). Sem gateway; só método e referência. Valores em reais viram
 * centavos inteiros; o saldo recarrega depois de cada ação.
 */
export function CounterSettleDialog({ rentalId, onClose }: { rentalId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { busy, run } = useSubmitGuard();
  const [action, setAction] = useState<Action | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<CounterMethod>('counter_card');
  const [depositId, setDepositId] = useState('');
  const [reference, setReference] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const balance = useQuery({
    queryKey: ['counter-balance', rentalId],
    queryFn: () => unwrap(api.GET('/rentals/{id}/counter-balance', { params: { path: { id: rentalId } } })),
  });
  const b = balance.data;
  const deposits = b?.deposits ?? [];

  const open = (a: ActionInput) => {
    const max = a.kind === 'refund' ? a.deposit.availableCents : a.debt.outstandingCents;
    const cap = a.kind === 'deduct' && deposits[0] ? Math.min(max, deposits[0].availableCents) : max;
    setAction({ ...a, key: crypto.randomUUID() });
    setAmount(toReais(cap));
    setMethod('counter_card');
    setDepositId(deposits[0]?.depositId ?? '');
    setReference('');
    setFieldError(undefined);
    setError(null);
  };

  const limit = (a: Action): { cents: number; text: string } => {
    if (a.kind === 'refund') return { cents: a.deposit.availableCents, text: `O valor passa do disponível da caução (${formatBRL(a.deposit.availableCents)})` };
    if (a.kind === 'deduct') {
      const dep = deposits.find((d) => d.depositId === depositId);
      const avail = dep?.availableCents ?? 0;
      if (avail < a.debt.outstandingCents) return { cents: avail, text: `O valor passa do disponível da caução (${formatBRL(avail)})` };
    }
    return { cents: a.debt.outstandingCents, text: `O valor passa do saldo do débito (${formatBRL(a.debt.outstandingCents)})` };
  };

  const confirm = () => run(async () => {
    if (!action) return;
    const cents = reaisToCents(amount);
    if (cents === null || cents <= 0) { setFieldError('Informe um valor válido'); return; }
    const lim = limit(action);
    if (cents > lim.cents) { setFieldError(lim.text); return; }
    setFieldError(undefined); setError(null);
    const ref = reference.trim() ? { reference: reference.trim() } : {};
    const header = { 'Idempotency-Key': action.key };
    try {
      if (action.kind === 'refund') {
        await unwrap(api.POST('/payments/deposits/{id}/counter-refund', { params: { path: { id: action.deposit.depositId }, header }, body: { amountCents: cents, ...ref } }));
        toast('Devolução da caução registrada');
      } else {
        const source = action.kind === 'deduct' ? { fromDepositId: depositId } : { method };
        await unwrap(api.POST('/payments/{id}/counter-settle', { params: { path: { id: action.debt.paymentId }, header }, body: { amountCents: cents, ...source, ...ref } }));
        toast(action.kind === 'deduct' ? 'Valor abatido da caução' : 'Pagamento registrado');
        qc.invalidateQueries({ queryKey: ['payments'] });
      }
      setAction(null);
      qc.invalidateQueries({ queryKey: ['counter-balance', rentalId] });
    } catch (e) {
      setError(errorText(e));
    }
  });

  const waiting = b && isRentalOpen(b.rentalStatus);

  return (
    <Modal open width={520} title="Acertar no balcão" onClose={onClose} testId="counter-settle-dialog"
      actions={<Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>}>
      <ErrorNote error={balance.error} onRetry={() => balance.refetch()} />
      {!b && balance.isLoading && <PanelSkeleton rows={3} />}
      {b && waiting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Alert tone="info" icon="Hourglass" testId="counter-wait">Aguardando o encerramento do aluguel</Alert>
          <Button size="sm" variant="secondary" icon="RefreshCw" testId="counter-settle-refresh" disabled={balance.isFetching} onClick={() => balance.refetch()}>Atualizar</Button>
        </div>
      )}
      {b && !waiting && (
        <>
          {b.customerFirstName && <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Cliente: <strong style={{ color: 'var(--text-primary)' }}>{b.customerFirstName}</strong></div>}
          <div>
            <SectionTitle>Valores a acertar</SectionTitle>
            {b.debts.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nenhum valor a acertar.</div>}
            {b.debts.map((d) => (
              <div key={d.paymentId} style={row}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{PAYMENT_KIND[d.kind]}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{PAYMENT_METHOD[d.method]}</div>
                </div>
                <strong data-testid="counter-debt-outstanding" style={{ fontSize: 15 }}>{formatBRL(d.outstandingCents)}</strong>
                <Button size="sm" variant="dark" icon="Wallet" testId="counter-debt-receive" onClick={() => open({ kind: 'receive', debt: d })}>Receber</Button>
                {deposits.length > 0 && <Button size="sm" variant="secondary" icon="ArrowDownToLine" testId="counter-debt-deduct" onClick={() => open({ kind: 'deduct', debt: d })}>Abater da caução</Button>}
              </div>
            ))}
          </div>
          <div>
            <SectionTitle>Caução do balcão</SectionTitle>
            {deposits.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nenhuma caução a devolver.</div>}
            {deposits.map((d) => (
              <div key={d.depositId} style={row}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Caução · {DEPOSIT_METHOD[d.method]}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Retida {formatBRL(d.amountCents)} · abatida {formatBRL(d.capturedCents)} · devolvida {formatBRL(d.refundedCents)}</div>
                </div>
                <strong data-testid="counter-deposit-available" style={{ fontSize: 15 }}>{formatBRL(d.availableCents)}</strong>
                <Button size="sm" variant="secondary" icon="Undo2" testId="counter-deposit-refund" onClick={() => open({ kind: 'refund', deposit: d })}>Devolver</Button>
              </div>
            ))}
          </div>
        </>
      )}

      {action && b && !waiting && (
        <div data-testid="counter-action" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)' }}>
          <div style={{ font: 'var(--type-label)' }}>
            {action.kind === 'receive' ? 'Receber no balcão' : action.kind === 'deduct' ? 'Abater da caução' : 'Devolver caução'}
          </div>
          <div className="form-2col">
            <Field label="Valor (R$)" error={fieldError}>
              <TextInput testId="counter-action-amount" value={amount} onChange={(v) => { setAmount(v); setFieldError(undefined); }} placeholder="0,00" />
            </Field>
            {action.kind === 'receive' && (
              <Field label="Método">
                <Select<CounterMethod> testId="counter-action-method" value={method} onChange={setMethod} options={COUNTER_METHODS.map((m) => ({ value: m, label: COUNTER_METHOD_LABEL[m] }))} />
              </Field>
            )}
            {action.kind === 'deduct' && deposits.length > 1 && (
              <Field label="Caução">
                <Select testId="counter-action-deposit" value={depositId} onChange={setDepositId}
                  options={deposits.map((d) => ({ value: d.depositId, label: `${DEPOSIT_METHOD[d.method]} · ${formatBRL(d.availableCents)}` }))} />
              </Field>
            )}
            <Field label="Referência (opcional)" hint="NSU da maquininha ou ID do Pix.">
              <TextInput testId="counter-action-reference" value={reference} onChange={(v) => setReference(v.slice(0, 64))} />
            </Field>
          </div>
          {error && <Alert tone="danger" testId="counter-settle-error">{error}</Alert>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button size="sm" variant="ghost" onClick={() => setAction(null)}>Cancelar</Button>
            <Button size="sm" variant="dark" testId="counter-action-confirm" disabled={busy} busy={busy} onClick={confirm}>{busy ? 'Registrando...' : 'Confirmar'}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
