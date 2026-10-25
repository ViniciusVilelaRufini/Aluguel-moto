'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { PAYMENT_KIND, PAYMENT_METHOD, PAYMENT_STATUS } from '@/lib/labels';
import { formatBRL, formatDateTime } from '@/lib/format';
import { periodRange } from '@/lib/period';
import { can } from '@/lib/permissions';
import { useAuth } from '@/lib/auth';
import type { S } from '@/lib/types';
import { Button } from '@/ds/Button';
import { DataTable, ErrorNote, Field, KV, Modal, PanelSkeleton, Pill, Select, usePagedQuery, type Column } from './ui';
import { DEFAULT_PERIOD, PeriodPicker, type PeriodState } from './PeriodPicker';
import { WalletAdjustDialog } from './WalletAdjustDialog';

type Payment = S<'Payment'>;
type StatusFilter = '' | S<'PaymentStatus'>;
type KindFilter = '' | S<'PaymentKind'>;

export const PAYMENT_STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'Todas' },
  ...(Object.keys(PAYMENT_STATUS) as S<'PaymentStatus'>[]).map((s) => ({ value: s as StatusFilter, label: PAYMENT_STATUS[s][0] })),
];
export const PAYMENT_KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: '', label: 'Todos' },
  ...(Object.keys(PAYMENT_KIND) as S<'PaymentKind'>[]).map((k) => ({ value: k as KindFilter, label: PAYMENT_KIND[k] })),
];

/** Colunas da lista de pagamentos (datas em America/Sao_Paulo, dinheiro em reais a partir de centavos). */
export function paymentColumns(): Column<Payment>[] {
  return [
    { key: 'createdAt', label: 'Criado em', render: (p) => formatDateTime(p.createdAt) },
    { key: 'kind', label: 'Tipo', render: (p) => PAYMENT_KIND[p.kind] },
    { key: 'method', label: 'Forma', render: (p) => PAYMENT_METHOD[p.method] },
    { key: 'amountCents', label: 'Valor', align: 'right', render: (p) => formatBRL(p.amountCents) },
    { key: 'refundedCents', label: 'Estornado', align: 'right', render: (p) => (p.refundedCents ? formatBRL(p.refundedCents) : '—') },
    { key: 'status', label: 'Situação', render: (p) => <Pill tone={PAYMENT_STATUS[p.status][1]}>{PAYMENT_STATUS[p.status][0]}</Pill> },
  ];
}

/**
 * Financeiro > Pagamentos (`GET /payments`, `GET /payments/{id}`; admin, financeiro e suporte).
 * O contrato não tem filtro por forma de pagamento nem CSV desta lista: a forma aparece só como coluna.
 */
export function PaymentsPanel() {
  const { groups } = useAuth();
  const [status, setStatus] = useState<StatusFilter>('');
  const [kind, setKind] = useState<KindFilter>('');
  const [period, setPeriod] = useState<PeriodState>({ ...DEFAULT_PERIOD, kind: '30d' });
  const [open, setOpen] = useState<Payment | null>(null);
  // Estável entre renderizações: presets "até agora" usam `new Date()` e não podem recalcular a cada render.
  const range = useMemo(() => periodRange(period.kind, period), [period]);
  const { rows, loading, error, pager, refetch } = usePagedQuery<Payment>(['payments', status, kind, period.kind, period.from, period.to], (cursor) =>
    unwrap(api.GET('/payments', { params: { query: { limit: 15, cursor, status: status || undefined, kind: kind || undefined, from: range?.from, to: range?.to } } })), !!range);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ width: 200 }}><Field label="Situação"><Select<StatusFilter> testId="payments-status" value={status} onChange={setStatus} options={PAYMENT_STATUS_OPTIONS} /></Field></div>
        <div style={{ width: 200 }}><Field label="Tipo"><Select<KindFilter> testId="payments-kind" value={kind} onChange={setKind} options={PAYMENT_KIND_OPTIONS} /></Field></div>
        <div style={{ paddingTop: 22 }}><PeriodPicker testId="payments-period" value={period} onChange={setPeriod} /></div>
      </div>
      <ErrorNote error={error} onRetry={() => refetch()} />
      <DataTable<Payment> testId="payments-table" label="Pagamentos" sticky rows={rows} loading={loading && !!range} pager={pager} onRowClick={setOpen}
        empty="Nenhum pagamento neste filtro." emptyIcon="Wallet" columns={paymentColumns()} />
      {open && <PaymentDetail id={open.id} canAdjust={can(groups, 'wallet.adjust')} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PaymentDetail({ id, canAdjust, onClose }: { id: string; canAdjust: boolean; onClose: () => void }) {
  const q = useQuery({ queryKey: ['payment', id], queryFn: () => unwrap(api.GET('/payments/{id}', { params: { path: { id } } })) });
  const [adjusting, setAdjusting] = useState(false);
  const p = q.data;
  return (
    <>
      <Modal open title="Pagamento" onClose={onClose} testId="payment-detail" width={480}
        actions={<>
          {p && canAdjust && <Button size="sm" variant="secondary" icon="Wallet" testId="payment-adjust-wallet" onClick={() => setAdjusting(true)}>Ajustar carteira do cliente</Button>}
          <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
        </>}>
        <ErrorNote error={q.error} onRetry={() => q.refetch()} />
        {q.isLoading && <PanelSkeleton rows={5} />}
        {p && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <KV k="Situação" v={<Pill tone={PAYMENT_STATUS[p.status][1]}>{PAYMENT_STATUS[p.status][0]}</Pill>} />
            <KV k="Tipo" v={PAYMENT_KIND[p.kind]} />
            <KV k="Forma" v={p.method === 'card' && p.cardLast4 ? `${PAYMENT_METHOD[p.method]} final ${p.cardLast4}` : PAYMENT_METHOD[p.method]} />
            <KV k="Valor" v={formatBRL(p.amountCents)} />
            <KV k="Estornado" v={formatBRL(p.refundedCents)} />
            {p.failureReason && <KV k="Motivo da falha" v={p.failureReason} />}
            <KV k="Criado em" v={formatDateTime(p.createdAt)} />
            <KV k="Atualizado em" v={formatDateTime(p.updatedAt)} />
            <KV k="Cliente" v={p.customerId.slice(0, 8)} mono />
            {p.rentalId && <KV k="Aluguel" v={p.rentalId.slice(0, 8)} mono />}
            {p.providerPaymentId && <KV k="ID no gateway" v={p.providerPaymentId} mono />}
          </div>
        )}
      </Modal>
      {adjusting && p && <WalletAdjustDialog customerId={p.customerId} onClose={() => setAdjusting(false)} />}
    </>
  );
}
