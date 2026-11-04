'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useDebounced } from '@/lib/use-debounced';
import type { S } from '@/lib/types';
import { ErrorNote, Field, Modal, TextInput } from '@/components/ui';
import { Button } from '@/ds/Button';

/**
 * "Registrar chegada" (Entregas): o atendente busca a moto pelo código (VLT-xxxx) entre as que têm aluguel em
 * andamento (`GET /vehicles?q=`, filtrando `currentRentalId`) e escolhe a que chegou; o diálogo de chegada abre em seguida.
 */
export function ArrivalSearchDialog({ onClose, onPick }: { onClose: () => void; onPick: (vehicle: S<'Vehicle'>) => void }) {
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 300);
  const list = useQuery({
    queryKey: ['vehicles', 'arrival', q],
    queryFn: () => unwrap(api.GET('/vehicles', { params: { query: { q: q || undefined, limit: 50 } } })),
  });
  const rented = (list.data?.items ?? []).filter((v) => !!v.currentRentalId);

  return (
    <Modal open width={480} title="Registrar chegada" onClose={onClose} testId="arrival-search-dialog"
      actions={<Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>}>
      <Field label="Código da moto" hint="Só aparecem motos com aluguel em andamento.">
        <TextInput testId="arrival-search-input" value={text} onChange={(v) => setText(v.slice(0, 64))} placeholder="VLT-0001" />
      </Field>
      <ErrorNote error={list.error} onRetry={() => list.refetch()} />
      <div data-testid="arrival-search-results" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {list.isLoading ? (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Buscando...</span>
        ) : rented.length === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{q ? 'Nenhuma moto com aluguel em andamento com esse código.' : 'Nenhuma moto com aluguel em andamento.'}</span>
        ) : rented.map((v) => (
          <button key={v.id} type="button" data-testid={`arrival-pick-${v.code}`} onClick={() => onPick(v)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--ink-100)', borderRadius: 10, background: 'var(--surface-card)', cursor: 'pointer', textAlign: 'left' }}>
            <strong style={{ fontFamily: 'var(--font-mono)' }}>{v.code}</strong>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{v.model}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
