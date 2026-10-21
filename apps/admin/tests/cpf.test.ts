import { describe, expect, it } from 'vitest';
import { maskCpf, formatCpf } from '@/lib/cpf';

describe('maskCpf', () => {
  it('masks as ***.456.789-**', () => {
    expect(maskCpf('12345678901')).toBe('***.456.789-**');
    expect(maskCpf('123.456.789-01')).toBe('***.456.789-**');
  });
  it('handles missing or invalid values', () => {
    expect(maskCpf(undefined)).toBe('—');
    expect(maskCpf('123')).toBe('***.***.***-**');
  });
  it('formats full CPF', () => {
    expect(formatCpf('12345678901')).toBe('123.456.789-01');
  });
});
