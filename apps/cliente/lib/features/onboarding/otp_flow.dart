import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/auth_store.dart';
import '../../core/cognito.dart';
import '../../core/cognito_auth.dart';
import '../../core/errors.dart';

/// Canal do codigo de uso unico.
enum OtpChannel { sms, email }

/// Motivos de falha mostrados na tela do codigo.
enum OtpError { invalidCode, expiredCode, tooManyAttempts, invalidDestination, network, notConfigured, unknown }

class OtpException implements Exception {
  const OtpException(this.error);
  final OtpError error;
  @override
  String toString() => 'OtpException($error)';
}

/// Desafio em andamento: para quem o codigo foi e como confirmar.
class OtpChallenge {
  const OtpChallenge({
    required this.channel,
    required this.destination,
    required this.signUp,
    this.challengeName = 'SMS_OTP',
    this.session,
  });

  final OtpChannel channel;

  /// Telefone E.164 ou e-mail (tambem e o `USERNAME` no Cognito).
  final String destination;

  /// Conta nova: confirma com `ConfirmSignUp`; senao `RespondToAuthChallenge`.
  final bool signUp;
  final String challengeName;
  final String? session;
}

/// Fronteira do login por codigo. [verify] conclui o login (grava a sessao).
abstract class OtpAuthClient {
  Future<OtpChallenge> start(OtpChannel channel, String destination);
  Future<OtpChallenge> resend(OtpChallenge challenge);
  Future<void> verify(OtpChallenge challenge, String code);
}

OtpError otpErrorOf(Object e) {
  if (e is OtpException) return e.error;
  if (e is CognitoException) {
    return switch (e.type) {
      'CodeMismatchException' => OtpError.invalidCode,
      'ExpiredCodeException' || 'NotAuthorizedException' => OtpError.expiredCode,
      'LimitExceededException' ||
      'TooManyRequestsException' ||
      'TooManyFailedAttemptsException' ||
      'CodeDeliveryFailureException' =>
        OtpError.tooManyAttempts,
      'InvalidParameterException' => OtpError.invalidDestination,
      'NotConfigured' => OtpError.notConfigured,
      CognitoException.network => OtpError.network,
      _ => OtpError.unknown,
    };
  }
  if (e is DioException) return OtpError.network;
  if (e is AppFailure) return e.isNetwork ? OtpError.network : OtpError.unknown;
  return OtpError.unknown;
}

/// Cognito, login sem senha (`USER_AUTH` + `SMS_OTP`/`EMAIL_OTP`).
///
/// Comeca por `SignUp` sem senha: conta nova recebe o codigo de confirmacao.
/// `UsernameExistsException` = conta existente → `InitiateAuth` pede o codigo
/// (isso funciona mesmo com `preventUserExistenceErrors`, que nao afeta o SignUp).
class CognitoOtpClient implements OtpAuthClient {
  CognitoOtpClient(this.api, {required this.onTokens});
  final CognitoIdentityClient api;
  final Future<void> Function(CognitoTokens tokens) onTokens;

  static String challengeFor(OtpChannel c) => c == OtpChannel.sms ? 'SMS_OTP' : 'EMAIL_OTP';

  @override
  Future<OtpChallenge> start(OtpChannel channel, String destination) async {
    try {
      final r = await api.signUp(
        username: destination,
        attributes: {channel == OtpChannel.sms ? 'phone_number' : 'email': destination},
      );
      return OtpChallenge(
        channel: channel,
        destination: destination,
        signUp: true,
        challengeName: challengeFor(channel),
        session: r['Session'] as String?,
      );
    } on CognitoException catch (e) {
      if (e.type != 'UsernameExistsException') throw OtpException(otpErrorOf(e));
    }
    return _initiate(channel, destination);
  }

