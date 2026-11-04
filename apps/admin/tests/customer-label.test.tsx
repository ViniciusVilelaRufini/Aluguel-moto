import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { customerIdentity, customerLabel, realEmail } from '@/lib/customer-label';
import { CustomerName } from '@/components/ui';

describe('identidade do cliente', () => {
  it('usa o nome quando existe', () => {
    expect(customerLabel({ id: 'abc', name: ' Ana Souza ', email: 'a@x.com' })).toBe('Ana Souza');
  });
  it('sem nome usa o e-mail real', () => {
    expect(customerLabel({ id: 'abc', name: null, email: 'ana@x.com' })).toBe('ana@x.com');
  });
  it('e-mail interno nunca aparece: vira "Conta sem nome" + id curto', () => {
    const i = customerIdentity({ id: '1234567890abcdef', email: '1234567890abcdef@sem-email.volti.invalid' });
    expect(i).toEqual({ label: 'Conta sem nome', shortId: '12345678' });
    expect(realEmail('x@SEM-EMAIL.volti.invalid')).toBeNull();
  });
  it('nome que é o e-mail interno também é ignorado', () => {
    expect(customerLabel({ id: 'z', name: 'z@sem-email.volti.invalid', email: 'z@sem-email.volti.invalid' })).toBe('Conta sem nome');
  });
  it('CustomerName renderiza o id curto discreto e sem o domínio interno', () => {
    const html = renderToStaticMarkup(<CustomerName id="1234567890" email="1234567890@sem-email.volti.invalid" />);
    expect(html).toContain('Conta sem nome');
    expect(html).toContain('12345678');
    expect(html).not.toContain('sem-email');
  });
});

describe('tabela larga', () => {
  it('classe de rolagem: sticky e transbordo', async () => {
    const { tableScrollClass } = await import('@/components/ui');
    expect(tableScrollClass(true, false)).toBe('table-scroll table-sticky');
    expect(tableScrollClass(true, true)).toBe('table-scroll table-sticky table-overflow');
    expect(tableScrollClass(false, true)).toBe('table-scroll table-overflow');
  });
});
