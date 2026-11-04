'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorText, unwrap } from '@/lib/api';
import { formatBRL } from '@/lib/format';
import { toReais } from '@/lib/money';
import { DEPOSIT_METHOD, PAYMENT_KIND, PAYMENT_METHOD } from '@/lib/labels';
import { useSubmitGuard } from '@/lib/submit-guard';
import { COUNTER_METHODS, COUNTER_METHOD_LABEL, counterKeys, hasCounterBalance, isLostResponse, isRentalOpen, reaisToCents, type CounterMethod } from '@/lib/counter';
import type { S } from '@/lib/types';
import { ErrorNote, Field, Modal, PanelSkeleton, SectionTitle, Select, TextInput, useToast } from './ui';
import { Alert } from '@/ds/Alert';
import { Button } from '@/ds/Button';

type Debt = S<'CounterDebt'>;
type Deposit = S<'CounterDepositBalance'>;

/** Ação em andamento (receber no balcão, abater da caução, devolver a caução), pelo id do débito ou da caução. */
type Action = { kind: 'receive' | 'deduct'; paymentId: string } | { kind: 'refund'; depositId: string };

/**
 * `Idempotency-Key` estável pelos dados da ação (tipo, alvo, valor, método/caução, referência), e não por abertura:
 * resposta perdida (timeout/5xx depois do registro) seguida de cancelar e reabrir com os mesmos dados reusa a chave,
 * e a API devolve o que já registrou em vez de quitar de novo. Sai do mapa só quando a ação dá certo ou expira
 * (24 h, em `counterKeys`).
 */
const actionKey = (signature: string) => counterKeys.keyFor(signature);

/** Consulta do saldo, compartilhada entre o botão "Acertar no balcão" e o diálogo (mesma chave de cache). */
export function counterBalanceQuery(rentalId: string) {
  return {
    queryKey: ['counter-balance', rentalId],
    queryFn: () => unwrap(api.GET('/rentals/{id}/counter-balance', { params: { path: { id: rentalId } } })),
  };
}

/**
 * Botão "Acertar no balcão": o contrato não diz quais alugueis podem ter débito de balcão (as dívidas e cauções são do
 * cliente), então busca o saldo e só aparece quando há algo a acertar (dívida ou caução a devolver). Carregando ou
 * com erro, não aparece.
 */
