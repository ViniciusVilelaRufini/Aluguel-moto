/** Valores digitados em reais ("0,79", "1.234,50") <-> centavos (inteiro). */
export const toReais = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

export function validMoney(v: string): boolean {
  return /^\d{1,6}([.,]\d{1,2})?$/.test(v.trim().replace(/\./g, ',').replace(/,(?=.*,)/g, ''));
}

export function toCents(v: string): number {
  return Math.round(Number(v.trim().replace(/\./g, '').replace(',', '.')) * 100);
}
