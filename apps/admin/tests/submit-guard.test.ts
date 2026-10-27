import { describe, expect, it } from 'vitest';
import { createSubmitLock, isEmail } from '@/lib/submit-guard';

describe('createSubmitLock', () => {
  it('descarta chamadas enquanto a primeira não terminou e libera depois', async () => {
    const run = createSubmitLock();
    let n = 0;
    const slow = () => new Promise<number>((r) => setTimeout(() => r(++n), 20));
    const [a, b] = await Promise.all([run(slow), run(slow)]);
    expect(a).toBe(1);
    expect(b).toBeUndefined();
    expect(await run(slow)).toBe(2);
  });
  it('libera a trava quando a função falha', async () => {
    const run = createSubmitLock();
    await expect(run(async () => { throw new Error('x'); })).rejects.toThrow('x');
    expect(await run(async () => 7)).toBe(7);
  });
});

describe('isEmail', () => {
  it('valida formato básico', () => {
    expect(isEmail('beto@volti.dev')).toBe(true);
    expect(isEmail(' beto@volti.dev ')).toBe(true);
    expect(isEmail('isso-nao-e-email')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
  });
});
