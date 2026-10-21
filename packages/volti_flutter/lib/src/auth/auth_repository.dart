import 'package:dio/dio.dart';

/// Modo de autenticacao. Espelha `AUTH_MODE` da API.
enum AuthMode { dev, cognito }

/// Pool de usuarios (`pool` do `POST /dev/token`).
enum DevAuthPool { customer, staff }

/// Sessao autenticada em memoria.
class AuthSession {
  const AuthSession({required this.accessToken, required this.expiresAt, this.email});

  final String accessToken;
  final DateTime expiresAt;
  final String? email;

  bool get isExpired => DateTime.now().isAfter(expiresAt);
}

/// Origem do bearer token usado por `ApiClientProvider`.
///
/// - `dev`: [DevAuthRepository], emite JWT via `POST /dev/token` (API em `AUTH_MODE=dev`).
/// - `cognito`: [CognitoAuthRepository], interface pronta; a tela hospedada
///   (Hosted UI / PKCE) ainda nao esta ligada e lanca [UnimplementedError].
abstract class AuthRepository {
  AuthMode get mode;

  /// Sessao atual, ou `null` se nao autenticado.
  AuthSession? get session;

  /// Token valido para o header `Authorization: Bearer`, ou `null`.
  Future<String?> accessToken();

  /// Encerra a sessao local.
  Future<void> signOut();

  /// Cria o repositorio conforme [mode].
  static AuthRepository create(AuthMode mode, {required String baseUrl, Dio? dio}) =>
      switch (mode) {
        AuthMode.dev => DevAuthRepository(baseUrl: baseUrl, dio: dio),
        AuthMode.cognito => CognitoAuthRepository(),
      };

  /// Le `--dart-define=AUTH_MODE=dev|cognito` (padrao `dev`).
  static AuthMode modeFromEnvironment() {
    const raw = String.fromEnvironment('AUTH_MODE', defaultValue: 'dev');
    return raw == 'cognito' ? AuthMode.cognito : AuthMode.dev;
  }
}

/// Modo `dev`: pede um token ao emissor local da API.
class DevAuthRepository implements AuthRepository {
  DevAuthRepository({required String baseUrl, Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: baseUrl,
              connectTimeout: const Duration(seconds: 5),
              receiveTimeout: const Duration(seconds: 10),
            ));

  final Dio _dio;
  AuthSession? _session;

  @override
  AuthMode get mode => AuthMode.dev;

  @override
  AuthSession? get session => _session;

  /// `POST /dev/token` com `sub`, `email`, `groups` e `pool`.
  /// [groups] so vale para `pool: staff` (admin, operacao, financeiro, suporte, campo).
  Future<AuthSession> signIn({
    required String sub,
    required String email,
    List<String> groups = const [],
    DevAuthPool pool = DevAuthPool.customer,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>('/dev/token', data: {
      'sub': sub,
      'email': email,
      'groups': groups,
      'pool': pool.name,
    });
    final data = res.data!;
    final expiresIn = (data['expiresIn'] as num?)?.toInt() ?? 3600;
    return _session = AuthSession(
      accessToken: data['accessToken'] as String,
      expiresAt: DateTime.now().add(Duration(seconds: expiresIn)),
      email: email,
    );
  }

  @override
  Future<String?> accessToken() async {
    final s = _session;
    if (s == null || s.isExpired) return null;
    return s.accessToken;
  }

  @override
  Future<void> signOut() async => _session = null;
}

/// Modo `cognito`: interface estavel; a integracao com o Hosted UI do Cognito
/// (login, MFA do pool interno, refresh) fica para a fase de infraestrutura.
/// Ate la os metodos de login lancam [UnimplementedError] com mensagem clara,
/// e [accessToken] devolve `null` (a API respondera 401).
class CognitoAuthRepository implements AuthRepository {
  @override
  AuthMode get mode => AuthMode.cognito;

  @override
  AuthSession? get session => null;

  /// Abriria o Hosted UI do pool indicado e trocaria o codigo por tokens (PKCE).
  Future<AuthSession> signIn({DevAuthPool pool = DevAuthPool.customer}) =>
      throw UnimplementedError(
          'Login Cognito (Hosted UI/PKCE) ainda nao esta ligado. '
          'Use AUTH_MODE=dev ate a infraestrutura de autenticacao estar pronta.');

  @override
  Future<String?> accessToken() async => null;

  @override
  Future<void> signOut() async {}
}
