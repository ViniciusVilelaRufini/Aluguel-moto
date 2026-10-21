import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function OptionCard({ title, description, price, priceNote, badge, icon, selected = false, disabled = false, onClick, children, style }) {
  return (
    <div role="radio" aria-checked={selected} onClick={disabled ? undefined : onClick} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16, borderRadius: 'var(--radius-lg)', cursor: disabled ? 'default' : 'pointer',
      background: selected ? 'var(--brand-soft)' : 'var(--surface-card)', border: '1.5px solid ' + (selected ? 'var(--brand)' : 'var(--border-subtle)'), opacity: disabled ? .5 : 1,
      transition: 'background var(--dur-base), border-color var(--dur-base), transform var(--dur-spring) var(--ease-spring)', ...style }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1, border: '1.5px solid ' + (selected ? 'var(--brand)' : 'var(--border-strong)'), background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selected && <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--brand)', animation: 'vt-check-pop 320ms var(--ease-spring) both' }} />}
      </span>
      {icon && <span style={{ width: 36, height: 36, borderRadius: 12, background: selected ? '#fff' : 'var(--surface-sunken)', color: 'var(--ink-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={18} /></span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ font: 'var(--type-body-strong)', color: 'var(--text-primary)' }}>{title}</span>
          {badge && <span style={{ height: 20, padding: '0 6px', borderRadius: 'var(--radius-xs)', background: selected ? '#fff' : 'var(--surface-sunken)', color: 'var(--ink-700)', font: 'var(--fw-semibold) 11px/20px var(--font-sans)' }}>{badge}</span>}
        </div>
        {description && <div style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)', marginTop: 3, textWrap: 'pretty' }}>{description}</div>}
        {children}
      </div>
      {price && <div style={{ textAlign: 'right', flexShrink: 0 }}><div style={{ font: 'var(--type-body-strong)', color: 'var(--text-primary)' }}>{price}</div>{priceNote && <div style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>{priceNote}</div>}</div>}
    </div>
  );
}
