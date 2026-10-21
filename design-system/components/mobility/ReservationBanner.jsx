import React from 'react';
import { SwipeAction } from './SwipeAction.jsx';
export function ReservationBanner({ seconds = 383, label = 'Tempo de reserva restante', swipeLabel = 'Deslize para cancelar', onCancel, style }) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0'), s = String(seconds % 60).padStart(2, '0');
  return (
    <div style={{ background: 'var(--danger)', borderRadius: 'var(--radius-xl)', padding: '12px 6px 6px', boxShadow: 'var(--shadow-coral)', color: '#fff', textAlign: 'center', ...style }}>
      <div style={{ font: 'var(--type-caption)', opacity: .92 }}>{label}</div>
      <div style={{ font: 'var(--fw-bold) 22px/1.2 var(--font-mono)', margin: '2px 0 10px', letterSpacing: '.02em' }}>{m} : {s} <span style={{ font: 'var(--fw-semibold) 15px/1 var(--font-sans)' }}>min</span></div>
      <SwipeAction label={swipeLabel} onComplete={onCancel} />
    </div>
  );
}
