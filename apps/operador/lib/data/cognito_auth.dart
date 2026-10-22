import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// Grupo do pool interno exigido pelo app (`cognito:groups`).
const String campoGroup = 'campo';

/// Configuracao do Hosted UI do pool interno (staff), lida de `--dart-define`:
/// `COGNITO_DOMAIN`, `COGNITO_CLIENT_ID`, `COGNITO_REDIRECT_URI` e, opcional,
/// `COGNITO_SCOPES` (separados por espaco; padrao `openid email profile`).
class CognitoConfig {
  const CognitoConfig({
    required this.domain,
    required this.clientId,
    required this.redirectUri,
    this.logoutRedirectUri,
    this.scopes = defaultScopes,
  });

  factory CognitoConfig.fromEnvironment() {
    const scopes = String.fromEnvironment('COGNITO_SCOPES');
    const logout = String.fromEnvironment('COGNITO_LOGOUT_URI');
    return CognitoConfig(
      domain: const String.fromEnvironment('COGNITO_DOMAIN'),
      clientId: const String.fromEnvironment('COGNITO_CLIENT_ID'),
      redirectUri: const String.fromEnvironment('COGNITO_REDIRECT_URI'),
      logoutRedirectUri: logout.trim().isEmpty ? null : logout.trim(),
      scopes: scopes.trim().isEmpty ? defaultScopes : scopes.trim().split(RegExp(r'\s+')),
    );
  }

  static const defaultScopes = ['openid', 'email', 'profile'];

  /// Dominio do Hosted UI, com ou sem `https://` (ex.: `volti-staff.auth.sa-east-1.amazoncognito.com`).
  final String domain;
  final String clientId;

  /// URI de retorno cadastrada no app client (ex.: `br.com.volti.operador://callback`).
  final String redirectUri;

  /// "Sign out URL" do app client (`COGNITO_LOGOUT_URI`; padrao = [redirectUri]).
  final String? logoutRedirectUri;
  final List<String> scopes;

  String get effectiveLogoutUri => logoutRedirectUri ?? redirectUri.trim();

  /// Host normalizado (sem esquema, barra final ou espacos).
  String get host {
    var d = domain.trim();
    d = d.replaceFirst(RegExp(r'^https?://', caseSensitive: false), '');
    while (d.endsWith('/')) {
      d = d.substring(0, d.length - 1);
    }
    return d;
  }

  /// Nomes dos `--dart-define` que faltam.
  List<String> get missing => [
        if (host.isEmpty) 'COGNITO_DOMAIN',
        if (clientId.trim().isEmpty) 'COGNITO_CLIENT_ID',
        if (redirectUri.trim().isEmpty || redirectScheme.isEmpty) 'COGNITO_REDIRECT_URI',
      ];

  bool get isComplete => missing.isEmpty;

  /// Esquema da URI de retorno (precisa bater com `appAuthRedirectScheme` do Android).
  String get redirectScheme => Uri.tryParse(redirectUri.trim())?.scheme ?? '';

  Uri get authorizationEndpoint => Uri.https(host, '/oauth2/authorize');
  Uri get tokenEndpoint => Uri.https(host, '/oauth2/token');
  Uri get revokeEndpoint => Uri.https(host, '/oauth2/revoke');

  /// Endpoint de logout do Hosted UI (encerra o cookie de sessao do navegador).
  Uri get logoutEndpoint => Uri.https(host, '/logout');

  /// Parametros que o Cognito exige no `/logout` (nao usa os do OIDC).
  Map<String, String> get logoutParameters =>
      {'client_id': clientId, 'logout_uri': effectiveLogoutUri};

  /// URL completa do logout do Hosted UI.
  Uri get logoutUri => logoutEndpoint.replace(queryParameters: logoutParameters);
}

/// Le as claims de um JWT (sem validar assinatura: a API valida o token).
Map<String, dynamic> decodeJwtClaims(String jwt) {
  final parts = jwt.split('.');
  if (parts.length != 3) throw const FormatException('JWT invalido');
  final payload = utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
  final claims = jsonDecode(payload);
  if (claims is! Map<String, dynamic>) throw const FormatException('JWT invalido');
  return claims;
}

