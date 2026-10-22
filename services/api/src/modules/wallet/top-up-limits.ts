import { unprocessable } from '../../common/problem';
import type { V2Config } from '../../config/v2-config';

const brl = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

/** Recarga de valor livre dentro de `topUpMinCents..topUpMaxCents` (o DTO já barra fora de 1000..100000). */
export function assertTopUpAmount(amountCents: number, cfg: Pick<V2Config, 'topUpMinCents' | 'topUpMaxCents'>): void {
  if (!Number.isInteger(amountCents) || amountCents < cfg.topUpMinCents || amountCents > cfg.topUpMaxCents) {
    throw unprocessable('top-up-amount-out-of-range', `A recarga precisa ficar entre ${brl(cfg.topUpMinCents)} e ${brl(cfg.topUpMaxCents)}.`);
  }
}

/** Campos de limite devolvidos em `GET /wallet`. */
export const topUpLimits = (cfg: Pick<V2Config, 'topUpMinCents' | 'topUpMaxCents' | 'suggestedTopUpAmountsCents'>) => ({
  topUpMinCents: cfg.topUpMinCents,
  topUpMaxCents: cfg.topUpMaxCents,
  suggestedTopUpAmountsCents: cfg.suggestedTopUpAmountsCents,
});
