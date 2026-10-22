import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { signStationCode, verifyStationCode } from './station-code';
import { issueStationCodes, parseIssueArgs } from './station-qr';

const A = 'd0000000-0000-4000-8000-000000000001';
const B = 'd0000000-0000-4000-8000-000000000002';

function db(rows: Array<{ id: string; name: string; stationCode: string | null }>) {
  const prisma = mockDeep<PrismaClient>();
  prisma.swapStation.findMany.mockImplementation((async (a: any) => rows.filter((r) => !a?.where?.id?.in || a.where.id.in.includes(r.id))) as any);
  prisma.swapStation.update.mockImplementation((async (a: any) => {
    const r = rows.find((x) => x.id === a.where.id)!;
    r.stationCode = a.data.stationCode;
    return r;
  }) as any);
  return { prisma, rows };
}

describe('emissão do QR das estações (fix 1, I6: script de operação, fora do seed)', () => {
  it('emite só para quem não tem código; mantém os existentes', async () => {
    const { prisma, rows } = db([{ id: A, name: 'A', stationCode: null }, { id: B, name: 'B', stationCode: 'vst1.antigo' }]);
    const out = await issueStationCodes(prisma as any, { secret: 's' });
    expect(out).toEqual([
      { id: A, name: 'A', stationCode: signStationCode(A, 's'), issued: true },
      { id: B, name: 'B', stationCode: 'vst1.antigo', issued: false },
    ]);
    expect(rows[0].stationCode).toBe(signStationCode(A, 's'));
    expect(prisma.swapStation.update).toHaveBeenCalledTimes(1);
  });

  it('--reissue regrava todos com o segredo atual (revogação); --station filtra', async () => {
    const { prisma, rows } = db([{ id: A, name: 'A', stationCode: signStationCode(A, 'velho') }, { id: B, name: 'B', stationCode: null }]);
    const out = await issueStationCodes(prisma as any, { secret: 'novo', reissue: true, stationIds: [A] });
    expect(out.map((o) => o.id)).toEqual([A]);
    expect(verifyStationCode(rows[0].stationCode!, 'novo')).toEqual({ stationId: A });
    expect(rows[1].stationCode).toBeNull();
  });

  it('argumentos da linha de comando', () => {
    expect(parseIssueArgs([])).toEqual({ reissue: false, stationIds: [] });
    expect(parseIssueArgs(['--reissue', `--station=${A}`, `--station=${B.toUpperCase()}`])).toEqual({ reissue: true, stationIds: [A, B] });
    expect(() => parseIssueArgs(['--station=abc'])).toThrow(/--station/);
    expect(() => parseIssueArgs(['--tudo'])).toThrow(/desconhecido/);
  });
});
