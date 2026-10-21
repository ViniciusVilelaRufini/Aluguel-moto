import React from 'react';
import { Icon } from './Icon.jsx';
const V = {
  surface: { bg: 'var(--surface-card)', fg: 'var(--text-primary)', sh: 'var(--shadow-1)' },
  ghost: { bg: 'transparent', fg: 'var(--text-primary)', sh: 'none' },
  soft: { bg: 'var(--surface-sunken)', fg: 'var(--text-primary)', sh: 'none' },
  brand: { bg: 'var(--brand)', fg: 'var(--on-brand)', sh: 'var(--shadow-brand)' },
  dark: { bg: 'var(--surface-inverse)', fg: 'var(--white)', sh: 'none' },
};
export function IconButton({ icon, variant = 'surface', size = 44, dot = false, label, onClick, iconColor, style }) {
  const [p, setP] = React.useState(false);
  const v = V[variant] || V.surface;
  return (
    <button aria-label={label} onClick={onClick} onPointerDown={() => setP(true)} onPointerUp={() => setP(false)} onPointerLeave={() => setP(false)}
      style={{ position: 'relative', width: size, height: size, borderRadius: '50%', border: 0, background: v.bg, color: iconColor || v.fg, boxShadow: v.sh,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
        transform: p ? 'scale(.92)' : 'none', transition: 'transform var(--dur-fast) var(--ease-out)', ...style }}>
      <Icon name={icon} size={Math.round(size * 0.46)} />
      {dot && <span style={{ position: 'absolute', top: size * 0.24, right: size * 0.26, width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', border: '1.5px solid var(--surface-card)' }} />}
    </button>
  );
}
