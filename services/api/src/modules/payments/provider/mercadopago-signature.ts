import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Validação do header `x-signature` do Mercado Pago (`ts=<epoch>,v1=<hex>`):
 * HMAC-SHA256 com o segredo do webhook sobre o manifesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
 * O Mercado Pago usa o `data.id` em minúsculas quando ele é alfanumérico.
 */
export function verifyMercadoPagoSignature(input: { secret?: string; signature?: string; requestId?: string; dataId: string }): boolean {
  const { secret, signature, requestId, dataId } = input;
  if (!secret || !signature || !requestId || !dataId) return false;
  const parts: Record<string, string> = {};
  for (const kv of signature.split(',')) {
    const i = kv.indexOf('=');
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  if (!parts.ts || !parts.v1 || !/^[0-9a-f]{64}$/i.test(parts.v1)) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = Buffer.from(createHmac('sha256', secret).update(manifest).digest('hex'));
  const got = Buffer.from(parts.v1.toLowerCase());
  return expected.length === got.length && timingSafeEqual(expected, got);
}
