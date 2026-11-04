import request from 'supertest';
import { createHarness, type Harness, staffToken } from '../../../test/helpers/http-harness';
import { AuditService } from '../audit/audit.service';
import { DelinquencyService } from '../payments/delinquency.service';
import { CustomersController } from './customers.controller';

describe('GET /customers — busca por CPF', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness({
      controllers: [CustomersController],
      providers: [
        { provide: AuditService, useValue: { record: jest.fn() } },
        { provide: DelinquencyService, useValue: {} },
      ],
    });
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.prisma.customer.findMany.mockReset().mockResolvedValue([]);
    h.prisma.restrictionEntry.findMany.mockResolvedValue([]);
    h.prisma.subscription.findMany.mockResolvedValue([]);
  });

  const search = async (groups: Array<'admin' | 'suporte'>, q: string) => {
    const res = await request(h.app.getHttpServer()).get('/customers').query({ q }).set('Authorization', `Bearer ${await staffToken(groups)}`);
    expect(res.status).toBe(200);
    return (h.prisma.customer.findMany.mock.calls[0][0] as any).where.OR as Array<Record<string, any>>;
  };

  it('suporte: CPF completo (11 dígitos) casa por igualdade', async () => {
    const or = await search(['suporte'], '123.456.789-09');
    expect(or).toContainEqual({ cpf: '12345678909' });
    expect(or.some((c) => c.cpf && typeof c.cpf === 'object')).toBe(false);
  });

  it('suporte: fragmento de CPF não enumera (nenhum contains em cpf)', async () => {
    const or = await search(['suporte'], '12345');
    expect(or.some((c) => 'cpf' in c)).toBe(false);
  });

  it('admin: mantém a busca parcial por CPF', async () => {
    const or = await search(['admin'], '12345');
    expect(or).toContainEqual({ cpf: { contains: '12345' } });
  });
});

describe('auditoria run-4: lista de restrição x bloqueio da conta', () => {
  let h: Harness;
  const CID = '33333333-3333-4333-8333-333333333333';
  const CPF = '52998224725';
  const row = (over: Record<string, unknown> = {}) => ({ id: CID, cpf: CPF, status: 'blocked', name: 'Maria', email: 'm@x.com', kycStatus: 'approved', createdAt: new Date(), ...over });
  beforeAll(async () => {
    h = await createHarness({
      controllers: [CustomersController],
      providers: [
        { provide: AuditService, useValue: { record: jest.fn() } },
        { provide: DelinquencyService, useValue: {} },
      ],
    });
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    jest.clearAllMocks();
    h.prisma.restrictionEntry.findMany.mockReset().mockResolvedValue([]);
    h.prisma.restrictionEntry.findUnique.mockReset().mockResolvedValue(null);
    h.prisma.subscription.findFirst.mockResolvedValue(null);
    h.prisma.rental.count.mockResolvedValue(0);
    h.prisma.payment.aggregate.mockResolvedValue({ _sum: { amountCents: 0, refundedCents: 0 } } as any);
    h.prisma.dispute.count.mockResolvedValue(0);
    h.prisma.rental.findFirst.mockResolvedValue(null);
    h.prisma.customer.updateMany.mockReset().mockResolvedValue({ count: 1 });
    h.prisma.customer.update.mockReset();
  });
  const admin = async () => `Bearer ${await staffToken(['admin'])}`;

  it('desbloquear com o CPF na lista de restrição → 409 e a conta continua bloqueada', async () => {
    h.prisma.customer.findUnique.mockResolvedValue(row() as any);
    h.prisma.restrictionEntry.findUnique.mockResolvedValue({ id: 'r1', cpf: CPF } as any);
    const res = await request(h.app.getHttpServer()).post(`/customers/${CID}/unblock`).set('Authorization', await admin()).send({ reason: 'Pedido do cliente' });
    expect(res.status).toBe(409);
    expect(h.prisma.customer.updateMany).not.toHaveBeenCalled();
    expect(h.prisma.customer.update).not.toHaveBeenCalled();
  });

  it('desbloquear: update condicional ao status blocked (corrida → 409)', async () => {
    h.prisma.customer.findUnique.mockResolvedValue(row() as any);
    h.prisma.customer.updateMany.mockResolvedValue({ count: 0 });
    const res = await request(h.app.getHttpServer()).post(`/customers/${CID}/unblock`).set('Authorization', await admin()).send({ reason: 'Pedido do cliente' });
    expect(res.status).toBe(409);
    expect((h.prisma.customer.updateMany.mock.calls[0][0] as any).where).toEqual({ id: CID, status: 'blocked' });
  });

  it('bloquear: update condicional ao status active (corrida → 409)', async () => {
    h.prisma.customer.findUnique.mockResolvedValue(row({ status: 'active' }) as any);
    h.prisma.customer.updateMany.mockResolvedValue({ count: 0 });
    const res = await request(h.app.getHttpServer()).post(`/customers/${CID}/block`).set('Authorization', await admin()).send({ reason: 'Fraude' });
    expect(res.status).toBe(409);
    expect((h.prisma.customer.updateMany.mock.calls[0][0] as any).where).toEqual({ id: CID, status: 'active' });
  });

  it('incluir CPF na lista bloqueia na mesma transação as contas ativas com esse CPF', async () => {
    h.prisma.restrictionEntry.create.mockResolvedValue({ id: 'r1', cpf: CPF, reason: 'Fraude', createdAt: new Date() } as any);
    const res = await request(h.app.getHttpServer()).post('/customer-restrictions').set('Authorization', await admin()).send({ cpf: CPF, reason: 'Fraude' });
    expect(res.status).toBe(201);
    expect(h.prisma.$transaction).toHaveBeenCalled();
    expect(h.prisma.customer.updateMany).toHaveBeenCalledWith({
      where: { cpf: CPF, status: 'active' },
      data: expect.objectContaining({ status: 'blocked', blockedReason: 'Fraude' }),
    });
  });

  it('incluir CPF duplicado em corrida (P2002) → 409', async () => {
    const { Prisma } = jest.requireActual('@prisma/client');
    h.prisma.restrictionEntry.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    const res = await request(h.app.getHttpServer()).post('/customer-restrictions').set('Authorization', await admin()).send({ cpf: CPF, reason: 'Fraude' });
    expect(res.status).toBe(409);
    expect(res.body.detail).toBe('CPF já está na lista de restrição.');
  });
});

