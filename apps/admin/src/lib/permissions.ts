import type { StaffGroup } from './types';

export type MenuKey =
  | 'dashboard' | 'fleet' | 'zones' | 'alerts' | 'customers' | 'rentals'
  | 'support' | 'field' | 'finance' | 'settings' | 'audit';

export interface MenuItem {
  key: MenuKey;
  label: string;
  href: string;
  icon: string;
  groups: StaffGroup[];
}

/** Ordem do menu. `admin` entra em todos os itens. */
export const MENU: MenuItem[] = [
  { key: 'dashboard', label: 'Visão geral', href: '/', icon: 'LayoutDashboard', groups: ['admin', 'operacao', 'financeiro', 'suporte'] },
  { key: 'fleet', label: 'Frota ao vivo', href: '/fleet', icon: 'Map', groups: ['admin', 'operacao', 'suporte'] },
  { key: 'zones', label: 'Cercas e regras', href: '/zones', icon: 'Hexagon', groups: ['admin', 'operacao'] },
  { key: 'alerts', label: 'Alertas', href: '/alerts', icon: 'Siren', groups: ['admin', 'operacao', 'suporte'] },
  { key: 'customers', label: 'Clientes', href: '/customers', icon: 'Users', groups: ['admin', 'suporte'] },
  { key: 'rentals', label: 'Aluguéis', href: '/rentals', icon: 'Receipt', groups: ['admin', 'financeiro', 'suporte'] },
  { key: 'support', label: 'Suporte', href: '/support', icon: 'LifeBuoy', groups: ['admin', 'suporte'] },
  { key: 'field', label: 'Operação de campo', href: '/field', icon: 'ClipboardList', groups: ['admin', 'operacao'] },
  { key: 'finance', label: 'Financeiro', href: '/finance', icon: 'ChartColumn', groups: ['admin', 'financeiro'] },
  { key: 'settings', label: 'Configurações', href: '/settings', icon: 'SlidersHorizontal', groups: ['admin'] },
  { key: 'audit', label: 'Auditoria', href: '/audit', icon: 'ScrollText', groups: ['admin'] },
];

export function menuFor(groups: StaffGroup[]): MenuItem[] {
  return MENU.filter((m) => m.groups.some((g) => groups.includes(g)));
}

export function canOpen(groups: StaffGroup[], key: MenuKey): boolean {
  return menuFor(groups).some((m) => m.key === key);
}

export type Action =
  | 'vehicle.command'
  | 'vehicle.status'
  | 'zone.edit'
  | 'alert.manage'
  | 'customer.block'
  | 'customer.restriction.remove'
  | 'rental.forceEnd'
  | 'payment.refund'
  | 'task.create'
  | 'settings.edit'
  | 'support.reply';

const ACTION_GROUPS: Record<Action, StaffGroup[]> = {
  'vehicle.command': ['admin', 'operacao'],
  'vehicle.status': ['admin', 'operacao'],
  'zone.edit': ['admin', 'operacao'],
  'alert.manage': ['admin', 'operacao', 'suporte'],
  'customer.block': ['admin', 'suporte'],
  'customer.restriction.remove': ['admin'],
  'rental.forceEnd': ['admin', 'suporte'],
  'payment.refund': ['admin', 'financeiro'],
  'task.create': ['admin', 'operacao'],
  'settings.edit': ['admin'],
  'support.reply': ['admin', 'suporte'],
};

export function can(groups: StaffGroup[], action: Action): boolean {
  return ACTION_GROUPS[action].some((g) => groups.includes(g));
}

/** CPF completo só para admin (docs/decisoes.md, decisão 10). */
export function canSeeFullCpf(groups: StaffGroup[]): boolean {
  return groups.includes('admin');
}
