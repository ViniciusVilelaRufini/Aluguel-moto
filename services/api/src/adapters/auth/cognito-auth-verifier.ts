import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { STAFF_GROUPS, type StaffGroup } from '../../common/enums';
import type { AppConfig } from '../../config/env';
import { AuthPool, AuthVerifier, InvalidTokenError, VerifiedToken } from '../../ports/auth-verifier.port';

/** `AUTH_MODE=cognito`: valida pelo JWKS de cada User Pool; o pool é identificado pelo `iss`. */
export class CognitoAuthVerifier implements AuthVerifier {
  /** `clientIds` vazio = qualquer client do pool; senão o `client_id` do token tem de estar na lista. */
  private readonly pools: Array<{ pool: AuthPool; issuer: string; clientIds: string[]; jwks: JWTVerifyGetKey }> = [];

  /** `jwksFor` permite injetar as chaves em testes (padrão: JWKS remoto do pool). */
  constructor(cfg: AppConfig, jwksFor: (issuer: string) => JWTVerifyGetKey = (iss) => createRemoteJWKSet(new URL(`${iss}/.well-known/jwks.json`))) {
    const add = (pool: AuthPool, poolId: string | undefined, clientIds: string[]) => {
      if (!poolId) return;
      const issuer = `https://cognito-idp.${cfg.cognito.region}.amazonaws.com/${poolId}`;
      this.pools.push({ pool, issuer, clientIds, jwks: jwksFor(issuer) });
    };
    add('customer', cfg.cognito.customerPoolId, cfg.cognito.customerClientId ? [cfg.cognito.customerClientId] : []);
    // Pool interno: painel e app do operador (COGNITO_STAFF_CLIENT_IDS, mais o legado COGNITO_STAFF_CLIENT_ID).
    add('staff', cfg.cognito.staffPoolId, cfg.cognito.staffClientIds);
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
      // QA-17: só access token autoriza a API (o id token é para o app, e o `aud` dele não prova o escopo de acesso).
      if (payload.token_use !== 'access') throw new InvalidTokenError('token_use inválido (só access token)');
      if (entry.clientIds.length && !entry.clientIds.includes(String(payload.client_id))) throw new InvalidTokenError('client_id não pertence ao app do pool');
      const groups = ((payload['cognito:groups'] as string[] | undefined) ?? []).filter((g): g is StaffGroup =>
        (STAFF_GROUPS as string[]).includes(g),
      );
      return {
        sub: String(payload.sub),
        // Access token do Cognito não traz e-mail; `username` não é e-mail (QA-17). O cadastro é casado pelo sub.
        email: typeof payload.email === 'string' ? payload.email : '',
        groups: entry.pool === 'staff' ? groups : [],
        pool: entry.pool,
      };
    } catch (err) {
      if (err instanceof InvalidTokenError) throw err;
      throw new InvalidTokenError((err as Error).message);
    }
  }
}
