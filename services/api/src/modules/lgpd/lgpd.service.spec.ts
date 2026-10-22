import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../../config/env';
import { deletedSubMarker } from '../auth/deleted-identity';
import { LgpdService } from './lgpd.service';
import { EV } from '../../common/events';

const ME = '11111111-1111-4111-8111-111111111111';
const now = new Date();

const me = {
  id: ME, cognitoSub: 'sub-me', email: 'eu@example.com', name: 'Maria Souza', phone: '+5511999990000', cpf: '12345678901',
  birthDate: new Date('1990-05-10'), kycStatus: 'approved', kycReason: null, status: 'active', delinquent: false, blockedReason: null, blockedAt: null,
  emergencyContactName: 'João', emergencyContactPhone: '+5511988887777', termsVersion: '2026-10', termsAccepted: true, termsAcceptedAt: now,
  locationConsent: true, locationConsentUpdatedAt: now, marketingConsent: false, consentsUpdatedAt: now, kycDocumentFrontKey: 'kyc/me/front.jpg',
  kycDocumentBackKey: null, kycSelfieKey: 'kyc/me/selfie.jpg', createdAt: now, updatedAt: now,
};

const subs = () => ({ closeForAccountDeletion: jest.fn().mockResolvedValue(undefined) });

function setup() {
  const prisma = mockDeep<PrismaClient>();
  const subscriptions = subs();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const storage = { deleteObject: jest.fn().mockResolvedValue(undefined), presignPut: jest.fn(), presignGet: jest.fn(), putObject: jest.fn() };
  const service = new LgpdService(prisma as any, storage, loadConfig(), subscriptions as any);
  prisma.customer.findUnique.mockResolvedValue(me as any);
  prisma.rental.findMany.mockResolvedValue([]);
  prisma.payment.findMany.mockResolvedValue([]);
  prisma.trackPoint.findMany.mockResolvedValue([]);
  prisma.walletEntry.findMany.mockResolvedValue([]);
  prisma.incident.findMany.mockResolvedValue([]);
  prisma.dispute.findMany.mockResolvedValue([]);
  prisma.claim.findMany.mockResolvedValue([]);
  // Contrato v2 (fix round 1, M10): assinaturas, cupons, indicações e manutenções também vão na exportação.
  prisma.subscription.findMany.mockResolvedValue([]);
  prisma.customerCoupon.findMany.mockResolvedValue([]);
  (prisma.couponRedemption.groupBy as any).mockResolvedValue([]);
  prisma.referral.findMany.mockResolvedValue([]);
  prisma.maintenanceTask.findMany.mockResolvedValue([]);
  prisma.customer.findMany.mockResolvedValue([]);
  // Retirada em galpão: reservas de galpão e entregas também vão na exportação.
  prisma.reservation.findMany.mockResolvedValue([]);
  prisma.handover.findMany.mockResolvedValue([]);
  prisma.rental.findFirst.mockResolvedValue(null);
  prisma.payment.count.mockResolvedValue(0);
  return { prisma, storage, service, subscriptions };
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
    expect(Object.keys(out).sort()).toEqual(['claims', 'consents', 'coupons', 'customer', 'depotReservations', 'disputes', 'generatedAt', 'handovers', 'incidents', 'maintenanceRequests', 'payments', 'referrals', 'rentals', 'subscriptions', 'tracks', 'walletEntries']);
    expect((prisma.subscription.findMany as jest.Mock).mock.calls[0][0].where.customerId).toBe(ME);
    expect((prisma.customerCoupon.findMany as jest.Mock).mock.calls[0][0].where.customerId).toBe(ME);
    expect((prisma.referral.findMany as jest.Mock).mock.calls[0][0].where.referrerId).toBe(ME);
    expect((prisma.maintenanceTask.findMany as jest.Mock).mock.calls[0][0].where.customerId).toBe(ME);
  });

  it('export inclui reservas de galpão e entregas do titular: sem pickupCode e fotos só como chaves (sem URLs)', async () => {
    const { service, prisma, storage } = setup();
    const DEPOT = '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c';
    prisma.rental.findMany.mockResolvedValue([{ id: 'r1', customerId: ME, vehicleId: 'v1', vehicle: { code: 'VLT-0001' }, planCode: 'day', coverage: 'basic', status: 'ended', startedAt: now, pausedSecondsAcc: 0, endedAt: now, endRequestedAt: now, priceSnapshot: { unit: 'day' }, costCents: 0, depositId: 'd1', createdAt: now, updatedAt: now }] as any);
    prisma.reservation.findMany.mockResolvedValue([
      {
        id: 'res1', customerId: ME, vehicleId: 'v1', vehicle: { code: 'VLT-0001' }, status: 'converted', depositId: 'd1', expiresAt: now, endedAt: now, depotId: DEPOT, pickupMode: 'scheduled',
        pickupAt: now, planCode: 'day', coverage: 'basic', depositMethod: 'card', cardId: 'card-1', couponCode: null, reminderSentAt: now, createdAt: now, updatedAt: now,
      },
    ] as any);
    prisma.handover.findMany.mockResolvedValue([
      {
        id: 'h1', type: 'pickup', status: 'accepted', depotId: DEPOT, reservationId: 'res1', rentalId: 'r1', vehicleId: 'v1', vehicle: { code: 'VLT-0001' }, operatorId: 'op-1',
        checklist: [{ code: 'freios', ok: true }], photoKeys: ['handovers/h1/1.jpg'], batteryPct: 90, batterySerial: 'BAT-1', disputeReason: null, lastError: null, respondedAt: now, createdAt: now, updatedAt: now,
      },
    ] as any);

    const out = await service.export(ME);

    const resArgs = prisma.reservation.findMany.mock.calls[0][0] as any;
    expect(resArgs.where).toEqual({ customerId: ME, depotId: { not: null } });
    const hoArgs = prisma.handover.findMany.mock.calls[0][0] as any;
    expect(hoArgs.where).toEqual({ OR: [{ reservation: { customerId: ME } }, { rentalId: { in: ['r1'] } }] });

    expect(out.depotReservations).toEqual([
      {
        id: 'res1', vehicleId: 'v1', status: 'converted', createdAt: now.toISOString(), expiresAt: now.toISOString(), depotId: DEPOT,
        pickupMode: 'scheduled', pickupAt: now.toISOString(), planCode: 'day', coverage: 'basic', depositMethod: 'card',
      },
    ]);
    expect(out.handovers).toEqual([
      {
        id: 'h1', type: 'pickup', status: 'accepted', depotId: DEPOT, reservationId: 'res1', rentalId: 'r1', vehicleId: 'v1', vehicleCode: 'VLT-0001', operatorId: 'op-1',
        checklist: [{ code: 'freios', ok: true }], photoKeys: ['handovers/h1/1.jpg'], batteryPct: 90, batterySerial: 'BAT-1', createdAt: now.toISOString(), respondedAt: now.toISOString(),
      },
    ]);
    const json = JSON.stringify(out);
    expect(json).not.toContain('pickupCode');
    expect(json).not.toContain('photoUrls');
    expect(json).not.toMatch(/https?:\/\//);
    expect(storage.presignGet).not.toHaveBeenCalled();
  });

  it('export sem aluguéis busca entregas só pelas reservas do titular', async () => {
    const { service, prisma } = setup();
    const out = await service.export(ME);
    expect((prisma.handover.findMany.mock.calls[0][0] as any).where).toEqual({ OR: [{ reservation: { customerId: ME } }] });
    expect(out.depotReservations).toEqual([]);
    expect(out.handovers).toEqual([]);
  });

  it('QA-07: DELETE /lgpd/account exclui a identidade no diretório e guarda só o hash do sub (para recusar o token antigo)', async () => {
    const prisma = mockDeep<PrismaClient>();
    (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
    prisma.customer.findUnique.mockResolvedValue(me as any);
    prisma.rental.findMany.mockResolvedValue([]);
    const identity = { deleteIdentity: jest.fn().mockResolvedValue(undefined) };
    const storage = { deleteObject: jest.fn().mockResolvedValue(undefined), presignPut: jest.fn(), presignGet: jest.fn(), putObject: jest.fn() };
    await new LgpdService(prisma as any, storage, loadConfig(), subs() as any, identity).deleteAccount(ME);
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
    const out = await new LgpdService(prisma as any, storage, loadConfig(), subs() as any, identity).deleteAccount(ME);
    expect(out.status).toBe('completed');
    expect(prisma.customer.update).toHaveBeenCalled();
    // Fix round 1: a exclusão pendente fica registrada (na mesma transação) para o job de retentativa.
    expect(prisma.customerIdentityDeletion.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { customerId: ME }, create: { customerId: ME, sub: 'sub-me' } }));
    expect(prisma.customerIdentityDeletion.update).toHaveBeenCalledWith({ where: { customerId: ME }, data: { attempts: { increment: 1 }, lastError: 'cognito fora' } });
    expect(prisma.customerIdentityDeletion.delete).not.toHaveBeenCalled();
  });

  it('fix round 1: exclusão de conta revoga o principal (o realtime desconecta os sockets do titular)', async () => {
    const prisma = mockDeep<PrismaClient>();
    (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
    prisma.customer.findUnique.mockResolvedValue(me as any);
    prisma.rental.findMany.mockResolvedValue([]);
    const events = { emit: jest.fn() };
    const storage = { deleteObject: jest.fn().mockResolvedValue(undefined), presignPut: jest.fn(), presignGet: jest.fn(), putObject: jest.fn() };
    await new LgpdService(prisma as any, storage, loadConfig(), subs() as any, undefined, events as any).deleteAccount(ME);
    expect(events.emit).toHaveBeenCalledWith(EV.PRINCIPAL_REVOKED, { pool: 'customer', userId: ME });
  });

  it('fix round 1: retentativa da exclusão no Cognito — sucesso apaga a pendência; esgotada → alerta (evento + log)', async () => {
    const prisma = mockDeep<PrismaClient>();
    const events = { emit: jest.fn() };
    const identity = { deleteIdentity: jest.fn().mockResolvedValueOnce(undefined).mockRejectedValue(new Error('cognito fora')) };
    const storage = { deleteObject: jest.fn(), presignPut: jest.fn(), presignGet: jest.fn(), putObject: jest.fn() };
    prisma.customerIdentityDeletion.findMany.mockResolvedValue([
      { customerId: 'c-ok', sub: 'sub-ok', attempts: 1 },
      { customerId: 'c-last', sub: 'sub-last', attempts: 9 },
    ] as any);
    prisma.customerIdentityDeletion.update.mockResolvedValue({ customerId: 'c-last', attempts: 10 } as any);
    await new LgpdService(prisma as any, storage, loadConfig(), subs() as any, identity, events as any).retryIdentityDeletions();
    expect(prisma.customerIdentityDeletion.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { attempts: { lt: 10 } } }));
    expect(prisma.customerIdentityDeletion.delete).toHaveBeenCalledWith({ where: { customerId: 'c-ok' } });
    expect(events.emit).toHaveBeenCalledWith(EV.LGPD_IDENTITY_DELETION_FAILED, { customerId: 'c-last', attempts: 10 });
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

  it('fix round 2 (M10): exclusão fecha a assinatura pelo SubscriptionsService (obrigatório) antes de anonimizar; falha dele interrompe', async () => {
    const { service, prisma, subscriptions } = setup();
    await service.deleteAccount(ME);
    expect(subscriptions.closeForAccountDeletion).toHaveBeenCalledWith(ME);
    expect(subscriptions.closeForAccountDeletion.mock.invocationCallOrder[0]).toBeLessThan(prisma.customer.update.mock.invocationCallOrder[0]);

    const other = setup();
    other.subscriptions.closeForAccountDeletion.mockRejectedValueOnce(new Error('db fora'));
    await expect(other.service.deleteAccount(ME)).rejects.toThrow('db fora');
    expect(other.prisma.customer.update).not.toHaveBeenCalled();
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

  it('QA-12: exclusão anula a posição de início dos aluguéis do titular', async () => {
    const { service, prisma } = setup();
    prisma.rental.findMany.mockResolvedValue([{ id: 'r1' }] as any);
    await service.deleteAccount(ME);
    expect(prisma.rental.updateMany).toHaveBeenCalledWith({ where: { customerId: ME }, data: expect.objectContaining({ startLat: null, startLng: null }) });
  });

  it('QA-14: exclusão apaga as fotos de devolução do bucket e as chaves do aluguel', async () => {
    const { service, prisma, storage } = setup();
    prisma.rental.findMany.mockResolvedValue([
      { id: 'r1', returnPhotoObjectKey: 'returns/r1/a.jpg', returnPhotoUploadKey: 'returns/r1/a.jpg' },
      { id: 'r2', returnPhotoObjectKey: null, returnPhotoUploadKey: 'returns/r2/b.jpg' },
    ] as any);
    await service.deleteAccount(ME);
    const cfg = loadConfig();
    expect(storage.deleteObject).toHaveBeenCalledWith({ bucket: cfg.buckets.returnPhotos, key: 'returns/r1/a.jpg' });
    expect(storage.deleteObject).toHaveBeenCalledWith({ bucket: cfg.buckets.returnPhotos, key: 'returns/r2/b.jpg' });
    expect(storage.deleteObject.mock.calls.filter(([a]: any) => a.key === 'returns/r1/a.jpg')).toHaveLength(1);
    expect(prisma.rental.updateMany).toHaveBeenCalledWith({ where: { customerId: ME }, data: expect.objectContaining({ returnPhotoObjectKey: null, returnPhotoUploadKey: null }) });
  });

  it('QA-12: job diário anula a posição de início dos aluguéis com mais de TRACK_RETENTION_DAYS', async () => {
    const { service, prisma } = setup();
    prisma.trackPoint.deleteMany.mockResolvedValue({ count: 0 });
    prisma.rental.updateMany.mockResolvedValue({ count: 3 });
    const before = Date.now();
    await service.purgeExpiredStartLocations();
    const args = prisma.rental.updateMany.mock.calls[0][0] as any;
    expect(args.data).toEqual({ startLat: null, startLng: null });
    expect(args.where.startLat).toEqual({ not: null });
    const cutoff = args.where.startedAt.lt.getTime();
    expect(before - cutoff).toBeGreaterThanOrEqual(90 * 86_400_000 - 1000);
    expect(before - cutoff).toBeLessThanOrEqual(90 * 86_400_000 + 1000);
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

  it('QA-09: revogar o consentimento de localização avisa o módulo IoT (o trajeto para na hora)', async () => {
    const prisma = mockDeep<PrismaClient>();
    prisma.customer.findUnique.mockResolvedValue(me as any);
    prisma.customer.update.mockResolvedValue({ ...me, locationConsent: false } as any);
    const events = { emit: jest.fn() };
    const storage = { deleteObject: jest.fn(), presignPut: jest.fn(), presignGet: jest.fn(), putObject: jest.fn() };
    await new LgpdService(prisma as any, storage, loadConfig(), subs() as any, undefined, events as any).updateConsents(ME, { termsVersion: '2026-10', termsAccepted: true, locationTracking: false, marketing: false });
    expect(events.emit).toHaveBeenCalledWith(EV.CUSTOMER_CONSENT_CHANGED, { customerId: ME, locationTracking: false });
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
