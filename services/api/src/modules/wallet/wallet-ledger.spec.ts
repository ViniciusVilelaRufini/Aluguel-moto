import { appendWalletEntry } from './wallet-ledger';

const CUSTOMER = '11111111-1111-4111-8111-111111111111';

describe('appendWalletEntry (auditoria run-4: balanceAfterCents sem corrida)', () => {
  it('trava a linha do cliente (FOR NO KEY UPDATE) antes de somar o saldo e inserir', async () => {
    const calls: string[] = [];
    const tx: any = {
      $queryRaw: jest.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        calls.push(`lock:${strings.join('?')}:${values.join(',')}`);
        return [{ id: CUSTOMER }];
      }),
      walletEntry: {
        aggregate: jest.fn(async () => (calls.push('aggregate'), { _sum: { amountCents: 1000, minutes: 0 }, _max: { createdAt: new Date() } })),
        create: jest.fn(async ({ data }: any) => (calls.push('create'), data)),
      },
    };
    const e = await appendWalletEntry(tx, { customerId: CUSTOMER, type: 'top_up', amountCents: 500, description: 'x' });
    expect(calls).toEqual([`lock:SELECT "id" FROM "Customer" WHERE "id" = ?::uuid FOR NO KEY UPDATE:${CUSTOMER}`, 'aggregate', 'create']);
    expect(e).toMatchObject({ balanceAfterCents: 1500 });
  });
});
