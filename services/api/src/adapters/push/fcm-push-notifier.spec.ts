jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
  initializeApp: jest.fn((opts: unknown, name: string) => ({ name, opts })),
  cert: jest.fn((c: unknown) => ({ cert: c })),
}));
jest.mock('firebase-admin/messaging', () => ({ getMessaging: jest.fn(() => ({ sendEachForMulticast: jest.fn() })) }));

import { cert, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { Logger } from '@nestjs/common';
import { createPushNotifier, FCM_MULTICAST_LIMIT, FcmPushNotifier, type FcmMessaging } from './fcm-push-notifier';
import { LogPushNotifier } from './log-push-notifier';

function store(tokens: string[]) {
  return {
    device: {
      findMany: jest.fn().mockResolvedValue(tokens.map((fcmToken) => ({ fcmToken }))),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

const ok = { success: true as const, messageId: 'm' };
const fail = (code: string) => ({ success: false as const, error: { code, message: code } });

describe('FcmPushNotifier (firebase-admin simulado)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('envia para todos os dispositivos do destinatário com título, corpo e data', async () => {
    const devices = store(['tok-a', 'tok-b']);
    const messaging: FcmMessaging = { sendEachForMulticast: jest.fn().mockResolvedValue({ successCount: 2, failureCount: 0, responses: [ok, ok] }) };
    await new FcmPushNotifier(messaging, devices as never).sendToOwner('owner-1', { title: 'Cadastro aprovado', body: 'Tudo certo.', data: { kind: 'kyc' } });
    expect(devices.device.findMany).toHaveBeenCalledWith({ where: { ownerId: 'owner-1' }, select: { fcmToken: true } });
    expect(messaging.sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({ tokens: ['tok-a', 'tok-b'], notification: { title: 'Cadastro aprovado', body: 'Tudo certo.' }, data: { kind: 'kyc' } }),
    );
    expect(devices.device.deleteMany).not.toHaveBeenCalled();
  });

  it('sem dispositivos não chama o FCM', async () => {
    const messaging: FcmMessaging = { sendEachForMulticast: jest.fn() };
    await new FcmPushNotifier(messaging, store([]) as never).sendToOwner('owner-1', { title: 't', body: 'b' });
    expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('apaga só os tokens mortos (não registrado / inválido); erro transitório mantém o dispositivo', async () => {
    const devices = store(['vivo', 'morto', 'invalido', 'transitorio']);
    const messaging: FcmMessaging = {
      sendEachForMulticast: jest.fn().mockResolvedValue({
        successCount: 1,
        failureCount: 3,
        responses: [ok, fail('messaging/registration-token-not-registered'), fail('messaging/invalid-registration-token'), fail('messaging/internal-error')],
      }),
    };
    await new FcmPushNotifier(messaging, devices as never).sendToOwner('owner-1', { title: 't', body: 'b' });
    expect(devices.device.deleteMany).toHaveBeenCalledWith({ where: { fcmToken: { in: ['morto', 'invalido'] } } });
  });

  it('divide em lotes de 500 (limite do multicast)', async () => {
    const tokens = Array.from({ length: FCM_MULTICAST_LIMIT + 2 }, (_, i) => `t${i}`);
    const messaging: FcmMessaging = {
      sendEachForMulticast: jest.fn(async (m) => ({ successCount: m.tokens.length, failureCount: 0, responses: m.tokens.map(() => ok) })),
    };
    await new FcmPushNotifier(messaging, store(tokens) as never).sendToOwner('owner-1', { title: 't', body: 'b' });
    expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(2);
    expect((messaging.sendEachForMulticast as jest.Mock).mock.calls[1][0].tokens).toEqual(['t500', 't501']);
  });

  it('log sem token, título nem corpo (podem ter dado pessoal)', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const messaging: FcmMessaging = { sendEachForMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0, responses: [ok] }) };
    await new FcmPushNotifier(messaging, store(['token-secreto']) as never).sendToOwner('owner-1', { title: 'Olá Maria', body: 'Rua X, 10' });
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain('push_sent');
    expect(logged).not.toMatch(/token-secreto|Maria|Rua X/);
  });

  it('fromServiceAccount inicializa o firebase-admin com a conta de serviço (app nomeado)', () => {
    const json = JSON.stringify({ project_id: 'volti-teste', client_email: 'push@volti-teste.iam.gserviceaccount.com', private_key: 'chave-falsa' });
    const notifier = FcmPushNotifier.fromServiceAccount(json, store([]) as never);
    expect(notifier).toBeInstanceOf(FcmPushNotifier);
    expect(cert).toHaveBeenCalledWith({ projectId: 'volti-teste', clientEmail: 'push@volti-teste.iam.gserviceaccount.com', privateKey: 'chave-falsa' });
    expect(initializeApp).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'volti-teste' }), 'volti-push');
    expect(getMessaging).toHaveBeenCalled();
  });

  it('createPushNotifier: PUSH_MODE=fcm → FCM; log → LogPushNotifier (core.module deixa de fixar o log)', () => {
    const json = JSON.stringify({ project_id: 'volti-teste', client_email: 'push@volti-teste.iam.gserviceaccount.com', private_key: 'chave-falsa' });
    expect(createPushNotifier({ pushMode: 'fcm', fcmServiceAccountJson: json }, store([]) as never)).toBeInstanceOf(FcmPushNotifier);
    expect(createPushNotifier({ pushMode: 'log' }, store([]) as never)).toBeInstanceOf(LogPushNotifier);
    expect(() => createPushNotifier({ pushMode: 'fcm' }, store([]) as never)).toThrow(/FCM_SERVICE_ACCOUNT_JSON/);
  });
});
