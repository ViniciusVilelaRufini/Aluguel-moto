'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import type { S } from '@/lib/types';
import { Alert } from '@/ds/Alert';
import { Button } from '@/ds/Button';
import { ErrorNote, Field, Modal, TextInput, useToast } from './ui';

/**
 * Define ou troca a moto fixa de uma assinatura semanal/mensal (`PUT /payments/subscriptions/{id}/vehicle`,
 * admin e operação). A API grava a auditoria; staff não tem a espera de 24 h do cliente.
 */
export function SubscriptionVehicleDialog({ subscriptionId, currentCode, onClose, onDone }: {
  subscriptionId: string; currentCode?: string; onClose: () => void; onDone?: (s: S<'Subscription'>) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const v = await unwrap(api.GET('/vehicles/by-code/{code}', { params: { path: { code: code.trim().toUpperCase() } } }));
      const sub = await unwrap(api.PUT('/payments/subscriptions/{id}/vehicle', { params: { path: { id: subscriptionId } }, body: { vehicleId: v.id } }));
      toast(`Moto fixa definida: ${v.code}`);
      qc.invalidateQueries({ queryKey: ['fleet'] });
      qc.invalidateQueries({ queryKey: ['vehicle'] });
      onDone?.(sub);
      onClose();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  return (
    <Modal open title={currentCode ? `Trocar a moto fixa (${currentCode})` : 'Definir a moto fixa'} onClose={onClose} testId="subscription-vehicle-dialog"
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" testId="subscription-vehicle-save" disabled={busy || !code.trim()} onClick={submit}>{busy ? 'Salvando...' : 'Salvar'}</Button></>}>
      <Alert tone="info" icon="Info">A moto fixa só pode ser alugada pelo assinante enquanto o plano estiver ativo ou pausado e some do mapa dos outros clientes.</Alert>
      <form onSubmit={(e) => { e.preventDefault(); if (!busy && code.trim()) void submit(); }}>
        <Field label="Código da moto"><TextInput testId="subscription-vehicle-code" value={code} onChange={setCode} placeholder="VLT-0001" /></Field>
      </form>
      <ErrorNote error={err} />
    </Modal>
  );
}
