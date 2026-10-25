import { can } from './permissions';
import type { StaffGroup } from './types';

export type FinanceTab = 'overview' | 'rentals' | 'payments' | 'deposits' | 'wallet';

/**
 * Abas do Financeiro liberadas ao grupo, na ordem de exibição. Visão geral e Aluguéis seguem os relatórios (admin, financeiro),
 * Pagamentos o `GET /payments` (inclui suporte, só leitura), Cauções `deposit.view` e a Carteira `wallet.adjust`.
 */
export function allowedFinanceTabs(groups: StaffGroup[]): FinanceTab[] {
  const tabs: FinanceTab[] = [];
  if (can(groups, 'finance.reports')) tabs.push('overview', 'rentals');
  if (can(groups, 'payment.view')) tabs.push('payments');
  if (can(groups, 'deposit.view')) tabs.push('deposits');
  if (can(groups, 'wallet.adjust')) tabs.push('wallet');
  return tabs;
}

/** Aba pedida (por exemplo em `?tab=`) se permitida; senão a primeira permitida. Sem grupos carregados: `null` (nada a mostrar ainda). */
export function resolveFinanceTab(requested: string | null | undefined, groups: StaffGroup[]): FinanceTab | null {
  const allowed = allowedFinanceTabs(groups);
  return allowed.find((t) => t === requested) ?? allowed[0] ?? null;
}
