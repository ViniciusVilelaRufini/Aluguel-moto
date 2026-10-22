import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/core/cognito.dart';
import 'package:volti_cliente/features/onboarding/otp_flow.dart';

import 'cognito_test.dart' show FakeTransport, config;

/// Timer manual: o teste chama [tick] para avancar um segundo.
class ManualTicker {
  final _callbacks = <void Function(Timer)>[];
  final _timers = <_FakeTimer>[];
  Timer periodic(Duration d, void Function(Timer) cb) {
    final t = _FakeTimer();
    _callbacks.add(cb);
    _timers.add(t);
    return t;
  }

  void tick([int n = 1]) {
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < _callbacks.length; j++) {
        if (_timers[j].isActive) _callbacks[j](_timers[j]);
      }
    }
  }
}

class _FakeTimer implements Timer {
  bool _active = true;
  @override
  void cancel() => _active = false;
  @override
  bool get isActive => _active;
  @override
  int get tick => 0;
}

/// Cliente de codigo falso para a maquina de estados.
class FakeOtpClient implements OtpAuthClient {
  int starts = 0, resends = 0;
  final verified = <String>[];
  Object? startError;
  String good = '123456';

  @override
  Future<OtpChallenge> start(OtpChannel channel, String destination) async {
    starts++;
    if (startError != null) throw startError!;
    return OtpChallenge(channel: channel, destination: destination, signUp: false, session: 's$starts');
  }

  @override
  Future<OtpChallenge> resend(OtpChallenge c) async {
    resends++;
    return c;
  }

  @override
  Future<void> verify(OtpChallenge c, String code) async {
    if (code != good) throw const OtpException(OtpError.invalidCode);
    verified.add(code);
  }
}


