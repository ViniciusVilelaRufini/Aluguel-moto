/**
 * QR fixo das estações de troca (troca de bateria via QR, docs/decisoes.md 2026-10-22). Idempotente; chamado por `seed.ts`.
 * Emite (ou reemite, se o segredo mudou) `SwapStation.stationCode` para **todas** as estações e imprime os payloads para
 * teste (gere o QR com qualquer gerador ou cole o texto no app em dev).
 *
 * Espelho de `src/modules/station-swaps/station-code.ts` (o seed é compilado sozinho no Dockerfile, sem `src/`); o teste
 * `src/modules/station-swaps/seed-station-codes.spec.ts` garante que os dois assinam igual.
 */
import { createHmac } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

export function seedStationSecret(): string {
  const v = process.env.STATION_QR_SECRET;
  if (v && v.trim()) return v;
  if (process.env.NODE_ENV === 'production') throw new Error('STATION_QR_SECRET é obrigatório em produção.');
  return 'volti-dev-station-qr-secret';
}

export function seedStationCode(stationId: string, secret: string = seedStationSecret()): string {
  const payload = `vst1.${stationId.toLowerCase()}`;
  return `${payload}.${createHmac('sha256', secret).update(payload).digest().subarray(0, 16).toString('base64url')}`;
}

export async function seedStationCodes(prisma: PrismaClient): Promise<Array<{ id: string; name: string; stationCode: string }>> {
  const secret = seedStationSecret();
  const stations = await prisma.swapStation.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, stationCode: true } });
  const out: Array<{ id: string; name: string; stationCode: string }> = [];
  for (const s of stations) {
    const code = seedStationCode(s.id, secret);
    if (s.stationCode !== code) await prisma.swapStation.update({ where: { id: s.id }, data: { stationCode: code } });
    out.push({ id: s.id, name: s.name, stationCode: code });
  }
  return out;
}
