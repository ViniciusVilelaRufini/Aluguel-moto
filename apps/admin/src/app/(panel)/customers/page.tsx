'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can, canSeeFullCpf } from '@/lib/permissions';
import { displayCpf, isValidCpf } from '@/lib/cpf';
import { CLAIM_STATUS, CONVERSATION_STATUS, CUSTOMER_STATUS, DISPUTE_STATUS, KYC_STATUS, PAYMENT_KIND, PAYMENT_STATUS, PLAN_LABEL, RENTAL_STATUS } from '@/lib/labels';
import { formatBRL, formatDate, formatDateTime, formatDuration } from '@/lib/format';
import type { S } from '@/lib/types';
import { DataTable, Empty, ErrorNote, Field, Initials, KV, Modal, PanelSkeleton, Page, PageHeader, Pill, ReasonDialog, SectionTitle, SidePanel, Skeleton, TextInput, usePagedQuery, useToast } from '@/components/ui';
import { RentalsPanel } from '@/components/RentalsPanel';
import { SupportPanel } from '@/components/SupportPanel';
import { SubscriptionVehicleDialog } from '@/components/SubscriptionVehicleDialog';
import { canSeeFullPixKey, displayPixKey } from '@/lib/pix';
import { useRealtime } from '@/lib/realtime';
import { SUBSCRIPTION_STATUS } from '@/lib/labels';
import { Badge } from '@/ds/Badge';
import { Button } from '@/ds/Button';
import { Input } from '@/ds/Input';
import { PhotoCapture } from '@/ds/PhotoCapture';
import { SegmentedControl } from '@/ds/SegmentedControl';

type Tab = 'customers' | 'rentals' | 'support';
type Filter = 'all' | 'pending' | 'blocked';

export default function CustomersPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'customers');
  const [rental, setRental] = useState<string | null>(params.get('rental'));
  const [customer, setCustomer] = useState<string | null>(params.get('customer'));
  const [restrictions, setRestrictions] = useState(false);
  const [supportCustomer, setSupportCustomer] = useState<string | null>(null);

  useEffect(() => {
    const t = params.get('tab') as Tab | null;
    if (t) setTab(t);
    setRental(params.get('rental'));
    if (params.get('customer')) { setCustomer(params.get('customer')); setTab('customers'); }
  }, [params]);

  const changeTab = (t: Tab) => { setTab(t); router.replace(`/customers?tab=${t}`, { scroll: false }); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
      <div style={{ padding: '20px 28px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PageHeader subtitle="Verificação, bloqueio de conta, aluguéis e atendimento">
          {tab === 'customers' && <Button size="sm" variant="secondary" icon="ShieldAlert" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => setRestrictions(true)}>Lista de restrição</Button>}
          <SegmentedControl options={[{ value: 'customers', label: 'Clientes' }, { value: 'rentals', label: 'Aluguéis' }, { value: 'support', label: 'Suporte' }]} value={tab} onChange={changeTab} style={{ width: 340 }} />
        </PageHeader>
      </div>
      <div key={tab} className="section-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
      {tab === 'customers' && <CustomersTab selected={customer} onSelect={setCustomer} onRentals={(id) => { setRental(id); changeTab('rentals'); }} onChat={(id) => { setSupportCustomer(id); changeTab('support'); }} />}
      {tab === 'rentals' && <div style={{ flex: 1, display: 'flex', padding: '14px 0 0 28px', minHeight: 0 }}><RentalsPanel selectedId={rental} onSelect={(id) => { setRental(id); router.replace(id ? `/customers?tab=rentals&rental=${id}` : '/customers?tab=rentals', { scroll: false }); }} /></div>}
      {tab === 'support' && <Page style={{ paddingTop: 14 }}>{supportCustomer && <div><Button size="sm" variant="ghost" icon="X" onClick={() => setSupportCustomer(null)}>Mostrar o atendimento de todos os clientes</Button></div>}<SupportPanel customerId={supportCustomer ?? undefined} /></Page>}
      </div>
      {restrictions && <RestrictionModal onClose={() => setRestrictions(false)} />}
    </div>
  );
}

