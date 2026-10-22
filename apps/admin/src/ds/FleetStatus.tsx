// @ts-nocheck
'use client';
import React from 'react';
export const FLEET_STATUS = {
  free: ['Livre', 'var(--status-free)'], rented: ['Alugada', 'var(--status-rented)'], reserved: ['Reservada', 'var(--status-reserved)'], paused: ['Pausada', 'var(--status-paused)'],
  blocked: ['Bloqueada', 'var(--status-blocked)'], maintenance: ['Manutenção', 'var(--status-maintenance)'], offline: ['Sem sinal', 'var(--status-offline)'],
  awaiting_pickup: ['Aguardando recolhimento', 'var(--status-awaiting-pickup)'],
};
export function FleetStatus({ status = 'free', count, variant = 'pill', selected = false, onClick, style }: any) {
  const [label, c] = FLEET_STATUS[status] || FLEET_STATUS.free;
  const dot = <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />;
  if (variant === 'dot') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: 'var(--type-label)', color: 'var(--text-primary)', whiteSpace: 'nowrap', ...style }}>{dot}{label}</span>;
  return (
    <button type="button" onClick={onClick} aria-pressed={onClick ? selected : undefined} className="fleet-chip" style={{ transition: 'background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), transform var(--dur-fast) var(--ease-out)', display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', borderRadius: 'var(--radius-pill)', cursor: onClick ? 'pointer' : 'default', whiteSpace: 'nowrap',
      border: '1px solid ' + (selected ? 'var(--ink-900)' : 'var(--border-subtle)'), background: selected ? 'var(--ink-900)' : 'var(--surface-card)', color: selected ? '#fff' : 'var(--text-primary)', font: 'var(--fw-medium) 12px/1 var(--font-sans)', ...style }}>
      {dot}{label}{count != null && <span style={{ font: 'var(--fw-bold) 12px/1 var(--font-mono)', opacity: .7 }}>{count}</span>}
    </button>
  );
}
