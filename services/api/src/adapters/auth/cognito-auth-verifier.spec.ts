import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { loadConfig } from '../../config/env';
import { CognitoAuthVerifier } from './cognito-auth-verifier';

const REGION = 'sa-east-1';
const POOL = 'sa-east-1_CUSTOMER';
const ISS = `https://cognito-idp.${REGION}.amazonaws.com/${POOL}`;

describe('CognitoAuthVerifier', () => {
  let verifier: CognitoAuthVerifier;
  let sign: (claims: Record<string, unknown>, iss?: string) => Promise<string>;

  beforeAll(async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
    const cfg = { ...loadConfig(), cognito: { region: REGION, customerPoolId: POOL, customerClientId: 'app-cliente' } };
    verifier = new CognitoAuthVerifier(cfg, () => createLocalJWKSet({ keys: [jwk] }));
    sign = (claims, iss = ISS) =>
      new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setIssuer(iss).setSubject('sub-1').setIssuedAt().setExpirationTime('5m').sign(privateKey);
  });

  it('aceita access token do app client configurado', async () => {
    const t = await sign({ token_use: 'access', client_id: 'app-cliente', username: 'u@example.com' });
    await expect(verifier.verify(t)).resolves.toMatchObject({ sub: 'sub-1', pool: 'customer', groups: [] });
  });

  it('recusa access token de outro app client', async () => {
    const t = await sign({ token_use: 'access', client_id: 'app-intruso' });
    await expect(verifier.verify(t)).rejects.toThrow(/client_id/);
  });

  it('id token: valida aud', async () => {
    await expect(verifier.verify(await sign({ token_use: 'id', aud: 'app-cliente', email: 'u@example.com' }))).resolves.toMatchObject({ email: 'u@example.com' });
    await expect(verifier.verify(await sign({ token_use: 'id', aud: 'outro' }))).rejects.toThrow();
  });

  it('recusa emissor desconhecido', async () => {
    await expect(verifier.verify(await sign({ token_use: 'access', client_id: 'app-cliente' }, 'https://evil.example.com/pool'))).rejects.toThrow(/emissor/);
  });
});
