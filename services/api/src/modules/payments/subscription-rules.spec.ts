import { ProblemException } from '../../common/problem';
import { assertVehicleSwapAllowed, checkPause, isCurrent, lifecycleTransition, nextCharge, pausesRemaining, renewEffect, resumeEffect } from './subscription-rules';

const now = new Date('2026-10-22T12:00:00Z');
const DAY = 86_400_000;
const sub = (over: Record<string, unknown> = {}) =>
  ({
    planCode: 'weekly', status: 'active', cancelAtPeriodEnd: false, currentPeriodEnd: new Date(now.getTime() + 5 * DAY), pausesUsedInPeriod: 0,
    pausedAt: null, pauseEndsAt: null, priceCents: 24900, ...over,
  }) as any;

function problem(fn: () => unknown): { status: number; slug: string } {
  try {
    fn();
  } catch (e) {
    if (e instanceof ProblemException) return { status: e.getStatus(), slug: e.slug };
    throw e;
  }
  throw new Error('não lançou');
}

describe('regras da pausa da assinatura', () => {
  it('semanal: até 3 dias; mensal: até 7', () => {
    expect(checkPause(sub(), { days: 3, now, hasOpenRental: false }).pauseEndsAt).toEqual(new Date(now.getTime() + 3 * DAY));
    expect(problem(() => checkPause(sub(), { days: 4, now, hasOpenRental: false }))).toEqual({ status: 422, slug: 'subscription-pause-limit-reached' });
    expect(checkPause(sub({ planCode: 'monthly' }), { days: 7, now, hasOpenRental: false }).pauseEndsAt).toEqual(new Date(now.getTime() + 7 * DAY));
    expect(problem(() => checkPause(sub({ planCode: 'monthly' }), { days: 8, now, hasOpenRental: false })).status).toBe(422);
    expect(problem(() => checkPause(sub(), { days: 0, now, hasOpenRental: false })).status).toBe(422);
  });

  it('uma pausa por período', () => {
    expect(pausesRemaining(sub())).toBe(1);
    expect(pausesRemaining(sub({ pausesUsedInPeriod: 1 }))).toBe(0);
    expect(problem(() => checkPause(sub({ pausesUsedInPeriod: 1 }), { days: 1, now, hasOpenRental: false }))).toEqual({ status: 422, slug: 'subscription-pause-limit-reached' });
  });

  it('só ativa, sem cancelamento agendado, dentro do período e sem aluguel aberto', () => {
    for (const s of [sub({ status: 'paused' }), sub({ status: 'past_due' }), sub({ cancelAtPeriodEnd: true }), sub({ currentPeriodEnd: new Date(now.getTime() - 1) })]) {
      expect(problem(() => checkPause(s, { days: 1, now, hasOpenRental: false }))).toEqual({ status: 409, slug: 'subscription-not-pausable' });
    }
    expect(problem(() => checkPause(sub(), { days: 1, now, hasOpenRental: true }))).toEqual({ status: 409, slug: 'rental-already-active' });
  });

  it('retomada antecipada estende o período só pelo tempo pausado', () => {
    const pausedAt = new Date(now.getTime() - 26 * 3600_000);
    const s = sub({ status: 'paused', pausedAt, pauseEndsAt: new Date(pausedAt.getTime() + 3 * DAY) });
    const r = resumeEffect(s, now);
    expect(r.pausedMs).toBe(26 * 3600_000);
    expect(r.currentPeriodEnd).toEqual(new Date(s.currentPeriodEnd.getTime() + 26 * 3600_000));
  });

  it('retomada automática atrasada não dá tempo além de pauseEndsAt', () => {
    const pausedAt = new Date(now.getTime() - 4 * DAY);
    const s = sub({ status: 'paused', pausedAt, pauseEndsAt: new Date(pausedAt.getTime() + 3 * DAY) });
    expect(resumeEffect(s, now).pausedMs).toBe(3 * DAY);
    expect(problem(() => resumeEffect(sub(), now))).toEqual({ status: 409, slug: 'subscription-not-pausable' });
  });

  it('próxima cobrança só para ativa sem cancelamento agendado', () => {
    expect(nextCharge(sub())).toEqual({ nextChargeAt: sub().currentPeriodEnd, nextChargeCents: 24900 });
    expect(nextCharge(sub({ status: 'paused' }))).toEqual({});
    expect(nextCharge(sub({ cancelAtPeriodEnd: true }))).toEqual({});
  });
});

