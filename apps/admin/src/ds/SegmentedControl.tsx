'use client';
import type { CSSProperties } from 'react';

type Opt<T extends string> = T | { value: T; label: string };

/**
 * Controle segmentado (design-system/components/forms/SegmentedControl) com o "polegar" branco
 * deslizando até a opção ativa (`--ease-spring`, `--dur-spring`). Cada opção expõe `aria-pressed`.
 */
export function SegmentedControl<T extends string>({ options = [], value, onChange, style, label }: {
  options: Opt<T>[]; value: T; onChange?: (v: T) => void; style?: CSSProperties; label?: string;
}) {
  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const n = Math.max(1, norm.length);
  const idx = Math.max(0, norm.findIndex((o) => o.value === value));
  return (
    <div role="group" aria-label={label} style={{ position: 'relative', display: 'flex', gap: 4, padding: 4, borderRadius: 'var(--radius-pill)', background: 'var(--surface-sunken)', ...style }}>
      <span aria-hidden className="seg-thumb"
        style={{ position: 'absolute', top: 4, bottom: 4, left: 4, width: `calc((100% - 8px - ${(n - 1) * 4}px) / ${n})`, borderRadius: 'var(--radius-pill)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-1)',
          transform: `translateX(calc(${idx} * (100% + 4px)))`, transition: 'transform var(--dur-spring) var(--ease-spring)' }} />
      {norm.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange && onChange(o.value)}
            style={{ position: 'relative', flex: 1, height: 36, border: 0, borderRadius: 'var(--radius-pill)', cursor: 'pointer', background: 'transparent', whiteSpace: 'nowrap', padding: '0 10px',
              color: on ? 'var(--text-primary)' : 'var(--text-secondary)', font: 'var(--fw-semibold) 13px/1 var(--font-sans)', transition: 'color var(--dur-base) var(--ease-out)' }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
