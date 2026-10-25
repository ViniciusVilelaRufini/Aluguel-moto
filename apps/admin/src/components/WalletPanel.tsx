'use client';

import { useEffect, useState } from 'react';
import { api, unwrap } from '@/lib/api';
import { can } from '@/lib/permissions';
import { useAuth } from '@/lib/auth';
import type { S } from '@/lib/types';
import { Button } from '@/ds/Button';
import { DataTable, ErrorNote, Field, Pill, Select, TextInput, usePagedQuery } from './ui';
import { WalletAdjustDialog } from './WalletAdjustDialog';
import { DelinquencyClearDialog } from './DelinquencyClearDialog';

type Show = 'search' | 'delinquent';

type Customer = S<'Customer'>;

/**
 * Financeiro > Carteira: busca de cliente (`GET /customers`, que o contrato abre ao financeiro) e ajuste manual
 * (`POST /customers/{id}/wallet/adjustments`). O financeiro não abre a ficha completa em Clientes.
 */
export function WalletPanel() {
  const { groups } = useAuth();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [target, setTarget] = useState<Customer | null>(null);
  const [clearing, setClearing] = useState<Customer | null>(null);
  // Task 14: "Inadimplentes" lista quem está com a flag (GET /customers?delinquent=true), sem precisar buscar.
  const [show, setShow] = useState<Show>('search');
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const onlyDelinquent = show === 'delinquent';
  const enabled = onlyDelinquent || debounced.length >= 2;
  const { rows, loading, error, pager, refetch } = usePagedQuery<Customer>(['wallet-customers', show, debounced], (cursor) =>
    unwrap(api.GET('/customers', { params: { query: { limit: 10, cursor, q: debounced || undefined, ...(onlyDelinquent ? { delinquent: true } : {}) } } })), enabled);
  const allowed = can(groups, 'wallet.adjust');
  const canClear = can(groups, 'delinquency.clear');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ width: 420, maxWidth: '100%' }}>
          <Field label="Cliente" hint={onlyDelinquent ? 'Filtra os inadimplentes por nome, e-mail, telefone ou CPF.' : 'Busque por nome, e-mail, telefone ou CPF (mínimo de 2 caracteres).'}>
            <TextInput testId="wallet-search" value={q} onChange={setQ} placeholder="Buscar cliente" />
          </Field>
        </div>
        <div style={{ width: 200 }}>
          <Field label="Mostrar"><Select<Show> testId="wallet-show" value={show} onChange={setShow} options={[{ value: 'search', label: 'Busca' }, { value: 'delinquent', label: 'Inadimplentes' }]} /></Field>
        </div>
      </div>
      <ErrorNote error={enabled ? error : null} onRetry={() => refetch()} />
      <DataTable<Customer> testId="wallet-customers" label="Clientes" rows={enabled ? rows : []} loading={enabled && loading} pager={enabled ? pager : undefined}
        empty={onlyDelinquent ? (debounced ? `Nenhum inadimplente para "${debounced}"` : 'Nenhum cliente inadimplente.') : enabled ? `Nenhum cliente para "${debounced}"` : 'Busque um cliente para ajustar a carteira.'}
        emptyIcon={onlyDelinquent ? 'CircleCheck' : enabled ? 'Search' : 'Wallet'}
        columns={[
          { key: 'name', label: 'Cliente', render: (c) => <span style={{ fontWeight: 600 }}>{c.name ?? c.email}</span> },
          { key: 'email', label: 'E-mail' },
          { key: 'delinquent', label: 'Situação', render: (c) => (c.delinquent ? <Pill tone="danger">Inadimplente</Pill> : <Pill>Em dia</Pill>) },
          { key: 'adjust', label: '', align: 'right', render: (c) => (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
              {c.delinquent && canClear && <Button size="sm" variant="secondary" icon="Check" testId="delinquency-clear-open" onClick={() => setClearing(c)}>Registrar quitação</Button>}
              {allowed && <Button size="sm" variant="secondary" icon="Wallet" testId="wallet-adjust-open" onClick={() => setTarget(c)}>Ajustar carteira</Button>}
            </div>
          ) },
        ]} />
      {target && <WalletAdjustDialog customerId={target.id} onClose={() => setTarget(null)} />}
      {clearing && <DelinquencyClearDialog customerId={clearing.id} onClose={() => setClearing(null)} />}
    </div>
  );
}
