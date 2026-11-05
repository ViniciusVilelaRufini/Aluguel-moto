'use client';

import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { imeiLast4 } from '@/lib/trackers';
import { ErrorNote } from '../ui';

/** Lista os rastreadores que estão no estoque (sem moto) para escolher um. Só escolhe: quem usa decide o que fazer. */
export function TrackerPicker({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const list = useQuery({
    queryKey: ['trackers', 'stock'],
    queryFn: () => unwrap(api.GET('/trackers', { params: { query: { installed: false } } })),
  });
  const items = list.data?.items ?? [];
  return (
    <div data-testid="tracker-picker">
      {list.error && <ErrorNote error={list.error} onRetry={() => list.refetch()} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflow: 'auto' }}>
        {items.length === 0 && !list.isLoading && !list.error && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nenhum rastreador no estoque. Use &quot;Cadastrar novo&quot;.</div>
        )}
        {items.map((t) => {
          const on = t.id === selectedId;
          return (
            <button key={t.id} type="button" data-testid="tracker-option" aria-pressed={on} onClick={() => onSelect(t.id)}
              style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${on ? 'var(--border-focus)' : 'var(--border-subtle)'}`, background: 'var(--surface-card)', cursor: 'pointer' }}>
              <div style={{ font: '600 13px/1.3 var(--font-mono)' }}>{t.imei}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {t.model} · final {imeiLast4(t.imei)} · {t.simCard ? `Chip ${t.simCard.carrier}` : 'Sem chip'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
