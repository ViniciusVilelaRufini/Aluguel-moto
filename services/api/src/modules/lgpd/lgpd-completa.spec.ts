import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../../config/env';
import { FakePaymentProvider } from '../payments/provider/fake-payment-provider';
import { LgpdService, MAX_GATEWAY_DELETION_ATTEMPTS } from './lgpd.service';

/** Task 14 das lacunas: exclusão completa (suporte, entregas, ocorrências, sinistros, gateway) e exportação com o chat. */
const ME = '11111111-1111-4111-8111-111111111111';
const now = new Date();
const me = {
  id: ME, cognitoSub: 'deleted:x', email: 'eu@example.com', name: 'Maria Souza', phone: null, cpf: null, cpfHash: 'h', birthDate: null, kycStatus: 'approved',
  status: 'active', delinquent: false, kycDocumentFrontKey: null, kycDocumentBackKey: null, kycSelfieKey: null, createdAt: now, updatedAt: now,
  termsAccepted: true, locationConsent: false, marketingConsent: false,
};

function setup(provider?: FakePaymentProvider) {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  prisma.customer.findUnique.mockResolvedValue(me as any);
  prisma.rental.findFirst.mockResolvedValue(null);
  prisma.payment.count.mockResolvedValue(0);
  prisma.rental.findMany.mockResolvedValue([{ id: 'r1', returnPhotoObjectKey: null, returnPhotoUploadKey: null }] as any);
  prisma.supportMessage.findMany.mockResolvedValue([{ attachmentObjectKeys: ['support/u/a.jpg'] }, { attachmentObjectKeys: [] }] as any);
  prisma.handover.findMany.mockResolvedValue([{ id: 'h1', photoKeys: ['handovers/h1/1.jpg', 'handovers/h1/2.jpg'] }] as any);
  prisma.incident.findMany.mockResolvedValue([{ photoObjectKeys: ['support/u/inc.jpg'] }] as any);
  prisma.claim.findMany.mockResolvedValue([{ photoObjectKeys: ['support/u/bo.pdf'] }] as any);
  prisma.paymentCard.findMany.mockResolvedValue([{ providerCardId: 'card-1' }, { providerCardId: 'card-2' }] as any);
  const storage = { deleteObject: jest.fn().mockResolvedValue(undefined), presignPut: jest.fn(), presignGet: jest.fn(), putObject: jest.fn() };
  const cfg = loadConfig();
  const subs = { closeForAccountDeletion: jest.fn().mockResolvedValue(undefined) };
  const service = new LgpdService(prisma as any, storage, cfg, subs as any, undefined, undefined, undefined, provider);
  return { prisma, storage, cfg, service };
}

