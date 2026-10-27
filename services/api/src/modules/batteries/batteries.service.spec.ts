import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { ProblemException } from '../../common/problem';
import type { Principal } from '../auth/principal';
import { BatteriesService } from './batteries.service';

const DEPOT = 'd0000000-0000-4000-8000-0000000000d1';
const DEPOT2 = 'd0000000-0000-4000-8000-0000000000d2';
const STATION = 'e0000000-0000-4000-8000-0000000000e1';
const BAT = 'b0000000-0000-4000-8000-0000000000b1';
const campo: Principal = { pool: 'staff', sub: 'c', email: 'c@volti.com.br', groups: ['campo'], userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', staffId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' } as Principal;

const admin: Principal = { pool: 'staff', sub: 'a', email: 'a@volti.com.br', groups: ['operacao'], userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', staffId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } as Principal;
const OTHER = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const row = (o: Record<string, unknown> = {}) => ({
  id: BAT, serial: 'BT-1', chargePct: 40, cycleCount: 3, status: 'charging', vehicleId: null, holderId: null, stationId: null, depotId: DEPOT,
  createdAt: new Date(), updatedAt: new Date(), ...o,
}) as any;

async function problem(p: Promise<unknown>): Promise<{ status: number; slug: string }> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ProblemException) return { status: e.getStatus(), slug: e.slug };
    throw e;
  }
  throw new Error('esperava erro');
}

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  prisma.battery.updateMany.mockResolvedValue({ count: 1 });
  prisma.battery.findMany.mockResolvedValue([]);
  prisma.battery.update.mockImplementation((async (a: any) => row({ ...a.data, id: a.where.id })) as any);
  prisma.depot.findUnique.mockResolvedValue({ id: DEPOT, active: true } as any);
  prisma.depot.findMany.mockResolvedValue([{ id: DEPOT }] as any);
  (prisma.battery.groupBy as any).mockResolvedValue([] as any);
  const stock = { check: jest.fn().mockResolvedValue(undefined) };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  return { service: new BatteriesService(prisma as any, stock as any, audit as any), prisma, stock, audit };
}

const movementsOf = (prisma: ReturnType<typeof setup>['prisma']) => prisma.batteryMovement.createMany.mock.calls.flatMap((c: any) => c[0].data);

describe('BatteriesService — cadastro', () => {
  it('cadastra `charged` (carga 100) no galpão e grava a primeira movimentação sem origem', async () => {
    const { service, prisma, audit } = setup();
    prisma.battery.findUnique.mockResolvedValue(null);
    prisma.battery.create.mockImplementation((async (a: any) => row({ ...a.data, id: BAT })) as any);
    const b = await service.create(campo, { serial: ' BT-9 ', status: 'charged', depotId: DEPOT, chargePct: 30 });
    expect(audit.record.mock.calls.map((c: any[]) => c[0])).toEqual([expect.objectContaining({ actor: campo, action: 'battery.create', entityType: 'Battery', entityId: BAT, metadata: expect.objectContaining({ serial: 'BT-9' }) })]);
    expect(prisma.battery.create).toHaveBeenCalledWith({ data: { serial: 'BT-9', status: 'charged', depotId: DEPOT, chargePct: 100 } });
    expect(b).toMatchObject({ status: 'charged', depotId: DEPOT, chargePct: 100 });
    expect(movementsOf(prisma)).toEqual([expect.objectContaining({ batteryId: BAT, fromStatus: null, toStatus: 'charged', depotId: DEPOT, actorId: campo.userId })]);
  });

  it('`charging` usa a carga informada (padrão 0)', async () => {
    const { service, prisma } = setup();
    prisma.battery.findUnique.mockResolvedValue(null);
    prisma.battery.create.mockImplementation((async (a: any) => row({ ...a.data })) as any);
    await service.create(campo, { serial: 'BT-9', status: 'charging', depotId: DEPOT });
    expect(prisma.battery.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ status: 'charging', chargePct: 0 }) });
    await service.create(campo, { serial: 'BT-8', status: 'charging', depotId: DEPOT, chargePct: 55 });
    expect(prisma.battery.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ chargePct: 55 }) });
  });

  it('série duplicada → 409; galpão inexistente → 404', async () => {
    const { service, prisma } = setup();
    prisma.battery.findUnique.mockResolvedValue(row());
    expect(await problem(service.create(campo, { serial: 'BT-1', status: 'charged', depotId: DEPOT }))).toEqual({ status: 409, slug: 'conflict' });
    prisma.battery.findUnique.mockResolvedValue(null);
    prisma.depot.findUnique.mockResolvedValue(null);
    expect(await problem(service.create(campo, { serial: 'BT-2', status: 'charged', depotId: DEPOT }))).toEqual({ status: 404, slug: 'not-found' });
  });
});

