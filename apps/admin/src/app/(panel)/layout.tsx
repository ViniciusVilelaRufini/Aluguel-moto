'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SideNav } from '@/ds/SideNav';
import { Badge } from '@/ds/Badge';
import { Icon } from '@/ds/Icon';
import { useAuth } from '@/lib/auth';
import { useRealtime, useRealtimeEvent } from '@/lib/realtime';
import { ALERT_TYPE } from '@/lib/labels';
import { menuFor, MENU } from '@/lib/permissions';
import { Initials, useToast } from '@/components/ui';
import { CommandPalette } from '@/components/CommandPalette';
import type { StaffGroup } from '@/lib/types';

const GROUP_LABEL: Record<StaffGroup, string> = { admin: 'Administrador', operacao: 'Operação', financeiro: 'Financeiro', suporte: 'Suporte', campo: 'Campo' };

/** Alerta crítico chega por tempo real: avisa em qualquer seção (fora da própria fila de alertas). */
function CriticalAlertToaster({ vehicles, onAlertsPage }: { vehicles: { id: string; code: string }[]; onAlertsPage: boolean }) {
  const toast = useToast();
  useRealtimeEvent('alert.created', (p) => {
    if (p.priority !== 'critical' || onAlertsPage) return;
    const code = p.vehicleId ? vehicles.find((v) => v.id === p.vehicleId)?.code : undefined;
    toast(`Alerta crítico: ${ALERT_TYPE[p.type]?.[0] ?? p.type}${code ? ` · ${code}` : ''}`, 'danger');
  });
  return null;
}

export default function PanelLayout({ children }: { children: ReactNode }) {
  const { ready, token, me, groups, logout } = useAuth();
  const { vehicles, vehiclesReady, openAlerts, connected } = useRealtime();
  const router = useRouter();
  const pathname = usePathname() ?? '/';

  const menu = menuFor(groups);
  const current = MENU.find((m) => pathname === m.href || pathname.startsWith(m.href + '/'));
  const allowed = !!current && menu.some((m) => m.key === current.key);

  useEffect(() => {
    if (!ready) return;
    if (!token) router.replace('/login');
    else if (me && !allowed) router.replace(menu[0]?.href ?? '/login');
  }, [ready, token, me, allowed, menu, router]);

  if (!ready || !token || !me || !allowed) {
    return (
      <div role="status" aria-label="Carregando o painel" style={{ height: '100vh', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'center', background: 'var(--surface-app)' }}>
        <div style={{ font: '800 32px/1 var(--font-sans)', letterSpacing: '-.04em', color: 'var(--green-500)', animation: 'vt-breathe 1.6s var(--ease-in-out) infinite' }}>volti</div>
        <div style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>Carregando o painel</div>
      </div>
    );
  }

  const items = menu.map((m) => ({ value: m.href, label: m.label, icon: m.icon, badge: m.key === 'alerts' && openAlerts > 0 ? openAlerts : undefined }));
  const offline = vehicles.filter((v) => v.status === 'offline').length;
  const name = me.staff?.name ?? me.email;
  const groupLabel = groups.map((g) => GROUP_LABEL[g]).join(', ');

  const canLive = groups.some((g) => g === 'admin' || g === 'operacao' || g === 'suporte');

  return (
    <div style={{ height: '100vh', display: 'flex', background: 'var(--surface-app)' }}>
      <SideNav
        style={{}}
        items={items}
        value={current?.href}
        onChange={(href: string) => router.push(href)}
        footer={
          <div className="nav-footer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.06)' }}>
            <Initials name={name} />
            <div className="nav-footer-name" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>{groupLabel} · 2FA</div>
            </div>
            <button onClick={logout} aria-label="Sair" title="Sair" data-testid="logout" className="nav-logout" style={{ border: 0, background: 'transparent', color: 'rgba(255,255,255,.6)', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
              <Icon name="LogOut" size={16} />
            </button>
          </div>
        }
      />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="shell-header" style={{ height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', background: 'var(--surface-card)', borderBottom: '1px solid var(--border-subtle)' }}>
          <h1 className="shell-title" style={{ font: 'var(--type-heading)', fontWeight: 700, fontSize: 18, flex: 1, margin: 0, minWidth: 0 }}>{current?.label}</h1>
          <CommandPalette vehicles={vehicles} menu={menu} />
          {canLive && <CriticalAlertToaster vehicles={vehicles} onAlertsPage={current?.key === 'alerts'} />}
          {vehiclesReady && (
            <Badge tone={offline > 0 ? 'warning' : 'success'} icon="Wifi">
              <span data-testid="fleet-badge" title={`${vehicles.length} motos · ${offline} sem sinal`}>
                <span className="fb-full">{vehicles.length} motos · {offline} sem sinal</span>
                <span className="fb-short">{offline > 0 ? `${offline} sem sinal` : `${vehicles.length} motos`}</span>
              </span>
            </Badge>
          )}
          {canLive && (
            <span role="status" data-testid="live-indicator" data-connected={connected} title={connected ? 'Recebendo posições e alertas em tempo real' : 'Sem conexão em tempo real. Tentando reconectar'}
              className="live-pill" style={{ color: connected ? 'var(--success-ink)' : 'var(--warning-ink)', background: connected ? 'var(--success-soft)' : 'var(--warning-soft)' }}>
              <span aria-hidden className={connected ? 'live-dot' : 'live-dot live-dot-off'} />
              <span className="live-text">{connected ? 'Ao vivo' : 'Reconectando'}</span>
            </span>
          )}
        </header>
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Troca de seção: fade + subida curta (vt-section-in, --ease-out). Só `backwards`, para não deixar transform residual. */}
          <div key={current?.key} id="main-content" tabIndex={-1} className="section-in" style={{ flex: 1, display: 'flex', minHeight: 0, minWidth: 0, outline: 'none' }}>
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
