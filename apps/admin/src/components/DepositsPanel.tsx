'use client';

import { useState } from 'react';
import { api, unwrap } from '@/lib/api';
import { DEPOSIT_METHOD, DEPOSIT_STATUS } from '@/lib/labels';
import { formatBRL, formatDateTime } from '@/lib/format';
import type { S } from '@/lib/types';
import { DataTable, ErrorNote, Field, Pill, Select, usePagedQuery } from './ui';

type Deposit = S<'Deposit'>;
type StatusFilter = '' | S<'DepositStatus'>;

export const DEPOSIT_STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'Todas' },
  ...(Object.keys(DEPOSIT_STATUS) as S<'DepositStatus'>[]).map((s) => ({ value: s as StatusFilter, label: DEPOSIT_STATUS[s][0] })),
];

/** Financeiro > Cauções (`GET /payments/deposits`) com filtro de status; admin e financeiro. */
export function DepositsPanel() {
  const [status, setStatus] = useState<StatusFilter>('');
  const { rows, loading, error, pager } = usePagedQuery<Deposit>(['deposits', status], (cursor) =>
    unwrap(api.GET('/payments/deposits', { params: { query: { limit: 15, cursor, status: status || undefined } } })));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 220 }}>
        <Field label="Situação">
          <Select<StatusFilter> testId="deposits-status" value={status} onChange={setStatus} options={DEPOSIT_STATUS_OPTIONS} />
        </Field>
      </div>
      <ErrorNote error={error} />
      <DataTable<Deposit> testId="deposits-table" label="Cauções" sticky rows={rows} loading={loading} pager={pager} empty="Nenhuma caução encontrada." emptyIcon="Wallet"
        columns={[
          { key: 'createdAt', label: 'Criada em', render: (d) => formatDateTime(d.createdAt) },
          { key: 'method', label: 'Forma', render: (d) => DEPOSIT_METHOD[d.method] },
          { key: 'amountCents', label: 'Valor', align: 'right', render: (d) => formatBRL(d.amountCents) },
          { key: 'capturedCents', label: 'Cobrado', align: 'right', render: (d) => (d.capturedCents ? formatBRL(d.capturedCents) : '—') },
          { key: 'status', label: 'Situação', render: (d) => <Pill tone={DEPOSIT_STATUS[d.status][1]}>{DEPOSIT_STATUS[d.status][0]}</Pill> },
          { key: 'rentalId', label: 'Aluguel', mono: true, render: (d) => (d.rentalId ? d.rentalId.slice(0, 8) : '—') },
        ]} />
    </div>
  );
}
