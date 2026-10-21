import { jwtVerify, SignJWT } from 'jose';
import { STAFF_GROUPS, type StaffGroup } from '../../common/enums';
import { AuthPool, AuthVerifier, InvalidTokenError, VerifiedToken } from '../../ports/auth-verifier.port';

export const DEV_ISSUER = 'volti-dev';
export const DEV_TOKEN_TTL_SECONDS = 12 * 60 * 60;

/** `AUTH_MODE=dev`: JWT HS256 do emissor local `volti-dev`, com as mesmas claims do Cognito. `aud` = pool. */
export class DevAuthVerifier implements AuthVerifier {
  private readonly key: Uint8Array;

  constructor(secret: string | undefined) {
    if (!secret || secret.length < 16) throw new Error('DEV_JWT_SECRET ausente ou curto demais (mínimo 16 caracteres).');
    this.key = new TextEncoder().encode(secret);
  }

  async issue(input: { sub: string; email: string; groups: StaffGroup[]; pool: AuthPool }): Promise<string> {
    return new SignJWT({ email: input.email, 'cognito:groups': input.groups, token_use: 'access' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(DEV_ISSUER)
      .setAudience(input.pool)
      .setSubject(input.sub)
      .setIssuedAt()
      .setExpirationTime(`${DEV_TOKEN_TTL_SECONDS}s`)
      .sign(this.key);
  }

  async verify(token: string): Promise<VerifiedToken> {
    try {
      const { payload } = await jwtVerify(token, this.key, { issuer: DEV_ISSUER, algorithms: ['HS256'] });
      const aud = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
      if (aud !== 'customer' && aud !== 'staff') throw new InvalidTokenError('pool inválido');
      if (!payload.sub) throw new InvalidTokenError('sub ausente');
      const groups = ((payload['cognito:groups'] as string[] | undefined) ?? []).filter((g): g is StaffGroup =>
        (STAFF_GROUPS as string[]).includes(g),
      );
      return { sub: payload.sub, email: String(payload.email ?? ''), groups: aud === 'staff' ? groups : [], pool: aud };
    } catch (err) {
      if (err instanceof InvalidTokenError) throw err;
      throw new InvalidTokenError((err as Error).message);
    }
  }
}
