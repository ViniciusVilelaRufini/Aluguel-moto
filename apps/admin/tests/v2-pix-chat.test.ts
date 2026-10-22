import { describe, expect, it } from 'vitest';
import { canSeeFullPixKey, displayPixKey, maskPixKey } from '@/lib/pix';
import { lastUnreadFromCustomer, messageStatus, type SupportMessage } from '@/lib/chat';

describe('chave Pix de estorno', () => {
  it('só admin e financeiro veem a chave inteira', () => {
    expect(canSeeFullPixKey(['admin'])).toBe(true);
    expect(canSeeFullPixKey(['financeiro'])).toBe(true);
    expect(canSeeFullPixKey(['suporte'])).toBe(false);
    expect(canSeeFullPixKey(['operacao'])).toBe(false);
  });

  it('máscara igual à da API', () => {
    expect(maskPixKey('cpf', '12345678909')).toBe('***.456.789-**');
    expect(maskPixKey('email', 'joana@exemplo.com')).toBe('j***@exemplo.com');
    expect(maskPixKey('phone', '+5511987654321')).toBe('+5511*****4321');
    expect(maskPixKey('random', '123e4567-e89b-12d3-a456-426614174000')).toBe('123e…4000');
  });

  it('valor já no formato exato da máscara da API não é mascarado de novo', () => {
    expect(maskPixKey('email', 'j***@exemplo.com')).toBe('j***@exemplo.com');
    expect(maskPixKey('random', '123e…4000')).toBe('123e…4000');
    expect(maskPixKey('cpf', '***.456.789-**')).toBe('***.456.789-**');
    expect(maskPixKey('phone', '+5511*****4321')).toBe('+5511*****4321');
  });

  it('asterisco no meio da chave não impede a máscara', () => {
    expect(maskPixKey('email', 'jo*ana@exemplo.com')).toBe('j***@exemplo.com');
    expect(maskPixKey('random', 'ab*cdefgh-1234-5678')).toBe('ab*c…5678');
    expect(maskPixKey('email', 'ju***@exemplo.com')).toBe('j***@exemplo.com');
  });

  it('exibição: completa (CPF formatado) para quem pode, mascarada para os demais', () => {
    expect(displayPixKey('cpf', '12345678909', true)).toBe('CPF · 123.456.789-09');
    expect(displayPixKey('cpf', '12345678909', false)).toBe('CPF · ***.456.789-**');
    expect(displayPixKey('email', 'joana@exemplo.com', false)).toBe('E-mail · j***@exemplo.com');
    expect(displayPixKey(undefined, undefined, true)).toBe('Não cadastrada');
  });
});

const msg = (id: string, authorType: SupportMessage['authorType'], createdAt: string, over: Partial<SupportMessage> = {}): SupportMessage =>
  ({ id, conversationId: 'c', authorType, body: 'oi', createdAt, ...over });

describe('estado das mensagens do chat', () => {
  it('usa o status do contrato e deduz pelos horários quando ausente', () => {
    expect(messageStatus({ status: 'delivered' })).toBe('delivered');
    expect(messageStatus({ readAt: '2026-10-22T10:00:00Z' })).toBe('read');
    expect(messageStatus({ deliveredAt: '2026-10-22T10:00:00Z' })).toBe('delivered');
    expect(messageStatus({})).toBe('sent');
  });

  it('marca como lida até a última mensagem do cliente', () => {
    const list = [
      msg('a', 'customer', '2026-10-22T10:00:00Z', { status: 'read' }),
      msg('b', 'staff', '2026-10-22T10:01:00Z', { status: 'sent' }),
      msg('d', 'customer', '2026-10-22T10:03:00Z', { status: 'delivered' }),
      msg('c', 'customer', '2026-10-22T10:02:00Z', { status: 'delivered' }),
    ];
    expect(lastUnreadFromCustomer(list)).toBe('d');
  });

  it('nada a marcar quando tudo do cliente já foi lido', () => {
    expect(lastUnreadFromCustomer([msg('a', 'customer', '2026-10-22T10:00:00Z', { status: 'read' }), msg('b', 'staff', '2026-10-22T10:01:00Z')])).toBeUndefined();
    expect(lastUnreadFromCustomer([])).toBeUndefined();
  });
});
