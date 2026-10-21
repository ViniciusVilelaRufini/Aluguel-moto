// @ts-nocheck
'use client';
import React from 'react';
import { Icon } from './Icon';
export function StatTile({ label, value, delta, trend = 'up', icon, style }: any) {
  const up = trend === 'up';
  return (
    <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', padding: 16, boxShadow: 'var(--shadow-1)', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>{icon && <Icon name={icon} size={16} />}{label}</div>
      <div style={{ font: 'var(--fw-bold) 26px/1.1 var(--font-sans)', letterSpacing: 'var(--ls-tight)', color: 'var(--text-primary)' }}>{value}</div>
      {delta && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: 'var(--fw-semibold) 12px/1 var(--font-sans)', color: up ? 'var(--success-ink)' : 'var(--danger-ink)' }}><Icon name={up ? 'TrendingUp' : 'TrendingDown'} size={14} />{delta}</div>}
    </div>
  );
}
