import { AdminDeleteUserCommand, AdminGetUserCommand, AdminUserGlobalSignOutCommand, type CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { CustomerContact, CustomerIdentityDirectory } from '../../ports/customer-identity.port';

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

  /** Task 30: só e-mail com `email_verified = true` e telefone com `phone_number_verified = true`. */
  async contactInfo(sub: string): Promise<CustomerContact | null> {
    try {
      const res = await this.client.send(new AdminGetUserCommand({ UserPoolId: this.userPoolId, Username: sub }));
      const attrs = new Map((res.UserAttributes ?? []).map((a) => [a.Name, a.Value]));
      const email = attrs.get('email')?.trim().toLowerCase();
      const phone = attrs.get('phone_number')?.trim();
      const out: CustomerContact = {
        ...(email && attrs.get('email_verified') === 'true' ? { email } : {}),
        ...(phone && attrs.get('phone_number_verified') === 'true' ? { phone } : {}),
      };
      return out.email || out.phone ? out : null;
    } catch (err) {
      if ((err as { name?: string }).name === 'UserNotFoundException') return null;
      throw err;
    }
  }
}
