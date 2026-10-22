import { Prisma } from '@prisma/client';
import { PrincipalResolver } from './principal-resolver.service';

/** QA-08: corrida do primeiro acesso (requisições paralelas do mesmo cliente novo). */
describe('PrincipalResolver (primeiro acesso)', () => {
  const token = { sub: 'novo', email: 'novo@volti.dev', groups: [], pool: 'customer' as const };
  const p2002 = () => new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });

  it('violação de unicidade no upsert → relê o cliente criado pela requisição concorrente', async () => {
    const prisma = {
      customer: {
        upsert: jest.fn().mockRejectedValue(p2002()),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'c1', status: 'active' }),
      },
    };
    const principal = await new PrincipalResolver(prisma as any).resolve(token);
    expect(principal).toMatchObject({ pool: 'customer', customerId: 'c1' });
    expect(prisma.customer.findUniqueOrThrow).toHaveBeenCalledWith({ where: { cognitoSub: 'novo' }, select: { id: true, status: true } });
  });

  it('outros erros continuam subindo', async () => {
    const prisma = { customer: { upsert: jest.fn().mockRejectedValue(new Error('db fora')), findUniqueOrThrow: jest.fn() } };
    await expect(new PrincipalResolver(prisma as any).resolve(token)).rejects.toThrow('db fora');
  });

  it('cliente excluído continua recusado', async () => {
    const prisma = { customer: { upsert: jest.fn().mockResolvedValue({ id: 'c1', status: 'deleted' }) } };
    await expect(new PrincipalResolver(prisma as any).resolve(token)).rejects.toMatchObject({ status: 401 });
  });
});

/** QA-04: grupos de staff vêm do cadastro (o painel é a fonte); o token não regrava o banco e nada fica em cache. */
describe('PrincipalResolver (staff, QA-04)', () => {
  const token = { sub: 'sub-op', email: 'operacao@volti.dev', groups: ['operacao' as const], pool: 'staff' as const };
  const row = (groups: string[], extra: Record<string, unknown> = {}) => ({ id: 's1', active: true, groups, cognitoSub: 'sub-op', lastLoginAt: new Date(), ...extra });

  function prismaWith(rows: unknown[]) {
    return {
      staffUser: {
        findUnique: jest.fn().mockImplementation(async () => rows.shift() ?? null),
        findFirst: jest.fn().mockImplementation(async () => rows.shift() ?? null),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: 'novo', groups: ['operacao'] }),
      },
    };
  }

  it('grupos efetivos = cadastro ∩ token; o banco não é regravado com os grupos do token', async () => {
    const prisma = prismaWith([row(['suporte'])]);
    const p = await new PrincipalResolver(prisma as any).resolve(token);
    expect(p.groups).toEqual([]);
    for (const [arg] of prisma.staffUser.update.mock.calls) expect(arg.data).not.toHaveProperty('groups');
  });

  it('sem cache: grupo removido no painel vale já na requisição seguinte', async () => {
    const prisma = prismaWith([row(['operacao']), row(['suporte'])]);
    const r = new PrincipalResolver(prisma as any);
    expect((await r.resolve(token)).groups).toEqual(['operacao']);
    expect((await r.resolve(token)).groups).toEqual([]);
  });

  it('usuário desativado → 403', async () => {
    const prisma = prismaWith([row(['operacao'], { active: false })]);
    await expect(new PrincipalResolver(prisma as any).resolve(token)).rejects.toMatchObject({ status: 403 });
  });

});
