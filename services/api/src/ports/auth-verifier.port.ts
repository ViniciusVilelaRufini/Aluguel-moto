// services/api/src/ports/auth-verifier.port.ts — valida JWT (dev HS256 `volti-dev` ou Cognito JWKS).
import type { StaffGroup } from '../common/enums';

export const AUTH_VERIFIER = Symbol('AUTH_VERIFIER');

export type AuthPool = 'customer' | 'staff';

export interface VerifiedToken {
  sub: string;
  email: string;
  groups: StaffGroup[];
  pool: AuthPool;
}

export interface AuthVerifier {
  /** Lança erro se o token for inválido ou expirado. */
  verify(token: string): Promise<VerifiedToken>;
}

export class InvalidTokenError extends Error {}
