'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { PLAN_LABEL, RENTAL_EVENT, RENTAL_STATUS, COVERAGE_LABEL } from '@/lib/labels';
import { dayEndIso, dayStartIso, formatBRL, formatDateTime, formatDuration } from '@/lib/format';
import { toCents } from '@/lib/money';
import type { S } from '@/lib/types';
import { DataTable, ErrorNote, Field, KV, Page, Pill, ReasonDialog, SectionTitle, Select, SidePanel, TextInput, usePagedQuery, useToast } from './ui';
import { Alert } from '@/ds/Alert';
import { Button } from '@/ds/Button';

type Rental = S<'Rental'>;
type StatusFilter = '' | S<'RentalStatus'>;

export function RentalsPanel({ customerId, selectedId, onSelect }: { customerId?: string; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const [status, setStatus] = useState<StatusFilter>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { rows, loading, error, pager } = usePagedQuery<Rental>(['rentals', status, from, to, customerId ?? ''], (cursor) =>
    unwrap(api.GET('/rentals', {
      params: { query: { limit: 15, cursor, status: status || undefined, customerId, from: from ? dayStartIso(from) : undefined, to: to ? dayEndIso(to) : undefined } },
    })),
  );

  return (
    <div className="split" style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
      <Page style={{ padding: 0, gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ width: 200 }}>
            <Field label="Situação">
              <Select<StatusFilter> value={status} onChange={setStatus} options={[{ value: '', label: 'Todas' }, ...(Object.keys(RENTAL_STATUS) as S<'RentalStatus'>[]).map((s) => ({ value: s, label: RENTAL_STATUS[s][0] }))]} />
            </Field>
          </div>
          <div style={{ width: 170 }}><Field label="De"><TextInput type="date" value={from} onChange={setFrom} /></Field></div>
          <div style={{ width: 170 }}><Field label="Até"><TextInput type="date" value={to} onChange={setTo} /></Field></div>
        </div>
        <ErrorNote error={error} />
        <DataTable<Rental>
          testId="rentals-table" sticky
          rows={rows}
          loading={loading}
          pager={pager}
          selectedKey={selectedId}
          onRowClick={(r) => onSelect(r.id)}
          empty="Nenhum aluguel encontrado."
          columns={[
            { key: 'startedAt', label: 'Início', render: (r) => formatDateTime(r.startedAt) },
            { key: 'vehicleCode', label: 'Moto', mono: true },
            { key: 'planCode', label: 'Plano', render: (r) => PLAN_LABEL[r.planCode] },
            { key: 'status', label: 'Situação', render: (r) => <Pill tone={RENTAL_STATUS[r.status][1]}>{RENTAL_STATUS[r.status][0]}</Pill> },
            { key: 'costCents', label: 'Valor', align: 'right', render: (r) => formatBRL(r.costCents) },
          ]}
        />
      </Page>
      {selectedId && <RentalDetail id={selectedId} onClose={() => onSelect(null)} />}
    </div>
  );
}

function RentalDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { groups } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [forceEnd, setForceEnd] = useState(false);
  const [refund, setRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');

  const rental = useQuery({ queryKey: ['rental', id], queryFn: () => unwrap(api.GET('/rentals/{id}', { params: { path: { id } } })) });
  const events = useQuery({ queryKey: ['rental-events', id], queryFn: () => unwrap(api.GET('/rentals/{id}/events', { params: { path: { id } } })) });
  const r = rental.data;
  const payment = useQuery({ queryKey: ['payment', r?.paymentId], enabled: !!r?.paymentId, queryFn: () => unwrap(api.GET('/payments/{id}', { params: { path: { id: r!.paymentId! } } })) });
  const finished = r?.status === 'ended' || r?.status === 'force_ended';

  return (
    <SidePanel width={380} onClose={onClose} testId="rental-detail" title={<div style={{ font: '700 18px/1.25 var(--font-sans)' }}>Aluguel {r?.vehicleCode ?? ''}</div>}>
      <ErrorNote error={rental.error} />
      {r && (
        <>
          <Pill tone={RENTAL_STATUS[r.status][1]}>{RENTAL_STATUS[r.status][0]}</Pill>
          <div>
            <KV k="Início" v={formatDateTime(r.startedAt)} />
            <KV k="Fim" v={formatDateTime(r.endedAt)} />
            <KV k="Duração" v={formatDuration(r.elapsedSeconds)} />
            <KV k="Pausado" v={formatDuration(r.pausedSeconds)} />
            <KV k="Plano" v={PLAN_LABEL[r.planCode]} />
            <KV k="Seguro" v={COVERAGE_LABEL[r.coverage]} />
            <KV k="Cupom" v={r.couponCode ?? '—'} />
            <KV k="Valor" v={formatBRL(r.costCents)} />
            <KV k="Cliente" v={<Link href={`/customers?customer=${r.customerId}`} style={{ color: 'var(--text-link)', fontWeight: 600 }}>Abrir ficha</Link>} />
            {r.forceEndReason && <KV k="Motivo do encerramento" v={r.forceEndReason} />}
          </div>
          {r.breakdown && (
            <div>
              <SectionTitle>Composição do valor</SectionTitle>
              {r.breakdown.lines.map((l, i) => <KV key={i} k={l.description} v={formatBRL(l.amountCents)} />)}
              {r.breakdown.discountCents > 0 && <KV k="Desconto" v={`- ${formatBRL(r.breakdown.discountCents)}`} />}
              <KV k="Total" v={formatBRL(r.breakdown.totalCents)} />
            </div>
          )}
          <div>
            <SectionTitle>Eventos</SectionTitle>
            {(events.data?.items ?? []).map((e) => (
              <div key={e.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
                <span style={{ font: '500 12px/1.4 var(--font-mono)', color: 'var(--text-secondary)' }}>{formatDateTime(e.at).slice(-5)}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{RENTAL_EVENT[e.type]}</div>
                  {e.message && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.message}</div>}
                </div>
              </div>
            ))}
            {events.data?.items.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Sem eventos.</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
            {can(groups, 'rental.forceEnd') && !finished && <Button size="sm" variant="danger" icon="Square" testId="force-end" onClick={() => setForceEnd(true)}>Encerrar à força</Button>}
            {can(groups, 'payment.refund') && r.paymentId && finished && <Button size="sm" variant="dark" icon="Undo2" testId="refund" onClick={() => { setRefundAmount(''); setRefund(true); }}>Estornar pagamento</Button>}
          </div>
        </>
      )}
      <ReasonDialog
        open={forceEnd}
        title="Encerrar aluguel à força"
        description="O aluguel é encerrado e liquidado agora. Fora da zona de devolução só o admin pode encerrar, e a taxa de encerramento forçado é somada."
        confirmLabel="Encerrar aluguel"
        danger
        onClose={() => setForceEnd(false)}
        onConfirm={async (reason) => {
          await unwrap(api.POST('/rentals/{id}/force-end', { params: { path: { id } }, body: { reason } }));
          toast('Aluguel encerrado');
          qc.invalidateQueries({ queryKey: ['rental', id] });
          qc.invalidateQueries({ queryKey: ['rentals'] });
        }}
      />
      <ReasonDialog
        open={refund}
        title="Estornar pagamento"
        confirmLabel="Estornar"
        danger
        onClose={() => setRefund(false)}
        onConfirm={async (reason) => {
          const cents = refundAmount.trim() ? toCents(refundAmount) : undefined;
          if (cents !== undefined && (!Number.isFinite(cents) || cents <= 0)) throw new Error('Informe um valor válido');
          const p = payment.data;
          if (cents !== undefined && p && cents > p.amountCents - p.refundedCents) throw new Error(`O valor excede o que ainda pode ser estornado (${formatBRL(Math.max(0, p.amountCents - p.refundedCents))})`);
          await unwrap(api.POST('/payments/{id}/refund', { params: { path: { id: r!.paymentId! }, header: { 'Idempotency-Key': crypto.randomUUID() } }, body: { reason, ...(cents ? { amountCents: cents } : {}) } }));
          toast('Estorno solicitado');
          qc.invalidateQueries({ queryKey: ['rental', id] });
          qc.invalidateQueries({ queryKey: ['payment', r!.paymentId] });
        }}
      >
        <Field label="Valor a estornar (R$)" hint="Deixe em branco para estornar o valor total.">
          <TextInput value={refundAmount} onChange={setRefundAmount} placeholder="0,00" />
        </Field>
        <Alert tone="warning" icon="TriangleAlert">O estorno é registrado na auditoria.</Alert>
      </ReasonDialog>
    </SidePanel>
  );
}
