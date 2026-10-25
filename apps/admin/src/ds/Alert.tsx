// @ts-nocheck
'use client';
import React from 'react';
import { Icon } from './Icon';
const T = { info: ['var(--info-soft)', 'var(--info-ink)', 'Info'], success: ['var(--success-soft)', 'var(--success-ink)', 'CircleCheck'], warning: ['var(--warning-soft)', 'var(--warning-ink)', 'TriangleAlert'], danger: ['var(--danger-soft)', 'var(--danger-ink)', 'OctagonAlert'] };
export function Alert({ tone = 'info', title, children, icon, action, onAction, solid = false, style, testId }: any) {
  const [bg, fg, ic] = T[tone] || T.info;
  const solidBg = { info: 'var(--info)', success: 'var(--brand)', warning: 'var(--warning)', danger: 'var(--danger)' }[tone];
  return (
    <div role="alert" data-testid={testId} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: solid ? solidBg : bg, color: solid ? '#fff' : fg, boxShadow: solid ? 'var(--shadow-2)' : 'none', ...style }}>
      <Icon name={icon || ic} size={20} style={{ marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ font: 'var(--type-label)' }}>{title}</div>}
        {children && <div style={{ font: 'var(--type-caption)', marginTop: title ? 2 : 0, color: solid ? 'rgba(255,255,255,.9)' : 'var(--ink-700)', textWrap: 'pretty' }}>{children}</div>}
      </div>
      {action && <button onClick={onAction} style={{ border: 0, background: 'transparent', color: 'inherit', font: 'var(--type-label)', cursor: 'pointer', padding: '2px 4px', textDecoration: 'underline' }}>{action}</button>}
    </div>
  );
}
