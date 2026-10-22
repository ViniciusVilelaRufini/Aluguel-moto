import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../../config/env';
import { deletedSubMarker } from '../auth/deleted-identity';
import { LgpdService } from './lgpd.service';

const ME = '11111111-1111-4111-8111-111111111111';
const now = new Date();

const me = {
  id: ME, cognitoSub: 'sub-me', email: 'eu@example.com', name: 'Maria Souza', phone: '+5511999990000', cpf: '12345678901',
  birthDate: new Date('1990-05-10'), kycStatus: 'approved', kycReason: null, status: 'active', delinquent: false, blockedReason: null, blockedAt: null,
  emergencyContactName: 'João', emergencyContactPhone: '+5511988887777', termsVersion: '2026-10', termsAccepted: true, termsAcceptedAt: now,
  locationConsent: true, locationConsentUpdatedAt: now, marketingConsent: false, consentsUpdatedAt: now, kycDocumentFrontKey: 'kyc/me/front.jpg',
  kycDocumentBackKey: null, kycSelfieKey: 'kyc/me/selfie.jpg', createdAt: now, updatedAt: now,
};

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const storage = { deleteObject: jest.fn().mockResolvedValue(undefined), presignPut: jest.fn(), presignGet: jest.fn(), putObject: jest.fn() };
  const service = new LgpdService(prisma as any, storage, loadConfig());
  prisma.customer.findUnique.mockResolvedValue(me as any);
  prisma.rental.findMany.mockResolvedValue([]);
  prisma.payment.findMany.mockResolvedValue([]);
  prisma.trackPoint.findMany.mockResolvedValue([]);
  prisma.walletEntry.findMany.mockResolvedValue([]);
  prisma.incident.findMany.mockResolvedValue([]);
  prisma.dispute.findMany.mockResolvedValue([]);
  prisma.claim.findMany.mockResolvedValue([]);
  prisma.rental.findFirst.mockResolvedValue(null);
  prisma.payment.count.mockResolvedValue(0);
  return { prisma, storage, service };
}

