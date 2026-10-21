// @ts-nocheck
'use client';
import React from 'react';
export function SegmentedControl({ options = [], value, onChange, style }: any) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 'var(--radius-pill)', background: 'var(--surface-sunken)', ...style }}>
      {options.map(o => { const val = typeof o === 'string' ? o : o.value, lab = typeof o === 'string' ? o : o.label, on = val === value;
        return <button key={val} onClick={() => onChange && onChange(val)} style={{ flex: 1, height: 36, border: 0, borderRadius: 'var(--radius-pill)', cursor: 'pointer',
          background: on ? 'var(--surface-card)' : 'transparent', boxShadow: on ? 'var(--shadow-1)' : 'none', color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
          font: 'var(--fw-semibold) 13px/1 var(--font-sans)', transition: 'all var(--dur-base) var(--ease-out)' }}>{lab}</button>; })}
    </div>
  );
}
