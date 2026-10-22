// @ts-nocheck
'use client';
import React from 'react';
export function OtpInput({ length = 6, value = '', onChange, error = false, autoFocus = false, label = 'Código', style }: any) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [f, setF] = React.useState(false);
  return (
    <div onClick={() => ref.current && ref.current.focus()} style={{ position: 'relative', display: 'flex', gap: 8, ...style }}>
      <input ref={ref} value={value} autoFocus={autoFocus} aria-label={label} inputMode="numeric" autoComplete="one-time-code" maxLength={length} onFocus={() => setF(true)} onBlur={() => setF(false)}
        onChange={e => onChange && onChange(e.target.value.replace(/\D/g, '').slice(0, length))} style={{ position: 'absolute', opacity: 0, inset: 0 }} />
      {Array.from({ length }).map((_, i) => { const active = f && i === Math.min(value.length, length - 1);
        return <div key={i} style={{ flex: 1, height: 56, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'var(--surface-card)' : 'var(--surface-sunken)',
          border: '1.5px solid ' + (error ? 'var(--danger)' : active ? 'var(--border-focus)' : 'transparent'), transition: 'border-color var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out)', animation: value[i] ? 'vt-pop-in 160ms var(--ease-out)' : undefined, font: 'var(--fw-bold) 22px/1 var(--font-mono)', color: 'var(--text-primary)' }}>{value[i] || ''}</div>; })}
    </div>
  );
}
