import { Inject, Injectable, Logger } from '@nestjs/common';
import { conflict, notFound } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import type { Principal } from '../auth/principal';
import { PICKUP_CODE_SECRET, signPickupCode } from '../reservations/pickup-code';
import { HandoversService } from './handovers.service';

/**
 * Ator de sistema da entrega simulada: UUID nulo, que nunca é um `StaffUser` real (o `operatorId` da entrega não tem FK).
 * Sem staff com esse id, o cliente vê o nome padrão "Equipe Volti".
 */
export const TEST_HANDOVER_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

const TEST_HANDOVER_ACTOR: Principal = {
  pool: 'staff',
  sub: 'system:test-handover',
  email: '',
  groups: [],
  userId: TEST_HANDOVER_ACTOR_ID,
  staffId: TEST_HANDOVER_ACTOR_ID,
};

const reservationNotFound = () => notFound('Reserva não encontrada.');

/**
 * Entrega simulada para o app de teste (`ALLOW_TEST_HANDOVER=true`): faz o papel do operador do galpão na saída. Assina o
 * código de retirada da própria reserva e delega ao `HandoversService.createPickup` (mesmas verificações: código, status da
 * reserva e da moto, uma entrega aberta por reserva). O aceite do cliente segue o caminho normal. Logs só com ids.
 */
@Injectable()
export class TestHandoverService {
  private readonly logger = new Logger('TestHandoverService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly handovers: HandoversService,
    @Inject(PICKUP_CODE_SECRET) private readonly pickupSecret: string,
  ) {}

  async create(customer: Principal, reservationId: string) {
    const r = await this.prisma.reservation.findUnique({ where: { id: reservationId }, include: { vehicle: true } });
    // Reserva de outro cliente responde igual à inexistente (não vaza a existência).
    if (!r || !customer.customerId || r.customerId !== customer.customerId || !r.depotId) throw reservationNotFound();
    if (r.status !== 'active') throw conflict('conflict', 'Esta reserva não está mais ativa.');

    const result = await this.handovers.createPickup(TEST_HANDOVER_ACTOR, {
      type: 'pickup',
      depotId: r.depotId,
      pickupCode: signPickupCode(r.id, r.expiresAt, this.pickupSecret),
      checklist: [{ code: 'teste', ok: true }],
      photoKeys: [],
      batteryPct: r.vehicle?.batteryPct ?? 100,
    });
    this.logger.log({ msg: 'handover_test_created', handoverId: result.body.id, reservationId: r.id, depotId: r.depotId, testHandover: true });
    return result.body;
  }
}
