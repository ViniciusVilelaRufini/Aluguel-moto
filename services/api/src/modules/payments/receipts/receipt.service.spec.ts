import { createInMemoryPrisma, type InMemoryPrisma } from '../testing/in-memory-prisma';
import { MockInvoiceIssuer } from './invoice-issuer';
import { ReceiptService } from './receipt.service';

const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const RENTAL = '88888888-8888-4888-8888-888888888888';

describe('ReceiptService (PDF no bucket de relatórios + NFS-e)', () => {
  let db: InMemoryPrisma;
  let storage: { putObject: jest.Mock; presignGet: jest.Mock };
  let issuer: MockInvoiceIssuer;
  let svc: ReceiptService;
  let paymentId: string;

  beforeEach(async () => {
    db = createInMemoryPrisma();
    storage = {
      putObject: jest.fn().mockResolvedValue(undefined),
      presignGet: jest.fn().mockResolvedValue({ url: 'https://s3.local/relatorios/recibo.pdf?sig', expiresAt: new Date().toISOString() }),
    };
    issuer = new MockInvoiceIssuer();
    svc = new ReceiptService(db as any, storage as any, issuer, { reportsBucket: 'relatorios' });
    await db.rental.create({
      data: {
        id: RENTAL, customerId: CUSTOMER, vehicleId: 'v', planCode: 'minute', coverage: 'basic', status: 'ended', depositId: 'd', priceSnapshot: {},
        startedAt: new Date('2026-10-21T15:00:00Z'), endedAt: new Date('2026-10-21T15:10:00Z'), costCents: 1290,
        breakdown: { lines: [{ label: 'Desbloqueio', amountCents: 300 }, { label: '10 min', amountCents: 790 }], subtotalCents: 1090, discountCents: 0, insuranceCents: 200, feesCents: 0, totalCents: 1290 },
      },
    });
    paymentId = (await db.payment.create({ data: { customerId: CUSTOMER, rentalId: RENTAL, kind: 'rental', method: 'card', status: 'paid', amountCents: 1290, cardLast4: '4242' } })).id;
  });

  it('gera o PDF, grava no bucket de relatórios e liga o link ao pagamento', async () => {
    await svc.issueForPayment(paymentId);
    expect(storage.putObject).toHaveBeenCalledTimes(1);
    const put = storage.putObject.mock.calls[0][0];
    expect(put).toMatchObject({ bucket: 'relatorios', key: `recibos/2026/10/${RENTAL}.pdf`, contentType: 'application/pdf' });
    expect(put.body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(await db.paymentReceipt.findUnique({ where: { paymentId } })).toMatchObject({ bucket: 'relatorios', objectKey: put.key, rentalId: RENTAL });
    expect((await db.payment.findUnique({ where: { id: paymentId } })).receiptUrl).toBe('https://s3.local/relatorios/recibo.pdf?sig');
  });

  it('emite a NFS-e pelo InvoiceIssuer uma única vez', async () => {
    await svc.issueForPayment(paymentId);
    await svc.issueForPayment(paymentId);
    expect(issuer.issued).toHaveLength(1);
    expect(issuer.issued[0]).toMatchObject({ paymentId, amountCents: 1290 });
    const inv = await db.invoice.findUnique({ where: { paymentId } });
    expect(inv).toMatchObject({ issuer: 'mock', status: 'issued', amountCents: 1290 });
    expect(inv.number).toMatch(/^NFSE-MOCK-/);
    expect(storage.putObject).toHaveBeenCalledTimes(1);
  });

  it('pagamento de valor zero: recibo sim, nota não', async () => {
    const zero = await db.payment.create({ data: { customerId: CUSTOMER, rentalId: RENTAL, kind: 'rental', method: 'card', status: 'paid', amountCents: 0, idempotencyKey: 'z' } });
    await svc.issueForPayment(zero.id);
    expect(storage.putObject).toHaveBeenCalledTimes(1);
    expect(issuer.issued).toHaveLength(0);
  });

  it('o recibo não lê dados pessoais do cliente (sem CPF/e-mail no PDF)', async () => {
    const spy = jest.spyOn(db.customer, 'findUnique');
    await svc.issueForPayment(paymentId);
    expect(spy).not.toHaveBeenCalled();
  });
});
