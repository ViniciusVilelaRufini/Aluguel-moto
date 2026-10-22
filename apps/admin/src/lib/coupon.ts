const positiveInt = (v: string) => /^\d+$/.test(v.trim()) && Number.isInteger(Number(v)) && Number(v) >= 1;

/** Limites do cupom (`maxRedemptions`, `maxRedemptionsPerCustomer`): vazio = sem limite; senão inteiro >= 1. */
export function couponLimitsError(max: string, perCustomer: string): string | null {
  if (max.trim() && !positiveInt(max)) return 'Limite de usos: número inteiro a partir de 1';
  if (perCustomer.trim() && !positiveInt(perCustomer)) return 'Usos por cliente: número inteiro a partir de 1';
  return null;
}
