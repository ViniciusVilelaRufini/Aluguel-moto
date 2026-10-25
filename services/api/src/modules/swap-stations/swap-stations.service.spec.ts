import { Prisma, PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { ProblemException } from '../../common/problem';
import type { Principal } from '../auth/principal';
import { verifyStationCode } from '../station-swaps/station-code';
import { OPEN_24H_TEXT } from './swap-stations.mapper';
import { resolveOpeningHours, SwapStationsService } from './swap-stations.service';

const SECRET = 'segredo-teste';
const ID = 'd0000000-0000-4000-8000-000000000001';
const OTHER = 'd0000000-0000-4000-8000-000000000002';
const now = new Date('2026-10-24T12:00:00Z');
const operacao: Principal = { pool: 'staff', sub: 'o', email: 'o@volti.com.br', groups: ['operacao'], userId: 'staff-o', staffId: 'staff-o' } as Principal;

const row = (over: Record<string, unknown> = {}) => ({
  id: ID, name: 'Estação A', address: 'R. A, 1', lat: -23.56, lng: -46.69, availableBatteries: 4, totalSlots: 10, openingHours: 'Seg a sáb, 7h às 22h',
  open24h: false, active: true, stationCode: 'vst1.x.y', thingName: null, createdAt: now, updatedAt: now, ...over,
});

const input = (over: Record<string, unknown> = {}) => ({ name: 'Estação Nova', address: 'R. Nova, 10', lat: -23.5, lng: -46.6, totalSlots: 8, openingHours: 'Todos os dias, 6h às 23h', ...over });

async function problem(p: Promise<unknown>): Promise<{ status: number; slug: string; fields?: string[] }> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ProblemException) return { status: e.getStatus(), slug: e.slug, fields: e.errors?.map((i) => i.field) };
    throw e;
  }
  throw new Error('esperava erro');
}

function setup(opts: { current?: Record<string, unknown> | null; inStation?: number; openSwaps?: number; thingOwner?: { id: string } | null } = {}) {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const current = opts.current === null ? null : row(opts.current);
  prisma.swapStation.findUnique.mockResolvedValue(current as any);
  prisma.swapStation.findFirst.mockResolvedValue((opts.thingOwner ?? null) as any);
  prisma.swapStation.create.mockImplementation((async (a: any) => ({ ...row(), ...a.data, createdAt: now, updatedAt: now })) as any);
  prisma.swapStation.update.mockImplementation((async (a: any) => ({ ...current, ...a.data })) as any);
  (prisma.$queryRaw as any).mockResolvedValue([{ id: ID }]);
  prisma.battery.count.mockResolvedValue(opts.inStation ?? 0);
  prisma.stationSwap.count.mockResolvedValue(opts.openSwaps ?? 0);
  (prisma.battery.groupBy as any).mockResolvedValue([{ stationId: ID, _count: { _all: opts.inStation ?? 0 } }]);
  (prisma.stationSwap.groupBy as any).mockResolvedValue([]);
  prisma.depot.findMany.mockResolvedValue([{ id: 'depot-1', swapStationId: ID }] as any);
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new SwapStationsService(prisma as any, audit as any, SECRET);
  return { prisma, audit, service };
}

describe('resolveOpeningHours', () => {
  it('texto vale; vazio só com 24 h (texto padrão); vazio sem 24 h → erro do campo', () => {
    expect(resolveOpeningHours(' Seg a sex, 7h às 20h ', false)).toEqual({ value: 'Seg a sex, 7h às 20h' });
    expect(resolveOpeningHours('', true)).toEqual({ value: OPEN_24H_TEXT });
    expect(resolveOpeningHours(undefined, false)).toEqual({ issue: expect.objectContaining({ field: 'openingHours' }) });
  });
});

