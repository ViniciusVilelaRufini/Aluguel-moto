import { loadPickupCodeSecret, signPickupCode, verifyPickupCode } from './pickup-code';

const RES_ID = '6c1f0a52-8f3e-4b8e-9d55-0d6a7f1e2c11';
const NOW = new Date('2026-10-22T15:00:00Z');
const EXP = new Date('2026-10-22T17:00:00Z');

describe('pickup code', () => {
  it('assina e verifica: devolve o id da reserva no formato v1.<id>.<exp>.<sig>', () => {
    const code = signPickupCode(RES_ID, EXP);
    const [v, id, exp, sig] = code.split('.');
    expect(v).toBe('v1');
    expect(id).toBe(RES_ID);
    expect(Number(exp)).toBe(Math.floor(EXP.getTime() / 1000));
    expect(sig).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(verifyPickupCode(code, NOW)).toEqual({ reservationId: RES_ID });
  });

  it('código adulterado → null (id, prazo, assinatura ou versão trocados)', () => {
    const code = signPickupCode(RES_ID, EXP);
    const [v, id, exp, sig] = code.split('.');
    const otherId = '7d2f0a52-8f3e-4b8e-9d55-0d6a7f1e2c11';
    expect(verifyPickupCode([v, otherId, exp, sig].join('.'), NOW)).toBeNull();
    expect(verifyPickupCode([v, id, String(Number(exp) + 3600), sig].join('.'), NOW)).toBeNull();
    expect(verifyPickupCode([v, id, exp, sig.slice(0, -2) + (sig.endsWith('AA') ? 'BB' : 'AA')].join('.'), NOW)).toBeNull();
    expect(verifyPickupCode(['v2', id, exp, sig].join('.'), NOW)).toBeNull();
    expect(verifyPickupCode('lixo', NOW)).toBeNull();
    expect(verifyPickupCode('', NOW)).toBeNull();
    expect(verifyPickupCode(`${code}.extra`, NOW)).toBeNull();
  });

  it('código assinado com outro segredo → null', () => {
    const code = signPickupCode(RES_ID, EXP, 'outro-segredo');
    expect(verifyPickupCode(code, NOW)).toBeNull();
    expect(verifyPickupCode(code, NOW, 'outro-segredo')).toEqual({ reservationId: RES_ID });
  });

  it('código vencido → null', () => {
    const code = signPickupCode(RES_ID, EXP);
    expect(verifyPickupCode(code, new Date(EXP.getTime() + 1000))).toBeNull();
    expect(verifyPickupCode(code, EXP)).toBeNull();
  });

  it('não contém dado pessoal: só versão, id da reserva, prazo e assinatura', () => {
    const code = signPickupCode(RES_ID, EXP);
    expect(code).not.toMatch(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/); // CPF
    expect(code.toLowerCase()).not.toContain('maria');
    expect(code.split('.')).toHaveLength(4);
    expect(code.length).toBeLessThan(110);
  });

  describe('segredo (PICKUP_CODE_SECRET)', () => {
    const env = { ...process.env };
    afterEach(() => {
      process.env = { ...env };
    });

    it('usa o da variável de ambiente quando definido', () => {
      process.env.PICKUP_CODE_SECRET = 'segredo-do-ambiente';
      expect(loadPickupCodeSecret()).toBe('segredo-do-ambiente');
    });

    it('em dev cai para um segredo local', () => {
      delete process.env.PICKUP_CODE_SECRET;
      process.env.NODE_ENV = 'development';
      expect(loadPickupCodeSecret()).toBeTruthy();
    });

    it('em produção sem segredo falha (a API não sobe)', () => {
      delete process.env.PICKUP_CODE_SECRET;
      process.env.NODE_ENV = 'production';
      expect(() => loadPickupCodeSecret()).toThrow(/PICKUP_CODE_SECRET/);
      process.env.PICKUP_CODE_SECRET = '   ';
      expect(() => loadPickupCodeSecret()).toThrow(/PICKUP_CODE_SECRET/);
    });
  });
});
