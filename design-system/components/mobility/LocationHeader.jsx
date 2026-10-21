import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { IconButton } from '../core/IconButton.jsx';
export function LocationHeader({ initials = 'AL', label = 'Sua localização', address = 'Av. Paulista, 1578', hasNotification = true, onAvatar, onBell, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      <button onClick={onAvatar} aria-label="Perfil" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #fff', background: 'var(--sun-300)', color: 'var(--ink-900)', font: 'var(--fw-bold) 15px/1 var(--font-sans)', boxShadow: 'var(--shadow-1)', cursor: 'pointer', flexShrink: 0 }}>{initials}</button>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}><div style={{ textAlign: 'center', minWidth: 0, maxWidth: '100%', padding: '6px 16px', borderRadius: 'var(--radius-pill)', background: 'var(--glass-bg)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-1)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>
          <Icon name="Navigation" size={12} color="var(--brand)" style={{ fill: 'var(--brand)' }} />{label}
        </div>
        <div style={{ font: 'var(--type-body-strong)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{address}</div>
      </div></div>
      <IconButton icon="Bell" dot={hasNotification} label="Notificações" onClick={onBell} />
    </div>
  );
}
