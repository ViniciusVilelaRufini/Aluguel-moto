import type { PrismaClient } from '@prisma/client';
import type { ObjectStorage } from '../../../ports/object-storage.port';

/** Validade do link do recibo (QA-11): gerado a cada leitura, nunca gravado no banco. */
export const RECEIPT_LINK_TTL_SECONDS = 15 * 60;

/**
 * Links GET assinados (15 min) dos recibos dos pagamentos, a partir da chave guardada em `PaymentReceipt`. Na AWS a URL
 * assinada com credenciais temporárias da task role morre com a sessão STS; por isso nada disso é persistido.
 */
export async function receiptLinks(
  prisma: Pick<PrismaClient, 'paymentReceipt'>,
  storage: Pick<ObjectStorage, 'presignGet'>,
  paymentIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!paymentIds.length) return out;
  const rows = await prisma.paymentReceipt.findMany({ where: { paymentId: { in: paymentIds } } });
  for (const r of rows) {
    const link = await storage.presignGet({ bucket: r.bucket, key: r.objectKey, expiresInSeconds: RECEIPT_LINK_TTL_SECONDS });
    out.set(r.paymentId, link.url);
  }
  return out;
}
