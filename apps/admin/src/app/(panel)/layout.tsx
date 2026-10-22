'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SideNav } from '@/ds/SideNav';
import { Badge } from '@/ds/Badge';
import { Icon } from '@/ds/Icon';
import { useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';
import { menuFor, MENU } from '@/lib/permissions';
import { Initials } from '@/components/ui';
import type { StaffGroup } from '@/lib/types';

const GROUP_LABEL: Record<StaffGroup, string> = { admin: 'Administrador', operacao: 'Operação', financeiro: 'Financeiro', suporte: 'Suporte', campo: 'Campo' };

export default function PanelLayout({ children }: { children: ReactNode }) {
  const { ready, token, me, groups, logout } = useAuth();
  const { vehicles, vehiclesReady, openAlerts } = useRealtime();
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const [q, setQ] = useState('');

  const menu = menuFor(groups);
  const current = MENU.find((m) => pathname === m.href || pathname.startsWith(m.href + '/'));
  const allowed = !!current && menu.some((m) => m.key === current.key);

  useEffect(() => {
    if (!ready) return;
    if (!token) router.replace('/login');
    else if (me && !allowed) router.replace(menu[0]?.href ?? '/login');
  }, [ready, token, me, allowed, menu, router]);

  if (!ready || !token || !me || !allowed) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Carregando...</div>;
  }

  const items = menu.map((m) => ({ value: m.href, label: m.label, icon: m.icon, badge: m.key === 'alerts' && openAlerts > 0 ? openAlerts : undefined }));
  const offline = vehicles.filter((v) => v.status === 'offline').length;
  const name = me.staff?.name ?? me.email;
  const groupLabel = groups.map((g) => GROUP_LABEL[g]).join(', ');

  const search = () => {
    const t = q.trim();
    if (!t) return;
    const v = vehicles.find((x) => x.code.toLowerCase() === t.toLowerCase());
    if (v) router.push(`/fleet?vehicle=${v.id}`);
    else if (menu.some((m) => m.key === 'customers')) router.push(`/customers?q=${encodeURIComponent(t)}`);
    else router.push(`/fleet?code=${encodeURIComponent(t)}`);
    setQ('');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', background: 'var(--surface-app)' }}>
      <SideNav
        style={{}}
        items={items}
        value={current?.href}
        onChange={(href: string) => router.push(href)}
        footer={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.06)' }}>
            <Initials name={name} />
            <div className="nav-footer-name" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>{groupLabel} · 2FA</div>
            </div>
            <button onClick={logout} aria-label="Sair" data-testid="logout" style={{ border: 0, background: 'transparent', color: 'rgba(255,255,255,.6)', cursor: 'pointer', padding: 6 }}>
              <Icon name="LogOut" size={16} />
            </button>
          </div>
        }
      />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', background: 'var(--surface-card)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ font: 'var(--type-heading)', fontWeight: 700, fontSize: 18, flex: 1 }}>{current?.label}</div>
          <form className="shell-search" onSubmit={(e) => { e.preventDefault(); search(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', borderRadius: 999, background: 'var(--surface-sunken)', width: 280, color: 'var(--text-tertiary)' }}>
            <Icon name="Search" size={16} />
            <input aria-label="Buscar moto, cliente ou aluguel" placeholder="Buscar moto, cliente ou aluguel" value={q} onChange={(e) => setQ(e.target.value)}
              style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', font: 'inherit', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }} />
          </form>
          {vehiclesReady && (
            <Badge tone={offline > 0 ? 'warning' : 'success'} icon="Wifi">
              <span data-testid="fleet-badge">{vehicles.length} motos · {offline} sem sinal</span>
            </Badge>
          )}
        </header>
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Troca de seção: fade + subida curta (vt-section-in, --ease-out). Só `backwards`, para não deixar transform residual. */}
          <div key={current?.key} className="section-in" style={{ flex: 1, display: 'flex', minHeight: 0, minWidth: 0 }}>
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
