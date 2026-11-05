import { ConsoleQueue, parseConsoleCommand } from './console';

const ID = '6f1d1c2e-1d7b-4c55-9a3a-0b8f1f3f2a11';

describe('parseConsoleCommand', () => {
  it('aceita console válido sem alterar o texto', () => {
    expect(parseConsoleCommand({ comando_id: ID, acao: 'console', texto: 'APN,indica.algar.br#' })).toEqual({ comandoId: ID, texto: 'APN,indica.algar.br#' });
  });
  it.each([
    ['sem comando_id', { acao: 'console', texto: 'STATUS#' }],
    ['texto vazio', { comando_id: ID, acao: 'console', texto: '' }],
    ['texto > 100', { comando_id: ID, acao: 'console', texto: 'A'.repeat(101) }],
    ['texto ausente', { comando_id: ID, acao: 'console' }],
    ['buzina', { comando_id: ID, acao: 'buzina' }],
    ['não objeto', 'x'],
  ])('recusa %s', (_n, body) => {
    expect(parseConsoleCommand(body)).toBeUndefined();
  });
  it('aceita texto de exatamente 100', () => {
    expect(parseConsoleCommand({ comando_id: ID, acao: 'console', texto: 'A'.repeat(100) })?.texto).toHaveLength(100);
  });
});

describe('ConsoleQueue', () => {
  it('entrega ao mais antigo primeiro e esvazia', () => {
    const q = new ConsoleQueue(60_000);
    q.add('m', 'a', 0);
    q.add('m', 'b', 1);
    expect(q.take('m')?.comandoId).toBe('a');
    expect(q.take('m')?.comandoId).toBe('b');
    expect(q.take('m')).toBeUndefined();
  });
  it('expira só quem passou de 60 s', () => {
    const q = new ConsoleQueue(60_000);
    q.add('m', 'a', 0);
    q.add('m', 'b', 30_000);
    expect(q.expire(59_999)).toEqual([]);
    expect(q.expire(60_000)).toEqual([{ thing: 'm', comandoId: 'a' }]);
    expect(q.expire(90_000)).toEqual([{ thing: 'm', comandoId: 'b' }]);
    expect(q.take('m')).toBeUndefined();
  });
  it('remove um específico e limpa por moto', () => {
    const q = new ConsoleQueue();
    q.add('m', 'a', 0);
    q.add('m', 'b', 0);
    q.remove('m', 'a');
    expect(q.take('m')?.comandoId).toBe('b');
    q.add('m', 'c', 0);
    q.clear('m');
    expect(q.take('m')).toBeUndefined();
  });
});
