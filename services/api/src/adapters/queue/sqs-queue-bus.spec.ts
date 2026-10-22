import { DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { SqsQueueBus } from './sqs-queue-bus';

const cfg = { sqs: { region: 'sa-east-1', queueUrls: { estacoes: 'https://sqs.sa-east-1.amazonaws.com/1/volti-estacoes.fifo' } } } as any;
const msg = (id: string, group: string, body: unknown) => ({ MessageId: id, ReceiptHandle: `rh-${id}`, Body: JSON.stringify(body), Attributes: { MessageGroupId: group } });

describe('SqsQueueBus — lote FIFO (fix 1, I4)', () => {
  it('handler que falha para o resto do mesmo grupo no lote (não apaga nem processa); outros grupos seguem', async () => {
    const bus = new SqsQueueBus(cfg);
    const sent: any[] = [];
    (bus as any).client = { send: jest.fn(async (c: any) => void sent.push(c)) };
    const seen: string[] = [];
    const handler = jest.fn(async (m: { n: string }) => {
      seen.push(m.n);
      if (m.n === 'a2') throw new Error('falhou');
    });
    await bus.processBatch('estacoes', cfg.sqs.queueUrls.estacoes, [
      msg('1', 'station-a', { n: 'a1' }),
      msg('2', 'station-b', { n: 'b1' }),
      msg('3', 'station-a', { n: 'a2' }),
      msg('4', 'station-a', { n: 'a3' }),
      msg('5', 'station-b', { n: 'b2' }),
    ], handler);
    expect(seen).toEqual(['a1', 'b1', 'a2', 'b2']); // a3 não roda depois da falha de a2
    const deleted = sent.filter((c) => c instanceof DeleteMessageCommand).map((c) => c.input.ReceiptHandle);
    expect(deleted).toEqual(['rh-1', 'rh-2', 'rh-5']);
    bus.onModuleDestroy();
  });

  it('mensagens sem grupo (fila padrão) continuam independentes', async () => {
    const bus = new SqsQueueBus(cfg);
    (bus as any).client = { send: jest.fn(async () => undefined) };
    const seen: string[] = [];
    await bus.processBatch('estacoes', 'u', [
      { MessageId: '1', ReceiptHandle: 'r1', Body: '{"n":"x"}' },
      { MessageId: '2', ReceiptHandle: 'r2', Body: '{"n":"y"}' },
    ], async (m: { n: string }) => {
      seen.push(m.n);
      if (m.n === 'x') throw new Error('x');
    });
    expect(seen).toEqual(['x', 'y']);
    bus.onModuleDestroy();
  });
});
