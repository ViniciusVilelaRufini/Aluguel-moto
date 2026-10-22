import type { PrismaClient } from '@prisma/client';
import { signStationCode } from './station-code';

/**
 * Emissão do QR fixo das estações (fix 1, I6): usada pelo script de operação `pnpm --filter api stations:qr`
 * (`src/cli/issue-station-qr.ts`; em produção `node dist/cli/issue-station-qr.js` numa task avulsa) e pela rota do admin.
 * Sem `--reissue`, só emite para quem ainda não tem código; `--reissue` regrava todos com o segredo atual (revogação depois de
 * trocar o `STATION_QR_SECRET`: os QR antigos param de valer, imprima e cole os novos).
 */
export interface IssueOptions {
  secret: string;
  reissue?: boolean;
  /** Só estas estações (vazio = todas). */
  stationIds?: string[];
}

export interface IssuedCode {
  id: string;
  name: string;
  stationCode: string;
  /** `true` quando o código foi gravado agora. */
  issued: boolean;
}

export async function issueStationCodes(prisma: Pick<PrismaClient, 'swapStation'>, opts: IssueOptions): Promise<IssuedCode[]> {
  const where = opts.stationIds?.length ? { id: { in: opts.stationIds } } : {};
  const stations = await prisma.swapStation.findMany({ where, orderBy: { name: 'asc' }, select: { id: true, name: true, stationCode: true } });
  const out: IssuedCode[] = [];
  for (const s of stations) {
    if (s.stationCode && !opts.reissue) {
      out.push({ id: s.id, name: s.name, stationCode: s.stationCode, issued: false });
      continue;
    }
    const code = signStationCode(s.id, opts.secret);
    const issued = s.stationCode !== code;
    if (issued) await prisma.swapStation.update({ where: { id: s.id }, data: { stationCode: code } });
    out.push({ id: s.id, name: s.name, stationCode: code, issued });
  }
  return out;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseIssueArgs(argv: string[]): { reissue: boolean; stationIds: string[] } {
  const res = { reissue: false, stationIds: [] as string[] };
  for (const a of argv) {
    if (a === '--reissue') res.reissue = true;
    else if (a.startsWith('--station=')) {
      const id = a.slice('--station='.length).toLowerCase();
      if (!UUID.test(id)) throw new Error(`--station inválido: "${id}" (id da estação)`);
      res.stationIds.push(id);
    } else throw new Error(`Argumento desconhecido: "${a}" (use --reissue e --station=<id>)`);
  }
  return res;
}
