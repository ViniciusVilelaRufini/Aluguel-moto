import { Prisma } from '@prisma/client';
import { deletedSubMarker } from './deleted-identity';
import { PrincipalResolver } from './principal-resolver.service';

/** QA-08: corrida do primeiro acesso (requisições paralelas do mesmo cliente novo). */
describe('PrincipalResolver (primeiro acesso)', () => {
  const token = { sub: 'novo', email: 'novo@volti.dev', groups: [], pool: 'customer' as const };
  const p2002 = () => new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });

  it('violação de unicidade no upsert → relê o cliente criado pela requisição concorrente', async () => {
    const prisma = {
      customer: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockRejectedValue(p2002()),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'c1', status: 'active' }),
      },
    };
    const principal = await new PrincipalResolver(prisma as any).resolve(token);
    expect(principal).toMatchObject({ pool: 'customer', customerId: 'c1' });
    expect(prisma.customer.findUniqueOrThrow).toHaveBeenCalledWith({ where: { cognitoSub: 'novo' }, select: { id: true, status: true } });
  });

  it('outros erros continuam subindo', async () => {
    const prisma = { customer: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockRejectedValue(new Error('db fora')), findUniqueOrThrow: jest.fn() } };
    await expect(new PrincipalResolver(prisma as any).resolve(token)).rejects.toThrow('db fora');
  });

  it('cliente excluído continua recusado', async () => {
    const prisma = { customer: { upsert: jest.fn().mockResolvedValue({ id: 'c1', status: 'deleted' }), findUnique: jest.fn().mockResolvedValue({ id: 'c1', status: 'deleted' }) } };
    await expect(new PrincipalResolver(prisma as any).resolve(token)).rejects.toMatchObject({ status: 401 });
  });
});

/** QA-07: depois da exclusão o mesmo token (sub) não recria a conta, em nenhuma instância. */
describe('PrincipalResolver (conta excluída, QA-07)', () => {
  const token = { sub: 'sub-excluido', email: 'x@volti.dev', groups: [], pool: 'customer' as const };

  it('sub de cliente excluído (hash guardado na exclusão) → 401 e nenhuma conta nova', async () => {
    const prisma = {
      customer: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => (where.cognitoSub === deletedSubMarker('sub-excluido') ? { id: 'c-old', status: 'deleted' } : null)),
        upsert: jest.fn(),
        create: jest.fn(),
      },
    };
    await expect(new PrincipalResolver(prisma as any).resolve(token)).rejects.toMatchObject({ status: 401 });
    expect(prisma.customer.upsert).not.toHaveBeenCalled();
    expect(prisma.customer.create).not.toHaveBeenCalled();
  });

  it('sem cache: exclusão feita por outra instância vale já na requisição seguinte', async () => {
    const rows = [{ id: 'c1', status: 'active' }, null];
    const prisma = {
      customer: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => (where.cognitoSub === 'sub-excluido' ? rows.shift() ?? null : { id: 'c1', status: 'deleted' })),
        upsert: jest.fn(),
        create: jest.fn(),
      },
    };
    const r = new PrincipalResolver(prisma as any);
    await expect(r.resolve(token)).resolves.toMatchObject({ customerId: 'c1' });
    await expect(r.resolve(token)).rejects.toMatchObject({ status: 401 });
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
        findFirst: jest.fn().mockResolvedValue(null),
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

  it('QA-17: casa pelo sub; o e-mail só liga um cadastro ainda sem sub (criado pelo painel)', async () => {
    const prisma = prismaWith([]);
    prisma.staffUser.findFirst.mockResolvedValue({ id: 's2', active: true, groups: ['operacao'], cognitoSub: null, lastLoginAt: null });
    const p = await new PrincipalResolver(prisma as any).resolve(token);
    expect(prisma.staffUser.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { cognitoSub: 'sub-op' } }));
    expect(prisma.staffUser.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { email: { equals: 'operacao@volti.dev', mode: 'insensitive' } } }));
    expect(p).toMatchObject({ staffId: 's2', groups: ['operacao'] });
    expect(prisma.staffUser.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 's2' }, data: expect.objectContaining({ cognitoSub: 'sub-op' }) }));
  });
});

