import React from 'react';
function toPascal(n){return String(n||'').replace(/(^|[-_ ])(\w)/g,(_,a,b)=>b.toUpperCase());}
export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2, style }) {
  const lib = typeof window !== 'undefined' && window.lucide && window.lucide.icons;
  const node = lib && (lib[toPascal(name)] || lib[name]);
  const kids = node ? (node[0] === 'svg' ? node[2] : node) : [];
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', style: { flexShrink: 0, display: 'block', ...style }, 'aria-hidden': true },
    kids.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs })));
}
