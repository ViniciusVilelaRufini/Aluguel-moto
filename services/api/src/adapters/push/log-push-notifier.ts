import { Logger } from '@nestjs/common';
import type { PushMessage, PushNotifier } from '../../ports/push-notifier.port';

/** `PUSH_MODE=log`: só registra (sem conteúdo da mensagem, que pode ter dado pessoal). */
export class LogPushNotifier implements PushNotifier {
  private readonly logger = new Logger('LogPushNotifier');

  async sendToOwner(ownerId: string, message: PushMessage): Promise<void> {
    this.logger.log({ msg: 'push_sent', ownerId, dataKeys: Object.keys(message.data ?? {}) });
  }
}
