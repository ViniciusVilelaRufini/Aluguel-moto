import { AdminDeleteUserCommand, AdminUserGlobalSignOutCommand } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoCustomerIdentityDirectory } from './cognito-customer-identity';

describe('CognitoCustomerIdentityDirectory (QA-07)', () => {
  it('encerra as sessões e exclui o usuário do pool de clientes (username = sub)', async () => {
    const send = jest.fn().mockResolvedValue({});
    await new CognitoCustomerIdentityDirectory({ send } as any, 'sa-east-1_clientes').deleteIdentity('sub-1');
    const [first, second] = send.mock.calls.map(([c]) => c);
    expect(first).toBeInstanceOf(AdminUserGlobalSignOutCommand);
    expect(second).toBeInstanceOf(AdminDeleteUserCommand);
    expect(second.input).toEqual({ UserPoolId: 'sa-east-1_clientes', Username: 'sub-1' });
  });

  it('usuário já ausente no pool não é erro', async () => {
    const send = jest.fn().mockRejectedValue(Object.assign(new Error('nope'), { name: 'UserNotFoundException' }));
    await expect(new CognitoCustomerIdentityDirectory({ send } as any, 'p').deleteIdentity('sub-1')).resolves.toBeUndefined();
  });
});
