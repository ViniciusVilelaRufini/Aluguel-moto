import { formatBRL } from './format';

/**
 * Task 30 (varredura E2E, item 33): o que compõe a "Receita" do Financeiro. Receita = aluguéis encerrados + assinaturas
 * pagas no período; recargas e pacotes de minutos ficam fora (crédito pré-pago, vira receita quando é usado no aluguel).
 */
export function revenueCaption(f: { rentalRevenueCents?: number; subscriptionRevenueCents?: number } | undefined): string | undefined {
  if (!f || (f.rentalRevenueCents === undefined && f.subscriptionRevenueCents === undefined)) return undefined;
  return `Aluguéis ${formatBRL(f.rentalRevenueCents ?? 0)} · Assinaturas ${formatBRL(f.subscriptionRevenueCents ?? 0)}`;
}

/**
 * P2-1: receita por moto por dia = receita do período ÷ motos-dia da frota (soma de `vehiclesTotal` do relatório de ocupação
 * por dia). Dividir pelas linhas com receita (moto × dia com aluguel) inflava o número.
 */
export function revenuePerVehicleDay(revenueRows: Array<{ revenueCents: number }> | undefined, occupancyRows: Array<{ vehiclesTotal: number }> | undefined): number | null {
  if (!revenueRows || !occupancyRows) return null;
  const vehicleDays = occupancyRows.reduce((a, r) => a + r.vehiclesTotal, 0);
  if (vehicleDays <= 0) return null;
  return Math.round(revenueRows.reduce((a, r) => a + r.revenueCents, 0) / vehicleDays);
}
