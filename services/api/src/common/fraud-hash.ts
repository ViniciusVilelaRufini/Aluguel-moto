import { createHmac } from 'node:crypto';
import type { Prisma } from '@prisma/client';

/**
 * Fix round 1 (I4): impressão digital do CPF para prevenção a fraude (indicação e limite de cupom por cliente).
 * HMAC-SHA256 com segredo do ambiente (`FRAUD_HASH_SECRET`): o CPF nunca é guardado em claro e o hash não é reversível sem o
 * segredo. Fica retido depois da exclusão LGPD (legítimo interesse/prevenção à fraude, ver docs/decisoes.md).
 */
export function cpfHash(cpf: string, secret: string): string {
  return createHmac('sha256', secret).update(cpf.replace(/\D/g, '')).digest('hex');
}

type CustomerTx = Pick<Prisma.TransactionClient, 'customer'>;

/** Hash do CPF do cliente (calcula e grava na primeira vez). `null` sem CPF. */
export async function customerCpfHash(tx: CustomerTx, customerId: string, secret: string): Promise<string | null> {
  const c = await tx.customer.findUnique({ where: { id: customerId }, select: { cpf: true, cpfHash: true } });
  if (!c) return null;
  if (c.cpfHash) return c.cpfHash;
  if (!c.cpf) return null;
  const h = cpfHash(c.cpf, secret);
  await tx.customer.update({ where: { id: customerId }, data: { cpfHash: h } });
  return h;
}