void main() {
  group('OtpFlowController', () {
    late FakeOtpClient client;
    late ManualTicker ticker;
    late OtpFlowController c;
    setUp(() {
      client = FakeOtpClient();
      ticker = ManualTicker();
      c = OtpFlowController(client: client, channel: OtpChannel.sms, periodic: ticker.periodic);
    });
    tearDown(() => c.dispose());

    test('envia → codigo com contagem de 60 s; reenviar so depois da contagem', () async {
      expect(c.phase, OtpPhase.enterDestination);
      await c.send('+5511987654321');
      expect(c.phase, OtpPhase.enterCode);
      expect(c.challenge!.destination, '+5511987654321');
      expect(c.resendIn, 60);
      expect(c.canResend, isFalse);

      await c.resend();
      expect(client.resends, 0, reason: 'contagem ainda correndo');

      ticker.tick(59);
      expect(c.resendIn, 1);
      ticker.tick();
      expect(c.resendIn, 0);
      expect(c.canResend, isTrue);

      await c.resend();
      expect(client.resends, 1);
      expect(c.resendIn, 60, reason: 'reenvio reinicia a contagem');
    });

    test('codigo errado: continua no codigo com erro; certo: conclui', () async {
      await c.send('+5511987654321');
      expect(await c.verify('12345'), isFalse, reason: 'menos de 6 digitos nem chama o cliente');
      expect(c.error, isNull);

      expect(await c.verify('000000'), isFalse);
      expect(c.phase, OtpPhase.enterCode);
      expect(c.error, OtpError.invalidCode);

      expect(await c.verify('123456'), isTrue);
      expect(c.phase, OtpPhase.done);
      expect(c.error, isNull);
      expect(client.verified, ['123456']);
    });

    test('falha no envio volta ao destino com o motivo', () async {
      client.startError = const CognitoException(CognitoException.network);
      await c.send('+5511987654321');
      expect(c.phase, OtpPhase.enterDestination);
      expect(c.error, OtpError.network);
    });

    test('corrigir o numero cancela a contagem e limpa o desafio', () async {
      await c.send('+5511987654321');
      c.editDestination();
      expect(c.phase, OtpPhase.enterDestination);
      expect(c.challenge, isNull);
      expect(c.resendIn, 0);
    });
  });

  group('CognitoOtpClient com Cognito falso', () {
    late FakeTransport t;
    late List<CognitoTokens> adopted;
    late CognitoOtpClient client;
    setUp(() {
      t = FakeTransport();
      adopted = [];
      client = CognitoOtpClient(CognitoIdentityClient(config, t), onTokens: (tk) async => adopted.add(tk));
    });

    Map<String, dynamic> authResult(String access) => {
          'AuthenticationResult': {'AccessToken': access, 'RefreshToken': 'r', 'ExpiresIn': 3600},
        };

    test('conta nova: SignUp → ConfirmSignUp(Session) → InitiateAuth(Session) sem 2o codigo', () async {
      t.on('SignUp', {'UserConfirmed': false, 'Session': 'su'});
      t.on('ConfirmSignUp', {'Session': 'cs'});
      t.on('InitiateAuth', authResult('novo'));

      final ch = await client.start(OtpChannel.sms, '+5511987654321');
      expect(ch.signUp, isTrue);
      await client.verify(ch, '111111');

      expect(t.calls.map((c) => c.$1), ['SignUp', 'ConfirmSignUp', 'InitiateAuth']);
      expect(t.calls[1].$2, {'ClientId': 'client123', 'Username': '+5511987654321', 'ConfirmationCode': '111111', 'Session': 'su'});
      expect(t.calls[2].$2['Session'], 'cs');
      expect(adopted.single.accessToken, 'novo');
    });

    test('conta existente: UsernameExists → InitiateAuth SMS_OTP → RespondToAuthChallenge', () async {
      t.on('SignUp', const CognitoException('UsernameExistsException'));
      t.on('InitiateAuth', {'ChallengeName': 'SMS_OTP', 'Session': 'ia'});
      t.on('RespondToAuthChallenge', authResult('ok'));

      final ch = await client.start(OtpChannel.sms, '+5511987654321');
      expect(ch.signUp, isFalse);
      expect(ch.session, 'ia');
      expect(t.calls.last.$2['AuthParameters'], {'USERNAME': '+5511987654321', 'PREFERRED_CHALLENGE': 'SMS_OTP'});

      await client.verify(ch, '222222');
      expect(t.calls.last.$1, 'RespondToAuthChallenge');
      expect(t.calls.last.$2['ChallengeResponses'], {'USERNAME': '+5511987654321', 'SMS_OTP_CODE': '222222'});
      expect(adopted.single.accessToken, 'ok');
    });

    test('e-mail usa EMAIL_OTP e o atributo email', () async {
      t.on('SignUp', const CognitoException('UsernameExistsException'));
      t.on('InitiateAuth', {'ChallengeName': 'EMAIL_OTP', 'Session': 'e'});
      await client.start(OtpChannel.email, 'ana@x.com');
      expect(t.calls.first.$2['UserAttributes'], [
        {'Name': 'email', 'Value': 'ana@x.com'},
      ]);
      expect(t.calls.last.$2['AuthParameters']['PREFERRED_CHALLENGE'], 'EMAIL_OTP');
    });

    test('cadastro nao confirmado: reenvia o codigo de confirmacao', () async {
      t.on('SignUp', const CognitoException('UsernameExistsException'));
      t.on('InitiateAuth', const CognitoException('UserNotConfirmedException'));
      final ch = await client.start(OtpChannel.sms, '+5511987654321');
      expect(ch.signUp, isTrue);
      expect(t.calls.last.$1, 'ResendConfirmationCode');
    });

    test('codigo errado vira OtpError.invalidCode e nao grava tokens', () async {
      t.on('SignUp', const CognitoException('UsernameExistsException'));
      t.on('InitiateAuth', {'ChallengeName': 'SMS_OTP', 'Session': 'ia'});
      t.on('RespondToAuthChallenge', const CognitoException('CodeMismatchException'));
      final ch = await client.start(OtpChannel.sms, '+5511987654321');
      await expectLater(client.verify(ch, '000000'),
          throwsA(isA<OtpException>().having((e) => e.error, 'error', OtpError.invalidCode)));
      expect(adopted, isEmpty);
    });

    test('limite de envios vira tooManyAttempts', () async {
      t.on('SignUp', const CognitoException('LimitExceededException'));
      await expectLater(client.start(OtpChannel.sms, '+5511987654321'),
          throwsA(isA<OtpException>().having((e) => e.error, 'error', OtpError.tooManyAttempts)));
    });
  });

  group('DevOtpClient', () {
    test('aceita so 123456 e entra com e-mail derivado do telefone', () async {
      final emails = <String>[];
      final dev = DevOtpClient((e) async => emails.add(e));
      final ch = await dev.start(OtpChannel.sms, '+5511987654321');
      await expectLater(dev.verify(ch, '000000'), throwsA(isA<OtpException>()));
      await dev.verify(ch, '123456');
      expect(emails, ['5511987654321@celular.volti.dev']);
    });
  });

  group('telefone', () {
    test('celular BR para E.164 e de volta', () {
      expect(brMobileToE164('(11) 98765-4321'), '+5511987654321');
      expect(brMobileToE164('+55 11 98765-4321'), '+5511987654321');
      expect(brMobileToE164('(11) 8765-4321'), isNull, reason: 'fixo/sem o 9');
      expect(brMobileToE164('(01) 98765-4321'), isNull);
      expect(formatBrPhone('+5511987654321'), '(11) 98765-4321');
      expect(looksLikeEmail('ana@x.com'), isTrue);
      expect(looksLikeEmail('ana@x'), isFalse);
    });
  });
}
