'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/ds/Icon';
import { dialogStack } from '@/lib/focus';
import { moveActive, paletteResults, sectionItems, vehicleItems, type PaletteItem } from '@/lib/palette';
import type { MenuItem } from '@/lib/permissions';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/status';
import type { VehicleStatus } from '@/lib/types';

interface VehicleLike { id: string; code: string; status: VehicleStatus; address?: string; model?: string }

/**
 * Depois de navegar pela paleta, o foco vai para o destino em vez de cair no <body>:
 * a ficha da moto (quando o item é uma moto) ou o título/conteúdo da seção.
 * Espera a URL mudar (até ~1,5 s), porque a navegação do App Router é assíncrona.
 */
function focusDestination(href: string) {
  const target = new URL(href, window.location.origin);
  const norm = (p: string) => p.replace(/\/$/, '');
  const vehicle = target.searchParams.get('vehicle');
  const started = Date.now();
  const tick = () => {
    const here = norm(window.location.pathname) === norm(target.pathname) && window.location.search === target.search;
    const el = here
      ? (vehicle ? document.querySelector<HTMLElement>('[data-testid="vehicle-sheet"]') : null)
        ?? document.querySelector<HTMLElement>('h1')
        ?? document.getElementById('main-content')
      : null;
    if (el) {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
      return;
    }
    if (Date.now() - started < 1500) setTimeout(tick, 50);
  };
  setTimeout(tick, 50);
}

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/**
 * Paleta de comandos: substitui a busca "Buscar moto, cliente ou aluguel" do header.
 * Abre com Ctrl+K / Cmd+K ou "/", navega com setas, Enter abre, Esc fecha.
 * Mantém o atalho da busca antiga: código exato de moto abre a ficha; texto livre busca clientes.
 */
export function CommandPalette({ vehicles, menu }: { vehicles: VehicleLike[]; menu: MenuItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const listId = useId();

  const canSearchCustomers = menu.some((m) => m.key === 'customers');
  const canSearchFleet = menu.some((m) => m.key === 'fleet');
  const vItems = useMemo(() => (canSearchFleet ? vehicleItems(vehicles, (s) => STATUS_LABEL[s as VehicleStatus] ?? s) : []), [vehicles, canSearchFleet]);
  const sections = useMemo(() => sectionItems(menu), [menu]);
  const results = useMemo(() => paletteResults(q, { vehicles: vItems, sections, canSearchCustomers, canSearchFleet }), [q, vItems, sections, canSearchCustomers, canSearchFleet]);
  const statusOf = useMemo(() => new Map(vehicles.map((v) => [v.id, v.status])), [vehicles]);

  useEffect(() => { setActive(0); }, [q]);

  const show = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    setQ('');
    opener.current?.focus?.({ preventScroll: true });
  }, []);
  const go = useCallback((item: PaletteItem | undefined) => {
    if (!item) return;
    setOpen(false);
    setQ('');
    router.push(item.href);
    focusDestination(item.href);
  }, [router]);

  // Atalhos globais.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) close();
        else if (dialogStack.size() === 0) show(); // não abre por cima de um diálogo aberto
        return;
      }
      if (e.key === '/' && !open && !isTyping(e.target) && dialogStack.size() === 0) { e.preventDefault(); show(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, show, close]);

  useEffect(() => {
    if (!open) return;
    const id = Symbol('palette');
    dialogStack.push(id);
    input.current?.focus();
    return () => dialogStack.remove(id);
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => moveActive(a, 1, results.length)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => moveActive(a, -1, results.length)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') e.preventDefault();
  };

  const kbd = <kbd className="kbd">Ctrl K</kbd>;
  let lastGroup = '';
  return (
    <>
      <button type="button" className="shell-search palette-trigger" onClick={show} aria-label="Buscar moto, cliente ou aluguel" aria-keyshortcuts="Control+K">
        <Icon name="Search" size={16} />
        <span style={{ flex: 1, textAlign: 'left' }}>Buscar moto, cliente ou aluguel</span>
        {kbd}
      </button>
      <button type="button" className="shell-search-icon" onClick={show} aria-label="Buscar moto, cliente ou aluguel" title="Buscar (Ctrl K)">
        <Icon name="Search" size={18} />
      </button>
      {open && (
        <div onMouseDown={close} style={{ position: 'fixed', inset: 0, zIndex: 85, background: 'var(--surface-scrim)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '12vh 16px 16px', animation: 'vt-scrim-in var(--dur-base) var(--ease-out) backwards' }}>
          <div role="dialog" aria-modal="true" aria-label="Buscar" data-testid="command-palette" onMouseDown={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 600, background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-2)', overflow: 'hidden', animation: 'vt-dialog-in var(--dur-slow) var(--ease-screen) backwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 60, borderBottom: '1px solid var(--border-subtle)' }}>
              <Icon name="Search" size={20} color="var(--text-tertiary)" />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} data-testid="palette-input"
                role="combobox" aria-expanded aria-controls={listId} aria-activedescendant={results[active] ? `${listId}-${active}` : undefined} aria-autocomplete="list"
                aria-label="Buscar moto, cliente ou aluguel" placeholder="Código ou endereço da moto, nome do cliente ou seção"
                style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', font: 'var(--type-body)', color: 'var(--text-primary)' }} />
              <kbd className="kbd">Esc</kbd>
            </div>
            <ul id={listId} role="listbox" aria-label="Resultados" style={{ listStyle: 'none', margin: 0, padding: 8, maxHeight: '52vh', overflow: 'auto' }}>
              {results.length === 0 && <li style={{ padding: '24px 12px', textAlign: 'center', font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>Nada encontrado. Tente o código da moto, ex.: VLT-0001.</li>}
              {results.map((r, i) => {
                const header = r.group !== lastGroup ? r.group : null;
                lastGroup = r.group;
                const on = i === active;
                const st = r.group === 'Motos' ? statusOf.get(r.id.slice(8)) : undefined;
                return (
                  <li key={r.id} role="presentation">
                    {header && <div style={{ font: 'var(--type-overline)', color: 'var(--text-tertiary)', padding: '10px 12px 4px' }}>{header}</div>}
                    <div id={`${listId}-${i}`} role="option" aria-selected={on} data-testid="palette-option" onMouseMove={() => setActive(i)} onClick={() => go(r)}
                      className="palette-option" data-on={on || undefined}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                      <span style={{ width: 32, height: 32, borderRadius: 10, background: on ? 'var(--surface-card)' : 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                        <Icon name={r.icon} size={16} />
                        {st && <span aria-hidden style={{ position: 'absolute', right: -2, bottom: -2, width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[st], border: '2px solid #fff' }} />}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', font: r.group === 'Motos' ? '600 14px/1.3 var(--font-mono)' : 'var(--type-label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                        {r.hint && <span style={{ display: 'block', font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>{r.hint}</span>}
                      </span>
                      {on && <Icon name="ArrowRight" size={16} color="var(--text-secondary)" />}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div style={{ display: 'flex', gap: 16, padding: '10px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--ink-50)', font: 'var(--type-caption)', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span><kbd className="kbd">Setas</kbd> navegar</span>
              <span><kbd className="kbd">Enter</kbd> abrir</span>
              <span><kbd className="kbd">/</kbd> ou <kbd className="kbd">Ctrl K</kbd> buscar de qualquer tela</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
