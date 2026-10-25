import { AdminAddUserToGroupCommand, AdminGetUserCommand, AdminDisableUserCommand, AdminRemoveUserFromGroupCommand, AdminUserGlobalSignOutCommand } from '@aws-sdk/client-cognito-identity-provider';
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

  it('M7: e-mail verificado pelo sub (AdminGetUser); não verificado → null', async () => {
    send.mockResolvedValueOnce({ UserAttributes: [{ Name: 'email', Value: 'Ana@Volti.com.br' }, { Name: 'email_verified', Value: 'true' }] });
    await expect(dir.verifiedEmail('sub-1')).resolves.toBe('ana@volti.com.br');
    expect(send.mock.calls[0][0]).toBeInstanceOf(AdminGetUserCommand);
    expect(send.mock.calls[0][0].input).toEqual({ UserPoolId: 'sa-east-1_staff', Username: 'sub-1' });
    send.mockResolvedValueOnce({ UserAttributes: [{ Name: 'email', Value: 'x@volti.dev' }, { Name: 'email_verified', Value: 'false' }] });
    await expect(dir.verifiedEmail('sub-2')).resolves.toBeNull();
  });
});
