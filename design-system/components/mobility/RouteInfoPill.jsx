import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function RouteInfoPill({ minutes = 5, distance = '310 m', style }) {
  const dot = (n) => <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--green-900)', color: 'var(--green-300)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={n} size={13} strokeWidth={2.5} /></span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px 0 5px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-inverse)', color: '#fff', font: 'var(--fw-semibold) 12px/1 var(--font-sans)', boxShadow: 'var(--shadow-2)', ...style }}>
      {dot('Clock')}{minutes} min
      <span style={{ width: 6 }} />{dot('Route')}{distance}
    </span>
  );
}
