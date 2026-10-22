import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * QR fixo da estação de troca: `vst1.<stationId>.<sig>`, com `sig` = HMAC-SHA256 de `vst1.<stationId>` pelo
 * `STATION_QR_SECRET`, truncado em 16 bytes (base64url, 22 caracteres). Sem dado pessoal e sem prazo (o QR fica colado
 * na estação). A API confere a assinatura e também a igualdade com `SwapStation.stationCode` (revogar = emitir outro
 * segredo e regravar os códigos).
 */
const VERSION = 'vst1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sem `STATION_QR_SECRET` em produção a API não sobe; em dev/teste usa um segredo local fixo. */
export function loadStationQrSecret(): string {
  const v = process.env.STATION_QR_SECRET;
  if (v && v.trim()) return v;
  if (process.env.NODE_ENV === 'production') throw new Error('STATION_QR_SECRET é obrigatório em produção (assinatura do QR das estações de troca).');
  return 'volti-dev-station-qr-secret';
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest().subarray(0, 16).toString('base64url');
}

export function signStationCode(stationId: string, secret: string = loadStationQrSecret()): string {
  const payload = `${VERSION}.${stationId.toLowerCase()}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** `null` para código malformado, adulterado ou assinado com outro segredo. */
export function verifyStationCode(code: string, secret: string = loadStationQrSecret()): { stationId: string } | null {
  if (typeof code !== 'string' || code.length > 256) return null;
  const parts = code.split('.');
  if (parts.length !== 3) return null;
  const [version, stationId, sig] = parts;
  if (version !== VERSION || !UUID.test(stationId)) return null;
  const expected = Buffer.from(sign(`${version}.${stationId.toLowerCase()}`, secret));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { stationId: stationId.toLowerCase() };
}
