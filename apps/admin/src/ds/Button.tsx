// @ts-nocheck
'use client';
import React from 'react';
import { Icon } from './Icon';
const SIZES = { sm: { h: 36, px: 16, fs: 14, ic: 16 }, md: { h: 48, px: 20, fs: 15, ic: 20 }, lg: { h: 56, px: 24, fs: 16, ic: 22 } };
const VARIANTS = {
  primary: { bg: 'var(--brand)', fg: 'var(--on-brand)', bd: 'transparent', sh: 'var(--shadow-brand)' },
  secondary: { bg: 'var(--surface-card)', fg: 'var(--brand)', bd: 'var(--brand)', sh: 'none' },
  ghost: { bg: 'transparent', fg: 'var(--text-primary)', bd: 'transparent', sh: 'none' },
  dark: { bg: 'var(--surface-inverse)', fg: 'var(--text-on-inverse)', bd: 'transparent', sh: 'var(--shadow-2)' },
  danger: { bg: 'var(--danger)', fg: 'var(--white)', bd: 'transparent', sh: 'var(--shadow-coral)' },
};
export function Button({ children, variant = 'primary', size = 'md', icon, iconRight, fullWidth = false, disabled = false, onClick, type = 'button', testId, title, style, busy, ariaBusy, ariaDescribedBy }: any) {
  const [p, setP] = React.useState(false);
  const s = SIZES[size] || SIZES.md, v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button type={type} disabled={disabled} aria-busy={busy || ariaBusy || undefined} aria-describedby={ariaDescribedBy || undefined} onClick={onClick} data-testid={testId} title={title}
      onPointerDown={() => setP(true)} onPointerUp={() => setP(false)} onPointerLeave={() => setP(false)}
      style={{ display: fullWidth ? 'flex' : 'inline-flex', width: fullWidth ? '100%' : undefined, alignItems: 'center', justifyContent: 'center', gap: 10, flexShrink: 0,
        height: s.h, padding: '0 ' + s.px + 'px', borderRadius: 'var(--radius-pill)', border: '1.5px solid ' + v.bd, background: v.bg, color: v.fg,
        font: 'var(--fw-semibold) ' + s.fs + 'px/1 var(--font-sans)', boxShadow: disabled ? 'none' : v.sh, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1, transform: p && !disabled ? 'scale(var(--press-scale))' : 'none', filter: p && !disabled ? 'brightness(.94)' : 'none',
        transition: 'transform var(--dur-fast) var(--ease-out), filter var(--dur-fast)', whiteSpace: 'nowrap', ...style }}>
      {icon && <Icon name={icon} size={s.ic} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.ic} />}
    </button>
  );
}
