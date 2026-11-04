import { mockDeep } from 'jest-mock-extended';
import { Prisma, type PrismaClient } from '@prisma/client';
import { loadConfig } from '../../config/env';
import type { Principal } from '../auth/principal';
import { KycService } from './kyc.service';
import type { KycSubmitDto } from './kyc.dto';

const CID = '11111111-1111-4111-8111-111111111111';
const CPF = '52998224725';
const staff = { pool: 'staff', sub: 's', email: 's@volti.com.br', groups: ['suporte'], userId: 'staff-1', staffId: 'staff-1' } as Principal;

const dto: KycSubmitDto = {
  fullName: 'Maria Silva', cpf: CPF, birthDate: '1990-05-10', documentType: 'cnh',
  documentFrontObjectKey: `kyc/${CID}/document-front`, selfieObjectKey: `kyc/${CID}/selfie`,
};

const customer = (over: Record<string, unknown> = {}) => ({
  id: CID, cpf: CPF, birthDate: new Date('1990-05-10T00:00:00Z'), kycStatus: 'pending', kycReason: null, kycSubmittedAt: new Date('2026-11-03T10:00:00Z'),
  kycReviewedAt: null, kycDocumentFrontKey: `kyc/${CID}/document-front`, kycSelfieKey: `kyc/${CID}/selfie`, kycDocumentBackKey: null, ...over,
});

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)));
  const audit = { record: jest.fn() };
  const provider = { verify: jest.fn().mockResolvedValue({ decision: 'approved' }) };
  const push = { sendToOwner: jest.fn() };
  const svc = new KycService(prisma as any, audit as any, provider as any, {} as any, push as any, loadConfig(), { fraudHashSecret: 'segredo-de-teste' } as any);
  prisma.customer.findUnique.mockResolvedValue(customer({ kycStatus: 'not_started', cpf: null, birthDate: null, kycSubmittedAt: null }) as any);
  prisma.customer.findUniqueOrThrow.mockResolvedValue(customer() as any);
  prisma.customer.findFirst.mockResolvedValue(null);
  prisma.restrictionEntry.findUnique.mockResolvedValue(null);
  prisma.customer.updateMany.mockResolvedValue({ count: 1 });
  return { prisma, svc, provider, push, audit };
}

const flush = () => new Promise((r) => setImmediate(r));

describe('KycService.submit/decide (auditoria run-4: decisão ligada ao envio)', () => {
  it('envio é condicional ao estado (not_started/rejected) e grava um kycSubmittedAt novo', async () => {
    const { prisma, svc } = setup();
    await svc.submit(CID, dto);
    const call = prisma.customer.updateMany.mock.calls[0][0] as any;
    expect(call.where).toEqual({ id: CID, kycStatus: { in: ['not_started', 'rejected'] } });
    expect(call.data).toMatchObject({ kycStatus: 'pending', cpf: CPF });
    expect(call.data.kycSubmittedAt).toBeInstanceOf(Date);
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it('dois envios concorrentes: o perdedor (count 0) recebe 409 e não agenda decisão', async () => {
    const { prisma, svc, provider } = setup();
    prisma.customer.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.submit(CID, dto)).rejects.toMatchObject({ status: 409 });
    await flush();
    expect(provider.verify).not.toHaveBeenCalled();
  });

  it('CPF gravado em corrida por outra conta (P2002) → 409', async () => {
    const { prisma, svc } = setup();
    prisma.customer.updateMany.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    await expect(svc.submit(CID, dto)).rejects.toMatchObject({ status: 409, detail: 'Este CPF já está cadastrado em outra conta.' });
  });

  it('a decisão do provedor só vale para o envio que a pediu (kycSubmittedAt gravado)', async () => {
    const { prisma, svc, push } = setup();
    await svc.submit(CID, dto);
    const submittedAt = (prisma.customer.updateMany.mock.calls[0][0] as any).data.kycSubmittedAt as Date;
    await flush();
    const decide = prisma.customer.updateMany.mock.calls[1][0] as any;
    expect(decide.where).toEqual({ id: CID, kycStatus: 'pending', kycSubmittedAt: submittedAt });
    expect(decide.data).toMatchObject({ kycStatus: 'approved' });
    expect(push.sendToOwner).toHaveBeenCalledTimes(1);
  });

  it('decisão velha (outro envio em curso, count 0) não notifica', async () => {
    const { prisma, svc, push } = setup();
    prisma.customer.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await svc.submit(CID, dto);
    await flush();
    expect(push.sendToOwner).not.toHaveBeenCalled();
  });

  it('aprovação do provedor com CPF que entrou na lista de restrição durante a análise → reprovado', async () => {
    const { prisma, svc } = setup();
    prisma.restrictionEntry.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'r1', cpf: CPF } as any);
    await svc.submit(CID, dto);
    await flush();
    expect((prisma.customer.updateMany.mock.calls[1][0] as any).data).toMatchObject({ kycStatus: 'rejected' });
  });
});

