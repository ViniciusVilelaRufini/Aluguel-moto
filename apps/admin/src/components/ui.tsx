'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { keepPreviousData, useQuery, type QueryKey } from '@tanstack/react-query';
import { Badge } from '@/ds/Badge';
import { Button } from '@/ds/Button';
import { Icon } from '@/ds/Icon';
import { IconButton } from '@/ds/IconButton';
import { Toast } from '@/ds/Toast';

/* ---------- Layout ---------- */

export function Page({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="page" style={{ flex: 1, overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0, ...style }}>{children}</div>;
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <h1 style={{ font: 'var(--type-title)', fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

export function SidePanel({ children, width = 360, onClose, title, testId }: { children: ReactNode; width?: number; onClose?: () => void; title?: ReactNode; testId?: string }) {
  return (
    <aside
      data-testid={testId}
      className="side-panel panel-in"
      style={{ width, flexShrink: 0, background: 'var(--surface-card)', borderLeft: '1px solid var(--border-subtle)', overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      {(title || onClose) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>{title}</div>
          {onClose && <IconButton icon="X" variant="soft" size={32} label="Fechar" onClick={onClose} />}
        </div>
      )}
      {children}
    </aside>
  );
}

/** Conteúdo de aba com a mesma entrada da troca de seção; `k` muda a cada aba para reanimar. */
export function TabPanel({ k, children, style }: { k: string; children: ReactNode; style?: CSSProperties }) {
  return <div key={k} className="section-in" style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0, ...style }}>{children}</div>;
}

export function KV({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--ink-100)', fontSize: 14, fontWeight: 500 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
      <span style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' }}>{v}</span>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div style={{ font: 'var(--type-label)', marginBottom: 6, fontWeight: 600 }}>{children}</div>;
}

/** Estado vazio: ícone, frase que explica e, quando faz sentido, a ação que resolve. */
export function Empty({ children, icon, hint, action, compact }: { children: ReactNode; icon?: string; hint?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className="section-in" style={{ padding: compact ? 16 : '36px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
      {icon && (
        <span style={{ width: compact ? 36 : 48, height: compact ? 36 : 48, borderRadius: '50%', background: 'var(--surface-sunken)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
          <Icon name={icon} size={compact ? 18 : 22} />
        </span>
      )}
      <div style={{ font: 'var(--type-label)', color: 'var(--text-primary)' }}>{children}</div>
      {hint && <div style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)', maxWidth: 360 }}>{hint}</div>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}

/** Bloco de carregamento com brilho (com movimento reduzido fica estático). */
export function Skeleton({ w = '100%', h = 12, r = 6, style }: { w?: number | string; h?: number | string; r?: number | string; style?: CSSProperties }) {
  return <span aria-hidden className="skeleton" style={{ display: 'block', width: w, height: h, borderRadius: r, ...style }} />;
}

/** Esqueleto de painel lateral: título, pílulas e linhas chave-valor. */
export function PanelSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Carregando" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Skeleton w={140} h={24} />
      <div style={{ display: 'flex', gap: 8 }}><Skeleton w={110} h={30} r={999} /><Skeleton w={70} h={26} /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 6 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}><Skeleton w={90} /><Skeleton w={60 + ((i * 37) % 60)} /></div>
        ))}
      </div>
      <Skeleton h={36} r={999} style={{ marginTop: 8 }} />
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div role="alert" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--danger-soft)', color: 'var(--danger-ink)', fontSize: 13, fontWeight: 600 }}>
      {error instanceof Error ? error.message : 'Algo deu errado. Tente de novo.'}
    </div>
  );
}

export function Initials({ name, size = 32 }: { name: string; size?: number }) {
  const t = name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: 'var(--sun-300)', color: 'var(--ink-900)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.37, flexShrink: 0 }}>
      {t}
    </span>
  );
}

/* ---------- Fields ---------- */

const fieldBox: CSSProperties = {
  width: '100%', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)', border: '1.5px solid transparent',
  padding: '0 16px', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', outline: 'none',
};

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ font: 'var(--type-label)', fontWeight: 600 }}>{label}</span>
      {children}
      {(error || hint) && (
        <span role={error ? 'alert' : undefined} style={{ fontSize: 12, color: error ? 'var(--danger-ink)' : 'var(--text-secondary)' }}>{error || hint}</span>
      )}
    </label>
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3, testId }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; testId?: string }) {
  return <textarea data-testid={testId} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ ...fieldBox, padding: '12px 16px', resize: 'vertical' }} />;
}