describe('SwapStationsService.list', () => {
  it('todas as estações (ativas e inativas) com baterias, trocas abertas e galpões; sem o QR', async () => {
    const { service, prisma } = setup({ inStation: 3 });
    prisma.swapStation.findMany.mockResolvedValue([row(), row({ id: OTHER, name: 'Estação B', active: false, thingName: 'station-aaaaaaaa-0000-4000-8000-000000000009' })] as any);
    (prisma.stationSwap.groupBy as any).mockResolvedValue([{ stationId: OTHER, _count: { _all: 2 } }]);
    const { items } = await service.list();
    expect(prisma.swapStation.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
    expect(items[0]).toMatchObject({ id: ID, active: true, thingName: `station-${ID}`, batteriesInStation: 3, openSwaps: 0, depotIds: ['depot-1'] });
    expect(items[1]).toMatchObject({ id: OTHER, active: false, thingName: 'station-aaaaaaaa-0000-4000-8000-000000000009', batteriesInStation: 0, openSwaps: 2, depotIds: [] });
    expect(JSON.stringify(items)).not.toContain('vst1');
  });
});

describe('SwapStationsService.create', () => {
  it('cria com QR assinado (o mesmo do script), sem baterias, e grava AuditLog sem o código', async () => {
    const { service, prisma, audit } = setup();
    const out = await service.create(operacao, input() as any);
    const data = (prisma.swapStation.create.mock.calls[0][0] as any).data;
    // Fix M4: thing efetiva gravada (padrão station-{id}), coberta pelo índice único.
    expect(data).toMatchObject({ name: 'Estação Nova', totalSlots: 8, availableBatteries: 0, active: true, open24h: false, thingName: `station-${data.id}` });
    expect(verifyStationCode(data.stationCode, SECRET)).toEqual({ stationId: data.id });
    expect(out).toMatchObject({ id: data.id, thingName: `station-${data.id}`, totalSlots: 8 });
    expect(out).not.toHaveProperty('stationCode');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'swap_station.create', entityType: 'SwapStation', entityId: data.id }), prisma);
    expect(JSON.stringify(audit.record.mock.calls)).not.toContain(data.stationCode);
  });

  it('24 h sem texto → "Todos os dias, 24 h"; sem horário e sem 24 h → 400; nome em branco → 400', async () => {
    const { service, prisma } = setup();
    await service.create(operacao, input({ openingHours: undefined, open24h: true }) as any);
    expect((prisma.swapStation.create.mock.calls[0][0] as any).data.openingHours).toBe(OPEN_24H_TEXT);
    expect(await problem(service.create(operacao, input({ openingHours: '  ' }) as any))).toMatchObject({ status: 400, fields: ['openingHours'] });
    expect(await problem(service.create(operacao, input({ name: '   ' }) as any))).toMatchObject({ status: 400, fields: ['name'] });
  });

  it('thingName de outra estação → 409 thing-name-taken; corrida no índice único também', async () => {
    const thing = 'station-aaaaaaaa-0000-4000-8000-000000000009';
    const { service, prisma } = setup({ thingOwner: { id: OTHER } });
    expect(await problem(service.create(operacao, input({ thingName: thing }) as any))).toMatchObject({ status: 409, slug: 'thing-name-taken' });
    const where = (prisma.swapStation.findFirst.mock.calls[0][0] as any).where;
    // Confere também a convenção station-{id} de uma estação sem thingName gravado.
    expect(where.OR).toEqual([{ thingName: thing }, { id: 'aaaaaaaa-0000-4000-8000-000000000009', thingName: null }]);

    prisma.swapStation.findFirst.mockResolvedValue(null);
    prisma.swapStation.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x', meta: { target: ['thingName'] } }));
    expect(await problem(service.create(operacao, input({ thingName: thing }) as any))).toMatchObject({ status: 409, slug: 'thing-name-taken' });
  });
});

