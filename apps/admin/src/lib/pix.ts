import type { S, StaffGroup } from './types';
import { formatCpf } from './cpf';

export type PixKeyType = S<'PixKeyType'>;

export const PIX_KEY_TYPE_LABEL: Record<PixKeyType, string> = {
  cpf: 'CPF', email: 'E-mail', phone: 'Celular', random: 'Chave aleatória',
};

/** Chave Pix de estorno completa só para admin e financeiro (contrato: `Customer.pixRefundKey`). */
export function canSeeFullPixKey(groups: StaffGroup[]): boolean {
  return groups.includes('admin') || groups.includes('financeiro');
}

/** Formato exato que a API devolve mascarado, por tipo (`services/api/src/common/pix-key.ts`). */
const API_MASK: Record<PixKeyType, RegExp> = {
  cpf: /^\*{3}\.\d{3}\.\d{3}-\*{2}$/,
  email: /^[^@*]\*{3}@[^@]*$/,
  phone: /^.{5}\*{5}.{4}$/,
  random: /^.{4}….{4}$/,
};
const isApiMasked = (type: PixKeyType, v: string) => API_MASK[type].test(v);

/** Mesma máscara da API (`services/api/src/common/pix-key.ts`); valor já mascarado passa direto. */
export function maskPixKey(type: PixKeyType, value: string): string {
  if (isApiMasked(type, value)) return value;
  switch (type) {
    case 'cpf': {
      const d = value.replace(/\D/g, '');
      return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
    }
    case 'email': {
      const [user, domain] = value.split('@');
      return `${user.slice(0, 1)}***@${domain ?? ''}`;
    }
    case 'phone':
      return `${value.slice(0, 5)}*****${value.slice(-4)}`;
    default:
      return `${value.slice(0, 4)}…${value.slice(-4)}`;
  }
}

/**
 * Texto da chave na ficha do cliente. Para quem não pode ver a chave inteira, a máscara é aplicada
 * aqui também, mesmo que a API já devolva mascarada.
 */
export function displayPixKey(type: PixKeyType | undefined, value: string | undefined, full: boolean): string {
  if (!value || !type) return 'Não cadastrada';
  const shown = full ? (type === 'cpf' && !isApiMasked(type, value) ? formatCpf(value) : value) : maskPixKey(type, value);
  return `${PIX_KEY_TYPE_LABEL[type]} · ${shown}`;
}