function CustomersTab({ selected, onSelect, onRentals, onChat }: { selected: string | null; onSelect: (id: string | null) => void; onRentals: (id: string) => void; onChat: (customerId: string) => void }) {
  const params = useSearchParams();
  const { groups } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState(q);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  const full = canSeeFullCpf(groups);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { const v = params.get('q'); if (v) setQ(v); }, [params]);

  const { rows, loading, error, pager } = usePagedQuery<S<'Customer'>>(['customers', filter, debounced], (cursor) =>
    unwrap(api.GET('/customers', {
      params: { query: { limit: 15, cursor, q: debounced || undefined, kycStatus: filter === 'pending' ? 'pending' : undefined, status: filter === 'blocked' ? 'blocked' : undefined } },
    })),
  );

  return (
    <div className="split" style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
      <Page>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Input placeholder={narrow ? 'Buscar por nome, CPF ou e-mail' : 'Buscar por nome, CPF, e-mail ou telefone'} icon="Search" value={q} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} testId="customer-search" />
          </div>
          <SegmentedControl options={[{ value: 'all', label: 'Todos' }, { value: 'pending', label: 'Pendentes' }, { value: 'blocked', label: 'Bloqueados' }]} value={filter} onChange={setFilter} style={{ width: 320 }} />
        </div>
        <ErrorNote error={error} />
        <div className="stack-cells">
        <DataTable<S<'Customer'>>
          testId="customers-table" sticky
          rows={rows}
          loading={loading}
          pager={pager}
          selectedKey={selected}
          onRowClick={(r) => onSelect(r.id)}
          label="Clientes"
          empty={debounced ? `Nenhum cliente para "${debounced}"` : 'Nenhum cliente nesta lista'}
          emptyIcon={debounced ? 'Search' : 'Users'}
          emptyHint={debounced ? 'Confira a grafia ou busque por CPF, e-mail ou telefone.' : undefined}
          emptyAction={debounced || filter !== 'all' ? <Button size="sm" variant="ghost" icon="X" onClick={() => { setQ(''); setFilter('all'); }}>Limpar busca e filtros</Button> : undefined}
          columns={[
            { key: 'name', label: 'Cliente', render: (r) => <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Initials name={r.name ?? r.email} /><span style={{ fontWeight: 600 }}>{r.name ?? r.email}</span></div> },
            { key: 'cpf', label: 'CPF', mono: true, render: (r) => displayCpf(r.cpf, full) },
            { key: 'kycStatus', label: 'Verificação', render: (r) => { const [l, t, i] = KYC_STATUS[r.kycStatus]; return <Badge size="sm" tone={t} icon={i}>{l}</Badge>; } },
            { key: 'plan', label: 'Plano', render: (r) => (r.activePlanCode ? <Pill tone="info" icon="Repeat">{PLAN_LABEL[r.activePlanCode]}</Pill> : <span style={{ color: 'var(--text-secondary)' }}>Avulso</span>) },
            { key: 'rentals', label: 'Aluguéis', align: 'right', render: (r) => r.stats?.rentalsCount ?? '—' },
            { key: 'spent', label: 'Gasto total', align: 'right', render: (r) => (r.stats ? formatBRL(r.stats.totalSpentCents) : '—') },
            { key: 'status', label: 'Conta', render: (r) => (
              <div style={{ display: 'flex', gap: 4 }}>
                <Pill tone={CUSTOMER_STATUS[r.status][1]}>{CUSTOMER_STATUS[r.status][0]}</Pill>
                {r.delinquent && <Pill tone="danger">Inadimplente</Pill>}
                {r.restricted && <Pill tone="danger">Restrição</Pill>}
              </div>
            ) },
          ]}
        />
        </div>
      </Page>
      {selected && <CustomerSheet id={selected} onClose={() => onSelect(null)} onRentals={onRentals} onChat={onChat} />}
    </div>
  );
}

