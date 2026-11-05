import { ConsoleQueue, isRelayConsoleText, parseConsoleCommand, replyMatches } from './console';

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
    q.add('m', 'a', 0, 'STATUS#');
    q.add('m', 'b', 1, 'WHERE#');
    expect(q.peek('m')?.texto).toBe('STATUS#');
    expect(q.take('m')?.comandoId).toBe('a');
    expect(q.take('m')?.comandoId).toBe('b');
    expect(q.take('m')).toBeUndefined();
  });
  it('expira só quem passou de 60 s', () => {
    const q = new ConsoleQueue(60_000);
    q.add('m', 'a', 0, 'STATUS#');
    q.add('m', 'b', 30_000, 'STATUS#');
    expect(q.expire(59_999)).toEqual([]);
    expect(q.expire(60_000)).toEqual([{ thing: 'm', comandoId: 'a' }]);
    expect(q.expire(90_000)).toEqual([{ thing: 'm', comandoId: 'b' }]);
    expect(q.take('m')).toBeUndefined();
  });
  it('remove um específico e limpa por moto', () => {
    const q = new ConsoleQueue();
    q.add('m', 'a', 0, 'STATUS#');
    q.add('m', 'b', 0, 'STATUS#');
    q.remove('m', 'a');
    expect(q.take('m')?.comandoId).toBe('b');
    q.add('m', 'c', 0, 'STATUS#');
    q.clear('m');
    expect(q.take('m')).toBeUndefined();
  });
});

describe('ConsoleQueue — M3: comando_id repetido (reentrega QoS 1)', () => {
  it('ignora id pendente ou já concluído; aceita id novo', () => {
    const q = new ConsoleQueue();
    expect(q.add('m', 'a', 0, 'STATUS#')).toBe(true);
    expect(q.add('m', 'a', 1, 'STATUS#')).toBe(false); // ainda pendente
    expect(q.take('m')?.comandoId).toBe('a');
    expect(q.take('m')).toBeUndefined();
    expect(q.add('m', 'a', 2, 'STATUS#')).toBe(false); // já concluído
    expect(q.add('m', 'b', 3, 'STATUS#')).toBe(true);
  });
  it('a memória dos vistos é limitada (o mais antigo sai)', () => {
    const q = new ConsoleQueue(60_000, 3);
    for (const id of ['a', 'b', 'c', 'd']) q.add('m', id, 0, 'STATUS#');
    q.clear('m');
    expect(q.add('m', 'a', 0, 'STATUS#')).toBe(true);
    expect(q.add('m', 'd', 0, 'STATUS#')).toBe(false);
  });
});

describe('isRelayConsoleText — C1 defesa em profundidade', () => {
  it.each(['RELAY,1#', 'relay,1#', 'Relay,0#', 'dyd#', 'DYD,000000#', 'HFYD#', 'hfyd,1#', 'STOP#', 'resume#', ' RELAY,1# '])('%s é relé', (t) => {
    expect(isRelayConsoleText(t)).toBe(true);
  });
  it.each(['STATUS#', 'APN,indica.algar.br#', 'RELAYX#', 'TIMER,30,3600#', 'STOPPED#'])('%s não é relé', (t) => {
    expect(isRelayConsoleText(t)).toBe(false);
  });
});

describe('replyMatches — M2 coerência mínima da resposta', () => {
  const STATUS_REPLY = 'Battery:4.27V;GPRS:Online;';
  it.each([
    ['STATUS#', STATUS_REPLY, true],
    ['status#', STATUS_REPLY, true],
    ['STATUS#', 'IMEI:860000000000001;', false],
    ['WHERE#', 'Lati:N23.5,Long:W46.6', true],
    ['WHERE#', 'Current position! Lat:N23', true],
    ['WHERE#', STATUS_REPLY, false],
    ['PARAM#', 'IMEI:860000000000001;TIMER:10;', true],
    ['PARAM#', STATUS_REPLY, false],
    ['APN#', 'APN:indica.algar.br', true],
    ['APN#', STATUS_REPLY, false],
    ['SERVER#', 'SERVER,1,host,5023,0', true],
    ['SERVER#', STATUS_REPLY, false],
    ['TIMER,30,3600#', 'OK', true],
    ['VERSION#', STATUS_REPLY, true],
    ['APN,x.y#', 'OK', true],
  ])('%s ← %j → %s', (texto, reply, ok) => {
    expect(replyMatches(texto, reply)).toBe(ok);
  });
});
