import { RECEIPT_LINK_TTL_SECONDS, receiptLinks } from './receipt-links';

/** QA-11: o link do recibo é gerado a cada leitura (15 min) a partir da chave do objeto. */
describe('receiptLinks', () => {
  it('assina um link curto por pagamento com recibo; sem recibo, nada', async () => {
    const prisma = { paymentReceipt: { findMany: jest.fn().mockResolvedValue([{ paymentId: 'p1', bucket: 'relatorios', objectKey: 'recibos/2026/10/r1.pdf' }]) } };
    const storage = { presignGet: jest.fn().mockResolvedValue({ url: 'https://s3/recibo?sig', expiresAt: 'x' }) };
    const links = await receiptLinks(prisma as any, storage as any, ['p1', 'p2']);
    expect(links.get('p1')).toBe('https://s3/recibo?sig');
    expect(links.has('p2')).toBe(false);
    expect(storage.presignGet).toHaveBeenCalledWith({ bucket: 'relatorios', key: 'recibos/2026/10/r1.pdf', expiresInSeconds: RECEIPT_LINK_TTL_SECONDS });
    expect(RECEIPT_LINK_TTL_SECONDS).toBe(15 * 60);
  });

  it('lista vazia não consulta o banco', async () => {
    const prisma = { paymentReceipt: { findMany: jest.fn() } };
    expect((await receiptLinks(prisma as any, {} as any, [])).size).toBe(0);
    expect(prisma.paymentReceipt.findMany).not.toHaveBeenCalled();
  });
});
