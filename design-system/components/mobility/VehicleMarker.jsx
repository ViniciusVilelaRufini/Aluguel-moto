import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function VehicleMarker({ level = 80, selected = false, delay = 0, onClick, style }) {
  const c = level > 50 ? 'var(--battery-high)' : level > 20 ? 'var(--battery-mid)' : 'var(--battery-low)';
  const s = selected ? 44 : 34;
  return (
    <button onClick={onClick} aria-label={'Moto, bateria ' + level + '%'} style={{ position: 'relative', width: s, height: s + 6, padding: 0, border: 0, background: 'transparent', cursor: 'pointer',
      animation: 'vt-marker-in 560ms var(--ease-spring) ' + delay + 'ms both', transition: 'width var(--dur-spring) var(--ease-spring), height var(--dur-spring) var(--ease-spring)', ...style }}>
      {selected && <span aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: s, height: s, borderRadius: '50%', background: 'var(--brand)', animation: 'vt-pulse-ring 1.8s var(--ease-out) infinite' }} />}
      <span style={{ position: 'absolute', top: 0, left: 0, width: s, height: s, borderRadius: '50%', background: selected ? 'var(--brand)' : 'var(--surface-inverse)', color: '#fff',
        border: '2.5px solid #fff', boxShadow: selected ? 'var(--shadow-brand)' : 'var(--shadow-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
        transition: 'all var(--dur-spring) var(--ease-spring)' }}>
        <Icon name="Bike" size={selected ? 22 : 17} />
      </span>
      <span style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 16, height: 4, borderRadius: 2, background: c, border: '1.5px solid #fff' }} />
    </button>
  );
}
