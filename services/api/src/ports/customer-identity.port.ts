// services/api/src/ports/customer-identity.port.ts — identidade do cliente no pool de clientes (Cognito), QA-07.
export const CUSTOMER_IDENTITY = Symbol('CUSTOMER_IDENTITY');

/**
 * Exclusão LGPD: a identidade do titular sai do pool (e-mail/telefone não ficam no Cognito) e as sessões são encerradas.
 * Mesmo antes disso a API já recusa o token antigo pelo hash do `sub` (ver `deletedSubMarker`).
 * local: no-op. aws: AdminUserGlobalSignOut + AdminDeleteUser (username = sub; o pool entra por e-mail).
 */
export interface CustomerIdentityDirectory {
  deleteIdentity(sub: string): Promise<void>;
}
