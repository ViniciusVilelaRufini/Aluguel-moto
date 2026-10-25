import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatAttachments } from '@/components/ChatAttachments';
import { revenueCaption } from '@/lib/finance-revenue';
import { lastErrorLabel } from '@/lib/handovers';
import { staffLabel } from '@/lib/staff-label';

/** Task 30: correções da varredura E2E na AWS dev (anexo do chat, receita, nome da equipe, erro da entrega). */
describe('anexos do chat (item 31)', () => {
  it('mostra as imagens pelas URLs pré-assinadas e abre numa nova aba', () => {
    const html = renderToStaticMarkup(<ChatAttachments message={{ attachmentObjectKeys: ['support/c/a.jpg'], attachmentUrls: ['https://s3.example/support/c/a.jpg?sig=1'] }} />);
    expect(html).toContain('<img');
    expect(html).toContain('src="https://s3.example/support/c/a.jpg?sig=1"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('chave sem URL (de outro autor) aparece como indisponível; sem anexos não renderiza nada', () => {
    const html = renderToStaticMarkup(<ChatAttachments message={{ attachmentObjectKeys: ['support/c/a.jpg', 'outro/b.jpg'], attachmentUrls: ['https://s3.example/a?sig'] }} />);
    expect(html).toContain('1 anexo indisponível');
    expect(renderToStaticMarkup(<ChatAttachments message={{}} />)).toBe('');
  });
});

describe('receita do Financeiro (item 33)', () => {
  it('legenda com aluguéis e assinaturas', () => {
    expect(revenueCaption({ rentalRevenueCents: 0, subscriptionRevenueCents: 24900 })).toBe('Aluguéis R$ 0,00 · Assinaturas R$ 249,00');
  });
  it('API antiga sem as parcelas → sem legenda', () => {
    expect(revenueCaption({})).toBeUndefined();
    expect(revenueCaption(undefined)).toBeUndefined();
  });
});

describe('equipe e entrega', () => {
  it('pessoa sem nome cadastrado aparece pelo e-mail só no painel', () => {
    expect(staffLabel({ name: '', email: 'ops@volti.dev' })).toBe('ops@volti.dev');
    expect(staffLabel({ name: 'Rafael Souza', email: 'ops@volti.dev' })).toBe('Rafael Souza');
  });
  it('vehicle-offline traduzido (sem o slug cru)', () => {
    expect(lastErrorLabel('vehicle-offline')).toBe('Moto sem conexão no destravamento');
  });
});