describe('LgpdService — exclusão completa (Task 14)', () => {
  it('apaga anexos e mensagens do suporte, fotos de entrega, ocorrência e sinistro encerrado', async () => {
    const { prisma, storage, cfg, service } = setup();
    await service.deleteAccount(ME);

    expect(prisma.supportMessage.updateMany).toHaveBeenCalledWith({ where: { conversation: { customerId: ME } }, data: { body: expect.stringContaining('LGPD'), attachmentObjectKeys: [] } });
    expect(prisma.supportConversation.updateMany).toHaveBeenCalledWith({ where: { customerId: ME }, data: { subject: 'Conversa removida' } });
    expect(prisma.handover.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['h1'] } }, data: { photoKeys: [], disputeReason: null } });
    expect(prisma.incident.updateMany).toHaveBeenCalledWith({ where: { customerId: ME }, data: expect.objectContaining({ photoObjectKeys: [], lat: null, lng: null }) });
    // Sinistro em andamento fica (contrato de seguro); só os encerrados são apagados.
    expect(prisma.claim.updateMany).toHaveBeenCalledWith({ where: { customerId: ME, status: { in: ['rejected', 'paid'] } }, data: expect.objectContaining({ photoObjectKeys: [], lat: null, lng: null }) });
    expect((prisma.claim.findMany.mock.calls[0][0] as any).where).toEqual({ customerId: ME, status: { in: ['rejected', 'paid'] } });
    // Entregas pelas reservas ou pelos aluguéis do titular.
    expect((prisma.handover.findMany.mock.calls[0][0] as any).where).toEqual({ OR: [{ reservation: { customerId: ME } }, { rentalId: { in: ['r1'] } }] });

    const deleted = storage.deleteObject.mock.calls.map((c) => `${c[0].bucket}:${c[0].key}`);
    expect(deleted).toEqual(
      expect.arrayContaining([
        `${cfg.buckets.returnPhotos}:handovers/h1/1.jpg`,
        `${cfg.buckets.returnPhotos}:handovers/h1/2.jpg`,
        `${cfg.buckets.attachments}:support/u/a.jpg`,
        `${cfg.buckets.attachments}:support/u/inc.jpg`,
        `${cfg.buckets.attachments}:support/u/bo.pdf`,
      ]),
    );
  });

  it('falha ao apagar um anexo não bloqueia a exclusão', async () => {
    const { storage, service, prisma } = setup();
    storage.deleteObject.mockRejectedValue(new Error('s3 fora'));
    const out = await service.deleteAccount(ME);
    expect(out.status).toBe('completed');
    expect(prisma.customer.update).toHaveBeenCalled();
  });

  it('exclui cliente e cartões no gateway; sucesso apaga a pendência e a referência', async () => {
    const provider = new FakePaymentProvider();
    const { prisma, service } = setup(provider);
    prisma.paymentProviderRef.findUnique.mockResolvedValue({ providerId: 'mp-cus-1' } as any);
    const spy = jest.spyOn(provider, 'deleteCustomer');
    await service.deleteAccount(ME);
    expect(prisma.paymentCard.updateMany).toHaveBeenCalledWith({ where: { customerId: ME, deletedAt: null }, data: { deletedAt: expect.any(Date), isDefault: false } });
    expect(prisma.providerCustomerDeletion.upsert).toHaveBeenCalledWith({
      where: { customerId: ME },
      create: { customerId: ME, provider: 'fake', providerCustomerId: 'mp-cus-1', providerCardIds: ['card-1', 'card-2'] },
      update: {},
    });
    expect(spy).toHaveBeenCalledWith({ providerCustomerId: 'mp-cus-1', providerCardIds: ['card-1', 'card-2'] });
    expect(provider.deletedCustomers.has('mp-cus-1')).toBe(true);
    expect(prisma.providerCustomerDeletion.delete).toHaveBeenCalledWith({ where: { customerId: ME } });
    expect(prisma.paymentProviderRef.deleteMany).toHaveBeenCalledWith({ where: { entityType: 'customer', entityId: ME, provider: 'fake' } });
  });

  it('gateway fora: a conta é excluída mesmo assim e a pendência ganha uma tentativa (o job refaz)', async () => {
    const provider = new FakePaymentProvider();
    provider.failNextDeleteCustomer = true;
    const { prisma, service } = setup(provider);
    prisma.paymentProviderRef.findUnique.mockResolvedValue({ providerId: 'mp-cus-1' } as any);
    prisma.providerCustomerDeletion.update.mockResolvedValue({ attempts: 1 } as any);
    const out = await service.deleteAccount(ME);
    expect(out.status).toBe('completed');
    expect(prisma.providerCustomerDeletion.update).toHaveBeenCalledWith({ where: { customerId: ME }, data: { attempts: { increment: 1 }, lastError: 'fake_gateway_unavailable' } });
    expect(prisma.providerCustomerDeletion.delete).not.toHaveBeenCalled();
    expect(provider.deletedCustomers.size).toBe(0);
  });

  it('job de retentativa: refaz as pendentes abaixo do limite e apaga as que o gateway confirmou', async () => {
    const provider = new FakePaymentProvider();
    const { prisma, service } = setup(provider);
    prisma.providerCustomerDeletion.findMany.mockResolvedValue([
      { customerId: 'c1', provider: 'fake', providerCustomerId: 'mp-1', providerCardIds: [], attempts: 3 },
      { customerId: 'c2', provider: 'mercadopago', providerCustomerId: 'mp-2', providerCardIds: [], attempts: 1 },
    ] as any);
    await service.retryGatewayDeletions();
    expect(prisma.providerCustomerDeletion.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { attempts: { lt: MAX_GATEWAY_DELETION_ATTEMPTS } } }));
    expect(provider.deletedCustomers.has('mp-1')).toBe(true);
    // Pendência de outro gateway não é tocada por este.
    expect(provider.deletedCustomers.has('mp-2')).toBe(false);
    expect(prisma.providerCustomerDeletion.delete).toHaveBeenCalledTimes(1);
  });

  it('sem cliente no gateway (nunca cadastrou cartão): nada a excluir lá', async () => {
    const provider = new FakePaymentProvider();
    const { prisma, service } = setup(provider);
    prisma.paymentProviderRef.findUnique.mockResolvedValue(null);
    await service.deleteAccount(ME);
    expect(prisma.providerCustomerDeletion.upsert).not.toHaveBeenCalled();
  });

  it('dívida quitada não bloqueia a exclusão (só conta dívida sem debtSettledAt)', async () => {
    const { prisma, service } = setup();
    await service.deleteAccount(ME);
    expect((prisma.payment.count.mock.calls[0][0] as any).where).toMatchObject({ debtSettledAt: null });
  });

  it('job diário: sinistro que encerrou depois da exclusão perde fotos, boletim, texto e posição', async () => {
    const { prisma, storage, cfg, service } = setup();
    prisma.claim.findMany.mockResolvedValue([{ id: 'cl1', customerId: ME, photoObjectKeys: ['support/u/bo.jpg'] }] as any);
    expect(await service.purgeClosedClaimsOfDeletedCustomers()).toBe(1);
    expect((prisma.claim.findMany.mock.calls[0][0] as any).where).toMatchObject({ status: { in: ['rejected', 'paid'] }, customer: { status: 'deleted' } });
    expect(storage.deleteObject).toHaveBeenCalledWith({ bucket: cfg.buckets.attachments, key: 'support/u/bo.jpg' });
    expect(prisma.claim.update).toHaveBeenCalledWith({ where: { id: 'cl1' }, data: expect.objectContaining({ photoObjectKeys: [], lat: null, lng: null }) });
  });
});

