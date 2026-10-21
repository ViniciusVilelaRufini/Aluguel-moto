// services/api/src/ports/push-notifier.port.ts — notificações push (FCM em produção, log em dev).
export const PUSH_NOTIFIER = Symbol('PUSH_NOTIFIER');

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushNotifier {
  /** Envia para todos os dispositivos registrados do destinatário (`Device.ownerId`). */
  sendToOwner(ownerId: string, message: PushMessage): Promise<void>;
}
