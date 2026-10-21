import React from 'react';
import { Icon } from './Icon.jsx';
const T = {
  success: ['var(--success-soft)', 'var(--success-ink)'], info: ['var(--info-soft)', 'var(--info-ink)'],
  warning: ['var(--warning-soft)', 'var(--warning-ink)'], danger: ['var(--danger-soft)', 'var(--danger-ink)'],
  neutral: ['var(--surface-sunken)', 'var(--ink-700)'], dark: ['var(--surface-inverse)', 'var(--white)'],
};
export function Badge({ children, tone = 'success', icon, size = 'md', style }) {
  const [bg, fg] = T[tone] || T.success;
  const sm = size === 'sm';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: sm ? 20 : 26, padding: sm ? '0 6px' : '0 8px', borderRadius: 'var(--radius-xs)',
      background: bg, color: fg, font: 'var(--fw-semibold) ' + (sm ? 11 : 12) + 'px/1 var(--font-sans)', whiteSpace: 'nowrap', ...style }}>
      {icon && <Icon name={icon} size={sm ? 12 : 14} />}{children}
    </span>
  );
}