describe('LgpdService', () => {
  it('GET /lgpd/export devolve só os dados do próprio cliente (todas as consultas filtradas pelo id dele)', async () => {
    const { service, prisma } = setup();
    const rentalRow = {
      id: 'r1', customerId: ME, vehicleId: 'v1', vehicle: { code: 'VLT-0001' }, planCode: 'minute', coverage: 'basic', status: 'ended',
      startedAt: new Date(now.getTime() - 600000), pausedAt: null, pausedSecondsAcc: 0, endRequestedAt: now, endedAt: now,
      priceSnapshot: { planCode: 'minute', unit: 'minute', unlockFeeCents: 300, unitPriceCents: 79, pausePerMinuteCents: 20, insurancePremiumCents: 200 },
      costCents: 1290, breakdown: { lines: [], subtotalCents: 1090, discountCents: 0, insuranceCents: 200, feesCents: 0, totalCents: 1290 },
      depositId: 'd1', createdAt: now, updatedAt: now,
    };
    prisma.rental.findMany.mockResolvedValue([rentalRow] as any);
    const out = await service.export(ME);

    expect(prisma.customer.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: ME } }));
    for (const model of ['rental', 'payment', 'walletEntry', 'incident', 'dispute', 'claim'] as const) {
      const args = (prisma[model].findMany as jest.Mock).mock.calls[0][0];
      expect(args.where.customerId).toBe(ME);
    }
    // Trajetos só dos aluguéis do cliente e ainda não expirados.
    const trackArgs = prisma.trackPoint.findMany.mock.calls[0][0] as any;
    expect(trackArgs.where.rentalId).toEqual({ in: ['r1'] });
    expect(trackArgs.where.expiresAt).toEqual({ gt: expect.any(Date) });

    expect(out.customer.id).toBe(ME);
    expect(out.customer.cpf).toBe('12345678901'); // dados do próprio titular, sem máscara
    expect(out.consents).toMatchObject({ termsAccepted: true, locationTracking: true, marketing: false });
    expect(Object.keys(out).sort()).toEqual(['claims', 'consents', 'customer', 'disputes', 'generatedAt', 'incidents', 'payments', 'rentals', 'tracks', 'walletEntries']);
  });

  it('QA-07: DELETE /lgpd/account exclui a identidade no diretório e guarda só o hash do sub (para recusar o token antigo)', async () => {
    const prisma = mockDeep<PrismaClient>();
    (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
    prisma.customer.findUnique.mockResolvedValue(me as any);
    prisma.rental.findMany.mockResolvedValue([]);
    const identity = { deleteIdentity: jest.fn().mockResolvedValue(undefined) };
    const storage = { deleteObject: jest.fn().mockResolvedValue(undefined), presignPut: jest.fn(), presignGet: jest.fn(), putObject: jest.fn() };
    await new LgpdService(prisma as any, storage, loadConfig(), identity).deleteAccount(ME);
    expect(identity.deleteIdentity).toHaveBeenCalledWith('sub-me');
    const update = prisma.customer.update.mock.calls[0][0] as any;
    expect(update.data.cognitoSub).toBe(deletedSubMarker('sub-me'));
    expect(update.data.cognitoSub).not.toContain('sub-me');
  });

  it('QA-07: falha do diretório não impede a anonimização (o token já é recusado pelo hash do sub)', async () => {
    const prisma = mockDeep<PrismaClient>();
    (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
    prisma.customer.findUnique.mockResolvedValue(me as any);
    prisma.rental.findMany.mockResolvedValue([]);
    const identity = { deleteIdentity: jest.fn().mockRejectedValue(new Error('cognito fora')) };
    const storage = { deleteObject: jest.fn().mockResolvedValue(undefined), presignPut: jest.fn(), presignGet: jest.fn(), putObject: jest.fn() };
    const out = await new LgpdService(prisma as any, storage, loadConfig(), identity).deleteAccount(ME);
    expect(out.status).toBe('completed');
    expect(prisma.customer.update).toHaveBeenCalled();
  });

  it('DELETE /lgpd/account anonimiza nome, CPF, e-mail e telefone e mantém os pagamentos', async () => {
    const { service, prisma, storage } = setup();
    prisma.rental.findMany.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }] as any);
    const out = await service.deleteAccount(ME);

    const update = prisma.customer.update.mock.calls[0][0] as any;
    expect(update.where).toEqual({ id: ME });
    expect(update.data.name).not.toBe(me.name);
    expect(update.data.name).toBe('Cliente removido');
    expect(update.data.cpf).toBeNull();
    expect(update.data.email).not.toBe(me.email);
    expect(update.data.email).toMatch(/@removido\.volti\.invalid$/);
    expect(update.data.phone).toBeNull();
    expect(update.data.birthDate).toBeNull();
    expect(update.data.status).toBe('deleted');
    expect(update.data.cognitoSub).not.toBe(me.cognitoSub);

    // Trajetos e documentos de KYC apagados; pagamentos preservados.
    expect(prisma.trackPoint.deleteMany).toHaveBeenCalledWith({ where: { rentalId: { in: ['r1', 'r2'] } } });
    expect(storage.deleteObject).toHaveBeenCalledWith(expect.objectContaining({ key: 'kyc/me/front.jpg' }));
    expect(storage.deleteObject).toHaveBeenCalledWith(expect.objectContaining({ key: 'kyc/me/selfie.jpg' }));
    expect(prisma.payment.deleteMany).not.toHaveBeenCalled();
    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(out.status).toBe('completed');
  });

  it('exclusão bloqueada com aluguel em andamento → 409 account-deletion-blocked', async () => {
    const { service, prisma } = setup();
    prisma.rental.findFirst.mockResolvedValue({ id: 'r', status: 'active' } as any);
    await expect(service.deleteAccount(ME)).rejects.toMatchObject({ status: 409, slug: 'account-deletion-blocked' });
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it('exclusão bloqueada com débito pendente → 409', async () => {
    const { service, prisma } = setup();
    prisma.customer.findUnique.mockResolvedValue({ ...me, delinquent: true } as any);
    await expect(service.deleteAccount(ME)).rejects.toMatchObject({ slug: 'account-deletion-blocked' });
  });

  it('job de expiração apaga TrackPoint com expiresAt < now', async () => {
    const { service, prisma } = setup();
    prisma.trackPoint.deleteMany.mockResolvedValue({ count: 7 });
    const before = Date.now();
    const deleted = await service.purgeExpiredTracks();
    const args = prisma.trackPoint.deleteMany.mock.calls[0][0] as any;
    expect(args.where.expiresAt.lt).toBeInstanceOf(Date);
    expect(args.where.expiresAt.lt.getTime()).toBeGreaterThanOrEqual(before);
    expect(deleted).toBe(7);
  });

  it('consentimentos: atualizar grava data quando muda a localização', async () => {
    const { service, prisma } = setup();
    prisma.customer.update.mockImplementation((async (a: any) => ({ ...me, ...a.data })) as any);
    const c = await service.updateConsents(ME, { termsVersion: '2026-11', termsAccepted: true, locationTracking: false, marketing: true });
    const data = prisma.customer.update.mock.calls[0][0].data as any;
    expect(data.locationConsent).toBe(false);
    expect(data.locationConsentUpdatedAt).toBeInstanceOf(Date);
    expect(c.locationTracking).toBe(false);
    expect(c.marketing).toBe(true);
  });
});
