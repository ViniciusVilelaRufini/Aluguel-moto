import React from 'react';
export function Switch({ checked, defaultChecked = false, onChange, disabled = false, label }) {
  const [inner, setInner] = React.useState(defaultChecked);
  const on = checked ?? inner;
  const toggle = () => { if (disabled) return; setInner(!on); onChange && onChange(!on); };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, opacity: disabled ? .4 : 1 }}>
      <button role="switch" aria-checked={on} aria-label={label} onClick={toggle} style={{ width: 51, height: 31, borderRadius: 999, border: 0, padding: 2, cursor: 'pointer',
        background: on ? 'var(--brand)' : 'var(--ink-300)', transition: 'background var(--dur-base)' }}>
        <span style={{ display: 'block', width: 27, height: 27, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.18)',
          transform: on ? 'translateX(20px)' : 'none', transition: 'transform var(--dur-base) var(--ease-spring)' }} />
      </button>
      {label && <span style={{ font: 'var(--type-body)' }}>{label}</span>}
    </span>
  );
}