/// Tokens devolvidos pelo endpoint `/oauth2/token`.
class CognitoTokens {
  const CognitoTokens({
    required this.accessToken,
    this.idToken,
    this.refreshToken,
    this.expiresAt,
  });

  final String accessToken;
  final String? idToken;
  final String? refreshToken;

  /// Expiracao do access token informada pelo provedor (senao usa a claim `exp`).
  final DateTime? expiresAt;
}

/// Sessao do operador: access token mais nome e grupos lidos dos tokens.
class OperatorSession extends AuthSession {
  const OperatorSession({
    required super.accessToken,
    required super.expiresAt,
    super.email,
    this.name,
    this.groups = const [],
  });

  /// Nome para a saudacao (`given_name` ou `name` do id token).
  final String? name;
  final List<String> groups;

  /// Monta a sessao a partir dos tokens. O e-mail e o nome vem do id token
  /// (o access token do Cognito nao traz e-mail); os grupos, do access token.
  factory OperatorSession.fromTokens(CognitoTokens t, {DateTime? now}) {
    final access = decodeJwtClaims(t.accessToken);
    final id = t.idToken == null ? const <String, dynamic>{} : decodeJwtClaims(t.idToken!);
    final exp = access['exp'];
    final expiresAt = t.expiresAt ??
        (exp is num
            ? DateTime.fromMillisecondsSinceEpoch(exp.toInt() * 1000)
            : (now ?? DateTime.now()).add(const Duration(hours: 1)));
    final rawGroups = access['cognito:groups'] ?? id['cognito:groups'];
    final groups = rawGroups is List ? rawGroups.map((e) => '$e').toList() : const <String>[];
    String? str(Object? v) => v is String && v.trim().isNotEmpty ? v.trim() : null;
    return OperatorSession(
      accessToken: t.accessToken,
      expiresAt: expiresAt,
      email: str(id['email']) ?? str(access['email']),
      name: str(id['given_name']) ?? str(id['name']),
      groups: groups,
    );
  }
}

/// O usuario autenticou, mas nao pertence ao grupo `campo`.
class CampoGroupRequired implements Exception {
  const CampoGroupRequired();
  @override
  String toString() => 'CampoGroupRequired';
}

/// Faltam `--dart-define` do Cognito.
class CognitoNotConfigured implements Exception {
  const CognitoNotConfigured(this.missing);
  final List<String> missing;
  @override
  String toString() => 'CognitoNotConfigured(${missing.join(', ')})';
}

/// O Cognito recusou o refresh token (`invalid_grant`): expirado ou revogado.
class CognitoRefreshRejected implements Exception {
  const CognitoRefreshRejected();
}

/// O operador fechou o Hosted UI sem entrar.
class CognitoSignInCancelled implements Exception {
  const CognitoSignInCancelled();
}

/// Fluxo OAuth (Hosted UI com Authorization Code + PKCE). Abstrai o plugin nos testes.
abstract class CognitoOAuthClient {
  Future<CognitoTokens> authorize(CognitoConfig config);
  Future<CognitoTokens> refresh(CognitoConfig config, String refreshToken);
  Future<void> revoke(CognitoConfig config, String refreshToken);

  /// Logout do Hosted UI (`/logout?client_id=&logout_uri=`).
  Future<void> endSession(CognitoConfig config, {String? idToken});
}

/// Implementacao com `flutter_appauth`: abre o Hosted UI no navegador do sistema
/// (Custom Tabs / ASWebAuthenticationSession), com PKCE S256 gerado pelo AppAuth.
/// O MFA do pool interno acontece dentro do Hosted UI.
class AppAuthCognitoClient implements CognitoOAuthClient {
  AppAuthCognitoClient({FlutterAppAuth? appAuth, Dio? dio})
      : _appAuth = appAuth ?? const FlutterAppAuth(),
        _dio = dio ??
            Dio(BaseOptions(
              connectTimeout: const Duration(seconds: 5),
              sendTimeout: const Duration(seconds: 5),
              receiveTimeout: const Duration(seconds: 5),
            ));

