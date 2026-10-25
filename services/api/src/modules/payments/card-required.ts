import { ProblemException } from '../../common/problem';
import type { PrismaService } from '../../prisma/prisma.service';
import { resolveCustomerCard } from './provider-customers.service';

/** Task 30 (item 12): o cliente não tem nenhum cartão ativo para a cobrança. */
export const cardRequired = (detail = 'Cadastre um cartão ou pague a caução com Pix.') =>
  new ProblemException(422, 'card-required', detail, undefined, 'Cartão necessário');

/**
 * Caução no cartão: o cartão informado (`card-not-found`) ou o padrão (`card-required` sem nenhum ativo). Verificado antes
 * de criar o pagamento da caução, para não deixar uma caução "Falhou" por falta de cartão.
 */
export async function assertDepositCard(prisma: Pick<PrismaService, 'paymentCard'>, customerId: string, cardId?: string | null): Promise<void> {
  if (await resolveCustomerCard(prisma, customerId, cardId)) return;
  if (cardId) throw new ProblemException(422, 'card-not-found', 'Cartão não encontrado. Escolha outro cartão ou pague a caução com Pix.');
  throw cardRequired();
}
