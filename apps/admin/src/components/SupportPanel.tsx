'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { CLAIM_STATUS, CLAIM_TYPE, DISPUTE_STATUS, INCIDENT_CATEGORY, INCIDENT_STATUS } from '@/lib/labels';
import { formatBRL, formatDateTime, timeAgo } from '@/lib/format';
import { useNarrow } from '@/lib/use-narrow';
import { useSubmitGuard } from '@/lib/submit-guard';
import { toCents, validMoney } from '@/lib/money';
import { MESSAGE_STATUS, lastUnreadFromCustomer, messageStatus } from '@/lib/chat';
import { Icon } from '@/ds/Icon';
import type { S } from '@/lib/types';
import { Button } from '@/ds/Button';
import { SegmentedControl } from '@/ds/SegmentedControl';
import { DataTable, ErrorNote, Field, Modal, Pill, Select, TextArea, TextInput, usePagedQuery, useToast } from './ui';

type Sub = 'chat' | 'disputes' | 'claims' | 'incidents';
const SUBS: { value: Sub; label: string }[] = [
  { value: 'chat', label: 'Conversas' },
  { value: 'disputes', label: 'Contestações' },
  { value: 'claims', label: 'Sinistros' },
  { value: 'incidents', label: 'Ocorrências' },
];

export function SupportPanel({ customerId }: { customerId?: string }) {
  const [sub, setSub] = useState<Sub>('chat');
  const narrow = useNarrow();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0 }}>
      {narrow ? (
        <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
          <SegmentedControl label="Seções do suporte" options={SUBS} value={sub} onChange={setSub} style={{ width: 'max-content', minWidth: '100%' }} />
        </div>
      ) : <SegmentedControl label="Seções do suporte" options={SUBS} value={sub} onChange={setSub} style={{ maxWidth: 520 }} />}
      {sub === 'chat' && <Conversations customerId={customerId} />}
      {sub === 'disputes' && <Disputes customerId={customerId} />}
      {sub === 'claims' && <Claims customerId={customerId} />}
      {sub === 'incidents' && <Incidents customerId={customerId} />}
    </div>
  );
}

/** Contrato: SupportMessageCreate.body tem no máximo 4000 caracteres. */
const MAX_REPLY = 4000;