  final FlutterAppAuth _appAuth;
  final Dio _dio;

  AuthorizationServiceConfiguration _service(CognitoConfig c) => AuthorizationServiceConfiguration(
        authorizationEndpoint: c.authorizationEndpoint.toString(),
        tokenEndpoint: c.tokenEndpoint.toString(),
      );

  @override
  Future<CognitoTokens> authorize(CognitoConfig config) async {
    try {
      final r = await _appAuth.authorizeAndExchangeCode(AuthorizationTokenRequest(
        config.clientId,
        config.redirectUri,
        serviceConfiguration: _service(config),
        scopes: config.scopes,
        // Aparelho compartilhado: sempre pede credenciais (e MFA) no Hosted UI.
        promptValues: const ['login'],
      ));
      return _tokens(r.accessToken, r.idToken, r.refreshToken, r.accessTokenExpirationDateTime);
    } on FlutterAppAuthUserCancelledException {
      throw const CognitoSignInCancelled();
    }
  }

  @override
  Future<CognitoTokens> refresh(CognitoConfig config, String refreshToken) async {
    final TokenResponse r;
    try {
      r = await _appAuth.token(TokenRequest(
        config.clientId,
        config.redirectUri,
        serviceConfiguration: _service(config),
        refreshToken: refreshToken,
        scopes: config.scopes,
      ));
    } on FlutterAppAuthPlatformException catch (e) {
      // Erro OAuth do servidor (invalid_grant...) = token recusado; sem erro OAuth = rede.
      if (e.platformErrorDetails.error != null) throw const CognitoRefreshRejected();
      rethrow;
    }
    return _tokens(r.accessToken, r.idToken, r.refreshToken ?? refreshToken,
        r.accessTokenExpirationDateTime);
  }

  @override
  Future<void> revoke(CognitoConfig config, String refreshToken) async {
    await _dio.postUri<void>(
      config.revokeEndpoint,
      data: {'token': refreshToken, 'client_id': config.clientId},
      options: Options(contentType: Headers.formUrlEncodedContentType),
    );
  }

  @override
  Future<void> endSession(CognitoConfig config, {String? idToken}) async {
    await _appAuth.endSession(EndSessionRequest(
      idTokenHint: idToken,
      postLogoutRedirectUrl: config.effectiveLogoutUri,
      additionalParameters: config.logoutParameters,
      serviceConfiguration: AuthorizationServiceConfiguration(
        authorizationEndpoint: config.authorizationEndpoint.toString(),
        tokenEndpoint: config.tokenEndpoint.toString(),
        endSessionEndpoint: config.logoutEndpoint.toString(),
      ),
    ));
  }

  CognitoTokens _tokens(String? access, String? id, String? refresh, DateTime? exp) {
    if (access == null) throw const FormatException('Resposta sem access token');
    return CognitoTokens(accessToken: access, idToken: id, refreshToken: refresh, expiresAt: exp);
  }
}

/// Guarda o refresh token entre aberturas do app.
abstract class RefreshTokenStore {
  Future<String?> read();
  Future<void> write(String token);
  Future<void> clear();
}

class MemoryRefreshTokenStore implements RefreshTokenStore {
  String? value;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String token) async => value = token;
  @override
  Future<void> clear() async => value = null;
}

