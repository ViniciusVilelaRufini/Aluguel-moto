import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { STAFF_GROUPS, type StaffGroup } from '../../common/enums';
import type { AppConfig } from '../../config/env';
import { AuthPool, AuthVerifier, InvalidTokenError, VerifiedToken } from '../../ports/auth-verifier.port';

/** `AUTH_MODE=cognito`: valida pelo JWKS de cada User Pool; o pool é identificado pelo `iss`. */
export class CognitoAuthVerifier implements AuthVerifier {
  private readonly pools: Array<{ pool: AuthPool; issuer: string; jwks: JWTVerifyGetKey }> = [];

  constructor(cfg: AppConfig) {
    const add = (pool: AuthPool, poolId?: string) => {
      if (!poolId) return;
      const issuer = `https://cognito-idp.${cfg.cognito.region}.amazonaws.com/${poolId}`;
      this.pools.push({ pool, issuer, jwks: createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)) });
    };
    add('customer', cfg.cognito.customerPoolId);
    add('staff', cfg.cognito.staffPoolId);
    if (this.pools.length === 0) throw new Error('COGNITO_CUSTOMER_POOL_ID/COGNITO_STAFF_POOL_ID não configurados.');
  }

  async verify(token: string): Promise<VerifiedToken> {
    let iss: string | undefined;
    try {
      iss = decodeJwt(token).iss;
    } catch {
      throw new InvalidTokenError('token malformado');
    }
    const entry = this.pools.find((p) => p.issuer === iss);
    if (!entry) throw new InvalidTokenError('emissor desconhecido');
    try {
      const { payload } = await jwtVerify(token, entry.jwks, { issuer: entry.issuer });
      if (payload.token_use !== 'access' && payload.token_use !== 'id') throw new InvalidTokenError('token_use inválido');
      const groups = ((payload['cognito:groups'] as string[] | undefined) ?? []).filter((g): g is StaffGroup =>
        (STAFF_GROUPS as string[]).includes(g),
      );
      return {
        sub: String(payload.sub),
        email: String(payload.email ?? payload.username ?? ''),
        groups: entry.pool === 'staff' ? groups : [],
        pool: entry.pool,
      };
    } catch (err) {
      if (err instanceof InvalidTokenError) throw err;
      throw new InvalidTokenError((err as Error).message);
    }
  }
}
