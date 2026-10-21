import { createHmac, timingSafeEqual } from 'node:crypto';

/** Janela padrão para o `ts` do webhook (5 minutos; `MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS`). */
export const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * Validação do header `x-signature` do Mercado Pago (`ts=<epoch>,v1=<hex>`):
 * HMAC-SHA256 com o segredo do webhook sobre o manifesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
 * O Mercado Pago usa o `data.id` em minúsculas quando ele é alfanumérico.
 * `ts` fora da janela de tolerância (passado ou futuro) é rejeitado, contra replay. Aceita `ts` em segundos ou milissegundos.
 */
export function verifyMercadoPagoSignature(input: {
  secret?: string;
  signature?: string;
  requestId?: string;
  dataId: string;
  toleranceSeconds?: number;
  nowMs?: number;
}): boolean {
  const { secret, signature, requestId, dataId } = input;
  if (!secret || !signature || !requestId || !dataId) return false;
  const parts: Record<string, string> = {};
  for (const kv of signature.split(',')) {
    const i = kv.indexOf('=');
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  if (!parts.ts || !parts.v1 || !/^[0-9a-f]{64}$/i.test(parts.v1) || !/^\d{1,16}$/.test(parts.ts)) return false;
  const tsNum = Number(parts.ts);
  const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
  const tolerance = (input.toleranceSeconds ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS) * 1000;
  if (Math.abs((input.nowMs ?? Date.now()) - tsMs) > tolerance) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = Buffer.from(createHmac('sha256', secret).update(manifest).digest('hex'));
  const got = Buffer.from(parts.v1.toLowerCase());
  return expected.length === got.length && timingSafeEqual(expected, got);
}
