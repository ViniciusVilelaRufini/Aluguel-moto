/**
 * Partes do login Cognito que o painel inteiro usa (logout), sem puxar a biblioteca SRP para todas as páginas.
 */

export interface StaffPoolConfig {
  userPoolId: string;
  clientId: string;
}

const POOL_ID = /^[a-z]{2}-[a-z]+-\d_[0-9a-zA-Z]+$/;

export function isPoolConfigured(cfg: StaffPoolConfig): boolean {
  return POOL_ID.test(cfg.userPoolId) && !!cfg.clientId;
}

export function regionOf(userPoolId: string): string {
  return userPoolId.split('_')[0];
}

export function cognitoEndpoint(userPoolId: string): string {
  return `https://cognito-idp.${regionOf(userPoolId)}.amazonaws.com/`;
}

/** RevokeToken: invalida o refresh token e os access tokens emitidos com ele (client com revogação habilitada). */
export async function revokeRefreshToken(cfg: StaffPoolConfig, refreshToken: string): Promise<boolean> {
  if (!isPoolConfigured(cfg)) return false;
  try {
    const res = await fetch(cognitoEndpoint(cfg.userPoolId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': 'AWSCognitoIdentityProviderService.RevokeToken' },
      body: JSON.stringify({ Token: refreshToken, ClientId: cfg.clientId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
