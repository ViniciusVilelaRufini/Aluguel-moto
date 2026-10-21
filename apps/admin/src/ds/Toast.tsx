// @ts-nocheck
'use client';
import React from 'react';
import { Icon } from './Icon';
const I = { success: ['CircleCheck', 'var(--green-400)'], info: ['Info', 'var(--blue-500)'], warning: ['CircleAlert', 'var(--orange-500)'], danger: ['CircleAlert', 'var(--coral-400)'] };
export function Toast({ children, tone = 'success', action, onAction, style }: any) {
  const [ic, c] = I[tone] || I.success;
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '10px 10px 10px 14px', borderRadius: 'var(--radius-md)',
      background: 'var(--surface-inverse)', color: '#fff', boxShadow: 'var(--shadow-2)', font: 'var(--type-label)', ...style }}>
      <Icon name={ic} size={20} color={c} />
      <span style={{ flex: 1 }}>{children}</span>
      {action && <button onClick={onAction} style={{ border: 0, background: 'transparent', color: 'var(--green-300)', font: 'var(--type-label)', cursor: 'pointer', padding: '6px 8px' }}>{action}</button>}
    </div>
  );
}
