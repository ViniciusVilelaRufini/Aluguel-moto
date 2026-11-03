import { notFixedForOtherSql } from './fixed-vehicle';

describe('notFixedForOtherSql', () => {
  const sql = notFixedForOtherSql('11111111-1111-1111-1111-111111111111');

  it('compara currentPeriodEnd (timestamp sem fuso, gravado em UTC) com o agora em UTC, independente do TimeZone da sessão', () => {
    const text = sql.text.replace(/\s+/g, ' ');
    expect(text).toContain(`s."currentPeriodEnd" > (now() AT TIME ZONE 'UTC')`);
    expect(text).not.toMatch(/"currentPeriodEnd" > now\(\)/);
  });

  it('mantém o filtro de assinatura aberta e de outro cliente (parâmetro)', () => {
    const text = sql.text.replace(/\s+/g, ' ');
    expect(text).toContain(`s."status" IN ('active', 'paused')`);
    expect(text).toContain(`s."customerId" <> $1::uuid`);
    expect(sql.values).toEqual(['11111111-1111-1111-1111-111111111111']);
  });
});
