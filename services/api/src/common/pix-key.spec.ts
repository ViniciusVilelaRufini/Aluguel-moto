import { isValidCpf, maskPixKey, normalizePixKey } from './pix-key';

describe('chave Pix para estornos', () => {
  it('CPF: dígitos verificadores, normaliza e exige o CPF da conta', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('52998224726')).toBe(false);
    expect(normalizePixKey('cpf', '529.982.247-25')).toEqual({ ok: true, value: '52998224725' });
    expect(normalizePixKey('cpf', '52998224725', '52998224725')).toEqual({ ok: true, value: '52998224725' });
    expect(normalizePixKey('cpf', '11144477735', '52998224725')).toEqual({ ok: false, message: 'A chave CPF precisa ser o CPF da sua conta.' });
    expect(normalizePixKey('cpf', '12345678900').ok).toBe(false);
  });

  it('e-mail: minúsculo e formato', () => {
    expect(normalizePixKey('email', ' Maria@Volti.com.BR ')).toEqual({ ok: true, value: 'maria@volti.com.br' });
    expect(normalizePixKey('email', 'maria@').ok).toBe(false);
    expect(normalizePixKey('email', `${'a'.repeat(70)}@volti.com`).ok).toBe(false);
  });

  it('telefone: celular brasileiro em E.164 (aceita máscara e sem +55)', () => {
    expect(normalizePixKey('phone', '+55 (11) 98765-4321')).toEqual({ ok: true, value: '+5511987654321' });
    expect(normalizePixKey('phone', '11987654321')).toEqual({ ok: true, value: '+5511987654321' });
    expect(normalizePixKey('phone', '+551133334444').ok).toBe(false); // fixo
    expect(normalizePixKey('phone', '+14155552671').ok).toBe(false); // fora do Brasil
  });

  it('aleatória: UUID', () => {
    expect(normalizePixKey('random', '3F1C2A9E-7B1D-4C55-9A51-0B7D4F6E8A01')).toEqual({ ok: true, value: '3f1c2a9e-7b1d-4c55-9a51-0b7d4f6e8a01' });
    expect(normalizePixKey('random', 'abc').ok).toBe(false);
  });

  it('máscara por tipo', () => {
    expect(maskPixKey('cpf', '52998224725')).toBe('***.982.247-**');
    expect(maskPixKey('email', 'maria@volti.com.br')).toBe('m***@volti.com.br');
    expect(maskPixKey('phone', '+5511987654321')).toBe('+5511*****4321');
    expect(maskPixKey('random', '3f1c2a9e-7b1d-4c55-9a51-0b7d4f6e8a01')).toBe('3f1c…8a01');
  });
});
