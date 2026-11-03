import type { Payment, Prisma, PrismaClient } from '@prisma/client';

type Db = Pick<PrismaClient, 'paymentCapture'> | Prisma.TransactionClient;

/**
 * Teto do estorno de um pagamento (Task 16): parte do gateway (valor capturado da caução, ou bruto − carteira) + parte da
 * carteira (`walletCents`; pagamento só da carteira é carteira inteiro). Usado pelo estorno manual e pelo webhook
 * (auditoria run-4), para os dois concordarem sobre quando o pagamento está totalmente estornado.
 */
export async function refundBase(db: Db, p: Pick<Payment, 'id' | 'method' | 'amountCents' | 'walletCents'>): Promise<{ gatewayBase: number; walletBase: number; base: number }> {
  const captured = await db.paymentCapture.findUnique({ where: { paymentId: p.id } });
  const walletBase = p.method === 'wallet' ? p.amountCents : p.walletCents;
  const gatewayBase = p.method === 'wallet' ? 0 : (captured?.capturedCents ?? p.amountCents - p.walletCents);
  return { gatewayBase, walletBase, base: gatewayBase + walletBase };
}
