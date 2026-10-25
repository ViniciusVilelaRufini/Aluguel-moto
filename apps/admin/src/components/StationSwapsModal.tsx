'use client';

import { useState } from 'react';
import { api, unwrap } from '@/lib/api';
import { STATION_SWAP_STATUS } from '@/lib/labels';
import { formatBRL, formatDateTime } from '@/lib/format';
import type { S } from '@/lib/types';
import { Button } from '@/ds/Button';
import { DataTable, ErrorNote, Modal, Pill, Select, usePagedQuery, type Column } from './ui';

type Swap = S<'StationSwap'>;
type StatusFilter = '' | S<'StationSwapStatus'>;

/** Colunas do histórico: série devolvida/liberada, status e horário (America/Sao_Paulo). */
export function swapColumns(): Column<Swap>[] {
  return [
    { key: 'createdAt', label: 'Horário', render: (s) => formatDateTime(s.createdAt) },
    { key: 'returnedSerial', label: 'Série entrada', mono: true, render: (s) => s.returnedSerial ?? '—' },
    { key: 'releasedSerial', label: 'Série saída', mono: true, render: (s) => s.releasedSerial ?? '—' },
    { key: 'status', label: 'Status', render: (s) => <Pill tone={STATION_SWAP_STATUS[s.status][1]}>{STATION_SWAP_STATUS[s.status][0]}</Pill> },
    { key: 'feeCents', label: 'Taxa', align: 'right', render: (s) => formatBRL(s.feeCents) },
  ];
}

/** Histórico de trocas por QR de uma estação (`GET /swap-stations/{id}/swaps`), mais recentes primeiro. */
export function StationSwapsModal({ station, onClose }: { station: Pick<S<'SwapStation'>, 'id' | 'name'>; onClose: () => void }) {
  const [status, setStatus] = useState<StatusFilter>('');
  const { rows, loading, error, pager, refetch } = usePagedQuery<Swap>(['station-swaps', station.id, status], (cursor) =>
    unwrap(api.GET('/swap-stations/{id}/swaps', { params: { path: { id: station.id }, query: { limit: 15, cursor, status: status || undefined } } })));
  return (
    <Modal open title={`Trocas · ${station.name}`} onClose={onClose} width={860} testId="station-swaps"
      actions={<Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>}>
      <div style={{ width: 240 }}>
        <Select<StatusFilter> testId="station-swaps-status" value={status} onChange={setStatus}
          options={[{ value: '', label: 'Todos os status' }, ...(Object.keys(STATION_SWAP_STATUS) as S<'StationSwapStatus'>[]).map((s) => ({ value: s, label: STATION_SWAP_STATUS[s][0] }))]} />
      </div>
      <ErrorNote error={error} onRetry={() => refetch()} />
      <DataTable<Swap> dense testId="station-swaps-table" label="Trocas da estação" rows={rows} loading={loading} pager={pager} columns={swapColumns()}
        empty="Nenhuma troca nesta estação" emptyIcon="BatteryCharging" />
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Horários de São Paulo. Série de entrada é a bateria devolvida; série de saída, a liberada para a moto.</div>
    </Modal>
  );
}