describe('KycService.review (auditoria run-4: estado, idade e restrição)', () => {
  const approve = { decision: 'approved' as const, reason: 'Documento conferido' };
  const reject = { decision: 'rejected' as const, reason: 'Documento ilegível' };

  it('aprova pendente com dados completos: update condicional ao estado lido', async () => {
    const { prisma, svc, audit } = setup();
    prisma.customer.findUnique.mockResolvedValue(customer() as any);
    await svc.review(staff, CID, approve);
    const call = prisma.customer.updateMany.mock.calls[0][0] as any;
    expect(call.where).toEqual({ id: CID, kycStatus: 'pending', kycSubmittedAt: customer().kycSubmittedAt });
    expect(call.data).toMatchObject({ kycStatus: 'approved', kycReason: null });
    expect(audit.record).toHaveBeenCalled();
  });

  it('aprovar quem nunca enviou (not_started) ou já aprovado → 409', async () => {
    const { prisma, svc } = setup();
    prisma.customer.findUnique.mockResolvedValue(customer({ kycStatus: 'not_started', cpf: null, birthDate: null }) as any);
    await expect(svc.review(staff, CID, approve)).rejects.toMatchObject({ status: 409 });
    prisma.customer.findUnique.mockResolvedValue(customer({ kycStatus: 'approved' }) as any);
    await expect(svc.review(staff, CID, approve)).rejects.toMatchObject({ status: 409 });
    expect(prisma.customer.updateMany).not.toHaveBeenCalled();
  });

  it('aprovar sem CPF, sem nascimento ou sem documentos → 422', async () => {
    const { prisma, svc } = setup();
    for (const over of [{ cpf: null }, { birthDate: null }, { kycDocumentFrontKey: null }, { kycSelfieKey: null }]) {
      prisma.customer.findUnique.mockResolvedValue(customer({ kycStatus: 'rejected', ...over }) as any);
      await expect(svc.review(staff, CID, approve)).rejects.toMatchObject({ status: 422, slug: 'validation-error' });
    }
    expect(prisma.customer.updateMany).not.toHaveBeenCalled();
  });

  it('aprovar menor de 18 → 422 kyc-underage', async () => {
    const { prisma, svc } = setup();
    const minor = new Date();
    minor.setUTCFullYear(minor.getUTCFullYear() - 17);
    prisma.customer.findUnique.mockResolvedValue(customer({ birthDate: minor }) as any);
    await expect(svc.review(staff, CID, approve)).rejects.toMatchObject({ status: 422, slug: 'kyc-underage' });
  });

  it('aprovar CPF na lista de restrição → 422 customer-blocked', async () => {
    const { prisma, svc } = setup();
    prisma.customer.findUnique.mockResolvedValue(customer() as any);
    prisma.restrictionEntry.findUnique.mockResolvedValue({ id: 'r1', cpf: CPF } as any);
    await expect(svc.review(staff, CID, approve)).rejects.toMatchObject({ status: 422, slug: 'customer-blocked' });
    expect(prisma.customer.updateMany).not.toHaveBeenCalled();
  });

  it('estado mudou entre a leitura e a gravação (count 0) → 409', async () => {
    const { prisma, svc } = setup();
    prisma.customer.findUnique.mockResolvedValue(customer() as any);
    prisma.customer.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.review(staff, CID, approve)).rejects.toMatchObject({ status: 409 });
  });

  it('rejeitar pendente continua permitido; rejeitar quem nunca enviou → 409', async () => {
    const { prisma, svc } = setup();
    prisma.customer.findUnique.mockResolvedValue(customer() as any);
    await svc.review(staff, CID, reject);
    expect((prisma.customer.updateMany.mock.calls[0][0] as any).data).toMatchObject({ kycStatus: 'rejected', kycReason: 'Documento ilegível' });
    prisma.customer.findUnique.mockResolvedValue(customer({ kycStatus: 'not_started' }) as any);
    await expect(svc.review(staff, CID, reject)).rejects.toMatchObject({ status: 409 });
  });
});

