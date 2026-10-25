'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from './Icon';
import { prefersReducedMotion, useReducedMotion } from '@/lib/motion';
import { createTicker, deltaTone, formatDelta } from '@/lib/ticker';

/** Número que rola do valor anterior até o novo (700ms, --ease-out); imediato com movimento reduzido. */
export function AnimatedNumber({ value, format = (n) => String(n), integer = true, duration = 700 }: {
  value: number; format?: (n: number) => string; integer?: boolean; duration?: number;
}) {
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  // Começa do zero: na primeira carga o número sobe até o valor (ticker); depois anima entre valores,
  // sempre a partir do número que está na tela (ver createTicker).
  const [shown, setShown] = useState(0);
  const ticker = useRef<ReturnType<typeof createTicker> | null>(null);
  if (!ticker.current) ticker.current = createTicker({ initial: 0, duration, integer, onShow: setShown, reduced: () => reducedRef.current || prefersReducedMotion() });
  useEffect(() => {
    const t = ticker.current!;
    t.to(value);
    return () => t.stop();
  }, [value]);
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{format(shown)}</span>;
}

/**
 * Indicador do dashboard (design-system/components/data/StatTile).
 * Com `numeric`, o valor anima (ticker) e cada mudança ao vivo mostra uma variação curta ("+1")
 * que some em 2,4 s, com tom conforme `goodWhen`. `delta`/`trend` estáticos continuam valendo.
 */
export function StatTile({ label, value, numeric, format, goodWhen = 'up', delta, trend = 'up', caption, icon, testId, style }: {
  label: string; value?: ReactNode; numeric?: number | null; format?: (n: number) => string; goodWhen?: 'up' | 'down';
  delta?: string; trend?: 'up' | 'down' | 'flat'; caption?: string; icon?: string; testId?: string; style?: CSSProperties;
}) {
  const prev = useRef<number | null | undefined>(numeric);
  const [live, setLive] = useState<{ text: string; tone: 'success' | 'danger'; key: number } | null>(null);
  useEffect(() => {
    const p = prev.current;
    prev.current = numeric;
    if (p == null || numeric == null || p === numeric) return;
    const text = formatDelta(p, numeric, format);
    const tone = deltaTone(p, numeric, goodWhen);
    if (!text || !tone) return;
    setLive({ text, tone, key: Date.now() });
    const h = setTimeout(() => setLive(null), 2400);
    return () => clearTimeout(h);
  }, [numeric, format, goodWhen]);
  const up = trend === 'up';
  const flat = trend === 'flat';
  return (
    <div data-testid={testId} className={live ? 'stat-tile stat-flash' : 'stat-tile'}
      style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', padding: 16, boxShadow: 'var(--shadow-1)', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>
        {icon && <Icon name={icon} size={16} />}
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {live && (
          <span className="stat-delta" style={{ font: 'var(--fw-bold) 11px/1 var(--font-mono)', padding: '3px 6px', borderRadius: 'var(--radius-xs)',
            background: live.tone === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)', color: live.tone === 'success' ? 'var(--success-ink)' : 'var(--danger-ink)' }}>{live.text}</span>
        )}
      </div>
      <div aria-live="off" style={{ font: 'var(--fw-bold) 26px/1.1 var(--font-sans)', letterSpacing: 'var(--ls-tight)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {numeric != null ? <AnimatedNumber value={numeric} format={format} /> : value ?? '—'}
      </div>
      {caption && <div style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>{caption}</div>}
      {delta && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: 'var(--fw-semibold) 12px/1 var(--font-sans)', color: flat ? 'var(--text-secondary)' : up ? 'var(--success-ink)' : 'var(--danger-ink)' }}>
          {!flat && <Icon name={up ? 'TrendingUp' : 'TrendingDown'} size={14} />}{delta}
        </div>
      )}
    </div>
  );
}

/** Esqueleto de StatTile com as mesmas medidas (evita salto de layout quando os dados chegam). */
export function StatTileSkeleton() {
  return (
    <div aria-hidden style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', padding: 16, boxShadow: 'var(--shadow-1)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span className="skeleton" style={{ display: 'block', width: '60%', height: 12, borderRadius: 6 }} />
      <span className="skeleton" style={{ display: 'block', width: '45%', height: 24, borderRadius: 6 }} />
    </div>
  );
}