  Future<OtpChallenge> _initiate(OtpChannel channel, String destination) async {
    try {
      final r = await api.initiateUserAuth(username: destination, preferredChallenge: challengeFor(channel));
      return OtpChallenge(
        channel: channel,
        destination: destination,
        signUp: false,
        challengeName: (r['ChallengeName'] as String?) ?? challengeFor(channel),
        session: r['Session'] as String?,
      );
    } on CognitoException catch (e) {
      if (e.type == 'UserNotConfirmedException') {
        // Cadastro comecado e nao confirmado: reenvia o codigo de confirmacao.
        await _guard(() => api.resendConfirmationCode(username: destination));
        return OtpChallenge(channel: channel, destination: destination, signUp: true, challengeName: challengeFor(channel));
      }
      throw OtpException(otpErrorOf(e));
    }
  }

  @override
  Future<OtpChallenge> resend(OtpChallenge c) async {
    if (c.signUp) {
      await _guard(() => api.resendConfirmationCode(username: c.destination));
      return c;
    }
    return _initiate(c.channel, c.destination);
  }

  @override
  Future<void> verify(OtpChallenge c, String code) async {
    final Map<String, dynamic> result;
    if (c.signUp) {
      final confirmed = await _guard(() => api.confirmSignUp(username: c.destination, code: code, session: c.session));
      result = await _guard(() => api.initiateUserAuth(username: c.destination, session: confirmed['Session'] as String?));
    } else {
      result = await _guard(() => api.respondToOtp(
            challengeName: c.challengeName,
            username: c.destination,
            code: code,
            session: c.session ?? '',
          ));
    }
    final auth = result['AuthenticationResult'];
    if (auth is! Map<String, dynamic>) throw const OtpException(OtpError.unknown);
    await onTokens(CognitoTokens.fromAuthenticationResult(auth));
  }

  static Future<T> _guard<T>(Future<T> Function() f) async {
    try {
      return await f();
    } on CognitoException catch (e) {
      throw OtpException(otpErrorOf(e));
    }
  }
}

/// Modo `dev`: simula o SMS (codigo fixo [code]) e entra com `POST /dev/token`
/// usando um e-mail derivado do telefone, para a tela do codigo funcionar sem Cognito.
class DevOtpClient implements OtpAuthClient {
  DevOtpClient(this.signIn);
  final Future<void> Function(String email) signIn;

  static const code = '123456';

  static String emailFor(String destination) =>
      destination.contains('@') ? destination : '${destination.replaceAll(RegExp(r'\D'), '')}@celular.volti.dev';

  @override
  Future<OtpChallenge> start(OtpChannel channel, String destination) async =>
      OtpChallenge(channel: channel, destination: destination, signUp: false, challengeName: CognitoOtpClient.challengeFor(channel));

  @override
  Future<OtpChallenge> resend(OtpChallenge challenge) async => challenge;

  @override
  Future<void> verify(OtpChallenge challenge, String value) async {
    if (value != code) throw const OtpException(OtpError.invalidCode);
    await signIn(emailFor(challenge.destination));
  }
}

class _UnavailableOtpClient implements OtpAuthClient {
  @override
  Future<OtpChallenge> start(OtpChannel channel, String destination) => throw const OtpException(OtpError.notConfigured);
  @override
  Future<OtpChallenge> resend(OtpChallenge challenge) => throw const OtpException(OtpError.notConfigured);
  @override
  Future<void> verify(OtpChallenge challenge, String code) => throw const OtpException(OtpError.notConfigured);
}

/// Cliente de codigo conforme o modo de autenticacao.
final otpAuthClientProvider = Provider<OtpAuthClient>((ref) {
  final auth = ref.watch(authRepositoryProvider);
  if (auth is CognitoCustomerAuthRepository && auth.config.hasIdentityApi) {
    return CognitoOtpClient(auth.client, onTokens: auth.adopt);
  }
  if (auth is PersistentDevAuthRepository) {
    return DevOtpClient((email) => auth.signIn(sub: email, email: email));
  }
  if (auth is DevAuthRepository) {
    return DevOtpClient((email) => auth.signIn(sub: email, email: email));
  }
  return _UnavailableOtpClient();
});

enum OtpPhase { enterDestination, sending, enterCode, verifying, done }

/// Maquina de estados do login por codigo: destino → envio → codigo (com
/// contagem para reenviar) → confirmacao.
class OtpFlowController extends ChangeNotifier {
  OtpFlowController({
    required this.client,
    required this.channel,
    this.resendCooldown = const Duration(seconds: 60),
    this.codeLength = 6,
    Timer Function(Duration, void Function(Timer))? periodic,
  }) : _periodic = periodic ?? Timer.periodic;

