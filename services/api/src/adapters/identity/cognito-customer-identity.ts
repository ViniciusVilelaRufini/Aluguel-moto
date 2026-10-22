import { AdminDeleteUserCommand, AdminUserGlobalSignOutCommand, type CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { CustomerIdentityDirectory } from '../../ports/customer-identity.port';

/** `AUTH_MODE=cognito`: encerra as sessões (refresh token) e exclui o usuário do pool de clientes. Usuário já ausente = ok. */
export class CognitoCustomerIdentityDirectory implements CustomerIdentityDirectory {
  constructor(
    private readonly client: Pick<CognitoIdentityProviderClient, 'send'>,
    private readonly userPoolId: string,
  ) {}

  async deleteIdentity(sub: string): Promise<void> {
    try {
      await this.client.send(new AdminUserGlobalSignOutCommand({ UserPoolId: this.userPoolId, Username: sub }));
      await this.client.send(new AdminDeleteUserCommand({ UserPoolId: this.userPoolId, Username: sub }));
    } catch (err) {
      if ((err as { name?: string }).name === 'UserNotFoundException') return;
      throw err;
    }
  }
}
