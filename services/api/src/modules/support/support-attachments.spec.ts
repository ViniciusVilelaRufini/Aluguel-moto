import { mockDeep } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';
import { loadConfig } from '../../config/env';
import type { Principal } from '../auth/principal';
import { SupportService } from './support.service';

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const CONV_ID = '22222222-2222-4222-8222-222222222222';
const STAFF_ID = '33333333-3333-4333-8333-333333333333';
const customer: Principal = { pool: 'customer', sub: 's', email: 'c@exemplo.com', groups: [], userId: CUSTOMER_ID, customerId: CUSTOMER_ID };
const staff: Principal = { pool: 'staff', sub: 'st', email: 'ops@volti.dev', groups: ['suporte'], userId: STAFF_ID, staffId: STAFF_ID };

const message = (over: Record<string, unknown> = {}) => ({
  id: 'm1', conversationId: CONV_ID, authorType: 'customer', authorId: CUSTOMER_ID, authorName: null, body: 'Segue foto',
  attachmentObjectKeys: [`support/${CUSTOMER_ID}/a.jpg`, 'kyc/outro/doc.jpg'], deliveredAt: null, readAt: null, createdAt: new Date(), ...over,
});

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const storage = { presignGet: jest.fn().mockImplementation(async ({ key }: any) => ({ url: `https://s3/${key}?sig`, expiresAt: '' })), presignPut: jest.fn(), deleteObject: jest.fn(), putObject: jest.fn() };
  const svc = new SupportService(prisma as any, {} as any, {} as any, storage as any, loadConfig(), {} as any);
  prisma.supportConversation.findUnique.mockResolvedValue({ id: CONV_ID, customerId: CUSTOMER_ID, status: 'open', customer: { name: 'Maria' } } as any);
  prisma.supportMessage.findMany.mockResolvedValue([message()] as any);
  prisma.supportMessage.updateMany.mockResolvedValue({ count: 1 });
  return { prisma, storage, svc };
}

describe('Chat de suporte: anexos e autor (Task 30)', () => {
  it('equipe recebe attachmentUrls pré-assinadas só das chaves do próprio autor', async () => {
    const { svc, storage } = setup();
    const page = await svc.listMessages(staff, CONV_ID, {} as any);
    expect(page.items[0]).toMatchObject({ attachmentObjectKeys: [`support/${CUSTOMER_ID}/a.jpg`, 'kyc/outro/doc.jpg'], attachmentUrls: [`https://s3/support/${CUSTOMER_ID}/a.jpg?sig`] });
    expect(storage.presignGet).toHaveBeenCalledTimes(1);
    expect(storage.presignGet.mock.calls[0][0]).toMatchObject({ key: `support/${CUSTOMER_ID}/a.jpg`, expiresInSeconds: 900 });
  });

  it('cliente não recebe attachmentUrls', async () => {
    const { svc, storage } = setup();
    const page = await svc.listMessages(customer, CONV_ID, {} as any);
    expect(page.items[0]).not.toHaveProperty('attachmentUrls');
    expect(storage.presignGet).not.toHaveBeenCalled();
  });

  it('mensagem da equipe: primeiro nome cadastrado ou "Equipe Volti" (nunca o e-mail)', async () => {
    const { svc, prisma } = setup();
    prisma.supportMessage.findMany.mockResolvedValue([
      message({ id: 'a', authorType: 'staff', authorId: STAFF_ID, authorName: 'Rafael Souza', attachmentObjectKeys: [] }),
      message({ id: 'b', authorType: 'staff', authorId: STAFF_ID, authorName: null, attachmentObjectKeys: [] }),
    ] as any);
    const page = await svc.listMessages(customer, CONV_ID, {} as any);
    expect(page.items.map((m: any) => m.authorName)).toEqual(['Rafael', 'Equipe Volti']);
  });

  it('equipe sem nome responde → authorName gravado "Equipe Volti"', async () => {
    const { svc, prisma } = setup();
    prisma.staffUser.findUnique.mockResolvedValue({ name: '' } as any);
    prisma.supportMessage.create.mockImplementation((async (args: any) => ({ ...message(), ...args.data, id: 'novo' })) as any);
    const out = await svc.sendMessage(staff, CONV_ID, { body: 'Olá' } as any);
    expect((prisma.supportMessage.create.mock.calls[0][0] as any).data.authorName).toBeUndefined();
    expect(out.authorName).toBe('Equipe Volti');
  });
});