function CustomerSheet({ id, onClose, onRentals, onChat }: { id: string; onClose: () => void; onRentals: (id: string) => void; onChat: (customerId: string) => void }) {
  const { groups } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<'kyc' | 'support' | 'history'>('kyc');
  const [block, setBlock] = useState(false);
  const [addList, setAddList] = useState(true);
  const [review, setReview] = useState<'approved' | 'rejected' | null>(null);
  const q = useQuery({ queryKey: ['customer', id], queryFn: () => unwrap(api.GET('/customers/{id}', { params: { path: { id } } })) });
  const c = q.data;
  const full = canSeeFullCpf(groups);

  const [unblocking, setUnblocking] = useState(false);

  return (
    <SidePanel width={400} onClose={onClose} testId="customer-sheet" title={
      c && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Initials name={c.name ?? c.email} size={48} />
          <div>
            <div style={{ font: '700 18px/1.25 var(--font-sans)' }}>{c.name ?? c.email}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Cliente desde {formatDate(c.createdAt)}</div>
          </div>
        </div>
      )
    }>
      <ErrorNote error={q.error} />
      {q.isLoading && <PanelSkeleton />}
      {c && (
        <>
          <SegmentedControl options={[{ value: 'kyc', label: 'Verificação' }, { value: 'support', label: 'Atendimento' }, { value: 'history', label: 'Histórico' }]} value={tab} onChange={setTab} />
          {tab === 'kyc' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <PhotoCapture height={110} label="Documento" icon="IdCard" done={c.kycStatus === 'approved'} />
                <PhotoCapture height={110} label="Selfie" icon="ScanFace" done={c.kycStatus === 'approved'} />
              </div>
              <div>
                <KV k="Verificação" v={KYC_STATUS[c.kycStatus][0]} />
                <KV k="CPF" v={displayCpf(c.cpf, full)} mono />
                <KV k="E-mail" v={c.email} />
                <KV k="Telefone" v={c.phone ?? '—'} />
                <KV k="Nascimento" v={formatDate(c.birthDate)} />
                <KV k="Localização autorizada" v={c.locationConsent ? 'Sim' : 'Não'} />
                <KV k="Plano" v={c.activePlanCode ? PLAN_LABEL[c.activePlanCode] : 'Avulso'} />
                <KV k="Chave Pix (estornos)" v={<span data-testid="pix-key" data-masked={!canSeeFullPixKey(groups) || undefined}>{displayPixKey(c.pixRefundKeyType, c.pixRefundKey, canSeeFullPixKey(groups))}</span>} />
                {c.blockedReason && <KV k="Motivo do bloqueio" v={c.blockedReason} />}
                {c.stats && <KV k="Contestações abertas" v={c.stats.openDisputes} />}
              </div>
              {c.activeSubscriptionId && <SubscriptionBox subscriptionId={c.activeSubscriptionId} planCode={c.activePlanCode} />}
              {c.kycStatus === 'pending' && can(groups, 'kyc.review') && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" style={{ flex: 1 }} icon="Check" onClick={() => setReview('approved')}>Aprovar</Button>
                  <Button size="sm" variant="danger" style={{ flex: 1 }} icon="X" onClick={() => setReview('rejected')}>Reprovar</Button>
                </div>
              )}
            </>
          )}
          {tab === 'support' && <CustomerTickets customerId={id} onChat={() => onChat(id)} />}
          {tab === 'history' && <CustomerHistory customerId={id} onRentals={onRentals} />}
          <div style={{ flex: 1 }} />
          {can(groups, 'customer.block') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
              {c.status === 'blocked'
                ? <Button size="sm" variant="dark" icon="Check" onClick={() => setUnblocking(true)}>Desbloquear conta</Button>
                : <Button size="sm" variant="dark" icon="Ban" testId="block-customer" onClick={() => { setAddList(false); setBlock(true); }}>Bloquear conta</Button>}
              {c.status !== 'blocked' && <Button size="sm" variant="ghost" icon="ShieldAlert" style={{ color: 'var(--danger-ink)' }} onClick={() => { setAddList(true); setBlock(true); }}>Bloquear e adicionar à lista de restrição</Button>}
            </div>
          )}
          <ReasonDialog
            open={block}
            title="Bloquear conta"
            description={addList ? 'O cliente não consegue alugar e o CPF entra na lista de restrição.' : 'O cliente não consegue alugar até a conta ser desbloqueada.'}
            confirmLabel="Bloquear"
            danger
            onClose={() => setBlock(false)}
            onConfirm={async (reason) => {
              await unwrap(api.POST('/customers/{id}/block', { params: { path: { id } }, body: { reason, addToRestrictionList: addList } }));
              toast('Conta bloqueada');
              qc.invalidateQueries({ queryKey: ['customer', id] });
              qc.invalidateQueries({ queryKey: ['customers'] });
            }}
          />
          <ReasonDialog
            open={unblocking}
            title="Desbloquear conta"
            confirmLabel="Desbloquear"
            onClose={() => setUnblocking(false)}
            onConfirm={async (reason) => {
              await unwrap(api.POST('/customers/{id}/unblock', { params: { path: { id } }, body: { reason } }));
              toast('Conta desbloqueada');
              qc.invalidateQueries({ queryKey: ['customer', id] });
              qc.invalidateQueries({ queryKey: ['customers'] });
            }}
          />
          <ReasonDialog
            open={!!review}
            title={review === 'approved' ? 'Aprovar verificação' : 'Reprovar verificação'}
            confirmLabel={review === 'approved' ? 'Aprovar' : 'Reprovar'}
            danger={review === 'rejected'}
            onClose={() => setReview(null)}
            onConfirm={async (reason) => {
              await unwrap(api.POST('/customers/{id}/kyc-review', { params: { path: { id } }, body: { decision: review!, reason } }));
              toast('Verificação registrada');
              qc.invalidateQueries({ queryKey: ['customer', id] });
              qc.invalidateQueries({ queryKey: ['customers'] });
            }}
          />
        </>
      )}
    </SidePanel>
  );
}

