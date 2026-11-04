/** Domínio do e-mail interno que a API grava para contas criadas sem e-mail (nunca deve aparecer na interface). */
export const PLACEHOLDER_EMAIL_DOMAIN = '@sem-email.volti.invalid';

export interface CustomerIdentityInput { id?: string; name?: string | null; email?: string | null }
export interface CustomerIdentity {
  /** Texto principal: nome, e-mail real ou "Conta sem nome". */
  label: string;
  /** Id curto discreto, só quando a conta não tem nome nem e-mail reais. */
  shortId?: string;
}

export function isPlaceholderEmail(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase().endsWith(PLACEHOLDER_EMAIL_DOMAIN);
}

/** E-mail para exibir: `null` quando vazio ou interno. */
export function realEmail(email?: string | null): string | null {
  const e = email?.trim();
  return e && !isPlaceholderEmail(e) ? e : null;
}

export function customerIdentity(c: CustomerIdentityInput): CustomerIdentity {
  const name = c.name?.trim();
  if (name && !isPlaceholderEmail(name)) return { label: name };
  const email = realEmail(c.email);
  if (email) return { label: email };
  return { label: 'Conta sem nome', shortId: c.id ? c.id.slice(0, 8) : undefined };
}

export function customerLabel(c: CustomerIdentityInput): string {
  return customerIdentity(c).label;
}
