import type { StaffGroup } from './types';

export type MenuKey = 'fleet' | 'alerts' | 'zones' | 'customers' | 'tasks' | 'finance' | 'settings' | 'team';

export interface MenuItem {
  key: MenuKey;
  label: string;
  href: string;
  icon: string;
  groups: StaffGroup[];
}

/** Seções do painel, na ordem do design (ui_kits/admin-v2/AdminApp.jsx). `admin` entra em todas. */
export const MENU: MenuItem[] = [
  { key: 'fleet', label: 'Frota ao vivo', href: '/fleet', icon: 'Map', groups: ['admin', 'operacao', 'suporte'] },
  { key: 'alerts', label: 'Alertas', href: '/alerts', icon: 'Siren', groups: ['admin', 'operacao', 'suporte'] },
  { key: 'zones', label: 'Cercas e regras', href: '/zones', icon: 'Hexagon', groups: ['admin', 'operacao'] },
  { key: 'customers', label: 'Clientes', href: '/customers', icon: 'Users', groups: ['admin', 'suporte'] },
  { key: 'tasks', label: 'Operação', href: '/tasks', icon: 'ClipboardList', groups: ['admin', 'operacao'] },
  { key: 'finance', label: 'Financeiro', href: '/finance', icon: 'ChartColumn', groups: ['admin', 'financeiro'] },
  { key: 'settings', label: 'Preços e planos', href: '/settings', icon: 'SlidersHorizontal', groups: ['admin', 'financeiro'] },
  { key: 'team', label: 'Equipe e acessos', href: '/team', icon: 'KeyRound', groups: ['admin'] },
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
  | 'support.reply'
  | 'kyc.review';

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
  'kyc.review': ['admin', 'suporte'],
};

export function can(groups: StaffGroup[], action: Action): boolean {
  return ACTION_GROUPS[action].some((g) => groups.includes(g));
}

/** CPF completo só para admin (docs/decisoes.md, decisão 10). */
export function canSeeFullCpf(groups: StaffGroup[]): boolean {
  return groups.includes('admin');
}

/** Onde abrir um aluguel: aba Aluguéis de Clientes (admin, suporte) ou de Financeiro (financeiro). */
export function rentalHref(groups: StaffGroup[], rentalId: string): string | null {
  if (canOpen(groups, 'customers')) return `/customers?tab=rentals&rental=${rentalId}`;
  if (canOpen(groups, 'finance')) return `/finance?tab=rentals&rental=${rentalId}`;
  return null;
}
