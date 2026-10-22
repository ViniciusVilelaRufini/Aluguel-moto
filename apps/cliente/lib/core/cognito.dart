import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';

/// Configuracao do User Pool de clientes, lida de `--dart-define`:
/// `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_DOMAIN`
/// (dominio do Hosted UI, ex. `volti-dev.auth.sa-east-1.amazoncognito.com`) e
/// `COGNITO_REDIRECT_URI` (padrao `volti://auth/callback`, mesmo esquema do AndroidManifest).
class CognitoConfig {
  const CognitoConfig({
    required this.region,
    required this.userPoolId,
    required this.clientId,
    this.domain = '',
    this.redirectUri = 'volti://auth/callback',
  });

  factory CognitoConfig.fromEnvironment() => const CognitoConfig(
        region: String.fromEnvironment('COGNITO_REGION'),
        userPoolId: String.fromEnvironment('COGNITO_USER_POOL_ID'),
        clientId: String.fromEnvironment('COGNITO_CLIENT_ID'),
        domain: String.fromEnvironment('COGNITO_DOMAIN'),
        redirectUri: String.fromEnvironment('COGNITO_REDIRECT_URI', defaultValue: 'volti://auth/callback'),
      );

  final String region;
  final String userPoolId;
  final String clientId;
  final String domain;
  final String redirectUri;

  /// Celular/e-mail com codigo (API do Cognito) precisam de regiao e client id.
  bool get hasIdentityApi => region.isNotEmpty && clientId.isNotEmpty;

  /// Google/Apple precisam tambem do dominio do Hosted UI.
  bool get hasHostedUi => hasIdentityApi && domain.isNotEmpty;

  /// Endpoint da API `cognito-idp` (JSON 1.1, sem assinatura para client publico).
  Uri get identityEndpoint => Uri.parse('https://cognito-idp.$region.amazonaws.com/');

  /// Dominio sem esquema nem barra final.
  String get domainHost => domain.replaceFirst(RegExp(r'^https?://'), '').replaceAll(RegExp(r'/+$'), '');

  /// Esquema de retorno do navegador (ex. `volti`).
  String get callbackScheme => Uri.parse(redirectUri).scheme;
}

/// Provedores federados configurados no pool (nomes exatos do Cognito).
enum IdentityProvider {
  google('Google'),
  apple('SignInWithApple');

  const IdentityProvider(this.cognitoName);
  final String cognitoName;
}

/// Par PKCE (RFC 7636, metodo S256).
class Pkce {
  const Pkce({required this.verifier, required this.challenge});

  factory Pkce.generate([Random? random]) => Pkce.fromVerifier(randomUrlSafe(64, random));

  factory Pkce.fromVerifier(String verifier) => Pkce(verifier: verifier, challenge: s256(verifier));

  final String verifier;
  final String challenge;

  static String s256(String verifier) =>
      base64Url.encode(sha256.convert(ascii.encode(verifier)).bytes).replaceAll('=', '');

  static const _unreserved = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

  static String randomUrlSafe(int length, [Random? random]) {
    final r = random ?? Random.secure();
    return List.generate(length, (_) => _unreserved[r.nextInt(_unreserved.length)]).join();
  }
}

/// Tokens devolvidos pelo Cognito (API ou endpoint OAuth).
class CognitoTokens {
  const CognitoTokens({required this.accessToken, required this.expiresIn, this.idToken, this.refreshToken});

  /// `AuthenticationResult` de InitiateAuth/RespondToAuthChallenge.
  factory CognitoTokens.fromAuthenticationResult(Map<String, dynamic> r) => CognitoTokens(
        accessToken: r['AccessToken'] as String,
        idToken: r['IdToken'] as String?,
        refreshToken: r['RefreshToken'] as String?,
        expiresIn: (r['ExpiresIn'] as num?)?.toInt() ?? 3600,
      );

  /// Resposta de `POST /oauth2/token`.
  factory CognitoTokens.fromOAuth(Map<String, dynamic> r) => CognitoTokens(
        accessToken: r['access_token'] as String,
        idToken: r['id_token'] as String?,
        refreshToken: r['refresh_token'] as String?,
        expiresIn: (r['expires_in'] as num?)?.toInt() ?? 3600,
      );