describe('KycService.files (painel de bancada, P2-6: revisão com os arquivos)', () => {
  const withStorage = () => {
    const s = setup();
    const storage = { presignGet: jest.fn(async ({ key, expiresInSeconds }: any) => ({ url: `https://minio.local/${key}?sig=1`, expiresAt: new Date(Date.parse('2026-11-03T12:00:00Z') + expiresInSeconds * 1000).toISOString() })) };
    const svc = new KycService(s.prisma as any, s.audit as any, s.provider as any, storage as any, s.push as any, loadConfig(), { fraudHashSecret: 'segredo-de-teste' } as any);
    return { ...s, svc, storage };
  };

  it('links pré-assinados curtos (5 min) do documento e da selfie, no bucket de KYC; frente/verso ausentes não viram link', async () => {
    const { prisma, svc, storage } = withStorage();
    prisma.customer.findUnique.mockResolvedValue(customer({ kycDocumentType: 'cnh' }) as any);
    const out = await svc.files(staff, CID);
    expect(out).toEqual({
      customerId: CID, documentType: 'cnh',
      documentFront: { url: `https://minio.local/kyc/${CID}/document-front?sig=1`, expiresAt: '2026-11-03T12:05:00.000Z' },
      selfie: { url: `https://minio.local/kyc/${CID}/selfie?sig=1`, expiresAt: '2026-11-03T12:05:00.000Z' },
    });
    for (const [arg] of storage.presignGet.mock.calls) expect(arg).toMatchObject({ bucket: loadConfig().buckets.kyc, expiresInSeconds: 300 });
  });

  it('cada consulta grava AuditLog sem as chaves dos objetos (LGPD)', async () => {
    const { prisma, svc, audit } = withStorage();
    prisma.customer.findUnique.mockResolvedValue(customer() as any);
    await svc.files(staff, CID);
    expect(audit.record).toHaveBeenCalledWith({ actor: staff, action: 'customer.kyc_files_view', entityType: 'Customer', entityId: CID, metadata: { files: ['documentFront', 'selfie'] } });
    expect(JSON.stringify(audit.record.mock.calls)).not.toContain(`kyc/${CID}`);
  });

  it('chave fora do prefixo do cliente não vira link; cliente sem envio → nenhum link; inexistente → 404', async () => {
    const { prisma, svc, storage } = withStorage();
    prisma.customer.findUnique.mockResolvedValue(customer({ kycDocumentFrontKey: 'kyc/outro/document-front', kycSelfieKey: null }) as any);
    expect(await svc.files(staff, CID)).toEqual({ customerId: CID });
    expect(storage.presignGet).not.toHaveBeenCalled();
    prisma.customer.findUnique.mockResolvedValue(null);
    await expect(svc.files(staff, CID)).rejects.toMatchObject({ status: 404 });
  });
});