/** M7 (revisão final): access token do Cognito sem e-mail → e-mail verificado do pool pelo sub liga o convite do painel. */
describe('PrincipalResolver (convite do painel no Cognito, M7)', () => {
  const cognitoToken = { sub: 'sub-cog', email: '', groups: ['operacao' as const], pool: 'staff' as const };
  const invite = { id: 'inv-1', active: true, groups: ['operacao'], cognitoSub: null, lastLoginAt: null };
  const mkPrisma = () => ({
    staffUser: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(invite), create: jest.fn(), update: jest.fn() },
  });

  it('primeiro login sem e-mail no token: busca o e-mail verificado pelo sub e liga o cadastro do convite (grava o sub)', async () => {
    const prisma = mkPrisma();
    const directory = { verifiedEmail: jest.fn().mockResolvedValue('ana@volti.com.br') };
    const p = await new PrincipalResolver(prisma as any, directory as any).resolve(cognitoToken);
    expect(directory.verifiedEmail).toHaveBeenCalledWith('sub-cog');
    expect(prisma.staffUser.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { email: { equals: 'ana@volti.com.br', mode: 'insensitive' } } }));
    expect(prisma.staffUser.create).not.toHaveBeenCalled();
    expect(prisma.staffUser.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'inv-1' }, data: expect.objectContaining({ cognitoSub: 'sub-cog' }) }));
    expect(p).toMatchObject({ staffId: 'inv-1', groups: ['operacao'] });
  });

  it('sub já ligado: não consulta o diretório', async () => {
    const prisma = mkPrisma();
    prisma.staffUser.findUnique.mockResolvedValue({ ...invite, cognitoSub: 'sub-cog', lastLoginAt: new Date() });
    const directory = { verifiedEmail: jest.fn() };
    await new PrincipalResolver(prisma as any, directory as any).resolve(cognitoToken);
    expect(directory.verifiedEmail).not.toHaveBeenCalled();
  });

  it('diretório fora (exceção): 503 retryable e nenhum cadastro criado', async () => {
    const prisma = mkPrisma();
    const directory = { verifiedEmail: jest.fn().mockRejectedValue(new Error('throttled')) };
    await expect(new PrincipalResolver(prisma as any, directory as any).resolve(cognitoToken)).rejects.toMatchObject({ status: 503, slug: 'staff-directory-unavailable' });
    expect(prisma.staffUser.findFirst).not.toHaveBeenCalled();
    expect(prisma.staffUser.create).not.toHaveBeenCalled();
  });

  it('e-mail não verificado no pool: 403 "não cadastrado" e nenhum cadastro criado', async () => {
    const prisma = mkPrisma();
    const directory = { verifiedEmail: jest.fn().mockResolvedValue(null) };
    await expect(new PrincipalResolver(prisma as any, directory as any).resolve(cognitoToken)).rejects.toMatchObject({ status: 403, slug: 'staff-not-registered' });
    expect(prisma.staffUser.create).not.toHaveBeenCalled();
  });
});