function CustomerTickets({ customerId, onChat }: { customerId: string; onChat: () => void }) {
  const d = useQuery({ queryKey: ['c-disputes', customerId], queryFn: () => unwrap(api.GET('/support/disputes', { params: { query: { customerId, limit: 5 } } })) });
  const cl = useQuery({ queryKey: ['c-claims', customerId], queryFn: () => unwrap(api.GET('/support/claims', { params: { query: { customerId, limit: 5 } } })) });
  const cv = useQuery({ queryKey: ['c-convs', customerId], queryFn: () => unwrap(api.GET('/support/conversations', { params: { query: { customerId, limit: 5 } } })) });
  const rf = useQuery({ queryKey: ['c-refunds', customerId], queryFn: () => unwrap(api.GET('/payments', { params: { query: { customerId, limit: 20 } } })) });
  const refunds = (rf.data?.items ?? []).filter((x) => x.status === 'refunded' || x.status === 'partially_refunded').slice(0, 5);
  const rows: { id: string; t: string; d: string; tone: 'warning' | 'info' | 'success' | 'neutral' | 'danger'; s: string }[] = [
    ...(d.data?.items ?? []).map((x) => ({ id: x.id, t: 'Contestação', d: x.reason, tone: DISPUTE_STATUS[x.status][1], s: DISPUTE_STATUS[x.status][0] })),
    ...(cl.data?.items ?? []).map((x) => ({ id: x.id, t: 'Sinistro', d: x.description, tone: CLAIM_STATUS[x.status][1], s: CLAIM_STATUS[x.status][0] })),
    ...refunds.map((x) => ({ id: x.id, t: 'Estorno', d: `${PAYMENT_KIND[x.kind]} · ${formatBRL(x.amountCents)}`, tone: PAYMENT_STATUS[x.status][1], s: PAYMENT_STATUS[x.status][0] })),
    ...(cv.data?.items ?? []).map((x) => ({ id: x.id, t: 'Chat', d: x.subject, tone: CONVERSATION_STATUS[x.status as 'open' | 'closed']?.[1] ?? 'neutral', s: CONVERSATION_STATUS[x.status as 'open' | 'closed']?.[0] ?? x.status })),
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(d.isLoading || cl.isLoading || cv.isLoading || rf.isLoading) && rows.length === 0 && [0, 1].map((i) => <Skeleton key={i} h={52} r={14} />)}
      {!(d.isLoading || cl.isLoading || cv.isLoading || rf.isLoading) && rows.length === 0 && <Empty compact icon="MessageCircle">Nenhum atendimento deste cliente</Empty>}
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{r.t}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.d}</div>
          </div>
          <Pill tone={r.tone}>{r.s}</Pill>
        </div>
      ))}
      <Button size="sm" variant="secondary" icon="MessageCircle" testId="open-chat" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={onChat}>Abrir chat</Button>
    </div>
  );
}

