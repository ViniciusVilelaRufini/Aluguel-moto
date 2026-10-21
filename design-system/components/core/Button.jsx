import React from 'react';
import { Icon } from './Icon.jsx';
const SIZES = { sm: { h: 36, px: 16, fs: 14, ic: 16 }, md: { h: 48, px: 20, fs: 15, ic: 20 }, lg: { h: 56, px: 24, fs: 16, ic: 22 } };
const VARIANTS = {
  primary: { bg: 'var(--brand)', fg: 'var(--on-brand)', bd: 'transparent', sh: 'var(--shadow-brand)', rip: 'rgba(255,255,255,.38)' },
  secondary: { bg: 'var(--surface-card)', fg: 'var(--brand)', bd: 'var(--brand)', sh: 'none', rip: 'rgba(52,194,92,.2)' },
  ghost: { bg: 'transparent', fg: 'var(--text-primary)', bd: 'transparent', sh: 'none', rip: 'rgba(21,24,26,.08)' },
  dark: { bg: 'var(--surface-inverse)', fg: 'var(--text-on-inverse)', bd: 'transparent', sh: 'var(--shadow-2)', rip: 'rgba(255,255,255,.22)' },
  danger: { bg: 'var(--danger)', fg: 'var(--white)', bd: 'transparent', sh: 'var(--shadow-coral)', rip: 'rgba(255,255,255,.35)' },
};
export function Button({ children, variant = 'primary', size = 'md', icon, iconRight, fullWidth = false, disabled = false, loading = false, shine = false, onClick, type = 'button', style }) {
  const [p, setP] = React.useState(false);
  const [h, setH] = React.useState(false);
  const [rip, setRip] = React.useState([]);
  const s = SIZES[size] || SIZES.md, v = VARIANTS[variant] || VARIANTS.primary;
  const off = disabled || loading;
  const down = e => {
    if (off) return;
    setP(true);
    const el = e.currentTarget, r = el.getBoundingClientRect(), k = r.width / el.offsetWidth || 1;
    const d = Math.max(el.offsetWidth, el.offsetHeight) * 2.2, id = Date.now() + Math.random();
    setRip(a => [...a, { id, d, x: (e.clientX - r.left) / k - d / 2, y: (e.clientY - r.top) / k - d / 2 }]);
    setTimeout(() => setRip(a => a.filter(q => q.id !== id)), 650);
  };
  return (
    <button type={type} disabled={off} onClick={onClick} onPointerDown={down} onPointerUp={() => setP(false)}
      onPointerEnter={() => setH(true)} onPointerLeave={() => { setP(false); setH(false); }}
      style={{ position: 'relative', overflow: 'hidden', isolation: 'isolate', display: fullWidth ? 'flex' : 'inline-flex', width: fullWidth ? '100%' : undefined, alignItems: 'center', justifyContent: 'center', gap: 10,
        height: s.h, padding: '0 ' + s.px + 'px', borderRadius: 'var(--radius-pill)', border: '1.5px solid ' + v.bd, background: v.bg, color: v.fg,
        font: 'var(--fw-semibold) ' + s.fs + 'px/1 var(--font-sans)', boxShadow: disabled ? 'none' : v.sh, cursor: disabled ? 'not-allowed' : loading ? 'progress' : 'pointer',
        opacity: disabled ? 0.4 : 1, transform: p && !off ? 'scale(var(--press-scale))' : h && !off ? 'translateY(-1px)' : 'none',
        filter: p && !off ? 'brightness(.94)' : h && !off ? 'brightness(1.04)' : 'none',
        transition: 'transform var(--dur-spring) var(--ease-spring), filter var(--dur-fast), opacity var(--dur-base), background var(--dur-base)', whiteSpace: 'nowrap', ...style }}>
      {rip.map(q => <span key={q.id} aria-hidden="true" style={{ position: 'absolute', left: q.x, top: q.y, width: q.d, height: q.d, borderRadius: '50%', background: v.rip, animation: 'vt-ripple 620ms var(--ease-out) forwards', pointerEvents: 'none', zIndex: -1 }} />)}
      {shine && !off && <span aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '35%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.38),transparent)', animation: 'vt-shine 3.8s var(--ease-in-out) 1.4s infinite', pointerEvents: 'none', zIndex: -1 }} />}
      {loading ? <Icon name="LoaderCircle" size={s.ic} style={{ animation: 'vt-spin .9s linear infinite' }} /> : icon && <Icon name={icon} size={s.ic} />}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={s.ic} />}
    </button>
  );
}