describe('SwapStationsService.update', () => {
  it('inexistente → 404', async () => {
    const { service } = setup({ current: null });
    expect(await problem(service.update(operacao, ID, { name: 'X' } as any))).toMatchObject({ status: 404 });
  });

  it('campos ausentes não mudam; trava a linha da estação e grava AuditLog com os nomes dos campos', async () => {
    const { service, prisma, audit } = setup();
    const out = await service.update(operacao, ID, { name: ' Estação A2 ', lat: -23.6 } as any);
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect((prisma.swapStation.update.mock.calls[0][0] as any).data).toEqual({ name: 'Estação A2', lat: -23.6 });
    expect(out).toMatchObject({ name: 'Estação A2', lat: -23.6 });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'swap_station.update', metadata: { fields: ['name', 'lat'] } }), prisma);
  });

  it('totalSlots abaixo das baterias na estação (maior entre o contador e as in_station) → 422 slots-below-stock', async () => {
    const { service } = setup({ current: { availableBatteries: 4 }, inStation: 6 });
    expect(await problem(service.update(operacao, ID, { totalSlots: 5 } as any))).toMatchObject({ status: 422, slug: 'slots-below-stock' });
    expect(await service.update(operacao, ID, { totalSlots: 6 } as any)).toMatchObject({ totalSlots: 6 });
    const counter = setup({ current: { availableBatteries: 7 }, inStation: 2 });
    expect(await problem(counter.service.update(operacao, ID, { totalSlots: 6 } as any))).toMatchObject({ status: 422, slug: 'slots-below-stock' });
  });

  it('desativar com troca em andamento → 409 station-swap-in-progress; sem troca desativa', async () => {
    const busy = setup({ openSwaps: 1 });
    expect(await problem(busy.service.update(operacao, ID, { active: false } as any))).toMatchObject({ status: 409, slug: 'station-swap-in-progress' });
    expect(busy.prisma.swapStation.update).not.toHaveBeenCalled();
    // Edição comum (sem desativar nem trocar o armário) não depende das trocas.
    expect(await busy.service.update(operacao, ID, { name: 'Outra' } as any)).toMatchObject({ name: 'Outra' });
    const idle = setup();
    expect(await idle.service.update(operacao, ID, { active: false } as any)).toMatchObject({ active: false });
  });

  it('trocar o thingName: com troca em andamento → 409; de outra estação → 409; livre → grava', async () => {
    const thing = 'station-aaaaaaaa-0000-4000-8000-000000000009';
    expect(await problem(setup({ openSwaps: 1 }).service.update(operacao, ID, { thingName: thing } as any))).toMatchObject({ status: 409, slug: 'station-swap-in-progress' });
    expect(await problem(setup({ thingOwner: { id: OTHER } }).service.update(operacao, ID, { thingName: thing } as any))).toMatchObject({ status: 409, slug: 'thing-name-taken' });
    const free = setup();
    expect(await free.service.update(operacao, ID, { thingName: thing } as any)).toMatchObject({ thingName: thing });
    // O próprio station-{id} (sem mudança efetiva) não confere trocas nem dono.
    const same = setup({ openSwaps: 3 });
    await same.service.update(operacao, ID, { thingName: `station-${ID}` } as any);
    expect(same.prisma.stationSwap.count).not.toHaveBeenCalled();
    expect((same.prisma.swapStation.update.mock.calls[0][0] as any).data).toEqual({});
  });

  it('fix M2: desmarcar 24 h mantendo o texto padrão de 24 h → 400; com horário novo → grava', async () => {
    const h24 = { open24h: true, openingHours: OPEN_24H_TEXT };
    expect(await problem(setup({ current: h24 }).service.update(operacao, ID, { open24h: false } as any))).toMatchObject({ status: 400, fields: ['openingHours'] });
    expect(await problem(setup({ current: h24 }).service.update(operacao, ID, { open24h: false, openingHours: OPEN_24H_TEXT } as any))).toMatchObject({ status: 400 });
    const ok = setup({ current: h24 });
    await ok.service.update(operacao, ID, { open24h: false, openingHours: 'Seg a sex, 7h às 20h' } as any);
    expect((ok.prisma.swapStation.update.mock.calls[0][0] as any).data).toEqual({ open24h: false, openingHours: 'Seg a sex, 7h às 20h' });
  });

  it('fix M6: desativar decide pelo estado relido sob o lock (já inativa sob o lock → não confere trocas)', async () => {
    const ctx = setup({ openSwaps: 2 });
    ctx.prisma.swapStation.findUnique.mockResolvedValueOnce(row() as any).mockResolvedValueOnce(row({ active: false }) as any);
    await ctx.service.update(operacao, ID, { active: false } as any);
    expect(ctx.prisma.stationSwap.count).not.toHaveBeenCalled();
  });

  it('horário: limpar sem 24 h → 400; ligar 24 h mantém o texto; 24 h com texto vazio → texto padrão', async () => {
    expect(await problem(setup().service.update(operacao, ID, { openingHours: '' } as any))).toMatchObject({ status: 400, fields: ['openingHours'] });
    const on = setup();
    await on.service.update(operacao, ID, { open24h: true } as any);
    expect((on.prisma.swapStation.update.mock.calls[0][0] as any).data).toEqual({ open24h: true });
    const blank = setup();
    await blank.service.update(operacao, ID, { open24h: true, openingHours: '' } as any);
    expect((blank.prisma.swapStation.update.mock.calls[0][0] as any).data).toEqual({ open24h: true, openingHours: OPEN_24H_TEXT });
  });
});
