import request from 'supertest';
import { createHarness, type Harness, staffToken } from '../../../test/helpers/http-harness';
import { CustomersController } from './customers.controller';

describe('GET /customers — busca por CPF', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness({ controllers: [CustomersController] });
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