describe('BatteriesService — mark-charged', () => {
  it('`charging → charged` com carga 100, mantém o galpão, grava movimentação', async () => {
    const { service, prisma, audit } = setup();
    prisma.battery.findUnique.mockResolvedValueOnce(row()).mockResolvedValueOnce(row()).mockResolvedValueOnce(row({ status: 'charged', chargePct: 100 }));
    const b = await service.markCharged(campo, BAT);
    expect(audit.record.mock.calls.map((c: any[]) => c[0])).toEqual([expect.objectContaining({ action: 'battery.mark_charged', entityType: 'Battery', entityId: BAT })]);
    expect(prisma.battery.updateMany).toHaveBeenCalledWith({ where: { id: BAT, status: 'charging' }, data: { status: 'charged', chargePct: 100 } });
    expect(b).toMatchObject({ status: 'charged', chargePct: 100 });
    expect(movementsOf(prisma)).toEqual([expect.objectContaining({ fromStatus: 'charging', toStatus: 'charged', depotId: DEPOT })]);
  });

  it.each(['charged', 'in_van', 'in_vehicle', 'in_station', 'defective', 'retired'])('de `%s` → 409', async (status) => {
    const { service, prisma, audit } = setup();
    prisma.battery.findUnique.mockResolvedValue(row({ status }));
    expect(await problem(service.markCharged(campo, BAT))).toEqual({ status: 409, slug: 'conflict' });
    expect(prisma.batteryMovement.createMany).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('corrida (status mudou entre a leitura e a escrita) → 409; inexistente → 404', async () => {
    const { service, prisma } = setup();
    prisma.battery.findUnique.mockResolvedValue(row());
    prisma.battery.updateMany.mockResolvedValue({ count: 0 });
    expect(await problem(service.markCharged(campo, BAT))).toEqual({ status: 409, slug: 'conflict' });
    prisma.battery.findUnique.mockResolvedValue(null);
    expect(await problem(service.markCharged(campo, BAT))).toEqual({ status: 404, slug: 'not-found' });
  });
});

describe('BatteriesService — fix 1: estação e checagem de estoque best-effort', () => {
  it('mark-charged de bateria carregando na estação (sem galpão) → `in_station` e volta a contar como disponível', async () => {
    const { service, prisma } = setup();
    const atStation = row({ status: 'charging', depotId: null, stationId: STATION, chargePct: 15 });
    prisma.battery.findUnique.mockResolvedValueOnce(atStation).mockResolvedValueOnce(atStation).mockResolvedValueOnce(row({ status: 'in_station', depotId: null, stationId: STATION, chargePct: 100 }));
    const b = await service.markCharged(campo, BAT);
    expect(prisma.battery.updateMany).toHaveBeenCalledWith({ where: { id: BAT, status: 'charging' }, data: { status: 'in_station', chargePct: 100 } });
    expect(prisma.swapStation.update).toHaveBeenCalledWith({ where: { id: STATION }, data: { availableBatteries: { increment: 1 } } });
    expect(movementsOf(prisma)).toEqual([expect.objectContaining({ fromStatus: 'charging', toStatus: 'in_station', stationId: STATION })]);
    expect(b).toMatchObject({ status: 'in_station', chargePct: 100 });
  });

  it('falha na checagem do estoque depois do commit não vira erro: a transição responde com a bateria', async () => {
    const { service, prisma, stock } = setup();
    stock.check.mockRejectedValue(new Error('banco fora'));
    prisma.battery.findUnique.mockResolvedValue(row({ status: 'charged' }));
    await expect(service.reportDefect(campo, BAT, 'Inchada')).resolves.toMatchObject({ id: BAT });
    await expect(service.retire(campo, BAT)).resolves.toMatchObject({ id: BAT });
    expect(stock.check).toHaveBeenCalled();
  });

  it('falha na checagem do estoque depois do commit não vira erro: carregar a van responde com o estoque', async () => {
    const { service, prisma, stock } = setup();
    stock.check.mockRejectedValue(new Error('banco fora'));
    prisma.battery.findMany.mockResolvedValueOnce([row({ serial: 'BT-A', status: 'charged' })]).mockResolvedValue([]);
    await expect(service.load(campo, ['BT-A'])).resolves.toMatchObject({ operatorId: campo.userId });
    expect(stock.check).toHaveBeenCalledWith([DEPOT]);
  });
});

describe('BatteriesService — defeito', () => {
  it.each([
    ['charging', {}],
    ['charged', {}],
    ['in_van', { holderId: campo.userId, depotId: null }],
    ['in_station', { stationId: STATION, depotId: null, chargePct: 30 }],
  ])('de `%s` → `defective` com motivo na movimentação', async (status, extra) => {
    const { service, prisma, audit } = setup();
    prisma.battery.findUnique.mockResolvedValueOnce(row({ status, ...extra })).mockResolvedValueOnce(row({ status: 'defective', ...extra }));
    await service.reportDefect(campo, BAT, 'Carcaça trincada');
    expect(audit.record.mock.calls.map((c: any[]) => c[0])).toEqual([expect.objectContaining({ action: 'battery.defect', reason: 'Carcaça trincada', metadata: expect.objectContaining({ from: status, to: 'defective' }) })]);
    expect(prisma.battery.updateMany).toHaveBeenCalledWith({ where: { id: BAT, status }, data: { status: 'defective' } });
    expect(movementsOf(prisma)).toEqual([expect.objectContaining({ fromStatus: status, toStatus: 'defective', reason: 'Carcaça trincada', actorId: campo.userId })]);
  });

  it('instalada numa moto → 409 (retirar antes); já com defeito ou baixada → 409', async () => {
    const { service, prisma } = setup();
    for (const status of ['in_vehicle', 'defective', 'retired']) {
      prisma.battery.findUnique.mockResolvedValue(row({ status }));
      expect(await problem(service.reportDefect(campo, BAT, 'x'.repeat(5)))).toEqual({ status: 409, slug: 'conflict' });
    }
    expect(prisma.battery.updateMany).not.toHaveBeenCalled();
  });

  it('carregada na estação deixa de contar como disponível; descarregada não mexe na estação', async () => {
    const { service, prisma } = setup();
    prisma.battery.findUnique.mockResolvedValue(row({ status: 'in_station', stationId: STATION, depotId: null, chargePct: 95 }));
    await service.reportDefect(campo, BAT, 'Não carrega');
    expect(prisma.swapStation.updateMany).toHaveBeenCalledWith({ where: { id: STATION, availableBatteries: { gt: 0 } }, data: { availableBatteries: { decrement: 1 } } });
    prisma.swapStation.updateMany.mockClear();
    prisma.battery.findUnique.mockResolvedValue(row({ status: 'in_station', stationId: STATION, depotId: null, chargePct: 20 }));
    await service.reportDefect(campo, BAT, 'Não carrega');
    expect(prisma.swapStation.updateMany).not.toHaveBeenCalled();
  });

  it('saída de `charged` confere o estoque mínimo do galpão', async () => {
    const { service, prisma, stock } = setup();
    prisma.battery.findUnique.mockResolvedValue(row({ status: 'charged' }));
    await service.reportDefect(campo, BAT, 'Inchada');
    expect(stock.check).toHaveBeenCalledWith([DEPOT]);
  });
});

describe('BatteriesService — baixa', () => {
  it.each(['defective', 'charging', 'charged'])('de `%s` → `retired`, sai da van/estação e mantém o galpão', async (status) => {
    const { service, prisma, audit } = setup();
    prisma.battery.findUnique.mockResolvedValue(row({ status }));
    await service.retire(campo, BAT, 'Fim da vida útil');
    expect(audit.record.mock.calls.map((c: any[]) => c[0])).toEqual([expect.objectContaining({ action: 'battery.retire', reason: 'Fim da vida útil', entityId: BAT })]);
    expect(prisma.battery.updateMany).toHaveBeenCalledWith({ where: { id: BAT, status }, data: { status: 'retired', holderId: null, stationId: null } });
    expect(movementsOf(prisma)).toEqual([expect.objectContaining({ fromStatus: status, toStatus: 'retired', depotId: DEPOT, reason: 'Fim da vida útil' })]);
  });

  it.each(['in_vehicle', 'in_van', 'in_station', 'retired'])('de `%s` → 409', async (status) => {
    const { service, prisma } = setup();
    prisma.battery.findUnique.mockResolvedValue(row({ status }));
    expect(await problem(service.retire(campo, BAT))).toEqual({ status: 409, slug: 'conflict' });
  });

  it('baixa de uma `charged` confere o estoque; de `charging` não', async () => {
    const { service, prisma, stock } = setup();
    prisma.battery.findUnique.mockResolvedValue(row({ status: 'charging' }));
    await service.retire(campo, BAT);
    expect(stock.check).not.toHaveBeenCalled();
    prisma.battery.findUnique.mockResolvedValue(row({ status: 'charged' }));
    await service.retire(campo, BAT);
    expect(stock.check).toHaveBeenLastCalledWith([DEPOT]);
  });
});

describe('BatteriesService — van', () => {
  it('descarregar sem estação nem galpão usa o único galpão ativo e grava `charging` com `depotId`', async () => {
    const { service, prisma } = setup();
    const inVan = row({ status: 'in_van', holderId: campo.userId, depotId: null });
    prisma.battery.findMany.mockResolvedValueOnce([inVan]).mockResolvedValue([]);
    await service.unload(campo, ['BT-1']);
    expect(prisma.depot.findMany).toHaveBeenCalledWith({ where: { active: true }, select: { id: true }, take: 2 });
    expect(prisma.battery.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [BAT] }, status: 'in_van', holderId: campo.userId },
      data: { holderId: null, status: 'charging', stationId: null, depotId: DEPOT },
    });
    expect(movementsOf(prisma)).toEqual([expect.objectContaining({ fromStatus: 'in_van', toStatus: 'charging', depotId: DEPOT })]);
  });

  it('com `depotId` no corpo usa esse galpão (inexistente → 404, inativo → 422)', async () => {
    const { service, prisma } = setup();
    prisma.battery.findMany.mockResolvedValue([row({ status: 'in_van', holderId: campo.userId, depotId: null })]);
    prisma.depot.findUnique.mockResolvedValue({ id: DEPOT2, active: true } as any);
    await service.unload(campo, ['BT-1'], undefined, DEPOT2);
    expect(prisma.battery.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ depotId: DEPOT2 }) }));
    prisma.depot.findUnique.mockResolvedValue(null);
    expect(await problem(service.unload(campo, ['BT-1'], undefined, DEPOT2))).toEqual({ status: 404, slug: 'not-found' });
    prisma.depot.findUnique.mockResolvedValue({ id: DEPOT2, active: false } as any);
    expect(await problem(service.unload(campo, ['BT-1'], undefined, DEPOT2))).toEqual({ status: 422, slug: 'depot-inactive' });
  });

  it('sem `depotId` e com mais de um (ou nenhum) galpão ativo → 422 `depot-required`', async () => {
    const { service, prisma } = setup();
    prisma.battery.findMany.mockResolvedValue([row({ status: 'in_van', holderId: campo.userId, depotId: null })]);
    prisma.depot.findMany.mockResolvedValue([{ id: DEPOT }, { id: DEPOT2 }] as any);
    expect(await problem(service.unload(campo, ['BT-1']))).toEqual({ status: 422, slug: 'depot-required' });
    prisma.depot.findMany.mockResolvedValue([]);
    expect(await problem(service.unload(campo, ['BT-1']))).toEqual({ status: 422, slug: 'depot-required' });
    expect(prisma.battery.updateMany).not.toHaveBeenCalled();
  });

  it('bateria fora da van do usuário → 409 antes de escolher o galpão (compatível com o contrato v2)', async () => {
    const { service, prisma } = setup();
    prisma.battery.findMany.mockResolvedValue([row({ status: 'in_station', stationId: STATION, depotId: null })]);
    prisma.depot.findMany.mockResolvedValue([{ id: DEPOT }, { id: DEPOT2 }] as any);
    expect(await problem(service.unload(campo, ['BT-1']))).toEqual({ status: 409, slug: 'conflict' });
  });

  it('descarregar na estação: `in_station` sem galpão, movimentação com a estação', async () => {
    const { service, prisma } = setup();
    prisma.swapStation.findUnique.mockResolvedValue({ id: STATION } as any);
    prisma.battery.findMany.mockResolvedValueOnce([row({ status: 'in_van', holderId: campo.userId, depotId: null, chargePct: 100 })]).mockResolvedValue([]);
    await service.unload(campo, ['BT-1'], STATION);
    expect(prisma.battery.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { holderId: null, status: 'in_station', stationId: STATION, depotId: null } }));
    expect(movementsOf(prisma)).toEqual([expect.objectContaining({ fromStatus: 'in_van', toStatus: 'in_station', stationId: STATION })]);
    expect(prisma.depot.findMany).not.toHaveBeenCalled();
  });

  it('carregar: `charged` sai do galpão (confere estoque), `charging` volta em `loadedChargingSerials`, série nova é cadastrada', async () => {
    const { service, prisma, stock } = setup();
    const charged = row({ id: 'b1', serial: 'BT-A', status: 'charged', chargePct: 100 });
    const charging = row({ id: 'b2', serial: 'BT-B', status: 'charging', chargePct: 60, depotId: DEPOT2 });
    prisma.battery.findMany.mockResolvedValueOnce([charged, charging]).mockResolvedValue([]);
    prisma.battery.create.mockImplementation((async (a: any) => row({ ...a.data, id: 'b3' })) as any);
    const res = await service.load(campo, ['BT-A', 'BT-B', 'BT-C']);
    // 2026-10-26: cada existente sai do estado lido (guarda no `where`), sem upsert; a nova é cadastrada.
    expect(prisma.battery.upsert).not.toHaveBeenCalled();
    expect(prisma.battery.updateMany).toHaveBeenCalledWith({ where: { id: 'b1', status: 'charged' }, data: { status: 'in_van', holderId: campo.userId, stationId: null, vehicleId: null, depotId: null } });
    expect(prisma.battery.updateMany).toHaveBeenCalledWith({ where: { id: 'b2', status: 'charging' }, data: { status: 'in_van', holderId: campo.userId, stationId: null, vehicleId: null, depotId: null } });
    expect(prisma.battery.create).toHaveBeenCalledWith({ data: { serial: 'BT-C', chargePct: 100, status: 'in_van', holderId: campo.userId } });
    expect(res.loadedChargingSerials).toEqual(['BT-B']);
    const mv = movementsOf(prisma);
    expect(mv).toEqual(expect.arrayContaining([
      expect.objectContaining({ batteryId: 'b1', fromStatus: 'charged', toStatus: 'in_van', depotId: DEPOT }),
      expect.objectContaining({ batteryId: 'b2', fromStatus: 'charging', toStatus: 'in_van', depotId: DEPOT2 }),
      expect.objectContaining({ batteryId: 'b3', fromStatus: null, toStatus: 'in_van' }),
    ]));
    expect(stock.check).toHaveBeenCalledWith([DEPOT]);
  });

  it('carregar só `charged`: sem `loadedChargingSerials`', async () => {
    const { service, prisma } = setup();
    prisma.battery.findMany.mockResolvedValueOnce([row({ serial: 'BT-A', status: 'charged' })]).mockResolvedValue([]);
    expect(await service.load(campo, ['BT-A'])).not.toHaveProperty('loadedChargingSerials');
  });

  it('carregar bateria com defeito ou baixada → 409', async () => {
    const { service, prisma } = setup();
    for (const status of ['defective', 'retired', 'in_vehicle']) {
      prisma.battery.findMany.mockResolvedValueOnce([row({ status })]);
      expect(await problem(service.load(campo, ['BT-1']))).toEqual({ status: 409, slug: 'conflict' });
    }
    expect(prisma.battery.upsert).not.toHaveBeenCalled();
    expect(prisma.battery.updateMany).not.toHaveBeenCalled();
  });

  it('2026-10-26: carregar bateria da van de outro operador → 409 battery-in-other-van, nada gravado (vale também para admin)', async () => {
    const { service, prisma } = setup();
    for (const who of [campo, admin]) {
      prisma.battery.findMany.mockResolvedValueOnce([row({ serial: 'BT-A', status: 'in_van', holderId: OTHER, depotId: null })]);
      expect(await problem(service.load(who, ['BT-A', 'BT-NOVA']))).toEqual({ status: 409, slug: 'battery-in-other-van' });
    }
    expect(prisma.battery.updateMany).not.toHaveBeenCalled();
    expect(prisma.battery.create).not.toHaveBeenCalled();
    expect(prisma.batteryMovement.createMany).not.toHaveBeenCalled();
  });

  it('2026-10-26: campo tirando bateria de uma estação → 409 battery-at-station, estação intocada', async () => {
    const { service, prisma } = setup();
    prisma.battery.findMany.mockResolvedValueOnce([row({ serial: 'BT-S', status: 'in_station', stationId: STATION, depotId: null, chargePct: 100 })]);
    expect(await problem(service.load(campo, ['BT-S']))).toEqual({ status: 409, slug: 'battery-at-station' });
    expect(prisma.swapStation.updateMany).not.toHaveBeenCalled();
    expect(prisma.battery.updateMany).not.toHaveBeenCalled();
  });

  it('2026-10-26: operação tira da estação (sai das disponíveis), com a estação lida no `where`', async () => {
    const { service, prisma } = setup();
    prisma.battery.findMany.mockResolvedValueOnce([row({ id: 'bs', serial: 'BT-S', status: 'in_station', stationId: STATION, depotId: null, chargePct: 100 })]).mockResolvedValue([]);
    await service.load(admin, ['BT-S']);
    expect(prisma.battery.updateMany).toHaveBeenCalledWith({ where: { id: 'bs', status: 'in_station', stationId: STATION }, data: expect.objectContaining({ status: 'in_van', holderId: admin.userId, stationId: null }) });
    expect(prisma.swapStation.updateMany).toHaveBeenCalledWith({ where: { id: STATION, availableBatteries: { gt: 0 } }, data: { availableBatteries: { decrement: 1 } } });
  });

  it('2026-10-26: `chargePct` só vale na criação — bateria existente mantém a carga gravada', async () => {
    const { service, prisma } = setup();
    prisma.battery.findMany.mockResolvedValueOnce([row({ id: 'b1', serial: 'BT-A', status: 'charged', chargePct: 100 })]).mockResolvedValue([]);
    prisma.battery.create.mockImplementation((async (a: any) => row({ ...a.data, id: 'b2' })) as any);
    await service.load(campo, ['BT-A', 'BT-NOVA'], 10);
    const upd = prisma.battery.updateMany.mock.calls.find((c: any) => c[0].where.id === 'b1')![0] as any;
    expect(upd.data).not.toHaveProperty('chargePct');
    expect(prisma.battery.create).toHaveBeenCalledWith({ data: { serial: 'BT-NOVA', chargePct: 10, status: 'in_van', holderId: campo.userId } });
  });

  it('2026-10-26: bateria já na própria van é recarregada sem erro; corrida (estado mudou) → 409', async () => {
    const { service, prisma } = setup();
    prisma.battery.findMany.mockResolvedValueOnce([row({ id: 'b1', serial: 'BT-A', status: 'in_van', holderId: campo.userId, depotId: null })]).mockResolvedValue([]);
    await service.load(campo, ['BT-A']);
    expect(prisma.battery.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'b1', status: 'in_van', holderId: campo.userId } }));
    prisma.battery.findMany.mockResolvedValueOnce([row({ id: 'b1', serial: 'BT-A', status: 'charged' })]);
    prisma.battery.updateMany.mockResolvedValue({ count: 0 });
    expect(await problem(service.load(campo, ['BT-A']))).toEqual({ status: 409, slug: 'conflict' });
  });
});