describe('ciclo de vida, renovação e troca da moto fixa (fix round 1)', () => {
  const GRACE = 3 * DAY;
  it('cancelamento agendado vencido → canceled; sem renovação além da carência → expired; pausada não expira', () => {
    const past = new Date(now.getTime() - 1);
    expect(lifecycleTransition(sub({ cancelAtPeriodEnd: true, currentPeriodEnd: past }), now, GRACE)).toBe('canceled');
    expect(lifecycleTransition(sub({ status: 'paused', cancelAtPeriodEnd: true, currentPeriodEnd: past }), now, GRACE)).toBe('canceled');
    expect(lifecycleTransition(sub({ currentPeriodEnd: past }), now, GRACE)).toBeNull(); // ainda na carência
    expect(lifecycleTransition(sub({ currentPeriodEnd: new Date(now.getTime() - GRACE) }), now, GRACE)).toBe('expired');
    expect(lifecycleTransition(sub({ status: 'past_due', currentPeriodEnd: new Date(now.getTime() - 4 * DAY) }), now, GRACE)).toBe('expired');
    expect(lifecycleTransition(sub({ status: 'paused', currentPeriodEnd: new Date(now.getTime() - 9 * DAY) }), now, GRACE)).toBeNull();
    expect(lifecycleTransition(sub(), now, GRACE)).toBeNull();
  });

  it('período vigente só para aberta com fim no futuro', () => {
    expect(isCurrent(sub(), now)).toBe(true);
    expect(isCurrent(sub({ status: 'paused' }), now)).toBe(true);
    expect(isCurrent(sub({ currentPeriodEnd: now }), now)).toBe(false);
    expect(isCurrent(sub({ status: 'canceled' }), now)).toBe(false);
  });

  it('renovação: ativa reabre a pausa do período; pausada continua pausada e mantém o contador', () => {
    const s = sub({ pausesUsedInPeriod: 1 });
    expect(renewEffect(s, 7 * DAY)).toEqual({ status: 'active', currentPeriodStart: s.currentPeriodEnd, currentPeriodEnd: new Date(s.currentPeriodEnd.getTime() + 7 * DAY), pausesUsedInPeriod: 0, pausedAt: null, pauseEndsAt: null });
    const p = sub({ status: 'paused', pausesUsedInPeriod: 1, pausedAt: now, pauseEndsAt: now });
    const r = renewEffect(p, 7 * DAY);
    expect(r).toEqual({ currentPeriodStart: p.currentPeriodEnd, currentPeriodEnd: new Date(p.currentPeriodEnd.getTime() + 7 * DAY) });
    // Cenário C: a retomada depois da renovação soma o tempo pausado ao período novo.
    const pausedAt = new Date(now.getTime() - DAY);
    const resumed = resumeEffect({ ...p, ...r, pausedAt, pauseEndsAt: new Date(pausedAt.getTime() + 3 * DAY) }, now);
    expect(resumed.currentPeriodEnd).toEqual(new Date(r.currentPeriodEnd.getTime() + DAY));
  });

  it('cliente troca a moto fixa no máximo uma vez a cada 24 h', () => {
    const H = 3600_000;
    expect(() => assertVehicleSwapAllowed({ assignedVehicleId: null, assignedVehicleAt: null }, now, 24 * H)).not.toThrow();
    expect(() => assertVehicleSwapAllowed({ assignedVehicleId: 'v', assignedVehicleAt: new Date(now.getTime() - 25 * H) }, now, 24 * H)).not.toThrow();
    expect(problem(() => assertVehicleSwapAllowed({ assignedVehicleId: 'v', assignedVehicleAt: new Date(now.getTime() - 2 * H) }, now, 24 * H))).toEqual({ status: 422, slug: 'subscription-vehicle-cooldown' });
  });
});
