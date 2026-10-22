import { createHash } from 'node:crypto';

/**
 * QA-07: na exclusão LGPD, `Customer.cognitoSub` vira `deleted:<sha256(sub)>`. O `sub` original não fica guardado, mas um
 * token com esse `sub` (ainda válido no Cognito até expirar) é reconhecido e recusado em vez de criar uma conta nova.
 */
export function deletedSubMarker(sub: string): string {
  return `deleted:${createHash('sha256').update(sub, 'utf8').digest('hex')}`;
}
