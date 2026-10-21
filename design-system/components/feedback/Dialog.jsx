import React from 'react';
export function Dialog({ open = true, title, children, actions, onClose, icon }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'var(--surface-scrim)', animation: 'vt-fade-in 200ms var(--ease-out) both', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 340, background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', padding: 24, boxShadow: 'var(--shadow-2)', animation: 'vt-pop-in 360ms var(--ease-spring) both', display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center', alignItems: 'center' }}>
        {icon}
        {title && <div style={{ font: 'var(--type-heading)', color: 'var(--text-primary)' }}>{title}</div>}
        {children && <div style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', textWrap: 'pretty' }}>{children}</div>}
        {actions && <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 8 }}>{actions}</div>}
      </div>
    </div>
  );
}
