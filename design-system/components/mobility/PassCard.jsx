import React from 'react';
import { Icon } from '../core/Icon.jsx';
const TONES = { brand: ['var(--green-100)', 'var(--green-700)'], sun: ['#FFF3CC', 'var(--orange-600)'], sky: ['var(--sky-100)', 'var(--blue-600)'], coral: ['var(--coral-50)', 'var(--coral-600)'] };
export function PassCard({ title, subtitle, icon = 'Ticket', tone = 'sun', onClick, style }) {
  const [bg, fg] = TONES[tone] || TONES.sun;
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 18px 8px 8px', borderRadius: 'var(--radius-lg)', border: 0, background: 'var(--glass-bg)',
      backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-1)', textAlign: 'left', cursor: 'pointer', flexShrink: 0, ...style }}>
      <span style={{ width: 44, height: 44, borderRadius: 14, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={22} /></span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ font: 'var(--type-label)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{title}</span>
        <span style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{subtitle}</span>
      </span>
    </button>
  );
}
