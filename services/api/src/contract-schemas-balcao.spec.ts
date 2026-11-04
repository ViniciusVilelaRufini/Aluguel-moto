import { loadSpecAs30 } from '../test/contract/openapi-30';

/** Contrato do balcão (pré-reserva no app, contrato e pagamento no galpão, 2026-11-04): só acréscimos. */
describe('contrato do balcão', () => {
  const c = loadSpecAs30() as any;
  const s = c.components.schemas;

  it('métodos de balcão só acrescentam', () => {
    expect(s.PaymentMethod.enum).toEqual(expect.arrayContaining(['card', 'pix', 'wallet', 'counter_card', 'counter_pix', 'cash']));
    expect(s.DepositMethod.enum).toEqual(expect.arrayContaining(['card', 'pix', 'counter_card', 'counter_pix', 'cash']));
    expect(s.CounterPaymentMethod.enum).toEqual(['counter_card', 'counter_pix', 'cash']);
    expect(s.CounterPlanCode.enum).toEqual(['day', 'weekly', 'monthly']);
  });

  it('ReservationCreate continua exigindo só vehicleId', () => expect(s.ReservationCreate.required).toEqual(['vehicleId']));

  it('counter-checkout exige Idempotency-Key e devolve Rental', () => {
    const op = c.paths['/handovers/{id}/counter-checkout'].post;
    expect(op.parameters.map((p: any) => p.$ref ?? p.name)).toEqual(expect.arrayContaining([expect.stringMatching(/IdempotencyKey$/)]));
    expect(op.responses['201'].content['application/json'].schema.$ref).toBe('#/components/schemas/Rental');
    expect(s.CounterCheckoutRequest.required).toEqual(['planCode', 'coverage', 'payment']);
    expect(s.CounterCheckoutRequest.properties.contractPhotoKeys.maxItems).toBe(4);
  });

  it('operações novas existem', () => {
    expect(c.paths['/handovers/{id}/counter-quote'].get.operationId).toBe('getHandoverCounterQuote');
    expect(c.paths['/payments/{id}/counter-settle'].post.operationId).toBe('counterSettlePayment');
    expect(c.paths['/payments/deposits/{id}/counter-refund'].post.operationId).toBe('counterRefundDeposit');
    expect(c.paths['/rentals/{id}/counter-balance'].get.operationId).toBe('getRentalCounterBalance');
  });

  it('campos novos são opcionais', () => {
    for (const [schema, prop] of [
      ['Payment', 'reference'],
      ['Payment', 'recordedBy'],
      ['Deposit', 'refundedCents'],
      ['Handover', 'contractPhotoKeys'],
      ['Rental', 'prepaidUntil'],
    ]) {
      expect(s[schema].properties[prop]).toBeDefined();
      expect(s[schema].required ?? []).not.toContain(prop);
    }
  });
});
