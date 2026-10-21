import React from 'react';
import { Icon } from './Icon.jsx';
export function Chip({ children, icon, selected = false, onClick, style }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 'var(--radius-pill)',
      border: '1px solid ' + (selected ? 'var(--brand)' : 'var(--border-subtle)'), background: selected ? 'var(--brand-soft)' : 'var(--surface-card)',
      color: selected ? 'var(--success-ink)' : 'var(--text-primary)', font: 'var(--fw-medium) 13px/1 var(--font-sans)', cursor: 'pointer', whiteSpace: 'nowrap',
      transition: 'background var(--dur-base), border-color var(--dur-base)', ...style }}>
      {icon && <Icon name={icon} size={16} />}{children}
    </button>
  );
}
