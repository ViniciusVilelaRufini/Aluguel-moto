import { Logger } from '@nestjs/common';
import type { CustomerIdentityDirectory } from '../../ports/customer-identity.port';

/** `AUTH_MODE=dev`: não há pool de clientes; o token dev do titular excluído é recusado pelo hash do `sub`. */
export class LocalCustomerIdentityDirectory implements CustomerIdentityDirectory {
  private readonly logger = new Logger('LocalCustomerIdentity');

  async deleteIdentity(): Promise<void> {
    this.logger.log({ msg: 'customer_identity_delete_noop' });
  }

  /** O token dev já traz o e-mail (mesmas claims do Cognito); não há diretório para consultar. */
  async contactInfo(): Promise<null> {
    return null;
  }
}