/** Auditoria run-4 (onda 2): primeiro login sem convite é fail-closed; só a allowlist STAFF_BOOTSTRAP_EMAILS cria cadastro. */
describe('PrincipalResolver (staff sem convite, fail-closed)', () => {
  const cognitoToken = { sub: 'sub-novo', email: '', groups: ['admin' as const], pool: 'staff' as const };
  const cognitoCfg = (emails: string[] = []) => ({ authMode: 'cognito' as const, staffBootstrapEmails: emails });
  const mkPrisma = (byEmail: unknown = null) => ({
    staffUser: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(byEmail),
      create: jest.fn().mockResolvedValue({ id: 'novo' }),
      update: jest.fn().mockResolvedValue({}),
    },
  });
  const dir = (email: string | null) => ({ verifiedEmail: jest.fn().mockResolvedValue(email) });

  it('e-mail verificado sem convite e fora da allowlist → 403 staff-not-registered, nada criado', async () => {
    const prisma = mkPrisma();
    const r = new PrincipalResolver(prisma as any, dir('estranho@gmail.com') as any, undefined, cognitoCfg(['dono@volti.com.br']) as any);
    await expect(r.resolve(cognitoToken)).rejects.toMatchObject({ status: 403, slug: 'staff-not-registered', detail: 'Usuário interno não cadastrado no painel.' });
    expect(prisma.staffUser.create).not.toHaveBeenCalled();
  });

  it('sem config (padrão): também fail-closed', async () => {
    const prisma = mkPrisma();
    await expect(new PrincipalResolver(prisma as any, dir('x@volti.com.br') as any).resolve(cognitoToken)).rejects.toMatchObject({ status: 403 });
    expect(prisma.staffUser.create).not.toHaveBeenCalled();
  });

  it('bootstrap: e-mail na allowlist (sem diferenciar maiúsculas) cria o cadastro com os grupos do token', async () => {
    const prisma = mkPrisma();
    const r = new PrincipalResolver(prisma as any, dir('Dono@Volti.com.br') as any, undefined, cognitoCfg(['dono@volti.com.br']) as any);
    const p = await r.resolve(cognitoToken);
    expect(p).toMatchObject({ staffId: 'novo', groups: ['admin'] });
    expect(prisma.staffUser.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ cognitoSub: 'sub-novo', email: 'dono@volti.com.br', groups: ['admin'], name: '' }) }));
  });

  it('bootstrap não vale para o e-mail que já tem cadastro: convite ligado continua com grupos = convite ∩ token', async () => {
    const prisma = mkPrisma({ id: 'inv', active: true, groups: ['suporte'], cognitoSub: null, lastLoginAt: null });
    const r = new PrincipalResolver(prisma as any, dir('dono@volti.com.br') as any, undefined, cognitoCfg(['dono@volti.com.br']) as any);
    const p = await r.resolve(cognitoToken);
    expect(p).toMatchObject({ staffId: 'inv', groups: [] });
    expect(prisma.staffUser.create).not.toHaveBeenCalled();
  });

  it('AUTH_MODE=dev (emissor local sem autenticação): o primeiro login cria o cadastro como antes', async () => {
    const prisma = mkPrisma();
    const r = new PrincipalResolver(prisma as any, undefined, undefined, { authMode: 'dev', staffBootstrapEmails: [] } as any);
    const p = await r.resolve({ sub: 'dev-x', email: 'x@volti.dev', groups: ['campo'], pool: 'staff' });
    expect(p).toMatchObject({ staffId: 'novo', groups: ['campo'] });
  });

  it('cadastro com o mesmo e-mail ligado a outro sub (usuário recriado no Cognito) → 403 próprio, sem P2002/409', async () => {
    const prisma = mkPrisma({ id: 'velho', active: true, groups: ['admin'], cognitoSub: 'sub-antigo', lastLoginAt: null });
    const r = new PrincipalResolver(prisma as any, dir('ana@volti.com.br') as any, undefined, cognitoCfg(['ana@volti.com.br']) as any);
    await expect(r.resolve(cognitoToken)).rejects.toMatchObject({ status: 403, slug: 'staff-account-relink-required' });
    expect(prisma.staffUser.create).not.toHaveBeenCalled();
    expect(prisma.staffUser.update).not.toHaveBeenCalled();
  });

  it('ligar o convite com P2002 (o sub já foi gravado por uma requisição concorrente) → relê pelo sub', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });
    const linked = { id: 'inv', active: true, groups: ['admin'], cognitoSub: 'sub-novo', lastLoginAt: new Date() };
    const prisma = mkPrisma({ id: 'inv', active: true, groups: ['admin'], cognitoSub: null, lastLoginAt: null });
    prisma.staffUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(linked);
    prisma.staffUser.update.mockRejectedValue(p2002);
    const p = await new PrincipalResolver(prisma as any, dir('ana@volti.com.br') as any, undefined, cognitoCfg() as any).resolve(cognitoToken);
    expect(p).toMatchObject({ staffId: 'inv', groups: ['admin'] });
  });

  it('P2002 ao ligar sem ninguém com o sub → o erro sobe', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });
    const prisma = mkPrisma({ id: 'inv', active: true, groups: ['admin'], cognitoSub: null, lastLoginAt: null });
    prisma.staffUser.update.mockRejectedValue(p2002);
    await expect(new PrincipalResolver(prisma as any, dir('ana@volti.com.br') as any, undefined, cognitoCfg() as any).resolve(cognitoToken)).rejects.toBe(p2002);
  });
});

