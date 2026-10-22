import { AdminAddUserToGroupCommand, AdminDisableUserCommand, AdminRemoveUserFromGroupCommand, AdminUserGlobalSignOutCommand } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoStaffDirectory } from './cognito-staff-directory';

describe('CognitoStaffDirectory (QA-04)', () => {
  const send = jest.fn().mockResolvedValue({});
  const dir = new CognitoStaffDirectory({ send } as any, 'sa-east-1_staff');
  beforeEach(() => send.mockClear());

  it('remove grupo no pool (username = sub) e encerra as sessões', async () => {
    await dir.updateGroups({ sub: 'sub-1', email: 'op@volti.dev' }, { add: ['suporte'], remove: ['operacao'] });
    const cmds = send.mock.calls.map(([c]) => c);
    expect(cmds[0]).toBeInstanceOf(AdminAddUserToGroupCommand);
    expect(cmds[0].input).toEqual({ UserPoolId: 'sa-east-1_staff', Username: 'sub-1', GroupName: 'suporte' });
    expect(cmds[1]).toBeInstanceOf(AdminRemoveUserFromGroupCommand);
    expect(cmds[1].input).toEqual({ UserPoolId: 'sa-east-1_staff', Username: 'sub-1', GroupName: 'operacao' });
    expect(cmds[2]).toBeInstanceOf(AdminUserGlobalSignOutCommand);
  });

  it('desativar → AdminDisableUser + sign-out; sem sub usa o e-mail', async () => {
    await dir.setActive({ sub: null, email: 'op@volti.dev' }, false);
    const cmds = send.mock.calls.map(([c]) => c);
    expect(cmds[0]).toBeInstanceOf(AdminDisableUserCommand);
    expect(cmds[0].input.Username).toBe('op@volti.dev');
    expect(cmds[1]).toBeInstanceOf(AdminUserGlobalSignOutCommand);
  });
});
