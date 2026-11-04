/** Métodos de pagamento/caução registrados no balcão do galpão (nunca passam pelo gateway). */
export const COUNTER_METHODS = ['counter_card', 'counter_pix', 'cash'] as const;
export type CounterMethod = (typeof COUNTER_METHODS)[number];

export function isCounterMethod(m: string | null | undefined): m is CounterMethod {
  return !!m && (COUNTER_METHODS as readonly string[]).includes(m);
}

/** Caução de balcão ainda disponível (valor − abatido − devolvido), nunca negativa. */
export function depositAvailableCents(d: { amountCents: number; capturedCents: number | null; refundedCents: number }): number {
  return Math.max(0, d.amountCents - (d.capturedCents ?? 0) - d.refundedCents);
}