describe('GET /customers — estatísticas na lista (painel de bancada, L2)', () => {
  let h: Harness;
  const A = '44444444-4444-4444-8444-444444444444';
  const B = '55555555-5555-4555-8555-555555555555';
  const row = (id: string) => ({ id, cpf: null, status: 'active', name: 'Cliente', email: `${id.slice(0, 4)}@x.com`, kycStatus: 'approved', delinquent: false, createdAt: new Date('2026-11-01T00:00:00Z') });
  beforeAll(async () => {
    h = await createHarness({
      controllers: [CustomersController],
      providers: [
        { provide: AuditService, useValue: { record: jest.fn() } },
        { provide: DelinquencyService, useValue: {} },
      ],
    });
  });
  afterAll(() => h.app.close());

  it('cada cliente vem com stats (aluguéis, inclusive o em andamento; gasto líquido; contestações abertas); sem dados → zeros', async () => {
    h.prisma.customer.findMany.mockReset().mockResolvedValue([row(A), row(B)] as any);
    h.prisma.restrictionEntry.findMany.mockResolvedValue([]);
    h.prisma.subscription.findMany.mockResolvedValue([]);
    (h.prisma.rental.groupBy as any).mockResolvedValue([{ customerId: A, _count: { _all: 2 }, _max: { startedAt: new Date('2026-11-03T12:00:00Z') } }]);
    (h.prisma.payment.groupBy as any).mockResolvedValue([{ customerId: A, _sum: { amountCents: 5000, refundedCents: 1000 } }]);
    (h.prisma.dispute.groupBy as any).mockResolvedValue([{ customerId: A, _count: { _all: 1 } }]);
    const res = await request(h.app.getHttpServer()).get('/customers').set('Authorization', `Bearer ${await staffToken(['admin'])}`);
    expect(res.status).toBe(200);
    const byId = Object.fromEntries(res.body.items.map((c: any) => [c.id, c.stats]));
    expect(byId[A]).toEqual({ rentalsCount: 2, totalSpentCents: 4000, openDisputes: 1, lastRentalAt: '2026-11-03T12:00:00.000Z' });
    expect(byId[B]).toEqual({ rentalsCount: 0, totalSpentCents: 0, openDisputes: 0 });
    expect(((h.prisma.rental.groupBy as any).mock.calls[0][0] as any).where).toEqual({ customerId: { in: [A, B] } });
  });
});
