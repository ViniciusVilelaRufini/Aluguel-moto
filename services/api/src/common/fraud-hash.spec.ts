import { cpfHash, customerCpfHash } from './fraud-hash';

describe('HMAC do CPF (prevenção a fraude, fix round 1)', () => {
  it('determinístico, ignora máscara, depende do segredo e não contém o CPF', () => {
    const a = cpfHash('529.982.247-25', 's1');
    expect(a).toBe(cpfHash('52998224725', 's1'));
    expect(a).not.toBe(cpfHash('52998224725', 's2'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('52998224725');
  });

  it('calcula e grava na primeira vez; reaproveita o gravado; sem CPF → null', async () => {
    const rows: Record<string, any> = { c1: { cpf: '52998224725', cpfHash: null }, c2: { cpf: null, cpfHash: null }, c3: { cpf: null, cpfHash: 'abc' } };
    const tx: any = {
      customer: {
        findUnique: jest.fn(async ({ where }) => rows[where.id] ?? null),
        update: jest.fn(async ({ where, data }) => Object.assign(rows[where.id], data)),
      },
    };
    expect(await customerCpfHash(tx, 'c1', 's')).toBe(cpfHash('52998224725', 's'));
    expect(rows.c1.cpfHash).toBe(cpfHash('52998224725', 's'));
    expect(await customerCpfHash(tx, 'c2', 's')).toBeNull();
    expect(await customerCpfHash(tx, 'c3', 's')).toBe('abc'); // conta excluída: o hash retido continua valendo
    expect(await customerCpfHash(tx, 'nope', 's')).toBeNull();
  });
});
