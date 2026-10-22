import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { RealtimeGateway, zoneMessage } from './realtime.gateway';

const RENTAL_ID = '88888888-8888-4888-8888-888888888888';

function setup() {
  const prisma = mockDeep<PrismaClient>();
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));
  const gw = new RealtimeGateway({} as any, {} as any, prisma as any);
  gw.server = { to, in: jest.fn(() => ({ socketsJoin: jest.fn(), socketsLeave: jest.fn() })) } as any;
  return { gw, prisma, emit, to };
}

describe('RealtimeGateway', () => {
  it('payment.updated de um aluguel → rental.updated na sala rental:{id}', async () => {
    const { gw, prisma, emit, to } = setup();
    const now = new Date();
    prisma.rental.findUnique.mockResolvedValue({
      id: RENTAL_ID, customerId: 'c', vehicleId: 'v', status: 'ended', startedAt: new Date(now.getTime() - 600_000), pausedAt: null, pausedSecondsAcc: 0,
      endRequestedAt: now, endedAt: now, priceSnapshot: {}, costCents: 1290, breakdown: { lines: [], subtotalCents: 1090, discountCents: 0, insuranceCents: 200, feesCents: 0, totalCents: 1290 },
      createdAt: now, updatedAt: now,
    } as any);
    await gw.onPaymentUpdated({ paymentId: 'p', rentalId: RENTAL_ID, status: 'paid' });
    expect(to).toHaveBeenCalledWith(`rental:${RENTAL_ID}`);
    expect(emit).toHaveBeenCalledWith('rental.updated', expect.objectContaining({ rentalId: RENTAL_ID, status: 'ended', costCents: 1290, elapsedSeconds: 600 }));
  });

  it('payment.updated sem aluguel não emite', async () => {
    const { gw, emit } = setup();
    await gw.onPaymentUpdated({ paymentId: 'p', status: 'paid' });
    expect(emit).not.toHaveBeenCalled();
  });

  it('fix round 1: acesso revogado → desconecta os sockets daquele usuário (sala principal:{pool}:{id})', () => {
    const { gw } = setup();
    const disconnectSockets = jest.fn();
    const inFn = jest.fn(() => ({ disconnectSockets }));
    (gw.server as any).in = inFn;
    gw.onPrincipalRevoked({ pool: 'customer', userId: 'c1' });
    expect(inFn).toHaveBeenCalledWith('principal:customer:c1');
    expect(disconnectSockets).toHaveBeenCalledWith(true);
  });

  it('zone.notice: mensagens em pt-BR', () => {
    expect(zoneMessage({ zoneType: 'reduced_speed', transition: 'ENTER', speedLimitKmh: 6 })).toBe('Você entrou numa área de pedestres. Velocidade máxima: 6 km/h.');
    expect(zoneMessage({ zoneType: 'operation', transition: 'EXIT' })).toMatch(/5 minutos/);
  });
  it('Task 6: handover.pending e handover.updated vão para customer:{id} e depot:{id}, sem dados pessoais', () => {
    const { gw, emit, to } = setup();
    gw.onHandoverPending({ handoverId: 'h1', reservationId: 'r1', customerId: 'c1', depotId: 'd1' });
    expect(to).toHaveBeenCalledWith('customer:c1');
    expect(to).toHaveBeenCalledWith('depot:d1');
    expect(emit).toHaveBeenCalledWith('handover.pending', { handoverId: 'h1', reservationId: 'r1' });
    emit.mockClear();
    gw.onHandoverUpdated({ handoverId: 'h1', status: 'pending_customer', lastError: 'payment-declined', customerId: 'c1', depotId: 'd1' });
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith('handover.updated', { handoverId: 'h1', status: 'pending_customer', lastError: 'payment-declined' });
    emit.mockClear();
    gw.onHandoverUpdated({ handoverId: 'h1', status: 'accepted', customerId: 'c1', depotId: 'd1' });
    expect(emit).toHaveBeenCalledWith('handover.updated', { handoverId: 'h1', status: 'accepted' });
  });

  it('troca na estação: station_swap.updated { swapId, status } só na sala customer:{id} do dono', () => {
    const { gw, emit, to } = setup();
    gw.onStationSwapUpdated({ swapId: 's1', customerId: 'c1', status: 'awaiting_return' });
    expect(to).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith('customer:c1');
    expect(emit).toHaveBeenCalledWith('station_swap.updated', { swapId: 's1', status: 'awaiting_return' });
  });
});
