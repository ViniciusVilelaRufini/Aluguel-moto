// @ts-nocheck
'use client';
import React from 'react';
import { Icon } from './Icon';
export function Input({ label, value, defaultValue, placeholder, onChange, icon, hint, error, type = 'text', inputMode, testId, name, style, readOnly }: any) {
  const [f, setF] = React.useState(false);
  const bd = error ? 'var(--danger)' : f ? 'var(--border-focus)' : 'transparent';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <span style={{ font: 'var(--type-label)', color: 'var(--text-primary)' }}>{label}</span>}
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 16px', borderRadius: 'var(--radius-md)', background: f ? 'var(--surface-card)' : 'var(--surface-sunken)',
        border: '1.5px solid ' + bd, transition: 'border-color var(--dur-base), background var(--dur-base)' }}>
        {icon && <Icon name={icon} size={20} color="var(--text-tertiary)" />}
        <input data-testid={testId} name={name} type={type} inputMode={inputMode} value={value} defaultValue={defaultValue} placeholder={placeholder} onChange={onChange} readOnly={readOnly}
          onFocus={() => setF(true)} onBlur={() => setF(false)}
          style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', font: 'var(--type-body)', color: readOnly ? 'var(--text-secondary)' : 'var(--text-primary)', cursor: readOnly ? 'default' : undefined }} />
      </span>
      {(error || hint) && <span style={{ font: 'var(--type-caption)', color: error ? 'var(--danger-ink)' : 'var(--text-secondary)' }}>{error || hint}</span>}
    </label>
  );
}
