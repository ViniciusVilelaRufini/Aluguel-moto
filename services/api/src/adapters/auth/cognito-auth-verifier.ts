import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { STAFF_GROUPS, type StaffGroup } from '../../common/enums';
import type { AppConfig } from '../../config/env';
import { AuthPool, AuthVerifier, InvalidTokenError, VerifiedToken } from '../../ports/auth-verifier.port';

/** `AUTH_MODE=cognito`: valida pelo JWKS de cada User Pool; o pool é identificado pelo `iss`. */
export class CognitoAuthVerifier implements AuthVerifier {
  private readonly pools: Array<{ pool: AuthPool; issuer: string; clientId?: string; jwks: JWTVerifyGetKey }> = [];

  /** `jwksFor` permite injetar as chaves em testes (padrão: JWKS remoto do pool). */
  constructor(cfg: AppConfig, jwksFor: (issuer: string) => JWTVerifyGetKey = (iss) => createRemoteJWKSet(new URL(`${iss}/.well-known/jwks.json`))) {
    const add = (pool: AuthPool, poolId?: string, clientId?: string) => {
      if (!poolId) return;
      const issuer = `https://cognito-idp.${cfg.cognito.region}.amazonaws.com/${poolId}`;
      this.pools.push({ pool, issuer, clientId, jwks: jwksFor(issuer) });
    };
    add('customer', cfg.cognito.customerPoolId, cfg.cognito.customerClientId);
    add('staff', cfg.cognito.staffPoolId, cfg.cognito.staffClientId);
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
      // App client do pool: access token traz `client_id`; id token traz `aud`.
      if (entry.clientId) {
        const client = payload.token_use === 'access' ? payload.client_id : Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
        if (client !== entry.clientId) throw new InvalidTokenError('client_id/aud não pertence ao app do pool');
      }
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
