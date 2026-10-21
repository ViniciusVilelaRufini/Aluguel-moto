import type { Deposit, Rental, RentalEvent, Vehicle } from '@prisma/client';
import { compact, iso } from '../../common/util';
import type { PixCharge } from '../../ports/rental-billing.port';
import { calculatePrice, PriceBreakdown, PriceSnapshot } from '../pricing/pricing.service';

type RentalRow = Rental & { vehicle?: Pick<Vehicle, 'code'> | null };

/** Tempo decorrido e pausado (segundos) até `endedAt`, `endRequestedAt` ou agora. */
export function rentalTimes(r: Pick<Rental, 'startedAt' | 'pausedAt' | 'pausedSecondsAcc' | 'endRequestedAt' | 'endedAt' | 'status'>, now = new Date()) {
  const end = r.endRequestedAt ?? r.endedAt ?? now;
  const elapsedSeconds = Math.max(0, Math.floor((end.getTime() - r.startedAt.getTime()) / 1000));
  const openPause = r.status === 'paused' && r.pausedAt ? Math.max(0, Math.floor((end.getTime() - r.pausedAt.getTime()) / 1000)) : 0;
  const pausedSeconds = Math.min(elapsedSeconds, r.pausedSecondsAcc + openPause);
  return { elapsedSeconds, pausedSeconds };
}

/** Custo parcial (em andamento) ou final (encerrado). */
export function rentalCost(r: Rental, now = new Date()): { costCents: number; breakdown: PriceBreakdown } {
  if ((r.status === 'ended' || r.status === 'force_ended') && r.breakdown) {
    return { costCents: r.costCents, breakdown: r.breakdown as unknown as PriceBreakdown };
  }
  const { elapsedSeconds, pausedSeconds } = rentalTimes(r, now);
  const breakdown = calculatePrice({ snapshot: r.priceSnapshot as unknown as PriceSnapshot, elapsedSeconds, pausedSeconds });
  return { costCents: breakdown.totalCents, breakdown };
}

/** Prisma → `Rental` do contrato. */
export function toRental(r: RentalRow, now = new Date()) {
  const { elapsedSeconds, pausedSeconds } = rentalTimes(r, now);
  const { costCents, breakdown } = rentalCost(r, now);
  return compact({
    id: r.id,
    customerId: r.customerId,
    vehicleId: r.vehicleId,
    vehicleCode: r.vehicle?.code ?? '',
    planCode: r.planCode,
    coverage: r.coverage,
    status: r.status,
    startedAt: r.startedAt.toISOString(),
    pausedAt: r.status === 'paused' ? iso(r.pausedAt) : undefined,
    endedAt: iso(r.endedAt),
    elapsedSeconds,
    pausedSeconds,
    costCents,
    breakdown,
    couponCode: r.couponCode ?? undefined,
    depositId: r.depositId,
    insurancePolicyId: r.insurancePolicyId ?? undefined,
    paymentId: r.paymentId ?? undefined,
    endZoneId: r.endZoneId ?? undefined,
    returnPhotoObjectKey: r.returnPhotoObjectKey ?? undefined,
    forceEndReason: r.forceEndReason ?? undefined,
    forcedEndById: r.forcedEndById ?? undefined,
    rating: r.rating ?? undefined,
    speedLimitKmh: r.speedLimitKmh ?? undefined,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  });
}

export function toRentalEvent(e: RentalEvent) {
  return compact({
    id: e.id,
    rentalId: e.rentalId,
    type: e.type,
    at: e.at.toISOString(),
    actorType: e.actorType,
    actorId: e.actorId ?? undefined,
    message: e.message ?? undefined,
    data: (e.data as Record<string, unknown> | null) ?? undefined,
  });
}

export function toDeposit(d: Deposit) {
  return compact({
    id: d.id,
    rentalId: d.rentalId ?? undefined,
    customerId: d.customerId,
    method: d.method,
    status: d.status,
    amountCents: d.amountCents,
    capturedCents: d.capturedCents ?? undefined,
    pix: (d.pix as PixCharge | null) ?? undefined,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  });
}
