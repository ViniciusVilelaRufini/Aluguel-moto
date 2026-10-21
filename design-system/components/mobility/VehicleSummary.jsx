import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Badge } from '../core/Badge.jsx';
import { BatteryPill } from './BatteryPill.jsx';
export function VehicleSummary({ category = 'Moto elétrica', name = 'Volti Flash', level = 90, range = 20, price = 'R$ 0,79/min + taxa', promo = 'Grátis na 1ª corrida', image, onView3d, style }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', ...style }}>
      <div style={{ position: 'relative', width: 132, minHeight: 132, borderRadius: 'var(--radius-lg)', background: 'var(--surface-media)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {image ? <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ font: 'var(--type-caption)', color: 'var(--blue-600)', textAlign: 'center', padding: 12 }}>foto da moto<br />(PNG recortado)</span>}
        {onView3d && <button onClick={onView3d} style={{ position: 'absolute', top: 8, left: 8, height: 28, padding: '0 10px', borderRadius: 999, border: 0, background: '#fff', display: 'flex', alignItems: 'center', gap: 5, font: 'var(--fw-semibold) 11px/1 var(--font-sans)', color: 'var(--text-primary)', cursor: 'pointer' }}><Icon name="Box" size={13} />Ver em 3D</button>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', minWidth: 0 }}>
        <div style={{ font: 'var(--fw-semibold) 13px/1 var(--font-sans)', color: 'var(--warning)' }}>{category}</div>
        <div style={{ font: 'var(--type-title)', color: 'var(--text-primary)', letterSpacing: 'var(--ls-tight)' }}>{name}</div>
        <div><BatteryPill level={level} range={range} /></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
          {promo && <Badge tone="success">{promo}</Badge>}
          {price && <Badge tone="info">{price}</Badge>}
        </div>
      </div>
    </div>
  );
}
