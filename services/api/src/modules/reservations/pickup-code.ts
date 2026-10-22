import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Código de retirada no galpão (conteúdo do QR): `v1.<reservationId>.<expEpoch>.<sig>`, com `sig` = HMAC-SHA256
 * (base64url) de `v1.<reservationId>.<expEpoch>` pelo `PICKUP_CODE_SECRET`. Curto e sem dado pessoal: só identifica a
 * reserva e o prazo; o operador valida o código e o servidor confere a reserva no banco.
 */
export const PICKUP_CODE_SECRET = Symbol('PICKUP_CODE_SECRET');

const VERSION = 'v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sem `PICKUP_CODE_SECRET` em produção a API não sobe; em dev/teste usa um segredo local fixo. */
export function loadPickupCodeSecret(): string {
  const v = process.env.PICKUP_CODE_SECRET;
  if (v && v.trim()) return v;
  if (process.env.NODE_ENV === 'production') throw new Error('PICKUP_CODE_SECRET é obrigatório em produção (assinatura do código de retirada no galpão).');
  return 'volti-dev-pickup-code-secret';
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function signPickupCode(reservationId: string, expiresAt: Date, secret: string = loadPickupCodeSecret()): string {
  const payload = `${VERSION}.${reservationId}.${Math.floor(expiresAt.getTime() / 1000)}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** `null` para código malformado, adulterado, assinado com outro segredo ou vencido. */
export function verifyPickupCode(code: string, now: Date, secret: string = loadPickupCodeSecret()): { reservationId: string } | null {
  if (typeof code !== 'string') return null;
  const parts = code.split('.');
  if (parts.length !== 4) return null;
  const [version, reservationId, exp, sig] = parts;
  if (version !== VERSION || !UUID.test(reservationId) || !/^\d{1,12}$/.test(exp)) return null;
  const expected = Buffer.from(sign(`${version}.${reservationId}.${exp}`, secret));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (Number(exp) * 1000 <= now.getTime()) return null;
  return { reservationId };
}
