'use client';

import { localDay } from '@/lib/format';
import { customRange, type PeriodKind } from '@/lib/period';
import { SegmentedControl } from '@/ds/SegmentedControl';
import { Field, TextInput } from './ui';

export interface PeriodState { kind: PeriodKind; from: string; to: string }

export const DEFAULT_PERIOD: PeriodState = { kind: '7d', from: '', to: '' };

/** Seletor de período: Hoje, 7 dias, 30 dias ou datas livres (dias de São Paulo). */
export function PeriodPicker({ value, onChange, width = 380, testId = 'period' }: { value: PeriodState; onChange: (v: PeriodState) => void; width?: number; testId?: string }) {
  const check = value.kind === 'custom' ? customRange(value.from, value.to) : null;
  const error = check && !check.ok ? check.error : undefined;
  const today = localDay();
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }} data-testid={testId}>
      <SegmentedControl options={[{ value: 'today', label: 'Hoje' }, { value: '7d', label: '7 dias' }, { value: '30d', label: '30 dias' }, { value: 'custom', label: 'Período' }]}
        value={value.kind} onChange={(k: PeriodKind) => onChange({ ...value, kind: k, from: value.from || today, to: value.to || today })} style={{ width }} />
      {value.kind === 'custom' && (
        <>
          <div style={{ width: 170 }}><Field label="De" error={error}><TextInput testId={`${testId}-from`} type="date" value={value.from} onChange={(from) => onChange({ ...value, from })} /></Field></div>
          <div style={{ width: 170 }}><Field label="Até"><TextInput testId={`${testId}-to`} type="date" value={value.to} onChange={(to) => onChange({ ...value, to })} /></Field></div>
        </>
      )}
    </div>
  );
}