export function Select<T extends string>({ value, onChange, options, testId }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; testId?: string }) {
  return (
    <select data-testid={testId} value={value} onChange={(e) => onChange(e.target.value as T)} style={{ ...fieldBox, height: 48 }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function TextInput({ value, onChange, type = 'text', placeholder, testId, min, max, step }: { value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string; testId?: string; min?: number; max?: number; step?: number }) {
  return <input data-testid={testId} type={type} value={value} min={min} max={max} step={step} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ ...fieldBox, height: 48 }} />;
}

/** Campo numérico compacto para tabelas de preço (estilo `PricingView`). */
export function MiniInput({ value, onChange, width = 110, align = 'right', label }: { value: string; onChange: (v: string) => void; width?: number; align?: 'left' | 'right'; label?: string }) {
  return (
    <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width, height: 34, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--ink-50)', font: '500 13px/1 var(--font-mono)', textAlign: align, color: 'var(--text-primary)' }} />
  );
}

/* ---------- Dialog ---------- */

export function Modal({ open, title, children, actions, onClose, width = 440, testId }: { open: boolean; title: string; children: ReactNode; actions?: ReactNode; onClose: () => void; width?: number; testId?: string }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'var(--surface-scrim)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div role="dialog" aria-modal="true" aria-label={title} data-testid={testId} onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', padding: 24, boxShadow: 'var(--shadow-2)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ font: 'var(--type-heading)', fontWeight: 700, fontSize: 18 }}>{title}</div>
        {children}
        {actions && <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4, flexWrap: 'wrap' }}>{actions}</div>}
      </div>
    </div>
  );
}

/** Ação com motivo obrigatório e confirmação explícita. */
export function ReasonDialog({
  open, title, description, confirmLabel, danger, minLength = 3, onClose, onConfirm, children, testId,
}: {
  open: boolean; title: string; description?: ReactNode; confirmLabel: string; danger?: boolean; minLength?: number;
  onClose: () => void; onConfirm: (reason: string) => Promise<void>; children?: ReactNode; testId?: string;
}) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (open) { setReason(''); setTouched(false); setError(null); }
  }, [open]);
  const invalid = reason.trim().length < minLength;
  return (
    <Modal open={open} title={title} onClose={onClose} testId={testId}
      actions={<>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" variant={danger ? 'danger' : 'dark'} testId="confirm-action" disabled={busy}
          onClick={async () => {
            setTouched(true);
            if (invalid) return;
            setBusy(true); setError(null);
            try { await onConfirm(reason.trim()); onClose(); } catch (e) { setError(e); } finally { setBusy(false); }
          }}>{confirmLabel}</Button>
      </>}>
      {description && <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{description}</div>}
      {children}
      <Field label="Motivo" error={touched && invalid ? 'Informe o motivo (mínimo de 3 caracteres)' : undefined} hint="Fica registrado na auditoria.">
        <TextArea testId="reason-input" value={reason} onChange={setReason} placeholder="Descreva o motivo" />
      </Field>
      <ErrorNote error={error} />
    </Modal>
  );
}

/* ---------- Toast ---------- */

type ToastTone = 'success' | 'info' | 'warning' | 'danger';
const ToastCtx = createContext<(msg: string, tone?: ToastTone) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; tone: ToastTone } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string, tone: ToastTone = 'success') => {
    setT({ msg, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && <Toast tone={t.tone} style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', minWidth: 320, zIndex: 90 }}>{t.msg}</Toast>}
    </ToastCtx.Provider>
  );
}

/* ---------- Tabela com paginação por cursor ---------- */

export interface Column<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  mono?: boolean;
  width?: number | string;
  render?: (row: T) => ReactNode;
}

export interface Pager {
  page: number;
  hasNext: boolean;
  onNext: () => void;
  onPrev: () => void;
  loading?: boolean;
}