/// Keystore (Android) / Keychain (iOS) via `flutter_secure_storage`.
class SecureRefreshTokenStore implements RefreshTokenStore {
  SecureRefreshTokenStore([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  static const _key = 'volti_operador_refresh_token';

  @override
  Future<String?> read() => _storage.read(key: _key);
  @override
  Future<void> write(String token) => _storage.write(key: _key, value: token);
  @override
  Future<void> clear() => _storage.delete(key: _key);
}

/// Modo `cognito` do app do operador: Hosted UI do pool interno, grupo `campo`
/// obrigatorio, refresh automatico do access token e refresh token guardado
/// no armazenamento seguro.
class OperatorCognitoAuthRepository implements AuthRepository {
  OperatorCognitoAuthRepository({
    required this.config,
    required CognitoOAuthClient client,
    required RefreshTokenStore store,
    DateTime Function()? clock,
    this.restoreRetryDelay = const Duration(seconds: 2),
  })  : _client = client,
        _store = store,
        _clock = clock ?? DateTime.now;

  /// Espera antes da segunda tentativa de restaurar (falha de rede na abertura).
  final Duration restoreRetryDelay;

  final CognitoConfig config;
  final CognitoOAuthClient _client;
  final RefreshTokenStore _store;
  final DateTime Function() _clock;

  OperatorSession? _session;
  String? _refreshToken;
  String? _idToken;
  Future<String?>? _refreshing;

  /// Renova o access token quando faltar menos que isso para expirar.
  static const refreshSkew = Duration(seconds: 60);

  @override
  AuthMode get mode => AuthMode.cognito;

  @override
  OperatorSession? get session => _session;

  /// Abre o Hosted UI e troca o codigo por tokens (PKCE).
  Future<OperatorSession> signIn() async {
    if (!config.isComplete) throw CognitoNotConfigured(config.missing);
    return _accept(await _client.authorize(config));
  }

  /// Restaura a sessao com o refresh token salvo (abertura do app). Sem token
  /// ou com token recusado, fica deslogado.
  Future<OperatorSession?> restore() async {
    if (!config.isComplete) return null;
    final saved = await _store.read();
    if (saved == null || saved.isEmpty) return null;
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        return await _accept(await _client.refresh(config, saved), fallbackRefresh: saved);
      } on CognitoRefreshRejected {
        await _store.clear(); // expirado/revogado: pede login
        return null;
      } on CampoGroupRequired {
        return null;
      } catch (_) {
        // Falha de rede: tenta mais uma vez antes de mostrar o login.
        if (attempt == 0) await Future<void>.delayed(restoreRetryDelay);
      }
    }
    return null;
  }

  Future<OperatorSession> _accept(CognitoTokens t, {String? fallbackRefresh}) async {
    final s = OperatorSession.fromTokens(t, now: _clock());
    if (!s.groups.contains(campoGroup)) {
      _session = null;
      _refreshToken = null;
      await _store.clear();
      throw const CampoGroupRequired();
    }
    _session = s;
    _idToken = t.idToken ?? _idToken;
    _refreshToken = t.refreshToken ?? fallbackRefresh ?? _refreshToken;
    if (_refreshToken != null) await _store.write(_refreshToken!);
    return s;
  }

  @override
  Future<String?> accessToken() async {
    final s = _session;
    if (s == null) return null;
    if (_clock().isBefore(s.expiresAt.subtract(refreshSkew))) return s.accessToken;
    final rt = _refreshToken;
    if (rt == null) return null;
    // Uma renovacao por vez, mesmo com varias requisicoes simultaneas.
    return _refreshing ??= _doRefresh(rt).whenComplete(() => _refreshing = null);
  }

  Future<String?> _doRefresh(String rt) async {
    try {
      return (await _accept(await _client.refresh(config, rt), fallbackRefresh: rt)).accessToken;
    } catch (_) {
      // Refresh recusado: a API respondera 401 e o app pede login de novo.
      return null;
    }
  }

  @override
  Future<void> signOut() async {
    final rt = _refreshToken;
    final id = _idToken;
    final hadSession = _session != null;
    _session = null;
    _refreshToken = null;
    _idToken = null;
    await _store.clear();
    // Revogacao e logout do Hosted UI em segundo plano: a UI nao espera a rede.
    if (rt != null) {
      unawaited(_client.revoke(config, rt).catchError((Object _) {
        // Sem rede: o token local ja foi apagado; ele expira sozinho.
      }));
    }
    if (hadSession && config.isComplete) {
      unawaited(_client.endSession(config, idToken: id).catchError((Object _) {}));
    }
  }
}
