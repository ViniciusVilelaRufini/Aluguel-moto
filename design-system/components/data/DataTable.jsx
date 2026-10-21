import React from 'react';
export function DataTable({ columns = [], rows = [], onRowClick, selectedKey, rowKey = 'id', dense = false, style }) {
  const pad = dense ? '8px 12px' : '12px 16px';
  return (
    <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)', ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-label)', fontWeight: 500 }}>
        <thead><tr>{columns.map(c => <th key={c.key} style={{ textAlign: c.align || 'left', padding: pad, font: 'var(--fw-semibold) 12px/1.3 var(--font-sans)', color: 'var(--text-secondary)', background: 'var(--ink-50)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap', width: c.width }}>{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => { const k = r[rowKey] ?? i, sel = k === selectedKey;
          return <tr key={k} onClick={onRowClick ? () => onRowClick(r) : undefined} style={{ cursor: onRowClick ? 'pointer' : 'default', background: sel ? 'var(--brand-soft)' : 'transparent' }}>
            {columns.map(c => <td key={c.key} style={{ padding: pad, textAlign: c.align || 'left', borderBottom: i < rows.length - 1 ? '1px solid var(--ink-100)' : 0, color: 'var(--text-primary)', font: c.mono ? 'var(--fw-medium) 13px/1.3 var(--font-mono)' : undefined, whiteSpace: 'nowrap' }}>{c.render ? c.render(r) : r[c.key]}</td>)}
          </tr>; })}</tbody>
      </table>
    </div>
  );
}
