/** Chave Pix para estornos (contrato v2, `MeUpdate.pixRefundKey`): validação e normalização por tipo. */
export type PixKeyType = 'cpf' | 'email' | 'phone' | 'random';

export type PixKeyResult = { ok: true; value: string } | { ok: false; message: string };

/** Dígitos verificadores do CPF (rejeita sequências repetidas como 111.111.111-11). */
export function isValidCpf(raw: string): boolean {
  const d = raw.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digit(9) === Number(d[9]) && digit(10) === Number(d[10]);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Celular brasileiro E.164: +55, DDD (2 dígitos, sem zero inicial) e 9 dígitos começando por 9. */
const BR_MOBILE = /^\+55[1-9]\d9\d{8}$/;
/** Chave aleatória (EVP) do DICT: UUID. */
const EVP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Valida e normaliza a chave pelo tipo. CPF: só dígitos, dígitos verificadores e, quando a conta tem CPF, igual a ele
 * (estorno só para o titular). E-mail: minúsculo, até 77 caracteres (limite do DICT). Telefone: E.164 de celular
 * brasileiro (aceita espaços, traços e parênteses na entrada). Aleatória: UUID minúsculo.
 */
export function normalizePixKey(type: PixKeyType, raw: string, accountCpf?: string | null): PixKeyResult {
  const v = raw.trim();
  switch (type) {
    case 'cpf': {
      const d = v.replace(/[.\-\s]/g, '');
      if (!/^\d{11}$/.test(d) || !isValidCpf(d)) return { ok: false, message: 'CPF inválido.' };
      if (accountCpf && accountCpf.replace(/\D/g, '') !== d) return { ok: false, message: 'A chave CPF precisa ser o CPF da sua conta.' };
      return { ok: true, value: d };
    }
    case 'email': {
      const e = v.toLowerCase();
      if (e.length > 77 || !EMAIL.test(e)) return { ok: false, message: 'E-mail inválido.' };
      return { ok: true, value: e };
    }
    case 'phone': {
      const p = v.replace(/[\s()-]/g, '');
      const e164 = p.startsWith('+') ? p : /^\d{11}$/.test(p) ? `+55${p}` : p;
      if (!BR_MOBILE.test(e164)) return { ok: false, message: 'Celular inválido. Use +55, DDD e o número.' };
      return { ok: true, value: e164 };
    }
    case 'random': {
      const k = v.toLowerCase();
      if (!EVP.test(k)) return { ok: false, message: 'Chave aleatória inválida.' };
      return { ok: true, value: k };
    }
    default:
      return { ok: false, message: 'Tipo de chave inválido.' };
  }
}

/** Máscara da chave para quem não precisa dela inteira (suporte, operação). */
export function maskPixKey(type: PixKeyType, value: string): string {
  switch (type) {
    case 'cpf':
      return `***.${value.slice(3, 6)}.${value.slice(6, 9)}-**`;
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
