'use client';

import { useEffect, useState } from 'react';
import { api, unwrap } from '@/lib/api';
import { can } from '@/lib/permissions';
import { useAuth } from '@/lib/auth';
import type { S } from '@/lib/types';
import { Button } from '@/ds/Button';
import { DataTable, ErrorNote, Field, TextInput, usePagedQuery } from './ui';
import { WalletAdjustDialog } from './WalletAdjustDialog';

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
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const enabled = debounced.length >= 2;
  const { rows, loading, error, pager, refetch } = usePagedQuery<Customer>(['wallet-customers', debounced], (cursor) =>
    unwrap(api.GET('/customers', { params: { query: { limit: 10, cursor, q: debounced } } })), enabled);
  const allowed = can(groups, 'wallet.adjust');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ maxWidth: 420 }}>
        <Field label="Cliente" hint="Busque por nome, e-mail, telefone ou CPF (mínimo de 2 caracteres).">
          <TextInput testId="wallet-search" value={q} onChange={setQ} placeholder="Buscar cliente" />
        </Field>
      </div>
      <ErrorNote error={enabled ? error : null} onRetry={() => refetch()} />
      <DataTable<Customer> testId="wallet-customers" label="Clientes" rows={enabled ? rows : []} loading={enabled && loading} pager={enabled ? pager : undefined}
        empty={enabled ? `Nenhum cliente para "${debounced}"` : 'Busque um cliente para ajustar a carteira.'} emptyIcon={enabled ? 'Search' : 'Wallet'}
        columns={[
          { key: 'name', label: 'Cliente', render: (c) => <span style={{ fontWeight: 600 }}>{c.name ?? c.email}</span> },
          { key: 'email', label: 'E-mail' },
          { key: 'adjust', label: '', align: 'right', render: (c) => (allowed
            ? <Button size="sm" variant="secondary" icon="Wallet" testId="wallet-adjust-open" onClick={() => setTarget(c)}>Ajustar carteira</Button>
            : null) },
        ]} />
      {target && <WalletAdjustDialog customerId={target.id} onClose={() => setTarget(null)} />}
    </div>
  );
}
