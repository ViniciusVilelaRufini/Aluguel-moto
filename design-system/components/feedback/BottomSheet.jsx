import React from 'react';
export function BottomSheet({ children, open = true, padding = '12px 20px 28px', style }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40, background: 'var(--surface-card)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
      boxShadow: 'var(--shadow-sheet)', padding, transform: open ? 'translateY(0)' : 'translateY(105%)', transition: 'transform var(--dur-slow) var(--ease-out)', ...style }}>
      <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--ink-200)', margin: '0 auto 14px' }} />
      {children}
    </div>
  );
}