function Conversations({ customerId }: { customerId?: string }) {
  const { groups } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const [sel, setSel] = useState<S<'SupportConversation'> | null>(null);
  const [text, setText] = useState('');
  const canReply = can(groups, 'support.reply');
  const end = useRef<HTMLDivElement>(null);
  const narrow = useNarrow();

  const list = useQuery({
    queryKey: ['conversations', status, customerId ?? ''],
    queryFn: () => unwrap(api.GET('/support/conversations', { params: { query: { status, customerId, limit: 50 } } })),
    refetchInterval: 15_000,
  });
  const msgs = useQuery({
    queryKey: ['messages', sel?.id],
    enabled: !!sel,
    queryFn: () => unwrap(api.GET('/support/conversations/{id}/messages', { params: { path: { id: sel!.id }, query: { limit: 100 } } })),
    refetchInterval: 5_000,
  });
  // Chrome recente devolve uma Promise em scrollIntoView: o efeito não pode retorná-la (vira "cleanup").
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.data]);

  const send = useMutation({
    mutationFn: () => unwrap(api.POST('/support/conversations/{id}/messages', { params: { path: { id: sel!.id } }, body: { body: text.trim() } })),
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['messages', sel?.id] }); },
  });
  const toggle = useMutation({
    mutationFn: () => unwrap(api.PATCH('/support/conversations/{id}', { params: { path: { id: sel!.id } }, body: { status: sel!.status === 'open' ? 'closed' : 'open' } })),
    onSuccess: () => { setSel(null); qc.invalidateQueries({ queryKey: ['conversations'] }); },
  });

  // O endpoint de mensagens vem em ordem do servidor; mostramos da mais antiga para a mais nova.
  const items = [...(msgs.data?.items ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Ao abrir a conversa (e quando chega mensagem nova do cliente), marca como lida até a última do cliente.
  // Só quem atende (admin, suporte) marca; o cliente passa a ver "Lida" nas mensagens dele.
  const upTo = canReply && sel ? lastUnreadFromCustomer(msgs.data?.items ?? []) : undefined;
  const marked = useRef<string | null>(null);
  useEffect(() => {
    if (!sel || !upTo || marked.current === upTo) return;
    marked.current = upTo;
    unwrap(api.POST('/support/conversations/{id}/read', { params: { path: { id: sel.id } }, body: { upToMessageId: upTo } }))
      .then(() => qc.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => { marked.current = null; });
  }, [sel, upTo, qc]);

  const overLimit = text.length > MAX_REPLY;
  const showList = !narrow || !sel;
  const showChat = !narrow || !!sel;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'minmax(220px, 320px) minmax(0, 1fr)', gap: 14, minHeight: 420 }}>
      {showList && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SegmentedControl options={[{ value: 'open', label: 'Abertas' }, { value: 'closed', label: 'Fechadas' }]} value={status} onChange={(v: 'open' | 'closed') => { setStatus(v); setSel(null); }} />
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {(list.data?.items ?? []).map((c) => (
            <button key={c.id} type="button" onClick={() => setSel(c)} aria-current={sel?.id === c.id ? 'true' : undefined} style={{ display: 'block', width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit', border: 0, borderBottom: '1px solid var(--ink-100)', padding: '12px 14px', cursor: 'pointer', background: sel?.id === c.id ? 'var(--brand-soft)' : 'transparent' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{c.customerName ?? 'Cliente'}{c.unreadCount ? <span style={{ marginLeft: 8 }}><Pill tone="danger">{c.unreadCount}</Pill></span> : null}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.subject} · {timeAgo(c.lastMessageAt)}</div>
            </button>
          ))}
          {list.data?.items.length === 0 && <div style={{ padding: 16, fontSize: 14, color: 'var(--text-secondary)' }}>Nenhuma conversa.</div>}
        </div>
      </div>}
      {showChat && <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', minHeight: 420, minWidth: 0 }}>
        {!sel ? <div style={{ margin: 'auto', color: 'var(--text-secondary)', fontSize: 14 }}>Selecione uma conversa.</div> : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--ink-100)' }}>
              {narrow && <Button size="sm" variant="ghost" icon="ArrowLeft" onClick={() => setSel(null)}>Voltar</Button>}
              <div style={{ flex: 1, fontWeight: 700, minWidth: 0, overflowWrap: 'anywhere' }}>{sel.subject}</div>
              {canReply && <Button size="sm" variant="ghost" onClick={() => toggle.mutate()}>{sel.status === 'open' ? 'Fechar conversa' : 'Reabrir'}</Button>}
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420 }}>
              {items.map((m) => (
                <div key={m.id} style={{ alignSelf: m.authorType === 'customer' ? 'flex-start' : 'flex-end', maxWidth: narrow ? '92%' : '75%', padding: '8px 12px', borderRadius: 14, background: m.authorType === 'customer' ? 'var(--surface-sunken)' : 'var(--brand-soft)', fontSize: 14 }}>
                  <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.body}</div>
                  {m.attachmentObjectKeys && m.attachmentObjectKeys.length > 0 && (
                    <ul aria-label="Anexos" style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                      {m.attachmentObjectKeys.map((k) => (
                        <li key={k} title={k} style={{ display: 'flex', alignItems: 'center', gap: 4, overflowWrap: 'anywhere' }}><Icon name="Paperclip" size={12} />Anexo: {k.split('/').pop()}</li>
                      ))}
                    </ul>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, justifyContent: m.authorType === 'customer' ? 'flex-start' : 'flex-end' }}>
                    <span>{m.authorName ?? (m.authorType === 'system' ? 'Sistema' : 'Cliente')} · {formatDateTime(m.createdAt)}</span>
                    {m.authorType !== 'customer' && (() => {
                      const st = MESSAGE_STATUS[messageStatus(m)];
                      return (
                        <span data-testid="message-status" data-status={messageStatus(m)} title={st.label} aria-label={st.label} style={{ display: 'inline-flex', color: st.strong ? 'var(--info-ink)' : 'var(--text-secondary)' }}>
                          <Icon name={st.icon} size={14} />
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ))}
              <div ref={end} />
            </div>
            {canReply && sel.status === 'open' && (
              <form onSubmit={(e) => { e.preventDefault(); if (text.trim() && !overLimit) send.mutate(); }} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--ink-100)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <TextInput value={text} onChange={setText} placeholder="Escreva uma resposta" />
                  {text.length >= MAX_REPLY - 200 && (
                    <div role={overLimit ? 'alert' : undefined} style={{ marginTop: 4, fontSize: 12, color: overLimit ? 'var(--danger-ink)' : 'var(--text-secondary)' }}>
                      {text.length}/{MAX_REPLY}{overLimit ? ' — a resposta passa do limite de 4.000 caracteres' : ''}
                    </div>
                  )}
                </div>
                <Button size="sm" type="submit" icon="Send" disabled={send.isPending || !text.trim() || overLimit}>Enviar</Button>
              </form>
            )}
            <ErrorNote error={send.error ?? toggle.error} />
          </>
        )}
      </div>}
    </div>
  );
}

