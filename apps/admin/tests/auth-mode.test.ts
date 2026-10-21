import { describe, expect, it } from 'vitest';
import { resolveAuthMode } from '@/lib/auth-mode';

describe('resolveAuthMode', () => {
  it('production build without the variable fails closed to cognito', () => {
    expect(resolveAuthMode(undefined, 'production')).toBe('cognito');
    expect(resolveAuthMode('', 'production')).toBe('cognito');
    expect(resolveAuthMode('qualquer', 'production')).toBe('cognito');
  });
  it('dev only when explicitly set, even in production', () => {
    expect(resolveAuthMode('dev', 'production')).toBe('dev');
  });
  it('cognito when set', () => {
    expect(resolveAuthMode('cognito', 'development')).toBe('cognito');
  });
  it('local development defaults to dev', () => {
    expect(resolveAuthMode(undefined, 'development')).toBe('dev');
    expect(resolveAuthMode(undefined, 'test')).toBe('dev');
  });
});
