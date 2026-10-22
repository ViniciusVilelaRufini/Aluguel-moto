'use client';

import type { CSSProperties } from 'react';
import { Switch } from '@/ds/Switch';
import { WEEKDAY_LABEL, WEEK_ORDER, type DayDraft, type HoursDraft } from '@/lib/depot-hours';

const timeBox: CSSProperties = {
  width: 96, height: 34, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)',
  background: 'var(--ink-50)', font: '500 13px/1 var(--font-mono)', color: 'var(--text-primary)',
};

/**
 * Horário por dia da semana (segunda a domingo): interruptor "aberto" e abertura/fechamento em HH:MM, no fuso do
 * galpão. Dia fechado não entra em `openingHours`.
 */
export function OpeningHoursEditor({ value, onChange, errors = {}, disabled }: {
  value: HoursDraft;
  onChange: (next: HoursDraft) => void;
  errors?: Record<number, string>;
  disabled?: boolean;
}) {
  const set = (wd: number, p: Partial<DayDraft>) => onChange(value.map((d, i) => (i === wd ? { ...d, ...p } : d)));
  return (
    <div role="group" aria-label="Horário de funcionamento" data-testid="hours-editor" style={{ display: 'flex', flexDirection: 'column' }}>
      {WEEK_ORDER.map((wd) => {
        const day = value[wd];
        const err = errors[wd];
        const label = WEEKDAY_LABEL[wd];
        return (
          <div key={wd} data-testid={`hours-day-${wd}`} style={{ padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ width: 70, fontSize: 14, fontWeight: 600 }}>{label}</span>
              <Switch checked={day.open} disabled={disabled} ariaLabel={`${label} aberto`} testId={`hours-${wd}-open`} onChange={(open: boolean) => set(wd, { open })} />
              {day.open ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input className="field-mini" type="time" aria-label={`${label}: abre`} data-testid={`hours-${wd}-opens`} value={day.opensAt} disabled={disabled}
                    aria-invalid={!!err || undefined} onChange={(e) => set(wd, { opensAt: e.target.value })} style={timeBox} />
                  <span aria-hidden style={{ color: 'var(--text-tertiary)' }}>–</span>
                  <input className="field-mini" type="time" aria-label={`${label}: fecha`} data-testid={`hours-${wd}-closes`} value={day.closesAt} disabled={disabled}
                    aria-invalid={!!err || undefined} onChange={(e) => set(wd, { closesAt: e.target.value })} style={timeBox} />
                </span>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Fechado</span>
              )}
            </div>
            {err && <div role="alert" data-testid={`hours-${wd}-error`} style={{ fontSize: 12, color: 'var(--danger-ink)', marginTop: 4 }}>{err}</div>}
          </div>
        );
      })}
    </div>
  );
}
