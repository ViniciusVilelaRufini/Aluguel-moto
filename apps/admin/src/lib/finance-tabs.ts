import { can } from './permissions';
import type { StaffGroup } from './types';

export type FinanceTab = 'overview' | 'rentals' | 'payments' | 'deposits' | 'wallet';

/** Abas do Financeiro liberadas ao grupo (a Carteira exige `wallet.adjust`), na ordem de exibição. */
export function allowedFinanceTabs(groups: StaffGroup[]): FinanceTab[] {
  return ['overview', 'rentals', 'payments', 'deposits', ...(can(groups, 'wallet.adjust') ? ['wallet' as const] : [])];
}

/** Aba pedida (por exemplo em `?tab=`) se permitida; senão a primeira permitida. */
export function resolveFinanceTab(requested: string | null | undefined, groups: StaffGroup[]): FinanceTab {
  const allowed = allowedFinanceTabs(groups);
  return allowed.find((t) => t === requested) ?? allowed[0];
}
