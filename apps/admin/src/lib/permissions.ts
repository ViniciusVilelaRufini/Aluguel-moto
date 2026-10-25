import type { StaffGroup } from './types';

export type MenuKey = 'fleet' | 'vehicles' | 'alerts' | 'zones' | 'customers' | 'tasks' | 'finance' | 'settings' | 'depots' | 'stations' | 'pickups' | 'handovers' | 'team';

export interface MenuItem {
  key: MenuKey;
  label: string;
  href: string;
  icon: string;
  groups: StaffGroup[];
  /** Grupos para os quais esta seção pode ser a tela inicial (padrão: todos de `groups`). */
  homeGroups?: StaffGroup[];
}

/** Seções do painel, na ordem do design (ui_kits/admin-v2/AdminApp.jsx). `admin` entra em todas. */
export const MENU: MenuItem[] = [
  { key: 'fleet', label: 'Frota ao vivo', href: '/fleet', icon: 'Map', groups: ['admin', 'operacao', 'suporte'] },
  // Cadastro de motos (Task 31, docs/decisoes.md 2026-10-25): POST/PATCH /vehicles e transferência são admin/operacao.
  { key: 'vehicles', label: 'Motos', href: '/motos', icon: 'Bike', groups: ['admin', 'operacao'] },
  // Task 14: financeiro vê os alertas de pagamento (`payment_needs_review`), mas continua começando no Financeiro.
  { key: 'alerts', label: 'Alertas', href: '/alerts', icon: 'Siren', groups: ['admin', 'operacao', 'suporte', 'financeiro'], homeGroups: ['admin', 'operacao', 'suporte'] },
  { key: 'zones', label: 'Cercas e regras', href: '/zones', icon: 'Hexagon', groups: ['admin', 'operacao'] },
  { key: 'customers', label: 'Clientes', href: '/customers', icon: 'Users', groups: ['admin', 'suporte'] },
  { key: 'tasks', label: 'Operação', href: '/tasks', icon: 'ClipboardList', groups: ['admin', 'operacao'] },
  // Suporte entra só para a lista de Pagamentos (GET /payments permite admin, financeiro, suporte); as outras abas seguem fechadas (ver finance-tabs).
  { key: 'finance', label: 'Financeiro', href: '/finance', icon: 'ChartColumn', groups: ['admin', 'financeiro', 'suporte'], homeGroups: ['admin', 'financeiro'] },
  { key: 'settings', label: 'Preços e planos', href: '/settings', icon: 'SlidersHorizontal', groups: ['admin', 'financeiro'] },
  // Retirada em galpão (spec 2026-10-22 §6). `campo` não usa o painel; financeiro só lê o cadastro (GET /depots).
  // Depois de Financeiro/Preços: a primeira seção de cada grupo é a tela inicial (financeiro continua em /finance).
  { key: 'depots', label: 'Galpões', href: '/galpoes', icon: 'Warehouse', groups: ['admin', 'operacao', 'financeiro'] },
  // Cadastro de estações de troca (Task 12 das lacunas): GET /swap-stations/registry é admin/operacao.
  { key: 'stations', label: 'Estações', href: '/estacoes', icon: 'BatteryCharging', groups: ['admin', 'operacao'] },
  { key: 'pickups', label: 'Retiradas', href: '/retiradas', icon: 'CalendarClock', groups: ['admin', 'operacao'] },
  { key: 'handovers', label: 'Entregas', href: '/entregas', icon: 'PackageCheck', groups: ['admin', 'operacao', 'suporte'] },
  { key: 'team', label: 'Equipe e acessos', href: '/team', icon: 'KeyRound', groups: ['admin'] },
];

export function menuFor(groups: StaffGroup[]): MenuItem[] {
  return MENU.filter((m) => m.groups.some((g) => groups.includes(g)));
}

/** Tela inicial do perfil: a primeira seção permitida que pode ser início para algum dos grupos. */
export function homeFor(groups: StaffGroup[]): string | undefined {
  return menuFor(groups).find((m) => !m.homeGroups || m.homeGroups.some((g) => groups.includes(g)))?.href;
}

export function canOpen(groups: StaffGroup[], key: MenuKey): boolean {
  return menuFor(groups).some((m) => m.key === key);
}

export type Action =
  | 'vehicle.command'
  | 'vehicle.status'
  | 'zone.edit'
  | 'alert.manage'
  | 'alert.resolve'
  | 'delinquency.clear'
  | 'customer.block'
  | 'customer.restriction.remove'
  | 'rental.forceEnd'
  | 'payment.refund'
  | 'task.create'
  | 'settings.edit'
  | 'support.reply'
  | 'kyc.review'
  | 'maintenance.view'
  | 'maintenance.schedule'
  | 'maintenance.update'
  | 'battery.view'
  | 'battery.transfer'
  | 'battery.create'
  | 'battery.markCharged'
  | 'battery.reportDefect'
  | 'battery.retire'
  | 'battery.movements'
  | 'catalog.edit'
  | 'subscription.assignVehicle'
  | 'vehicle.edit'
  | 'vehicle.transfer'
  | 'depot.edit'
  | 'depot.deactivate'
  | 'handover.cancel'
  | 'station.swaps'
  | 'station.edit'
  | 'station.qr'
  | 'wallet.adjust'
  | 'deposit.view'
  | 'payment.view'
  | 'finance.reports';

