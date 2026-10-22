'use client';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';

export interface SideNavItem { value: string; label: string; icon: string; badge?: number }

/**
 * Menu lateral ink-900 (design-system/components/navigation/SideNav).
 * Abaixo de 1024px vira trilho de ícones (globals.css, `.shell-nav`): por isso cada item tem
 * `aria-label` e `title` — o texto visível some, o nome acessível e a dica continuam.
 */
export function SideNav({ items = [], value, onChange, footer, brand = 'volti', style }: {
  items: SideNavItem[]; value?: string; onChange?: (v: string) => void; footer?: ReactNode; brand?: string; style?: CSSProperties;
}) {
  return (
    <nav className="shell-nav" aria-label="Seções do painel" style={{ width: 232, flexShrink: 0, background: 'var(--ink-900)', color: '#fff', display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: 4, transition: 'width var(--dur-slow) var(--ease-screen)', ...style }}>
      <div style={{ font: '800 24px/1 var(--font-sans)', letterSpacing: '-.04em', color: 'var(--green-400)', padding: '4px 12px 20px' }}>{brand}</div>
      {items.map((it) => {
        const on = it.value === value;
        const name = it.badge != null ? `${it.label}, ${it.badge} ${it.badge === 1 ? 'pendente' : 'pendentes'}` : it.label;
        return (
          <button key={it.value} type="button" className="nav-item" data-on={on || undefined} aria-current={on ? 'page' : undefined} aria-label={name} title={it.label}
            onClick={() => onChange && onChange(it.value)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, height: 42, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: 0, cursor: 'pointer', textAlign: 'left',
              font: 'var(--fw-semibold) 14px/1 var(--font-sans)' }}>
            <Icon name={it.icon} size={18} color={on ? 'var(--green-400)' : 'currentColor'} />
            <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{it.label}</span>
            {it.badge != null && (
              <span key={it.badge} className="nav-badge" aria-hidden style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: 'var(--danger)', color: '#fff', font: 'var(--fw-bold) 11px/20px var(--font-sans)', textAlign: 'center' }}>{it.badge}</span>
            )}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      {footer}
    </nav>
  );
}