function CustomerHistory({ customerId, onRentals }: { customerId: string; onRentals: (id: string) => void }) {
  const r = useQuery({ queryKey: ['c-rentals', customerId], queryFn: () => unwrap(api.GET('/rentals', { params: { query: { customerId, limit: 10 } } })) });
  const p = useQuery({ queryKey: ['c-payments', customerId], queryFn: () => unwrap(api.GET('/payments', { params: { query: { customerId, limit: 10 } } })) });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionTitle>Aluguéis</SectionTitle>
      <DataTable<S<'Rental'>> dense rows={r.data?.items ?? []} loading={r.isLoading} empty="Nenhum aluguel." onRowClick={(x) => onRentals(x.id)}
        columns={[
          { key: 'startedAt', label: 'Data', render: (x) => formatDate(x.startedAt) },
          { key: 'vehicleCode', label: 'Moto', mono: true },
          { key: 'elapsedSeconds', label: 'Tempo', align: 'right', render: (x) => formatDuration(x.elapsedSeconds) },
          { key: 'planCode', label: 'Plano', render: (x) => PLAN_LABEL[x.planCode] },
          { key: 'status', label: 'Situação', render: (x) => RENTAL_STATUS[x.status][0] },
          { key: 'costCents', label: 'Valor', align: 'right', render: (x) => formatBRL(x.costCents) },
        ]} />
      <SectionTitle>Pagamentos</SectionTitle>
      <DataTable<S<'Payment'>> dense rows={p.data?.items ?? []} loading={p.isLoading} empty="Nenhum pagamento."
        columns={[
          { key: 'createdAt', label: 'Data', render: (x) => formatDateTime(x.createdAt) },
          { key: 'kind', label: 'Tipo', render: (x) => PAYMENT_KIND[x.kind] },
          { key: 'status', label: 'Situação', render: (x) => PAYMENT_STATUS[x.status][0] },
          { key: 'amountCents', label: 'Valor', align: 'right', render: (x) => formatBRL(x.amountCents) },
        ]} />
    </div>
  );
}

function RestrictionModal({ onClose }: { onClose: () => void }) {
  const { groups } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [cpf, setCpf] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const [removing, setRemoving] = useState<S<'RestrictionEntry'> | null>(null);
  const full = canSeeFullCpf(groups);
  const cpfInvalid = cpf.replace(/\D/g, '').length === 11 && !isValidCpf(cpf);
  const { rows, loading, error, pager } = usePagedQuery<S<'RestrictionEntry'>>(['restrictions'], (cursor) => unwrap(api.GET('/customer-restrictions', { params: { query: { cursor, limit: 10 } } })));
  return (
    <Modal open title="Lista de restrição" onClose={onClose} width={640} actions={<Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>}>
      <ErrorNote error={error ?? err} />
      <DataTable<S<'RestrictionEntry'>> dense rows={rows} loading={loading} pager={pager} empty="Nenhum CPF na lista."
        columns={[
          { key: 'cpf', label: 'CPF', mono: true, render: (r) => displayCpf(r.cpf, full) },
          { key: 'reason', label: 'Motivo', render: (r) => <span style={{ whiteSpace: 'normal' }}>{r.reason}</span> },
          { key: 'createdAt', label: 'Desde', render: (r) => formatDate(r.createdAt) },
          { key: 'a', label: '', align: 'right', render: (r) => can(groups, 'customer.restriction.remove') ? (
            <Button size="sm" variant="ghost" icon="Trash2" style={{ color: 'var(--danger-ink)' }} onClick={() => setRemoving(r)}>Remover</Button>
          ) : null },
        ]} />
      <SectionTitle>Adicionar CPF</SectionTitle>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ width: 170 }}><Field label="CPF" error={cpfInvalid ? 'CPF inválido: confira os dígitos' : undefined}><TextInput value={cpf} onChange={setCpf} placeholder="Somente números" /></Field></div>
        <div style={{ flex: 1, minWidth: 180 }}><Field label="Motivo"><TextInput value={reason} onChange={setReason} /></Field></div>
        <Button size="sm" icon="Plus" disabled={cpf.replace(/\D/g, '').length !== 11 || cpfInvalid || reason.trim().length < 3} onClick={async () => {
          try { await unwrap(api.POST('/customer-restrictions', { body: { cpf: cpf.replace(/\D/g, ''), reason: reason.trim() } })); setCpf(''); setReason(''); setErr(null); toast('CPF adicionado'); qc.invalidateQueries({ queryKey: ['restrictions'] }); } catch (e) { setErr(e); }
        }}>Adicionar</Button>
      </div>
      <Modal open={!!removing} title="Remover da lista de restrição" onClose={() => setRemoving(null)}
        actions={<>
          <Button size="sm" variant="ghost" onClick={() => setRemoving(null)}>Cancelar</Button>
          <Button size="sm" variant="danger" onClick={async () => {
            const r = removing!;
            setRemoving(null);
            try { await unwrap(api.DELETE('/customer-restrictions/{id}', { params: { path: { id: r.id } } })); toast('CPF removido da lista'); qc.invalidateQueries({ queryKey: ['restrictions'] }); } catch (e) { setErr(e); }
          }}>Remover CPF</Button></>}>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Este CPF volta a poder alugar. Confirma a remoção de {removing ? displayCpf(removing.cpf, full) : ''}?</div>
      </Modal>
    </Modal>
  );
}

