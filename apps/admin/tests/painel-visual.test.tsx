import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));

describe('404 em pt-BR', () => {
  it('mostra o texto e leva de volta à frota', async () => {
    const NotFound = (await import('@/app/not-found')).default;
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain('Página não encontrada');
    expect(html).toContain('Voltar à frota');
    expect(html).toContain('href="/fleet/"');
    expect(html).not.toContain('This page could not be found');
  });
});

describe('aviso do mapa', () => {
  it('carregando ignora cliques; falha mostra mensagem e botão', async () => {
    const { MapOverlay, MAP_LOAD_TIMEOUT_MS } = await import('@/components/MapView');
    const loading = renderToStaticMarkup(<MapOverlay state="loading" onRetry={() => {}} />);
    expect(loading).toContain('Carregando mapa…');
    expect(loading).toContain('pointer-events:none');
    const failed = renderToStaticMarkup(<MapOverlay state="failed" onRetry={() => {}} />);
    expect(failed).toContain('Não foi possível carregar o mapa.');
    expect(failed).toContain('Tentar de novo');
    expect(failed).not.toContain('pointer-events:none');
    expect(renderToStaticMarkup(<MapOverlay state="ready" onRetry={() => {}} />)).toBe('');
    expect(MAP_LOAD_TIMEOUT_MS).toBe(15000);
  });
});

describe('metadata do 404', () => {
  it('título em pt-BR', async () => {
    const m = await import('@/app/not-found');
    expect((m.metadata as { title: string }).title).toBe('Página não encontrada · Volti');
  });
});