  final String accessToken;
  final String? idToken;
  final String? refreshToken;
  final int expiresIn;

  /// Claims do id token (sem validar assinatura: so para exibir e-mail/telefone).
  Map<String, dynamic> get idClaims => decodeJwtPayload(idToken);
}

Map<String, dynamic> decodeJwtPayload(String? jwt) {
  if (jwt == null) return const {};
  final parts = jwt.split('.');
  if (parts.length != 3) return const {};
  try {
    final decoded = utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
    final m = jsonDecode(decoded);
    return m is Map<String, dynamic> ? m : const {};
  } catch (_) {
    return const {};
  }
}

/// Erro da API do Cognito (`__type` da resposta 400), ou `network` sem resposta.
class CognitoException implements Exception {
  const CognitoException(this.type, [this.message = '']);
  final String type;
  final String message;

  static const network = 'NetworkError';

  @override
  String toString() => 'CognitoException($type)';
}

/// Login hospedado (Google/Apple): Authorization Code + PKCE.
class CognitoHostedUi {
  const CognitoHostedUi(this.config);
  final CognitoConfig config;

  static const scopes = ['openid', 'email', 'phone', 'profile'];

  Uri authorizeUri({required IdentityProvider provider, required Pkce pkce, required String state}) => Uri(
        scheme: 'https',
        host: config.domainHost,
        path: '/oauth2/authorize',
        queryParameters: {
          'response_type': 'code',
          'client_id': config.clientId,
          'redirect_uri': config.redirectUri,
          'identity_provider': provider.cognitoName,
          'scope': scopes.join(' '),
          'state': state,
          'code_challenge': pkce.challenge,
          'code_challenge_method': 'S256',
        },
      );

  Uri get tokenUri => Uri(scheme: 'https', host: config.domainHost, path: '/oauth2/token');

  Map<String, String> tokenRequestBody({required String code, required Pkce pkce}) => {
        'grant_type': 'authorization_code',
        'client_id': config.clientId,
        'code': code,
        'redirect_uri': config.redirectUri,
        'code_verifier': pkce.verifier,
      };

  /// Le o `code` do retorno, conferindo `state`. Lanca [CognitoException] em erro ou cancelamento.
  String codeFromCallback(String callbackUrl, {required String expectedState}) {
    final uri = Uri.parse(callbackUrl);
    final q = uri.queryParameters;
    if (q['error'] != null) throw CognitoException('HostedUiError', q['error_description'] ?? q['error']!);
    if (q['state'] != expectedState) throw const CognitoException('StateMismatch');
    final code = q['code'];
    if (code == null || code.isEmpty) throw const CognitoException('MissingCode');
    return code;
  }
}

/// Transporte da API do Cognito. Os testes usam um fake que grava as chamadas.
abstract class CognitoTransport {
  /// Chama a operacao `AWSCognitoIdentityProviderService.<target>` com o corpo JSON.
  Future<Map<String, dynamic>> call(String target, Map<String, dynamic> body);

  /// `POST` form-urlencoded (endpoint OAuth do Hosted UI).
  Future<Map<String, dynamic>> postForm(Uri uri, Map<String, String> form);
}

class DioCognitoTransport implements CognitoTransport {
  DioCognitoTransport(this.config, {Dio? dio})
      : _dio = dio ?? Dio(BaseOptions(connectTimeout: const Duration(seconds: 8), receiveTimeout: const Duration(seconds: 15)));
  final CognitoConfig config;
  final Dio _dio;

