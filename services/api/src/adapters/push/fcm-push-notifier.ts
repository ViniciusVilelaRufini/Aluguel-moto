import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type BatchResponse, type MulticastMessage } from 'firebase-admin/messaging';
import type { AppConfig } from '../../config/env';
import type { PushMessage, PushNotifier } from '../../ports/push-notifier.port';
import { LogPushNotifier } from './log-push-notifier';

/** Subconjunto do `Messaging` do firebase-admin usado aqui (os testes passam um falso). */
export interface FcmMessaging {
  sendEachForMulticast(message: MulticastMessage): Promise<BatchResponse>;
}

type DeviceStore = Pick<PrismaClient, 'device'>;

/** Limite do FCM por chamada multicast. */
export const FCM_MULTICAST_LIMIT = 500;
/** Erros que significam "token morto": o dispositivo sai do cadastro (app desinstalado, token trocado). */
const DEAD_TOKEN_CODES = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']);
const APP_NAME = 'volti-push';

/**
 * `PUSH_MODE=fcm`: envia pelo Firebase Cloud Messaging (firebase-admin) para todos os dispositivos do destinatário
 * (`Device.ownerId`). Credencial: `FCM_SERVICE_ACCOUNT_JSON` (Secrets Manager → variável do container). Tokens mortos são
 * apagados. Nunca loga token, título ou corpo (podem ter dado pessoal): só o destinatário (id interno) e as contagens.
 */
export class FcmPushNotifier implements PushNotifier {
  private readonly logger = new Logger('FcmPushNotifier');

  constructor(
    private readonly messaging: FcmMessaging,
    private readonly devices: DeviceStore,
  ) {}

  /** Inicializa o app do firebase-admin com a conta de serviço (JSON já validado pelo `assertSafeConfig`). */
  static fromServiceAccount(serviceAccountJson: string, devices: DeviceStore): FcmPushNotifier {
    const account = JSON.parse(serviceAccountJson) as { project_id: string; client_email: string; private_key: string };
    const app = getApps().some((a) => a.name === APP_NAME)
      ? getApp(APP_NAME)
      : initializeApp(
          { credential: cert({ projectId: account.project_id, clientEmail: account.client_email, privateKey: account.private_key }), projectId: account.project_id },
          APP_NAME,
        );
    return new FcmPushNotifier(getMessaging(app), devices);
  }

  async sendToOwner(ownerId: string, message: PushMessage): Promise<void> {
    const rows = await this.devices.device.findMany({ where: { ownerId }, select: { fcmToken: true } });
    const tokens = rows.map((r) => r.fcmToken);
    if (!tokens.length) {
      this.logger.log({ msg: 'push_no_devices', ownerId });
      return;
    }
    let sent = 0;
    let failed = 0;
    const dead: string[] = [];
    for (let i = 0; i < tokens.length; i += FCM_MULTICAST_LIMIT) {
      const batch = tokens.slice(i, i + FCM_MULTICAST_LIMIT);
      const res = await this.messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: message.title, body: message.body },
        ...(message.data ? { data: message.data } : {}),
        android: { priority: 'high' },
        apns: { headers: { 'apns-priority': '10' } },
      });
      sent += res.successCount;
      failed += res.failureCount;
      res.responses.forEach((r, idx) => {
        if (!r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code)) dead.push(batch[idx]);
      });
    }
    if (dead.length) await this.devices.device.deleteMany({ where: { fcmToken: { in: dead } } });
    this.logger.log({ msg: 'push_sent', ownerId, devices: tokens.length, sent, failed, removed: dead.length, dataKeys: Object.keys(message.data ?? {}) });
  }
}

/** Porta de push escolhida por `PUSH_MODE` (fcm = Firebase; log = só registra, dev). */
export function createPushNotifier(cfg: Pick<AppConfig, 'pushMode' | 'fcmServiceAccountJson'>, devices: DeviceStore): PushNotifier {
  if (cfg.pushMode !== 'fcm') return new LogPushNotifier();
  if (!cfg.fcmServiceAccountJson) throw new Error('PUSH_MODE=fcm exige FCM_SERVICE_ACCOUNT_JSON.');
  return FcmPushNotifier.fromServiceAccount(cfg.fcmServiceAccountJson, devices);
}
