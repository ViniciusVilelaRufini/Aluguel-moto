import { describe, expect, it } from 'vitest';
import { maskCpf, formatCpf, displayCpf, isValidCpf } from '@/lib/cpf';

describe('maskCpf', () => {
  it('masks as ***.456.789-**', () => {
    expect(maskCpf('12345678901')).toBe('***.456.789-**');
    expect(maskCpf('123.456.789-01')).toBe('***.456.789-**');
  });
  it('keeps a CPF the API already masked', () => {
    expect(maskCpf('***.444.777-**')).toBe('***.444.777-**');
    expect(displayCpf('***.444.777-**', false)).toBe('***.444.777-**');
  });
  it('handles missing or invalid values', () => {
    expect(maskCpf(undefined)).toBe('—');
    expect(maskCpf('123')).toBe('***.***.***-**');
  });
  it('formats full CPF', () => {
    expect(formatCpf('12345678901')).toBe('123.456.789-01');
  });
});

describe('isValidCpf', () => {
  it('aceita CPF com dígitos verificadores corretos', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });
  it('recusa dígito verificador errado, repetidos e tamanho errado', () => {
    expect(isValidCpf('52998224726')).toBe(false);
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('12345678901')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
  });
});