function Disputes({ customerId }: { customerId?: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { groups } = useAuth();
  const [sel, setSel] = useState<S<'Dispute'> | null>(null);
  const [decision, setDecision] = useState<'accepted' | 'rejected'>('accepted');
  const [text, setText] = useState('');
  const [refund, setRefund] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const [refundErr, setRefundErr] = useState('');
  const guard = useSubmitGuard();
  const rental = useQuery({ queryKey: ['rental', sel?.rentalId], enabled: !!sel && !sel.paymentId, queryFn: () => unwrap(api.GET('/rentals/{id}', { params: { path: { id: sel!.rentalId } } })) });
  const paymentId = sel?.paymentId ?? rental.data?.paymentId;
  const payment = useQuery({ queryKey: ['payment', paymentId], enabled: !!paymentId, queryFn: () => unwrap(api.GET('/payments/{id}', { params: { path: { id: paymentId! } } })) });
  const { rows, loading, error, pager } = usePagedQuery<S<'Dispute'>>(['disputes', customerId ?? ''], (cursor) => unwrap(api.GET('/support/disputes', { params: { query: { cursor, customerId, limit: 15 } } })));
  const canResolve = groups.some((g) => ['admin', 'financeiro', 'suporte'].includes(g));
  return (
    <>
      <ErrorNote error={error} />
      <DataTable<S<'Dispute'>> rows={rows} loading={loading} pager={pager} empty="Nenhuma contestação."
        columns={[
          { key: 'createdAt', label: 'Aberta em', render: (r) => formatDateTime(r.createdAt) },
          { key: 'rentalId', label: 'Aluguel', mono: true, render: (r) => <span title={r.rentalId}>{r.rentalId.slice(0, 8)}</span> },
          ...(customerId ? [] : [{ key: 'customerId', label: 'Cliente', mono: true, render: (r: S<'Dispute'>) => <span title={r.customerId}>{r.customerId.slice(0, 8)}</span> }]),
          { key: 'reason', label: 'Motivo', render: (r) => <span style={{ whiteSpace: 'normal' }}>{r.reason}</span> },
          { key: 'status', label: 'Situação', render: (r) => <Pill tone={DISPUTE_STATUS[r.status][1]}>{DISPUTE_STATUS[r.status][0]}</Pill> },
          { key: 'a', label: '', align: 'right', render: (r) => canResolve && (r.status === 'open' || r.status === 'under_review') ? <Button size="sm" variant="dark" onClick={() => { setSel(r); setText(''); setRefund(''); setErr(null); setRefundErr(''); }}>Resolver</Button> : null },
        ]} />
      <Modal open={!!sel} title="Resolver contestação" onClose={() => setSel(null)}
        actions={<><Button size="sm" variant="ghost" onClick={() => setSel(null)}>Cancelar</Button>
          <Button size="sm" variant="dark" disabled={text.trim().length < 3 || guard.busy} aria-busy={guard.busy} onClick={() => guard.run(async () => {
            setErr(null); setRefundErr('');
            let cents: number | undefined;
            if (decision === 'accepted' && refund.trim()) {
              cents = toCents(refund);
              if (!validMoney(refund) || !Number.isFinite(cents) || cents < 1) { setRefundErr('Informe um valor válido, de pelo menos R$ 0,01.'); return; }
              const p = payment.data;
              if (p && cents > p.amountCents - p.refundedCents) { setRefundErr(`O valor excede o que ainda pode ser estornado (${formatBRL(Math.max(0, p.amountCents - p.refundedCents))}).`); return; }
            }
            try {
              await unwrap(api.POST('/support/disputes/{id}/resolve', { params: { path: { id: sel!.id } }, body: { decision, resolution: text.trim(), ...(cents ? { refundAmountCents: cents } : {}) } }));
              toast('Contestação resolvida'); qc.invalidateQueries({ queryKey: ['disputes'] }); setSel(null);
            } catch (e) { setErr(e); }
          })}>Confirmar</Button></>}>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{sel?.reason}</div>
        <Field label="Decisão"><Select value={decision} onChange={setDecision} options={[{ value: 'accepted', label: 'Aceitar' }, { value: 'rejected', label: 'Recusar' }]} /></Field>
        {decision === 'accepted' && <Field label="Valor a estornar (R$)" hint={payment.data ? `Opcional. Ainda estornável: ${formatBRL(Math.max(0, payment.data.amountCents - payment.data.refundedCents))}.` : 'Opcional.'} error={refundErr || undefined}><TextInput value={refund} onChange={(v) => { setRefund(v); setRefundErr(''); }} placeholder="0,00" /></Field>}
        <Field label="Resolução"><TextArea value={text} onChange={setText} /></Field>
        <ErrorNote error={err} />
      </Modal>
    </>
  );
}

function Claims({ customerId }: { customerId?: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [sel, setSel] = useState<S<'Claim'> | null>(null);
  const [status, setStatus] = useState<S<'ClaimStatus'>>('under_review');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const { rows, loading, error, pager } = usePagedQuery<S<'Claim'>>(['claims', customerId ?? ''], (cursor) => unwrap(api.GET('/support/claims', { params: { query: { cursor, customerId, limit: 15 } } })));
  return (
    <>
      <ErrorNote error={error} />
      <DataTable<S<'Claim'>> rows={rows} loading={loading} pager={pager} empty="Nenhum sinistro."
        columns={[
          { key: 'occurredAt', label: 'Ocorrido em', render: (r) => formatDateTime(r.occurredAt) },
          { key: 'type', label: 'Tipo', render: (r) => CLAIM_TYPE[r.type] },
          { key: 'description', label: 'Descrição', render: (r) => <span style={{ whiteSpace: 'normal' }}>{r.description}</span> },
          { key: 'status', label: 'Situação', render: (r) => <Pill tone={CLAIM_STATUS[r.status][1]}>{CLAIM_STATUS[r.status][0]}</Pill> },
          { key: 'a', label: '', align: 'right', render: (r) => <Button size="sm" variant="secondary" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => { setSel(r); setStatus(r.status); setNote(''); setErr(null); }}>Atualizar</Button> },
        ]} />
      <Modal open={!!sel} title="Atualizar sinistro" onClose={() => setSel(null)}
        actions={<><Button size="sm" variant="ghost" onClick={() => setSel(null)}>Cancelar</Button>
          <Button size="sm" variant="dark" onClick={async () => {
            try {
              await unwrap(api.PATCH('/support/claims/{id}', { params: { path: { id: sel!.id } }, body: { status, ...(note.trim() ? { statusNote: note.trim() } : {}) } }));
              toast('Sinistro atualizado'); qc.invalidateQueries({ queryKey: ['claims'] }); setSel(null);
            } catch (e) { setErr(e); }
          }}>Salvar</Button></>}>
        <Field label="Situação"><Select value={status} onChange={setStatus} options={(Object.keys(CLAIM_STATUS) as S<'ClaimStatus'>[]).map((v) => ({ value: v, label: CLAIM_STATUS[v][0] }))} /></Field>
        <Field label="Observação"><TextArea value={note} onChange={setNote} /></Field>
        <ErrorNote error={err} />
      </Modal>
    </>
  );
}

function Incidents({ customerId }: { customerId?: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [sel, setSel] = useState<S<'Incident'> | null>(null);
  const [status, setStatus] = useState<S<'IncidentStatus'>>('in_progress');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const { rows, loading, error, pager } = usePagedQuery<S<'Incident'>>(['incidents', customerId ?? ''], (cursor) => unwrap(api.GET('/support/incidents', { params: { query: { cursor, customerId, limit: 15 } } })));
  return (
    <>
      <ErrorNote error={error} />
      <DataTable<S<'Incident'>> rows={rows} loading={loading} pager={pager} empty="Nenhuma ocorrência."
        columns={[
          { key: 'createdAt', label: 'Registrada em', render: (r) => formatDateTime(r.createdAt) },
          { key: 'category', label: 'Categoria', render: (r) => INCIDENT_CATEGORY[r.category] },
          { key: 'description', label: 'Descrição', render: (r) => <span style={{ whiteSpace: 'normal' }}>{r.description}</span> },
          { key: 'status', label: 'Situação', render: (r) => <Pill tone={INCIDENT_STATUS[r.status][1]}>{INCIDENT_STATUS[r.status][0]}</Pill> },
          { key: 'a', label: '', align: 'right', render: (r) => <Button size="sm" variant="secondary" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => { setSel(r); setStatus(r.status); setNote(''); setErr(null); }}>Atualizar</Button> },
        ]} />
      <Modal open={!!sel} title="Atualizar ocorrência" onClose={() => setSel(null)}
        actions={<><Button size="sm" variant="ghost" onClick={() => setSel(null)}>Cancelar</Button>
          <Button size="sm" variant="dark" onClick={async () => {
            try {
              await unwrap(api.PATCH('/support/incidents/{id}', { params: { path: { id: sel!.id } }, body: { status, ...(note.trim() ? { resolutionNote: note.trim() } : {}) } }));
              toast('Ocorrência atualizada'); qc.invalidateQueries({ queryKey: ['incidents'] }); setSel(null);
            } catch (e) { setErr(e); }
          }}>Salvar</Button></>}>
        <Field label="Situação"><Select value={status} onChange={setStatus} options={(Object.keys(INCIDENT_STATUS) as S<'IncidentStatus'>[]).map((v) => ({ value: v, label: INCIDENT_STATUS[v][0] }))} /></Field>
        <Field label="Observação"><TextArea value={note} onChange={setNote} /></Field>
        <ErrorNote error={err} />
      </Modal>
    </>
  );
}