  @override
  Future<Map<String, dynamic>> call(String target, Map<String, dynamic> body) async {
    try {
      final res = await _dio.postUri<String>(
        config.identityEndpoint,
        data: jsonEncode(body),
        options: Options(
          headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.$target',
          },
          responseType: ResponseType.plain,
        ),
      );
      final text = res.data ?? '';
      return text.isEmpty ? <String, dynamic>{} : jsonDecode(text) as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _toException(e);
    }
  }

  @override
  Future<Map<String, dynamic>> postForm(Uri uri, Map<String, String> form) async {
    try {
      final res = await _dio.postUri<Map<String, dynamic>>(
        uri,
        data: form,
        options: Options(contentType: Headers.formUrlEncodedContentType),
      );
      return res.data ?? <String, dynamic>{};
    } on DioException catch (e) {
      throw _toException(e);
    }
  }

  static CognitoException _toException(DioException e) {
    final data = e.response?.data;
    Map<String, dynamic>? m;
    if (data is Map<String, dynamic>) m = data;
    if (data is String && data.isNotEmpty) {
      try {
        m = jsonDecode(data) as Map<String, dynamic>;
      } catch (_) {}
    }
    if (m == null) return const CognitoException(CognitoException.network);
    // `__type` pode vir como "com.amazonaws...#CodeMismatchException".
    final type = ((m['__type'] ?? m['error'] ?? 'Unknown') as String).split('#').last;
    return CognitoException(type, (m['message'] ?? m['error_description'] ?? '') as String);
  }
}

/// Operacoes do pool de clientes usadas pelo app (client publico, sem segredo).
///
/// Celular/e-mail com codigo usa o login sem senha nativo do Cognito
/// (`USER_AUTH` com `SMS_OTP`/`EMAIL_OTP`). Conta nova: `SignUp` sem senha manda o
/// codigo de confirmacao; `ConfirmSignUp` devolve uma `Session` que entra direto
/// (`InitiateAuth` `USER_AUTH` com `Session`), sem um segundo codigo.
class CognitoIdentityClient {
  CognitoIdentityClient(this.config, this.transport);
  final CognitoConfig config;
  final CognitoTransport transport;

  Future<Map<String, dynamic>> signUp({required String username, required Map<String, String> attributes}) =>
      transport.call('SignUp', {
        'ClientId': config.clientId,
        'Username': username,
        'UserAttributes': [
          for (final e in attributes.entries) {'Name': e.key, 'Value': e.value},
        ],
      });

  Future<Map<String, dynamic>> confirmSignUp({required String username, required String code, String? session}) =>
      transport.call('ConfirmSignUp', {
        'ClientId': config.clientId,
        'Username': username,
        'ConfirmationCode': code,
        'Session': ?session,
      });

  Future<Map<String, dynamic>> resendConfirmationCode({required String username}) =>
      transport.call('ResendConfirmationCode', {'ClientId': config.clientId, 'Username': username});

  /// `USER_AUTH` pedindo o desafio [preferredChallenge] (`SMS_OTP` ou `EMAIL_OTP`).
  /// Com [session] (vinda do `ConfirmSignUp`) o Cognito ja devolve os tokens.
  Future<Map<String, dynamic>> initiateUserAuth({required String username, String? preferredChallenge, String? session}) =>
      transport.call('InitiateAuth', {
        'ClientId': config.clientId,
        'AuthFlow': 'USER_AUTH',
        'AuthParameters': {
          'USERNAME': username,
          'PREFERRED_CHALLENGE': ?preferredChallenge,
        },
        'Session': ?session,
      });

  Future<Map<String, dynamic>> respondToOtp({
    required String challengeName,
    required String username,
    required String code,
    required String session,
  }) =>
      transport.call('RespondToAuthChallenge', {
        'ClientId': config.clientId,
        'ChallengeName': challengeName,
        'Session': session,
        'ChallengeResponses': {
          'USERNAME': username,
          '${challengeName}_CODE': code,
        },
      });

  Future<CognitoTokens> refresh(String refreshToken) async {
    final r = await transport.call('InitiateAuth', {
      'ClientId': config.clientId,
      'AuthFlow': 'REFRESH_TOKEN_AUTH',
      'AuthParameters': {'REFRESH_TOKEN': refreshToken},
    });
    return CognitoTokens.fromAuthenticationResult(r['AuthenticationResult'] as Map<String, dynamic>);
  }

  Future<void> revoke(String refreshToken) async {
    await transport.call('RevokeToken', {'ClientId': config.clientId, 'Token': refreshToken});
  }

  Future<CognitoTokens> exchangeCode({required String code, required Pkce pkce}) async {
    final ui = CognitoHostedUi(config);
    return CognitoTokens.fromOAuth(await transport.postForm(ui.tokenUri, ui.tokenRequestBody(code: code, pkce: pkce)));
  }
}