  final OtpAuthClient client;
  final OtpChannel channel;
  final Duration resendCooldown;
  final int codeLength;
  final Timer Function(Duration, void Function(Timer)) _periodic;

  OtpPhase _phase = OtpPhase.enterDestination;
  OtpChallenge? _challenge;
  OtpError? _error;
  int _resendIn = 0;
  bool _resending = false;
  Timer? _timer;
  bool _disposed = false;

  OtpPhase get phase => _phase;
  OtpChallenge? get challenge => _challenge;
  OtpError? get error => _error;

  /// Segundos ate liberar o reenvio.
  int get resendIn => _resendIn;
  bool get resending => _resending;
  bool get canResend => _phase == OtpPhase.enterCode && _resendIn == 0 && !_resending;
  bool get busy => _phase == OtpPhase.sending || _phase == OtpPhase.verifying || _resending;

  Future<void> send(String destination) async {
    if (busy) return;
    _set(phase: OtpPhase.sending, error: null);
    try {
      _challenge = await client.start(channel, destination);
      _set(phase: OtpPhase.enterCode);
      _startCountdown();
    } catch (e) {
      _set(phase: OtpPhase.enterDestination, error: otpErrorOf(e));
    }
  }

  Future<void> resend() async {
    final c = _challenge;
    if (!canResend || c == null) return;
    _resending = true;
    _set(error: null);
    try {
      _challenge = await client.resend(c);
      _startCountdown();
    } catch (e) {
      _error = otpErrorOf(e);
    } finally {
      _resending = false;
      _notify();
    }
  }

  /// `true` quando o login foi concluido.
  Future<bool> verify(String code) async {
    final c = _challenge;
    if (c == null || code.length != codeLength || busy) return false;
    _set(phase: OtpPhase.verifying, error: null);
    try {
      await client.verify(c, code);
      _timer?.cancel();
      _set(phase: OtpPhase.done);
      return true;
    } catch (e) {
      _set(phase: OtpPhase.enterCode, error: otpErrorOf(e));
      return false;
    }
  }

  /// Volta para corrigir o telefone/e-mail.
  void editDestination() {
    if (busy) return;
    _timer?.cancel();
    _resendIn = 0;
    _challenge = null;
    _set(phase: OtpPhase.enterDestination, error: null);
  }

  void clearError() {
    if (_error != null) _set(error: null);
  }

  void _startCountdown() {
    _timer?.cancel();
    _resendIn = resendCooldown.inSeconds;
    _notify();
    _timer = _periodic(const Duration(seconds: 1), (t) {
      if (_resendIn > 0) _resendIn--;
      if (_resendIn == 0) t.cancel();
      _notify();
    });
  }

  static const _keep = Object();

  void _set({OtpPhase? phase, Object? error = _keep}) {
    if (phase != null) _phase = phase;
    if (!identical(error, _keep)) _error = error as OtpError?;
    _notify();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    super.dispose();
  }
}

// ---------------------------------------------------------------------------
// Telefone (Brasil)
// ---------------------------------------------------------------------------

/// "(11) 98765-4321" → "+5511987654321". `null` se nao for um celular valido
/// (DDD + 9 digitos comecando por 9).
String? brMobileToE164(String input) {
  var d = input.replaceAll(RegExp(r'\D'), '');
  if (d.length == 13 && d.startsWith('55')) d = d.substring(2);
  if (d.length != 11) return null;
  if (d[0] == '0' || d[2] != '9') return null;
  return '+55$d';
}

/// "+5511987654321" → "(11) 98765-4321". Outros formatos voltam como vieram.
String formatBrPhone(String e164) {
  final m = RegExp(r'^\+55(\d{2})(\d{4,5})(\d{4})$').firstMatch(e164);
  if (m == null) return e164;
  return '(${m[1]}) ${m[2]}-${m[3]}';
}

/// Validacao simples de e-mail para o login por codigo.
bool looksLikeEmail(String s) => RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(s.trim());