const ACTION_GROUPS: Record<Action, StaffGroup[]> = {
  'vehicle.command': ['admin', 'operacao'],
  'vehicle.status': ['admin', 'operacao'],
  'zone.edit': ['admin', 'operacao'],
  'alert.manage': ['admin', 'operacao', 'suporte'],
  // Task 14: o financeiro resolve os alertas de pagamento; atribuir exige GET /staff (admin, operacao, suporte).
  'alert.resolve': ['admin', 'operacao', 'suporte', 'financeiro'],
  'delinquency.clear': ['admin', 'financeiro'], // POST /customers/{id}/delinquency/clear
  'customer.block': ['admin', 'suporte'],
  'customer.restriction.remove': ['admin'],
  'rental.forceEnd': ['admin', 'suporte'],
  'payment.refund': ['admin', 'financeiro'],
  'task.create': ['admin', 'operacao'],
  'settings.edit': ['admin'],
  'support.reply': ['admin', 'suporte'],
  'kyc.review': ['admin', 'suporte'],
  // Contrato v2 (x-required-groups de cada operação; `campo` não usa o painel).
  'maintenance.view': ['admin', 'operacao'], // GET /maintenance/vehicles, /maintenance/tasks
  'maintenance.schedule': ['admin', 'operacao'], // POST /maintenance/tasks
  'maintenance.update': ['admin', 'operacao'], // PATCH /maintenance/tasks/{id}
  'battery.view': ['admin', 'operacao'], // GET /batteries, /batteries/van-stock
  'battery.transfer': ['admin', 'operacao'], // POST /batteries/van-stock/load|unload
  'battery.create': ['admin', 'operacao'], // POST /batteries
  'battery.markCharged': ['admin', 'operacao', 'campo'], // POST /batteries/{id}/mark-charged
  'battery.reportDefect': ['admin', 'operacao', 'campo'], // POST /batteries/{id}/report-defect
  'battery.retire': ['admin', 'operacao'], // POST /batteries/{id}/retire
  'battery.movements': ['admin', 'operacao', 'suporte', 'campo'], // GET /batteries/{id}/movements
  'catalog.edit': ['admin'], // POST/PATCH /vehicle-models, POST /vehicle-models/uploads
  'subscription.assignVehicle': ['admin', 'operacao'], // PUT /payments/subscriptions/{id}/vehicle
  'vehicle.edit': ['admin', 'operacao'], // PATCH /vehicles/{id}
  'vehicle.transfer': ['admin', 'operacao'], // POST /vehicles/{id}/transfer-depot
  'depot.edit': ['admin', 'operacao'],
  // Não há DELETE no contrato: "desativar" (PATCH active=false) fica só com o admin.
  'depot.deactivate': ['admin'],
  // Rotas que já existiam no contrato (x-required-groups; `campo` não usa o painel).
  'handover.cancel': ['admin', 'operacao'], // POST /handovers/{id}/cancel (contrato: admin, operacao, campo)
  'station.swaps': ['admin', 'operacao', 'suporte'], // GET /swap-stations/{id}/swaps
  // Task 12 das lacunas: POST /swap-stations, PATCH /swap-stations/{id} (inclui desativar) e GET /swap-stations/{id}/qr.
  'station.edit': ['admin', 'operacao'],
  'station.qr': ['admin', 'operacao'],
  'wallet.adjust': ['admin', 'financeiro'], // POST /customers/{id}/wallet/adjustments
  'deposit.view': ['admin', 'financeiro'], // GET /payments/deposits
  'payment.view': ['admin', 'financeiro', 'suporte'], // GET /payments, GET /payments/{id}
  'finance.reports': ['admin', 'financeiro'], // GET /reports/finance|revenue|occupancy…; abas Visão geral e Aluguéis
};

export function can(groups: StaffGroup[], action: Action): boolean {
  return ACTION_GROUPS[action].some((g) => groups.includes(g));
}

/** CPF completo só para admin (docs/decisoes.md, decisão 10). */
export function canSeeFullCpf(groups: StaffGroup[]): boolean {
  return groups.includes('admin');
}

/** Alertas financeiros (Task 14): a API não os mostra a quem é só `operacao` e mostra só eles a quem é só `financeiro`. */
export const FINANCIAL_ALERT_TYPES: readonly string[] = ['payment_needs_review'];

/** Mesmo escopo de `GET /alerts` (alertScope na API), para o contador ao vivo não somar o que a fila não mostra. */
export function alertVisibleTo(groups: StaffGroup[], type: string): boolean {
  if (groups.includes('admin') || groups.includes('suporte')) return true;
  const financial = FINANCIAL_ALERT_TYPES.includes(type);
  return (financial && groups.includes('financeiro')) || (!financial && groups.includes('operacao'));
}

/** Task 14: onde abrir um pagamento (alerta `payment_needs_review`): Financeiro > Pagamentos com o detalhe aberto. */
export function paymentHref(groups: StaffGroup[], paymentId: string): string | null {
  return canOpen(groups, 'finance') ? `/finance?tab=payments&payment=${paymentId}` : null;
}

/** Onde abrir um aluguel: aba Aluguéis de Clientes (admin, suporte) ou de Financeiro (financeiro). */
export function rentalHref(groups: StaffGroup[], rentalId: string): string | null {
  if (canOpen(groups, 'customers')) return `/customers?tab=rentals&rental=${rentalId}`;
  if (canOpen(groups, 'finance')) return `/finance?tab=rentals&rental=${rentalId}`;
  return null;
}