export function CounterSettleButton({ rentalId, testId, onClick }: { rentalId: string; testId: string; onClick: () => void }) {
  const q = useQuery(counterBalanceQuery(rentalId));
  const d = q.data;
  if (!d || !hasCounterBalance(d)) return null;
  return <Button size="sm" variant="secondary" icon="Wallet" testId={testId} style={{ alignSelf: 'flex-start' }} onClick={onClick}>Acertar no balcão</Button>;
}

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
  const [notice, setNotice] = useState<string | null>(null);
  const [otherSettled, setOtherSettled] = useState<string | null>(null);

  // Sempre do servidor ao abrir (sem o staleTime padrão): o valor sugerido nunca vem de um saldo antigo.
  const balance = useQuery({
    ...counterBalanceQuery(rentalId),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const b = balance.data;
  const deposits: Deposit[] = b?.deposits ?? [];
  const reload = () => qc.invalidateQueries({ queryKey: ['counter-balance', rentalId] });
  // Débito/caução da ação sempre do saldo atual: depois de recarregar, o limite já é o novo.
  const debt: Debt | undefined = action && action.kind !== 'refund' ? b?.debts.find((d) => d.paymentId === action.paymentId) : undefined;
  const deposit = action && action.kind === 'refund' ? deposits.find((d) => d.depositId === action.depositId) : undefined;
  const target = debt ?? deposit;
  const stale = balance.isFetching;

  const close = () => { reload(); onClose(); };
  const cancelAction = () => { setAction(null); reload(); };

  const open = (a: Action) => {
    const max = a.kind === 'refund'
      ? deposits.find((d) => d.depositId === a.depositId)?.availableCents ?? 0
      : b?.debts.find((d) => d.paymentId === a.paymentId)?.outstandingCents ?? 0;
    const cap = a.kind === 'deduct' && deposits[0] ? Math.min(max, deposits[0].availableCents) : max;
    setAction(a);
    setAmount(toReais(cap));
    setMethod('counter_card');
    setDepositId(deposits[0]?.depositId ?? '');
    setReference('');
    setFieldError(undefined);
    setError(null);
    setNotice(null);
    setOtherSettled(null);
  };

  const limit = (): { cents: number; text: string } => {
    if (deposit) return { cents: deposit.availableCents, text: `O valor passa do disponível da caução (${formatBRL(deposit.availableCents)})` };
    const owed = debt?.outstandingCents ?? 0;
    if (action?.kind === 'deduct') {
      const avail = deposits.find((d) => d.depositId === depositId)?.availableCents ?? 0;
      if (avail < owed) return { cents: avail, text: `O valor passa do disponível da caução (${formatBRL(avail)})` };
    }
    return { cents: owed, text: `O valor passa do saldo do débito (${formatBRL(owed)})` };
  };

  const confirm = () => run(async () => {
    if (!action || !target || stale) return;
    const cents = reaisToCents(amount);
    if (cents === null || cents <= 0) { setFieldError('Informe um valor válido'); return; }
    const lim = limit();
    if (cents > lim.cents) { setFieldError(lim.text); return; }
    setFieldError(undefined); setError(null);
    const ref = reference.trim() ? { reference: reference.trim() } : {};
    const source = action.kind === 'deduct' ? { fromDepositId: depositId } : { method };
    const targetId = action.kind === 'refund' ? action.depositId : action.paymentId;
    const signature = JSON.stringify([rentalId, action.kind, targetId, cents, action.kind === 'refund' ? null : source, ref]);
    const header = { 'Idempotency-Key': actionKey(signature) };
    try {
      if (action.kind === 'refund') {
        await unwrap(api.POST('/payments/deposits/{id}/counter-refund', { params: { path: { id: action.depositId }, header }, body: { amountCents: cents, ...ref } }));
        toast('Devolução da caução registrada');
      } else {
        await unwrap(api.POST('/payments/{id}/counter-settle', { params: { path: { id: action.paymentId }, header }, body: { amountCents: cents, ...source, ...ref } }));
        toast(action.kind === 'deduct' ? 'Valor abatido da caução' : 'Pagamento registrado');
        qc.invalidateQueries({ queryKey: ['payments'] });
      }
      counterKeys.clear(signature);
      setAction(null);
    } catch (e) {
      // Só rede/timeout/5xx pode ter registrado: relê o saldo e, se o alvo sumiu, o acerto foi por inteiro.
      // Um 4xx é recusa da API (ex.: outra pessoa já quitou): mostra o erro, sem dizer que o acerto foi registrado.
      const fresh = await balance.refetch().then((r) => r.data, () => undefined);
      const gone = fresh && (action.kind === 'refund'
        ? !fresh.deposits.some((d) => d.depositId === action.depositId)
        : !fresh.debts.some((d) => d.paymentId === action.paymentId));
      if (gone && isLostResponse(e)) {
        counterKeys.clear(signature);
        setAction(null);
        setNotice(action.kind === 'refund' ? 'Devolução registrada. A caução já estava devolvida por inteiro; confira o saldo.' : 'Acerto registrado. O valor já estava quitado por inteiro; confira o saldo.');
      } else if (gone) {
        counterKeys.clear(signature);
        setAction(null);
        setOtherSettled(action.kind === 'refund' ? 'Esta caução já foi devolvida por outra pessoa.' : 'Este débito já foi quitado por outra pessoa.');
      } else {
        setError(errorText(e));
      }
    } finally {
      // Também no erro: a resposta pode ter se perdido depois do registro; o saldo mostrado tem de ser o do servidor.
      reload();
    }
  });

  const waiting = b && isRentalOpen(b.rentalStatus);

  return (
    <Modal open width={520} title="Acertar no balcão" onClose={close} testId="counter-settle-dialog"
      actions={<Button size="sm" variant="ghost" onClick={close}>Fechar</Button>}>
      <ErrorNote error={balance.error} onRetry={() => balance.refetch()} />
      {!b && balance.isLoading && <PanelSkeleton rows={3} />}
      {b && waiting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Alert tone="info" icon="Hourglass" testId="counter-wait">Aguardando o encerramento do aluguel</Alert>
          <Button size="sm" variant="secondary" icon="RefreshCw" testId="counter-settle-refresh" disabled={balance.isFetching} onClick={() => balance.refetch()}>Atualizar</Button>
        </div>
      )}
      {notice && <Alert tone="success" testId="counter-settle-notice">{notice}</Alert>}
      {otherSettled && <Alert tone="info" testId="counter-settle-other">{otherSettled}</Alert>}
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
                <Button size="sm" variant="dark" icon="Wallet" testId="counter-debt-receive" disabled={stale} onClick={() => open({ kind: 'receive', paymentId: d.paymentId })}>Receber</Button>
                {deposits.length > 0 && <Button size="sm" variant="secondary" icon="ArrowDownToLine" testId="counter-debt-deduct" disabled={stale} onClick={() => open({ kind: 'deduct', paymentId: d.paymentId })}>Abater da caução</Button>}
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
                <Button size="sm" variant="secondary" icon="Undo2" testId="counter-deposit-refund" disabled={stale} onClick={() => open({ kind: 'refund', depositId: d.depositId })}>Devolver</Button>
              </div>
            ))}
          </div>
        </>
      )}

      {action && b && !waiting && target && (
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
            <Button size="sm" variant="ghost" testId="counter-action-cancel" onClick={cancelAction}>Cancelar</Button>
            <Button size="sm" variant="dark" testId="counter-action-confirm" disabled={busy || stale} busy={busy} onClick={confirm}>{busy ? 'Registrando...' : 'Confirmar'}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
