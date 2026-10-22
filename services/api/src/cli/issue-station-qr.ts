/**
 * Script de operação (fix 1, I6): emite ou reemite o QR fixo das estações de troca.
 *   dev:       pnpm --filter api stations:qr [--reissue] [--station=<id>]
 *   produção:  node dist/cli/issue-station-qr.js [--reissue] [--station=<id>]   (task avulsa do ECS, com DATABASE_URL e STATION_QR_SECRET)
 * Imprime uma linha JSON por estação (`id`, `name`, `stationCode` = conteúdo do QR, `issued`). Sem dado pessoal.
 */
import { PrismaClient } from '@prisma/client';
import { loadStationQrSecret } from '../modules/station-swaps/station-code';
import { issueStationCodes, parseIssueArgs } from '../modules/station-swaps/station-qr';

async function main(): Promise<void> {
  const args = parseIssueArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  try {
    const out = await issueStationCodes(prisma, { secret: loadStationQrSecret(), ...args });
    for (const s of out) process.stdout.write(`${JSON.stringify({ msg: 'station_qr', ...s })}\n`);
    process.stdout.write(`${JSON.stringify({ msg: 'station_qr_done', stations: out.length, issued: out.filter((s) => s.issued).length })}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  process.stderr.write(`${JSON.stringify({ msg: 'station_qr_failed', error: (err as Error).message })}\n`);
  process.exitCode = 1;
});
