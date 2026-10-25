import { formatBRL } from './format';

/**
 * Task 30 (varredura E2E, item 33): o que compõe a "Receita" do Financeiro. Receita = aluguéis encerrados + assinaturas
 * pagas no período; recargas e pacotes de minutos ficam fora (crédito pré-pago, vira receita quando é usado no aluguel).
 */
export function revenueCaption(f: { rentalRevenueCents?: number; subscriptionRevenueCents?: number } | undefined): string | undefined {
  if (!f || (f.rentalRevenueCents === undefined && f.subscriptionRevenueCents === undefined)) return undefined;
  return `Aluguéis ${formatBRL(f.rentalRevenueCents ?? 0)} · Assinaturas ${formatBRL(f.subscriptionRevenueCents ?? 0)}`;
}

