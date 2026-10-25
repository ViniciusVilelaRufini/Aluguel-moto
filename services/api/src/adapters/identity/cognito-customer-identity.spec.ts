import { AdminDeleteUserCommand, AdminGetUserCommand, AdminUserGlobalSignOutCommand } from '@aws-sdk/client-cognito-identity-provider';
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

  it('Task 30: contactInfo devolve só e-mail e telefone verificados (AdminGetUser, username = sub)', async () => {
    const attrs = (over: Record<string, string>) => ({ UserAttributes: Object.entries(over).map(([Name, Value]) => ({ Name, Value })) });
    const send = jest.fn().mockResolvedValue(attrs({ email: 'Maria@Exemplo.com', email_verified: 'true', phone_number: '+5511999990000', phone_number_verified: 'true' }));
    const dir = new CognitoCustomerIdentityDirectory({ send } as any, 'sa-east-1_clientes');
    expect(await dir.contactInfo('sub-1')).toEqual({ email: 'maria@exemplo.com', phone: '+5511999990000' });
    expect(send.mock.calls[0][0]).toBeInstanceOf(AdminGetUserCommand);
    expect(send.mock.calls[0][0].input).toEqual({ UserPoolId: 'sa-east-1_clientes', Username: 'sub-1' });
    send.mockResolvedValueOnce(attrs({ email: 'x@exemplo.com', email_verified: 'false', phone_number: '+5511999990000', phone_number_verified: 'true' }));
    expect(await dir.contactInfo('sub-1')).toEqual({ phone: '+5511999990000' });
    send.mockResolvedValueOnce(attrs({ email: 'x@exemplo.com' }));
    expect(await dir.contactInfo('sub-1')).toBeNull();
    send.mockRejectedValueOnce(Object.assign(new Error('nope'), { name: 'UserNotFoundException' }));
    expect(await dir.contactInfo('sub-1')).toBeNull();
  });

  it('usuário já ausente no pool não é erro', async () => {
    const send = jest.fn().mockRejectedValue(Object.assign(new Error('nope'), { name: 'UserNotFoundException' }));
    await expect(new CognitoCustomerIdentityDirectory({ send } as any, 'p').deleteIdentity('sub-1')).resolves.toBeUndefined();
  });
});
