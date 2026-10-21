// @ts-nocheck
'use client';
import React from 'react';
const V = {
  elevated: { bg: 'var(--surface-card)', bd: 'transparent', sh: 'var(--shadow-1)' },
  outline: { bg: 'var(--surface-card)', bd: 'var(--border-subtle)', sh: 'none' },
  sunken: { bg: 'var(--surface-sunken)', bd: 'transparent', sh: 'none' },
  media: { bg: 'var(--surface-media)', bd: 'transparent', sh: 'none' },
};
export function Card({ children, variant = 'elevated', padding = 16, radius = 'var(--radius-lg)', onClick, style }: any) {
  const v = V[variant] || V.elevated;
  return <div onClick={onClick} style={{ background: v.bg, border: '1px solid ' + v.bd, boxShadow: v.sh, borderRadius: radius, padding, cursor: onClick ? 'pointer' : undefined, ...style }}>{children}</div>;
}
