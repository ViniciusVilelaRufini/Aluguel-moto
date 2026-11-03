import type { Prisma, PrismaClient } from '@prisma/client';

/** O efeito decidiu não agir agora (ex.: assinatura mudou entre a leitura e a gravação): o marcador não é gravado. */
export const SKIP_EFFECT = Symbol('SKIP_EFFECT');

export type EffectOutcome<T> = { status: 'applied'; result: T } | { status: 'already' } | { status: 'skipped' };

class EffectsAlreadyApplied extends Error {}

/**
 * Auditoria run-4: aplica os efeitos de um pagamento uma única vez (marcador `Payment.effectsAppliedAt`), para que o
 * webhook possa chamá-los sempre que o status local for final — inclusive quando a transição já tinha sido gravada e o
 * efeito se perdeu numa queda. Na mesma transação: lê o marcador, roda o efeito e grava o marcador com update
 * condicional; se outro executor marcou antes, lança para o Postgres desfazer o efeito desta execução.
 */
export async function applyEffectsOnce<T>(
  prisma: Pick<PrismaClient, '$transaction'>,
  paymentId: string,
  effect: (tx: Prisma.TransactionClient) => Promise<T | typeof SKIP_EFFECT>,
): Promise<EffectOutcome<T>> {
  try {
    return await prisma.$transaction(async (tx) => {
      const p = await tx.payment.findUnique({ where: { id: paymentId }, select: { effectsAppliedAt: true } });
      if (p?.effectsAppliedAt) return { status: 'already' as const };
      const result = await effect(tx);
      if (result === SKIP_EFFECT) return { status: 'skipped' as const };
      const claimed = await tx.payment.updateMany({ where: { id: paymentId, effectsAppliedAt: null }, data: { effectsAppliedAt: new Date() } });
      if (claimed.count === 0) throw new EffectsAlreadyApplied();
      return { status: 'applied' as const, result: result as T };
    });
  } catch (err) {
    if (err instanceof EffectsAlreadyApplied) return { status: 'already' };
    throw err;
  }
}
