import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Checkbox({ checked, defaultChecked = false, onChange, label, disabled = false }) {
  const [inner, setInner] = React.useState(defaultChecked);
  const on = checked ?? inner;
  const toggle = () => { if (disabled) return; setInner(!on); onChange && onChange(!on); };
  return (
    <label onClick={toggle} style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', opacity: disabled ? .4 : 1 }}>
      <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: on ? 'var(--brand)' : 'var(--surface-card)', border: '1.5px solid ' + (on ? 'var(--brand)' : 'var(--border-strong)'), color: '#fff', transition: 'all var(--dur-fast)' }}>
        {on && <Icon name="Check" size={14} strokeWidth={3} />}
      </span>
      {label && <span style={{ font: 'var(--type-body)', color: 'var(--text-primary)', paddingTop: 1 }}>{label}</span>}
    </label>
  );
}
