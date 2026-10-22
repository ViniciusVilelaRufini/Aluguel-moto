import {
  AdminAddUserToGroupCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminRemoveUserFromGroupCommand,
  AdminUserGlobalSignOutCommand,
  type CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import type { StaffGroup } from '../../common/enums';
import type { StaffDirectory, StaffIdentity } from '../../ports/staff-directory.port';

/**
 * `AUTH_MODE=cognito`: pool interno. O pool entra por e-mail (username = sub), então o `sub` é o username; sem ele
 * (cadastro ainda não ligado), o e-mail serve de alias. Depois de remover grupo ou desativar, encerra as sessões
 * (AdminUserGlobalSignOut): o refresh token deixa de valer e o próximo token já vem sem o grupo.
 */
export class CognitoStaffDirectory implements StaffDirectory {
  constructor(
    private readonly client: Pick<CognitoIdentityProviderClient, 'send'>,
    private readonly userPoolId: string,
  ) {}

  private username(user: StaffIdentity): string {
    return user.sub ?? user.email;
  }

  async updateGroups(user: StaffIdentity, change: { add: StaffGroup[]; remove: StaffGroup[] }): Promise<void> {
    const Username = this.username(user);
    for (const GroupName of change.add) await this.client.send(new AdminAddUserToGroupCommand({ UserPoolId: this.userPoolId, Username, GroupName }));
    for (const GroupName of change.remove) await this.client.send(new AdminRemoveUserFromGroupCommand({ UserPoolId: this.userPoolId, Username, GroupName }));
    if (change.remove.length) await this.client.send(new AdminUserGlobalSignOutCommand({ UserPoolId: this.userPoolId, Username }));
  }

  async setActive(user: StaffIdentity, active: boolean): Promise<void> {
    const Username = this.username(user);
    if (active) {
      await this.client.send(new AdminEnableUserCommand({ UserPoolId: this.userPoolId, Username }));
      return;
    }
    await this.client.send(new AdminDisableUserCommand({ UserPoolId: this.userPoolId, Username }));
    await this.client.send(new AdminUserGlobalSignOutCommand({ UserPoolId: this.userPoolId, Username }));
  }
}
