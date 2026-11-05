import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CONSOLE_PRESETS, apnMismatch, consoleRisk } from '@/lib/tracker-console';

const answered = {
  id: 'c1', vehicleId: 'v1', text: 'STATUS#', risk: 'read', status: 'answered', failReason: null,
  response: 'BAT:4.1V,EXT:12.3V,GPRS:OFF', requestedById: 'u1', createdAt: '2026-11-05T15:00:00.000Z', respondedAt: '2026-11-05T15:00:04.000Z',
  statusReport: { batteryVolts: 4.1, externalVolts: 12.3, gprsOnline: false, acc: false, gpsOn: true, relay: false, sleep: false, csq: 21 },
};
const apnReply = { ...answered, id: 'c2', text: 'APN#', response: 'APN:algar.br,,,', statusReport: null };
const failed = { ...answered, id: 'c3', status: 'failed', failReason: 'offline', response: null, statusReport: null };
const timedOut = { ...answered, id: 'c4', status: 'failed', failReason: 'timeout', response: null, statusReport: null };
const pending = { ...answered, id: 'c5', status: 'pending', response: null, statusReport: null, respondedAt: null };

let items: unknown[] = [answered];
vi.mock('@tanstack/react-query', async (orig) => {
  const real = await orig<typeof import('@tanstack/react-query')>();
  return {
    ...real,
    useQuery: () => ({ data: { items }, isLoading: false, error: null }),
    useQueryClient: () => ({ invalidateQueries() {}, setQueryData() {} }),
    useMutation: () => ({ mutateAsync: async () => ({}), isPending: false }),
  };
});

const text = (html: string) => html.replace(/<[^>]*>/g, '|');

describe('lib/tracker-console', () => {
  it('apnMismatch compara sem caixa e devolve o APN do aparelho quando difere', () => {
    expect(apnMismatch('indica.algar.br', 'APN:algar.br,,,')).toBe('algar.br');
    expect(apnMismatch('Indica.Algar.BR', 'APN:indica.algar.br,,,')).toBeNull();
    expect(apnMismatch(null, 'APN:algar.br,,,')).toBeNull();
    expect(apnMismatch('x', 'STATUS ok')).toBeNull();
    expect(apnMismatch('x', null)).toBeNull();
  });
  it('presets e risco', () => {
    expect(CONSOLE_PRESETS.map((p) => p.text)).toEqual(['STATUS#', 'PARAM#', 'WHERE#', 'APN#', 'SERVER#', 'VERSION#']);
    expect(consoleRisk('STATUS#')).toBe('read');
    expect(consoleRisk('RESET#')).toBe('connection');
    expect(consoleRisk('apn,indica.algar.br#')).toBe('connection');
    expect(consoleRisk('TIMER,30#')).toBe('change');
  });
});

describe('TrackerConsole', () => {
  it('resposta de STATUS vira mini-tabela com Dados móveis Offline', async () => {
    items = [answered];
    const { TrackerConsole } = await import('@/components/tracker/TrackerConsole');
    const t = text(renderToStaticMarkup(<TrackerConsole vehicleId="v1" groups={['admin']} mode="relay_only" simApn={null} />));
    expect(t).toMatch(/Dados móveis\|+Offline/);
    expect(t).toContain('Bateria interna');
    expect(t).toContain('Respondido');
  });
  it('não renderiza para operação nem para speed_control', async () => {
    const { TrackerConsole } = await import('@/components/tracker/TrackerConsole');
    expect(renderToStaticMarkup(<TrackerConsole vehicleId="v1" groups={['operacao']} mode="relay_only" simApn={null} />)).toBe('');
    expect(renderToStaticMarkup(<TrackerConsole vehicleId="v1" groups={['admin']} mode="speed_control" simApn={null} />)).toBe('');
  });
  it('falhas e pendente com rótulos em pt-BR', async () => {
    const { TrackerConsole } = await import('@/components/tracker/TrackerConsole');
    items = [failed, timedOut, pending];
    const t = text(renderToStaticMarkup(<TrackerConsole vehicleId="v1" groups={['admin']} mode="relay_only" simApn={null} />));
    expect(t).toContain('Rastreador offline');
    expect(t).toContain('Sem resposta em 90 s');
    expect(t).toContain('Aguardando');
  });
  it('avisa quando o APN do aparelho difere do chip', async () => {
    const { TrackerConsole } = await import('@/components/tracker/TrackerConsole');
    items = [apnReply];
    const t = text(renderToStaticMarkup(<TrackerConsole vehicleId="v1" groups={['admin']} mode="relay_only" simApn="indica.algar.br" />));
    expect(t).toContain('O aparelho está com o APN algar.br, mas o chip cadastrado usa indica.algar.br.');
  });
  it('só a resposta de APN mais recente conta: divergência antiga não avisa', async () => {
    const { TrackerConsole } = await import('@/components/tracker/TrackerConsole');
    items = [{ ...apnReply, id: 'new', response: 'APN:indica.algar.br,,,' }, { ...apnReply, id: 'old', response: 'APN:algar.br,,,' }];
    const t = text(renderToStaticMarkup(<TrackerConsole vehicleId="v1" groups={['admin']} mode="relay_only" simApn="indica.algar.br" />));
    expect(t).not.toContain('O aparelho está com o APN');
  });
});