/**
 * Assinatura semanal/mensal do cliente. O staff não lê a assinatura (`GET /payments/subscriptions/{id}` é do
 * cliente): a moto fixa vem da frota (`Vehicle.assignedSubscriptionId`) e o estado completo aparece depois de
 * definir a moto (resposta do `PUT .../vehicle`). Pausar e retomar são ações do cliente no app.
 */
function SubscriptionBox({ subscriptionId, planCode }: { subscriptionId: string; planCode?: S<'SubscriptionPlanCode'> }) {
  const { groups } = useAuth();
  const { vehicles } = useRealtime();
  const [assign, setAssign] = useState(false);
  const [sub, setSub] = useState<S<'Subscription'> | null>(null);
  const fixed = sub?.assignedVehicle?.code ?? vehicles.find((v) => v.assignedSubscriptionId === subscriptionId)?.code;
  const canAssign = can(groups, 'subscription.assignVehicle');
  return (
    <div data-testid="subscription-box" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Assinatura {planCode ? PLAN_LABEL[planCode].toLowerCase() : ''}</span>
        {sub && <Pill tone={SUBSCRIPTION_STATUS[sub.status][1]}>{SUBSCRIPTION_STATUS[sub.status][0]}</Pill>}
      </div>
      <KV k="Moto fixa" v={<span data-testid="fixed-vehicle" style={{ fontFamily: fixed ? 'var(--font-mono)' : undefined }}>{fixed ?? 'Nenhuma'}</span>} />
      {sub?.status === 'paused' && <KV k="Pausada até" v={formatDateTime(sub.pauseEndsAt)} />}
      {sub?.nextChargeAt && <KV k="Próxima cobrança" v={`${formatDate(sub.nextChargeAt)}${sub.nextChargeCents !== undefined ? ` · ${formatBRL(sub.nextChargeCents)}` : ''}`} />}
      {sub && <KV k="Pausas restantes no período" v={sub.pausesRemainingInPeriod ?? '—'} />}
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Pausar e retomar o plano são feitos pelo cliente no app.</div>
      {canAssign && <Button size="sm" variant="secondary" icon="Bike" testId="assign-fixed" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)', background: '#fff' }} onClick={() => setAssign(true)}>{fixed ? 'Trocar moto fixa' : 'Definir moto fixa'}</Button>}
      {assign && <SubscriptionVehicleDialog subscriptionId={subscriptionId} currentCode={fixed} onClose={() => setAssign(false)} onDone={setSub} />}
    </div>
  );
}
