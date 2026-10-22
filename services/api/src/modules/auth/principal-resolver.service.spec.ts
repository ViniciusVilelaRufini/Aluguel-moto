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
