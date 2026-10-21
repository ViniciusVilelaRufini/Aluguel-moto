import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function ListRow({ icon, iconTone = 'neutral', title, subtitle, value, trailing = 'arrow', onClick, style }) {
  const tones = { neutral: ['var(--surface-sunken)', 'var(--ink-700)'], brand: ['var(--green-50)', 'var(--green-700)'], info: ['var(--blue-50)', 'var(--blue-600)'], sun: ['#FFF3CC', 'var(--orange-600)'], danger: ['var(--coral-50)', 'var(--coral-600)'] };
  const [bg, fg] = tones[iconTone] || tones.neutral;
  const t = trailing === 'arrow' ? 'ArrowRight' : trailing === 'chevron' ? 'ChevronRight' : null;
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '10px 14px', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', cursor: onClick ? 'pointer' : undefined, ...style }}>
      {icon && <span style={{ width: 36, height: 36, borderRadius: 12, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={18} /></span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: 'var(--type-body-strong)', color: 'var(--text-primary)' }}>{title}</div>
        {subtitle && <div style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {value && <span style={{ font: 'var(--type-label)', color: 'var(--text-secondary)' }}>{value}</span>}
      {t && <Icon name={t} size={20} color="var(--text-primary)" />}
    </div>
  );
}
