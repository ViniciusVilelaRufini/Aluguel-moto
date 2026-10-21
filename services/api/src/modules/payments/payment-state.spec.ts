import { assertTransition, canTransition, InvalidPaymentTransitionError, PAYMENT_TRANSITIONS, type PaymentStatus } from './payment-state';

const ALL: PaymentStatus[] = ['pending', 'authorized', 'captured', 'canceled', 'paid', 'refunded', 'partially_refunded', 'failed'];

describe('payment-state (máquina de estados de Payment)', () => {
  const valid: Array<[PaymentStatus, PaymentStatus]> = [
    ['pending', 'authorized'],
    ['authorized', 'captured'],
    ['authorized', 'canceled'],
    ['pending', 'paid'],
    ['paid', 'refunded'],
    ['paid', 'partially_refunded'],
    ['captured', 'refunded'],
    ['captured', 'partially_refunded'],
    ['partially_refunded', 'partially_refunded'],
    ['partially_refunded', 'refunded'],
    ['pending', 'failed'],
    ['authorized', 'failed'],
  ];

  it.each(valid)('%s → %s é válida', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it('a tabela tem exatamente as transições válidas listadas', () => {
    const table = Object.entries(PAYMENT_TRANSITIONS).flatMap(([from, tos]) => tos.map((to) => `${from}->${to}`)).sort();
    expect(table).toEqual(valid.map(([f, t]) => `${f}->${t}`).sort());
  });

  const invalid = ALL.flatMap((from) => ALL.map((to) => [from, to] as [PaymentStatus, PaymentStatus]))
    .filter(([f, t]) => !valid.some(([vf, vt]) => vf === f && vt === t));

  it.each(invalid)('%s → %s é rejeitada', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(InvalidPaymentTransitionError);
  });

  it('capture de canceled → erro com os dois estados na mensagem', () => {
    expect(() => assertTransition('canceled', 'captured')).toThrow('canceled → captured');
  });

  it('estados terminais não saem para lugar nenhum', () => {
    for (const s of ['canceled', 'refunded', 'failed'] as PaymentStatus[]) {
      expect(ALL.filter((to) => canTransition(s, to))).toEqual([]);
    }
  });
});