/** QA-08 (resto): primeiro acesso paralelo de um staff sem cadastro (bootstrap/dev) não responde 409. */
describe('PrincipalResolver (staff novo em paralelo)', () => {
  it('violação de unicidade ao criar o staff → relê o cadastro criado pela requisição concorrente', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });
    const created = { id: 's9', active: true, groups: ['campo'], cognitoSub: 'novo-staff', lastLoginAt: new Date() };
    const prisma = {
      staffUser: {
        findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(created),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(p2002),
        update: jest.fn(),
      },
    };
    const p = await new PrincipalResolver(prisma as any, undefined, undefined, { authMode: 'dev', staffBootstrapEmails: [] } as any).resolve({ sub: 'novo-staff', email: 'n@volti.dev', groups: ['campo'], pool: 'staff' });
    expect(p).toMatchObject({ staffId: 's9', groups: ['campo'] });
  });
});

/** Task 30 (item 39): o access token do Cognito não traz e-mail; o contato verificado vem do diretório de clientes. */
describe('PrincipalResolver (e-mail do cliente, Task 30)', () => {
  const cognitoToken = { sub: 'sub-c', email: undefined as unknown as string, groups: [], pool: 'customer' as const };

  it('primeiro acesso sem e-mail no token: grava o e-mail e o telefone verificados do diretório', async () => {
    const prisma = { customer: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({ id: 'c1', status: 'active' }) } };
    const directory = { contactInfo: jest.fn().mockResolvedValue({ email: 'maria@exemplo.com', phone: '+5511999990000' }), deleteIdentity: jest.fn() };
    await new PrincipalResolver(prisma as any, undefined, directory as any).resolve(cognitoToken);
    expect(directory.contactInfo).toHaveBeenCalledWith('sub-c');
    expect(prisma.customer.upsert.mock.calls[0][0].create).toEqual({ cognitoSub: 'sub-c', email: 'maria@exemplo.com', phone: '+5511999990000' });
  });

  it('diretório fora: entra com o e-mail provisório (o login não falha)', async () => {
    const prisma = { customer: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({ id: 'c1', status: 'active' }) } };
    const directory = { contactInfo: jest.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'TooManyRequestsException' })), deleteIdentity: jest.fn() };
    await expect(new PrincipalResolver(prisma as any, undefined, directory as any).resolve(cognitoToken)).resolves.toMatchObject({ customerId: 'c1' });
    expect(prisma.customer.upsert.mock.calls[0][0].create.email).toBe('sub-c@sem-email.volti.invalid');
  });

  it('cadastro com e-mail provisório é completado (telefone só se vazio); depois de achar, não consulta mais', async () => {
    const row = { id: 'c1', status: 'active', email: 'sub-c@sem-email.volti.invalid', phone: '+5511888880000' };
    const prisma = {
      customer: {
        findUnique: jest.fn().mockImplementation(async () => ({ ...row })),
        update: jest.fn().mockImplementation(async ({ data }: any) => Object.assign(row, data)),
      },
    };
    const directory = { contactInfo: jest.fn().mockResolvedValue({ email: 'maria@exemplo.com', phone: '+5511999990000' }), deleteIdentity: jest.fn() };
    const r = new PrincipalResolver(prisma as any, undefined, directory as any);
    await r.resolve(cognitoToken);
    expect(prisma.customer.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { email: 'maria@exemplo.com' } });
    await r.resolve(cognitoToken);
    expect(directory.contactInfo).toHaveBeenCalledTimes(1);
  });

  it('diretório sem e-mail verificado: no máximo uma consulta a cada 10 min por cliente', async () => {
    const prisma = { customer: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', status: 'active', email: 'sub-c@sem-email.volti.invalid', phone: null }), update: jest.fn() } };
    const directory = { contactInfo: jest.fn().mockResolvedValue(null), deleteIdentity: jest.fn() };
    const r = new PrincipalResolver(prisma as any, undefined, directory as any);
    await r.resolve(cognitoToken);
    await r.resolve(cognitoToken);
    expect(directory.contactInfo).toHaveBeenCalledTimes(1);
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it('cadastro com e-mail real: não consulta o diretório', async () => {
    const prisma = { customer: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', status: 'active', email: 'maria@exemplo.com', phone: null }), update: jest.fn() } };
    const directory = { contactInfo: jest.fn(), deleteIdentity: jest.fn() };
    await new PrincipalResolver(prisma as any, undefined, directory as any).resolve(cognitoToken);
    expect(directory.contactInfo).not.toHaveBeenCalled();
  });
});
