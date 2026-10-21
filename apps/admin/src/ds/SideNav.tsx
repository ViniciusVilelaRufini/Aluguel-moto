// @ts-nocheck
'use client';
import React from 'react';
import { Icon } from './Icon';
export function SideNav({ items = [], value, onChange, footer, brand = 'volti', style }: any) {
  return (
    <nav style={{ width: 232, flexShrink: 0, background: 'var(--ink-900)', color: '#fff', display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: 4, ...style }}>
      <div style={{ font: '800 24px/1 var(--font-sans)', letterSpacing: '-.04em', color: 'var(--green-400)', padding: '4px 12px 20px' }}>{brand}</div>
      {items.map(it => { const on = it.value === value;
        return <button key={it.value} onClick={() => onChange && onChange(it.value)} style={{ display: 'flex', alignItems: 'center', gap: 12, height: 42, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: 0, cursor: 'pointer', textAlign: 'left',
          background: on ? 'rgba(255,255,255,.08)' : 'transparent', color: on ? '#fff' : 'rgba(255,255,255,.62)', font: 'var(--fw-semibold) 14px/1 var(--font-sans)' }}>
          <Icon name={it.icon} size={18} color={on ? 'var(--green-400)' : 'currentColor'} /><span style={{ flex: 1 }}>{it.label}</span>
          {it.badge != null && <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: 'var(--danger)', color: '#fff', font: 'var(--fw-bold) 11px/20px var(--font-sans)', textAlign: 'center' }}>{it.badge}</span>}
        </button>; })}
      <div style={{ flex: 1 }} />
      {footer}
    </nav>
  );
}
