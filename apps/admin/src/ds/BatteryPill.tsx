// @ts-nocheck
'use client';
import React from 'react';
import { Icon } from './Icon';
export function BatteryPill({ level = 90, range = 20, style }: any) {
  const c = level > 50 ? 'var(--battery-high)' : level > 20 ? 'var(--battery-mid)' : 'var(--battery-low)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 30, whiteSpace: 'nowrap', flexShrink: 0, padding: '0 12px 0 4px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-inverse)', color: '#fff', font: 'var(--fw-semibold) 13px/1 var(--font-sans)', ...style }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid ' + c, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c }}><Icon name="Zap" size={12} strokeWidth={2.5} /></span>
      {level}%<span style={{ width: 1, height: 14, background: 'rgba(255,255,255,.35)' }} />~{range} km
    </span>
  );
}
