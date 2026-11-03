import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mockDeep } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';
import { loadConfig } from '../../config/env';
import type { Principal } from '../auth/principal';
import { ClaimCreateDto, IncidentCreateDto, MessageCreateDto } from './support.dto';
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

describe('auditoria run-4: chaves de anexo do cliente presas ao próprio prefixo', () => {
  const RENTAL = '66666666-6666-4666-8666-666666666666';
  const own = `support/${CUSTOMER_ID}/foto.jpg`;
  const foreign = 'support/99999999-9999-4999-8999-999999999999/foto.jpg';

  it('mensagem do cliente com chave de outro usuário → 422 e nada gravado; com a própria → ok', async () => {
    const { svc, prisma } = setup();
    prisma.supportMessage.create.mockImplementation((async (args: any) => ({ ...message(), ...args.data, id: 'novo' })) as any);
    await expect(svc.sendMessage(customer, CONV_ID, { body: 'Oi', attachmentObjectKeys: [foreign] })).rejects.toMatchObject({ status: 422 });
    expect(prisma.supportMessage.create).not.toHaveBeenCalled();
    await svc.sendMessage(customer, CONV_ID, { body: 'Oi', attachmentObjectKeys: [own] });
    expect((prisma.supportMessage.create.mock.calls[0][0] as any).data.attachmentObjectKeys).toEqual([own]);
  });

  it('chave com o prefixo como trecho (support/<id>/../outro) → 422', async () => {
    const { svc } = setup();
    await expect(svc.sendMessage(customer, CONV_ID, { body: 'Oi', attachmentObjectKeys: [`support/${CUSTOMER_ID}/../outro/x.jpg`] })).rejects.toMatchObject({ status: 422 });
  });

  it('ocorrência e sinistro do cliente com chave alheia → 422', async () => {
    const { svc, prisma } = setup();
    prisma.rental.findUnique.mockResolvedValue({ customerId: CUSTOMER_ID, vehicleId: null, insurancePolicyId: 'pol' } as any);
    await expect(svc.createIncident(customer, { category: 'other', description: 'Pneu furado', photoObjectKeys: [foreign] })).rejects.toMatchObject({ status: 422 });
    await expect(svc.createClaim(customer, { rentalId: RENTAL, type: 'damage', description: 'Arranhão no para-lama', occurredAt: new Date().toISOString(), photoObjectKeys: [foreign] }))
      .rejects.toMatchObject({ status: 422 });
    expect(prisma.incident.create).not.toHaveBeenCalled();
    expect(prisma.claim.create).not.toHaveBeenCalled();
  });

  it('primeira mensagem da conversa grava authorId = userId (mesmo autor das demais)', async () => {
    const { svc, prisma } = setup();
    prisma.supportConversation.create.mockResolvedValue({ id: CONV_ID, customerId: CUSTOMER_ID, status: 'open', subject: 'Ajuda', customer: { name: 'Maria' }, createdAt: new Date(), lastMessageAt: new Date() } as any);
    const other: Principal = { ...customer, userId: 'user-x' };
    await svc.createConversation(other, { subject: 'Ajuda', message: 'Oi' });
    expect((prisma.supportMessage.create.mock.calls[0][0] as any).data.authorId).toBe('user-x');
  });

  it('DTOs: no máximo o limite do contrato de chaves (mensagem 4, ocorrência 6, sinistro 10) e cada chave com até 200 caracteres', async () => {
    const keys = (n: number) => Array.from({ length: n }, (_, i) => `support/${CUSTOMER_ID}/${i}.jpg`);
    const errs = async (cls: any, body: any) => (await validate(plainToInstance(cls, body))).map((e) => e.property);
    expect(await errs(MessageCreateDto, { body: 'Oi', attachmentObjectKeys: keys(5) })).toContain('attachmentObjectKeys');
    expect(await errs(MessageCreateDto, { body: 'Oi', attachmentObjectKeys: keys(4) })).toEqual([]);
    expect(await errs(IncidentCreateDto, { category: 'other', description: 'Pneu furado', photoObjectKeys: keys(7) })).toContain('photoObjectKeys');
    expect(await errs(ClaimCreateDto, { rentalId: '66666666-6666-4666-8666-666666666666', type: 'damage', description: 'Arranhão no para-lama', occurredAt: new Date().toISOString(), photoObjectKeys: keys(11) }))
      .toContain('photoObjectKeys');
    expect(await errs(MessageCreateDto, { body: 'Oi', attachmentObjectKeys: [`support/${'x'.repeat(200)}`] })).toContain('attachmentObjectKeys');
  });
});