describe('LgpdService — exportação com o chat do suporte (Task 14)', () => {
  it('inclui conversas com mensagens; atendente só pelo primeiro nome e sem id', async () => {
    const { prisma, service } = setup();
    for (const m of ['rental', 'payment', 'walletEntry', 'incident', 'dispute', 'claim', 'subscription', 'customerCoupon', 'referral', 'maintenanceTask', 'customer', 'reservation', 'handover', 'stationSwap', 'trackPoint'] as const) {
      (prisma[m].findMany as jest.Mock).mockResolvedValue([]);
    }
    (prisma.couponRedemption.groupBy as any).mockResolvedValue([]);
    prisma.supportConversation.findMany.mockResolvedValue([
      {
        id: 'conv1', customerId: ME, rentalId: null, subject: 'Cobrança', status: 'open', lastMessageAt: now, createdAt: now, updatedAt: now,
        messages: [
          { id: 'm1', conversationId: 'conv1', authorType: 'customer', authorId: ME, authorName: null, body: 'Oi', attachmentObjectKeys: ['support/u/a.jpg'], deliveredAt: null, readAt: null, createdAt: now },
          { id: 'm2', conversationId: 'conv1', authorType: 'staff', authorId: 'staff-1', authorName: 'Ana Paula Lima', body: 'Olá!', attachmentObjectKeys: [], deliveredAt: now, readAt: null, createdAt: now },
        ],
      },
    ] as any);
    const out = await service.export(ME);
    expect((prisma.supportConversation.findMany.mock.calls[0][0] as any).where).toEqual({ customerId: ME });
    expect(out.supportConversations).toHaveLength(1);
    const [conv] = out.supportConversations;
    expect(conv).toMatchObject({ id: 'conv1', subject: 'Cobrança', status: 'open' });
    expect(conv.messages[0]).toMatchObject({ id: 'm1', authorType: 'customer', body: 'Oi', attachmentObjectKeys: ['support/u/a.jpg'] });
    expect(conv.messages[1]).toMatchObject({ id: 'm2', authorType: 'staff', authorName: 'Ana', status: 'delivered' });
    expect(conv.messages[1]).not.toHaveProperty('authorId');
    expect(JSON.stringify(out.supportConversations)).not.toContain('Paula');
  });
});
