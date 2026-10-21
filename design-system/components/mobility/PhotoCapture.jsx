import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function PhotoCapture({ label = 'Tirar foto', hint, done = false, icon = 'Camera', height = 160, onClick, style }) {
  return (
    <button onClick={onClick} style={{ width: '100%', height, borderRadius: 'var(--radius-lg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
      background: done ? 'var(--brand-soft)' : 'var(--surface-sunken)', border: '1.5px dashed ' + (done ? 'var(--brand)' : 'var(--border-strong)'), color: done ? 'var(--success-ink)' : 'var(--ink-700)', ...style }}>
      <span style={{ width: 48, height: 48, borderRadius: '50%', background: done ? 'var(--brand)' : '#fff', color: done ? '#fff' : 'var(--ink-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-1)' }}><Icon name={done ? 'Check' : icon} size={22} strokeWidth={done ? 3 : 2} /></span>
      <span style={{ font: 'var(--type-label)' }}>{done ? 'Foto enviada' : label}</span>
      {hint && !done && <span style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>{hint}</span>}
    </button>
  );
}
