import type { Subscription, SubscriptionStatus } from '@prisma/client';
import { conflict, unprocessable } from '../../common/problem';

/**
 * Regras da pausa da assinatura (contrato v2): até 3 dias por pausa no semanal e 7 no mensal, uma pausa por período de
 * cobrança. O período (e a próxima cobrança) anda o tempo efetivamente pausado.
 */
export const PAUSE_POLICY = {
  weekly: { maxDaysPerPause: 3, maxPausesPerPeriod: 1 },
  monthly: { maxDaysPerPause: 7, maxPausesPerPeriod: 1 },
} as const;

type SubLike = Pick<Subscription, 'planCode' | 'status' | 'cancelAtPeriodEnd' | 'currentPeriodEnd' | 'pausesUsedInPeriod' | 'pausedAt' | 'pauseEndsAt' | 'priceCents'>;

const DAY_MS = 86_400_000;

export function pausePolicy(planCode: string) {
  return planCode === 'monthly' ? PAUSE_POLICY.monthly : PAUSE_POLICY.weekly;
}

export function pausesRemaining(sub: Pick<SubLike, 'planCode' | 'pausesUsedInPeriod'>): number {
  return Math.max(0, pausePolicy(sub.planCode).maxPausesPerPeriod - sub.pausesUsedInPeriod);
}

/** Valida o pedido de pausa; devolve o fim da pausa. Lança 409/422 com os slugs do contrato. */
export function checkPause(sub: SubLike, input: { days: number; now: Date; hasOpenRental: boolean }): { pauseEndsAt: Date } {
  if (sub.status !== 'active' || sub.cancelAtPeriodEnd || sub.currentPeriodEnd <= input.now) {
    throw conflict('subscription-not-pausable', 'Só é possível pausar uma assinatura ativa, sem cancelamento agendado.');
  }
  if (input.hasOpenRental) throw conflict('rental-already-active', 'Encerre o aluguel em andamento antes de pausar o plano.');
  const policy = pausePolicy(sub.planCode);
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > policy.maxDaysPerPause) {
    throw unprocessable('subscription-pause-limit-reached', `Neste plano a pausa vai de 1 a ${policy.maxDaysPerPause} dias.`);
  }
  if (pausesRemaining(sub) === 0) {
    throw unprocessable('subscription-pause-limit-reached', 'Você já usou a pausa deste período. Ela volta na próxima cobrança.');
  }
  return { pauseEndsAt: new Date(input.now.getTime() + input.days * DAY_MS) };
}

/**
 * Retomada (manual ou automática): o período anda o tempo pausado, nunca além do `pauseEndsAt` (a retomada automática
 * pode rodar com atraso do job sem dar dias a mais).
 */
export function resumeEffect(sub: SubLike, now: Date): { pausedMs: number; currentPeriodEnd: Date } {
  if (sub.status !== 'paused' || !sub.pausedAt) throw conflict('subscription-not-pausable', 'A assinatura não está pausada.');
  const until = sub.pauseEndsAt && sub.pauseEndsAt < now ? sub.pauseEndsAt : now;
  const pausedMs = Math.max(0, until.getTime() - sub.pausedAt.getTime());
  return { pausedMs, currentPeriodEnd: new Date(sub.currentPeriodEnd.getTime() + pausedMs) };
}

/** Próxima cobrança: só assinatura ativa e sem cancelamento agendado. */
export function nextCharge(sub: SubLike): { nextChargeAt?: Date; nextChargeCents?: number } {
  if (sub.status !== 'active' || sub.cancelAtPeriodEnd) return {};
  return { nextChargeAt: sub.currentPeriodEnd, nextChargeCents: sub.priceCents };
}

// ───────────── fix round 1 ─────────────

const OPEN = ['active', 'paused'];

/** Período vigente: assinatura aberta (ativa ou pausada) com `currentPeriodEnd` no futuro. Só ela dá moto fixa e plano ativo. */
export function isCurrent(sub: Pick<Subscription, 'status' | 'currentPeriodEnd'>, now: Date): boolean {
  return OPEN.includes(sub.status) && sub.currentPeriodEnd > now;
}

/**
 * Ciclo de vida (C1): cancelamento agendado com período vencido → `canceled`; ativa ou inadimplente sem renovação além da
 * carência → `expired`. Pausada não expira (a retomada estende o período).
 */
export function lifecycleTransition(
  sub: Pick<Subscription, 'status' | 'cancelAtPeriodEnd' | 'currentPeriodEnd'>,
  now: Date,
  graceMs: number,
): 'canceled' | 'expired' | null {
  if (OPEN.includes(sub.status) && sub.cancelAtPeriodEnd && sub.currentPeriodEnd <= now) return 'canceled';
  if ((sub.status === 'active' || sub.status === 'past_due') && sub.currentPeriodEnd.getTime() + graceMs <= now.getTime()) return 'expired';
  return null;
}

/**
 * Fix round 2 (achado 3): o mesmo critério de `lifecycleTransition` como filtro do banco, para o job só ler assinaturas que
 * já devem mudar (sem isso, as que estão na carência ocupavam a página e escondiam as vencidas).
 */
export function lifecycleCandidatesWhere(now: Date, graceMs: number) {
  return {
    OR: [
      { status: { in: ['active', 'paused'] as SubscriptionStatus[] }, cancelAtPeriodEnd: true, currentPeriodEnd: { lte: now } },
      { status: { in: ['active', 'past_due'] as SubscriptionStatus[] }, currentPeriodEnd: { lte: new Date(now.getTime() - graceMs) } },
    ],
  };
}

/**
 * Renovação paga (I1): período seguinte a partir do fim atual. Pausada continua pausada e a pausa em curso conta no novo
 * período (o tempo pausado é somado na retomada); ativa ganha a pausa do período de volta.
 */
export function renewEffect(sub: Pick<Subscription, 'status' | 'currentPeriodEnd' | 'planCode' | 'pausesUsedInPeriod'>, periodMs: number) {
  const start = sub.currentPeriodEnd;
  const end = new Date(start.getTime() + periodMs);
  if (sub.status === 'paused') return { currentPeriodStart: start, currentPeriodEnd: end };
  return { status: 'active' as const, currentPeriodStart: start, currentPeriodEnd: end, pausesUsedInPeriod: 0, pausedAt: null, pauseEndsAt: null };
}

/** Troca da moto fixa pelo cliente: no máximo uma a cada `cooldownMs` (M9). Staff não espera. */
export function assertVehicleSwapAllowed(sub: Pick<Subscription, 'assignedVehicleId' | 'assignedVehicleAt'>, now: Date, cooldownMs: number): void {
  if (!sub.assignedVehicleId || !sub.assignedVehicleAt) return;
  const waitMs = sub.assignedVehicleAt.getTime() + cooldownMs - now.getTime();
  if (waitMs > 0) {
    throw unprocessable('subscription-vehicle-cooldown', `Você pode trocar a moto fixa de novo em ${Math.ceil(waitMs / 3_600_000)} h.`);
  }
}
