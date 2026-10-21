import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function SwipeAction({ label = 'Deslize para cancelar', tone = 'danger', onComplete, style }) {
  const track = React.useRef(null);
  const [x, setX] = React.useState(0);
  const [drag, setDrag] = React.useState(null);
  const H = 52, K = 40;
  const max = () => (track.current ? track.current.offsetWidth - K - 12 : 200);
  const c = tone === 'brand' ? 'var(--brand)' : 'var(--danger)';
  const down = e => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(e.clientX - x); };
  const move = e => { if (drag === null) return; setX(Math.max(0, Math.min(max(), e.clientX - drag))); };
  const up = () => { if (drag === null) return; setDrag(null); if (x > max() * 0.85) { setX(max()); onComplete && onComplete(); setTimeout(() => setX(0), 400); } else setX(0); };
  return (
    <div ref={track} style={{ position: 'relative', height: H, borderRadius: 'var(--radius-pill)', background: 'var(--surface-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', touchAction: 'none', ...style }}>
      <span style={{ font: 'var(--fw-bold) 16px/1 var(--font-sans)', color: 'var(--text-primary)', opacity: 1 - x / (max() * 1.2) }}>{label}</span>
      <span onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ position: 'absolute', left: 6, top: 6, width: K, height: K, borderRadius: '50%', background: c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab',
          transform: 'translateX(' + x + 'px)', transition: drag === null ? 'transform var(--dur-slow) var(--ease-spring)' : 'none' }}>
        <Icon name="ChevronsRight" size={20} />
      </span>
    </div>
  );
}
