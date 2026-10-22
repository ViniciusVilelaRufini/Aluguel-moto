import type { Coupon } from '@prisma/client';
import { unprocessable } from '../../common/problem';

/** Sem 0/O/1/I/L para o código ser fácil de ditar. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** Código de indicação: até 5 letras do primeiro nome (sem acento) + 4 caracteres aleatórios. Ex.: `MARIA7K2Q`. */
export function makeReferralCode(name: string | null | undefined, random: () => number = Math.random): string {
  const first = (name ?? '').trim().split(/\s+/)[0] ?? '';
  const letters = first.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 5) || 'VOLTI';
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += ALPHABET[Math.floor(random() * ALPHABET.length) % ALPHABET.length];
  return letters + suffix;
}

export const normalizeReferralCode = (code: string) => code.trim().toUpperCase();

/** Primeiro nome para mostrar a outro cliente (LGPD: nunca o nome completo). */
export const firstName = (name: string | null | undefined, fallback = 'Amigo') => (name ?? '').trim().split(/\s+/)[0] || fallback;

/**
 * Quem pode usar um código de indicação: conta com KYC aprovado, sem corrida, que ainda não foi indicada, e nunca o
 * próprio código. Lança `422 referral-not-eligible`.
 */
export function assertReferralEligible(input: { refereeId: string; referrerId: string; kycApproved: boolean; rentalsCount: number; alreadyReferred: boolean }): void {
  if (input.referrerId === input.refereeId) throw unprocessable('referral-not-eligible', 'Você não pode usar o seu próprio código.');
  if (input.alreadyReferred) throw unprocessable('referral-not-eligible', 'Sua conta já usou um código de indicação.');
  if (input.rentalsCount > 0) throw unprocessable('referral-not-eligible', 'O código de indicação vale só antes da primeira corrida.');
  if (!input.kycApproved) throw unprocessable('referral-not-eligible', 'Conclua a verificação de identidade para usar o código.');
}

export type CustomerCouponStatus = 'available' | 'used' | 'expired';

/** Situação de um cupom salvo na conta, calculada na leitura. */
export function customerCouponStatus(
  coupon: Pick<Coupon, 'active' | 'validUntil' | 'maxRedemptions' | 'redemptions' | 'maxRedemptionsPerCustomer'>,
  usedByCustomer: number,
  now: Date,
): { status: CustomerCouponStatus; usesRemaining?: number } {
  const usesRemaining = coupon.maxRedemptionsPerCustomer != null ? Math.max(0, coupon.maxRedemptionsPerCustomer - usedByCustomer) : undefined;
  if (usesRemaining === 0) return { status: 'used', usesRemaining };
  if (!coupon.active || (coupon.validUntil && coupon.validUntil < now) || (coupon.maxRedemptions != null && coupon.redemptions >= coupon.maxRedemptions)) {
    return { status: 'expired', usesRemaining };
  }
  return { status: 'available', usesRemaining };
}