export function DataTable<T extends object>({
  columns, rows, rowKey = 'id', selectedKey, onRowClick, dense, loading, empty = 'Nada por aqui ainda.', emptyIcon = 'Search', emptyHint, emptyAction, pager, testId, rowClassName, label,
}: {
  columns: Column<T>[]; rows: T[]; rowKey?: string; selectedKey?: string | null; onRowClick?: (r: T) => void;
  dense?: boolean; loading?: boolean; empty?: ReactNode; emptyIcon?: string; emptyHint?: ReactNode; emptyAction?: ReactNode; pager?: Pager; testId?: string;
  /** Classe extra por linha (ex.: destaque de linha recém-chegada). */
  rowClassName?: (r: T) => string | undefined;
  label?: string;
}) {
  const pad = dense ? '8px 12px' : '12px 16px';
  const get = (r: T, k: string) => (r as Record<string, unknown>)[k];
  const skeleton = loading && rows.length === 0;
  const refetching = !!pager?.loading && rows.length > 0;
  return (
    <div data-testid={testId} className="dt" style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
      <div className="table-scroll">
        <table aria-label={label} aria-busy={skeleton || refetching || undefined} style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 14, fontWeight: 500 }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" style={{ textAlign: c.align ?? 'left', padding: pad, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--ink-50)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap', width: c.width }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ opacity: refetching ? 0.55 : 1, transition: 'opacity var(--dur-base) var(--ease-out)' }}>
            {skeleton && Array.from({ length: dense ? 3 : 5 }).map((_, i) => (
              <tr key={'sk-' + i} aria-hidden>
                {columns.map((c, j) => (
                  <td key={c.key} style={{ padding: pad, borderBottom: '1px solid var(--ink-100)' }}>
                    <Skeleton w={c.label ? (50 + ((i * 17 + j * 23) % 40)) + '%' : 64} h={dense ? 10 : 12} style={{ marginLeft: c.align === 'right' ? 'auto' : undefined }} />
                  </td>
                ))}
              </tr>
            ))}
            {rows.map((r, i) => {
              const k = String(get(r, rowKey) ?? i);
              const sel = k === selectedKey;
              const extra = rowClassName?.(r);
              const cls = ['dt-row', onRowClick ? 'dt-click' : '', extra ?? ''].filter(Boolean).join(' ');
              return (
                <tr key={k} data-testid="row" className={cls} data-selected={sel || undefined}
                  aria-selected={onRowClick ? sel : undefined} tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  onKeyDown={onRowClick ? (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onRowClick(r); } } : undefined}>
                  {columns.map((c) => (
                    <td key={c.key} style={{ padding: pad, textAlign: c.align ?? 'left', borderBottom: i < rows.length - 1 ? '1px solid var(--ink-100)' : 0, font: c.mono ? '500 13px/1.3 var(--font-mono)' : undefined, whiteSpace: 'nowrap' }}>
                      {c.render ? c.render(r) : (get(r, c.key) as ReactNode)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {skeleton && <span role="status" className="sr-only">Carregando</span>}
      {!loading && rows.length === 0 && <Empty icon={emptyIcon} hint={emptyHint} action={emptyAction} compact={dense}>{empty}</Empty>}
      {pager && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--ink-100)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 'auto' }}>Página {pager.page + 1}</span>
          <Button size="sm" variant="ghost" icon="ChevronLeft" disabled={pager.page === 0 || pager.loading} onClick={pager.onPrev} testId="page-prev">Anterior</Button>
          <Button size="sm" variant="ghost" iconRight="ChevronRight" disabled={!pager.hasNext || pager.loading} onClick={pager.onNext} testId="page-next">Próxima</Button>
        </div>
      )}
    </div>
  );
}

interface Paged<T> { items: T[]; nextCursor?: string }

/** Paginação por cursor no servidor: guarda a pilha de cursores e busca uma página por vez. */
export function usePagedQuery<T>(key: QueryKey, fetchPage: (cursor?: string) => Promise<Paged<T>>, enabled = true) {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const keyStr = JSON.stringify(key);
  useEffect(() => setCursors([undefined]), [keyStr]);
  const page = cursors.length - 1;
  const cursor = cursors[page];
  const q = useQuery({
    queryKey: [...key, cursor ?? 'first'],
    queryFn: () => fetchPage(cursor),
    placeholderData: keepPreviousData,
    enabled,
  });
  const pager: Pager = useMemo(() => ({
    page,
    hasNext: !!q.data?.nextCursor,
    loading: q.isFetching,
    onNext: () => q.data?.nextCursor && setCursors((c) => [...c, q.data!.nextCursor]),
    onPrev: () => setCursors((c) => (c.length > 1 ? c.slice(0, -1) : c)),
  }), [page, q.data, q.isFetching]);
  return { rows: q.data?.items ?? [], loading: q.isLoading, error: q.error, pager, refetch: q.refetch };
}

/* ---------- Pequenos ---------- */

export function Pill({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'dark'; icon?: string }) {
  return <Badge size="sm" tone={tone} icon={icon}>{children}</Badge>;
}

export function LinkBtn({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} style={{ fontWeight: 600, color: 'var(--text-link)', textDecoration: 'none' }}>{children}</a>;
}

export { Icon };
