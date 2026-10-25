import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { allowedFinanceTabs, resolveFinanceTab } from '@/lib/finance-tabs';

const keys: string[] = [];
const fetches: string[] = [];

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ groups: ['financeiro'] }) }));
vi.mock('@/components/ui', async (orig) => {
  const real = await orig<typeof import('@/components/ui')>();
  return {
    ...real,
    // Registra a chave e, como o hook real, só "busca" quando a chave muda.
    usePagedQuery: (key: unknown[], fetchPage: (c?: string) => Promise<unknown>) => {
      const k = JSON.stringify(key);
      if (keys[keys.length - 1] !== k) { fetches.push(k); void fetchPage(undefined); }
      keys.push(k);
      return { rows: [], loading: false, error: null, pager: { page: 0, hasNext: false, onNext() {}, onPrev() {} }, refetch() {} };
    },
  };
});
vi.mock('@/lib/api', () => ({ api: { GET: vi.fn(async () => ({ data: { items: [] }, response: { ok: true } })) }, unwrap: (p: Promise<unknown>) => p }));

afterEach(() => { vi.useRealTimers(); keys.length = 0; fetches.length = 0; });

describe('PaymentsPanel: chave de consulta estável (C1)', () => {
  it('a chave não muda com o passar do tempo entre renderizações (preset 30 dias)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T15:00:00.000Z'));
    const { PaymentsPanel } = await import('@/components/PaymentsPanel');
    for (let i = 0; i < 5; i++) {
      renderToStaticMarkup(<PaymentsPanel />);
      vi.advanceTimersByTime(1500);
    }
    expect(new Set(keys).size).toBe(1);
    expect(fetches.length).toBe(1);
  });
});

describe('abas do Financeiro por grupo (I1)', () => {
  it('carteira só com wallet.adjust', () => {
    expect(allowedFinanceTabs(['financeiro'])).toContain('wallet');
    expect(allowedFinanceTabs(['operacao'])).not.toContain('wallet');
  });
  it('aba pedida sem permissão ou inválida cai na primeira permitida', () => {
    expect(resolveFinanceTab('wallet', ['suporte'])).toBe('overview');
    expect(resolveFinanceTab('nada', ['financeiro'])).toBe('overview');
    expect(resolveFinanceTab(null, ['financeiro'])).toBe('overview');
    expect(resolveFinanceTab('wallet', ['financeiro'])).toBe('wallet');
    expect(resolveFinanceTab('payments', ['admin'])).toBe('payments');
  });
});
