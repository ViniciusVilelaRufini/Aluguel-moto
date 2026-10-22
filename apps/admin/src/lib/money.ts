/** Valores digitados em reais ("0,79", "0.79", "1.234,50") <-> centavos (inteiro). */
export const toReais = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

const THOUSANDS = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/;
const PLAIN = /^\d+([.,]\d{1,2})?$/;

/**
 * Reais como número, ou `null` se inválido. O ponto só é separador de milhar no formato `1.234` /
 * `1.234,56`; um ponto seguido de 1 ou 2 dígitos ("0.79", "3.5") é a vírgula decimal.
 */
export function parseReais(v: string): number | null {
  const t = v.trim();
  if (THOUSANDS.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
  if (PLAIN.test(t)) return Number(t.replace(',', '.'));
  return null;
}

/** Valor válido até 999.999,99 (6 dígitos inteiros). */
export function validMoney(v: string): boolean {
  const n = parseReais(v);
  return n !== null && n < 1_000_000;
}

export function toCents(v: string): number {
  const n = parseReais(v);
  return n === null ? NaN : Math.round(n * 100);
}
