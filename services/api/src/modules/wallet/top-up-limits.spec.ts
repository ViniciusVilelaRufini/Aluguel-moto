import { loadV2Config } from '../../config/v2-config';
import { ProblemException } from '../../common/problem';
import { assertTopUpAmount, topUpLimits } from './top-up-limits';

describe('limites da recarga de valor livre', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('padrão R$ 10 a R$ 1.000 com atalhos 20/50/100', () => {
    delete process.env.WALLET_TOP_UP_MIN_CENTS;
    delete process.env.WALLET_TOP_UP_MAX_CENTS;
    delete process.env.WALLET_TOP_UP_SUGGESTED_CENTS;
    expect(topUpLimits(loadV2Config())).toEqual({ topUpMinCents: 1000, topUpMaxCents: 100000, suggestedTopUpAmountsCents: [2000, 5000, 10000] });
  });

  it('a configuração só estreita o intervalo do contrato e descarta atalhos fora dele', () => {
    process.env.WALLET_TOP_UP_MIN_CENTS = '500';
    process.env.WALLET_TOP_UP_MAX_CENTS = '30000';
    process.env.WALLET_TOP_UP_SUGGESTED_CENTS = '2000, 50000, abc';
    const cfg = loadV2Config();
    expect(cfg.topUpMinCents).toBe(1000);
    expect(cfg.topUpMaxCents).toBe(30000);
    expect(cfg.suggestedTopUpAmountsCents).toEqual([2000]);
  });

  it('fora do intervalo → 422 top-up-amount-out-of-range; nas bordas passa', () => {
    const cfg = { topUpMinCents: 1000, topUpMaxCents: 30000 };
    expect(() => assertTopUpAmount(1000, cfg)).not.toThrow();
    expect(() => assertTopUpAmount(30000, cfg)).not.toThrow();
    for (const v of [999, 30001, 1500.5]) {
      try {
        assertTopUpAmount(v, cfg);
        throw new Error('deveria falhar');
      } catch (e) {
        expect(e).toBeInstanceOf(ProblemException);
        expect((e as ProblemException).getStatus()).toBe(422);
        expect((e as ProblemException).slug).toBe('top-up-amount-out-of-range');
        expect((e as ProblemException).detail).toBe('A recarga precisa ficar entre R$ 10,00 e R$ 300,00.');
      }
    }
  });
});
