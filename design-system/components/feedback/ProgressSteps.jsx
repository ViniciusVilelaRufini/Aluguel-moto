import React from 'react';
export function ProgressSteps({ total = 4, current = 0, label, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      <div style={{ display: 'flex', gap: 6 }}>{Array.from({ length: total }).map((_, i) => <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= current ? 'var(--brand)' : 'var(--ink-200)', transition: 'background var(--dur-base)' }} />)}</div>
      {label && <div style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>{label}</div>}
    </div>
  );
}