describe('BatteriesService — consulta', () => {
  it('lista por galpão e status e traz a contagem por status (ignorando o filtro de status)', async () => {
    const { service, prisma } = setup();
    (prisma.battery.groupBy as any).mockResolvedValue([{ status: 'charged', _count: { _all: 4 } }, { status: 'defective', _count: { _all: 1 } }] as any);
    const page = await service.list(campo, { depotId: DEPOT, status: 'charged' });
    expect(prisma.battery.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { depotId: DEPOT, status: 'charged' } }));
    expect(prisma.battery.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ['status'], where: { depotId: DEPOT } }));
    expect(page.statusCounts).toEqual({ in_vehicle: 0, in_van: 0, charging: 0, charged: 4, in_station: 0, defective: 1, retired: 0 });
  });

  it('2026-10-26: campo listando baterias com `holderId` de outra pessoa → 403 (mesma regra do vanStock)', async () => {
    const { service, prisma } = setup();
    expect(await problem(service.list(campo, { holderId: OTHER }))).toEqual({ status: 403, slug: 'forbidden' });
    expect(prisma.battery.findMany).not.toHaveBeenCalled();
    await service.list(campo, { holderId: 'me' });
    await service.list(campo, { holderId: campo.userId });
    expect(prisma.battery.findMany.mock.calls.map((c: any) => c[0].where)).toEqual([{ holderId: campo.userId }, { holderId: campo.userId }]);
    await service.list(admin, { holderId: OTHER });
    expect((prisma.battery.findMany.mock.calls.at(-1)![0] as any).where).toEqual({ holderId: OTHER });
  });

  it('movimentações: mais recente primeiro; bateria inexistente → 404', async () => {
    const { service, prisma } = setup();
    prisma.battery.findUnique.mockResolvedValue(row());
    prisma.batteryMovement.findMany.mockResolvedValue([
      { id: 'm2', batteryId: BAT, fromStatus: 'charging', toStatus: 'charged', depotId: DEPOT, stationId: null, vehicleId: null, actorId: campo.userId, reason: null, at: new Date('2026-10-24T12:00:00Z') },
    ] as any);
    const page = await service.movements(BAT, {});
    expect(prisma.batteryMovement.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { batteryId: BAT }, orderBy: [{ at: 'desc' }, { id: 'desc' }] }));
    expect(page.items[0]).toEqual({ id: 'm2', batteryId: BAT, fromStatus: 'charging', toStatus: 'charged', depotId: DEPOT, actorId: campo.userId, at: '2026-10-24T12:00:00.000Z' });
    prisma.battery.findUnique.mockResolvedValue(null);
    expect(await problem(service.movements(BAT, {}))).toEqual({ status: 404, slug: 'not-found' });
  });
});
