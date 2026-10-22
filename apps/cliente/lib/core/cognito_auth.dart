import 'package:flutter/services.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'auth_store.dart';
import 'cognito.dart';

/// Navegador do login hospedado. Os testes usam um fake que devolve a URL de retorno.
abstract class WebAuthBrowser {
  /// Abre [url] e devolve a URL de retorno completa (com `code` e `state`).
  /// Cancelamento: [CognitoException] `Canceled`.
  Future<String> authenticate(Uri url, {required String callbackScheme});
}

/// ASWebAuthenticationSession no iOS e Custom Tabs no Android.
class FlutterWebAuthBrowser implements WebAuthBrowser {
  const FlutterWebAuthBrowser();

  @override
  Future<String> authenticate(Uri url, {required String callbackScheme}) async {
    try {
      return await FlutterWebAuth2.authenticate(url: url.toString(), callbackUrlScheme: callbackScheme);
    } on PlatformException catch (e) {
      if (e.code == 'CANCELED') throw const CognitoException('Canceled');
      rethrow;
    }
  }
}

/// Modo `cognito` do app do cliente (pool de clientes).
///
/// - Celular/e-mail com codigo: `CognitoOtpClient` (otp_flow.dart) chama [adopt].
/// - Google/Apple: [signInWithProvider] (Hosted UI, Authorization Code + PKCE).
/// - O bearer da API e o **access token**; renovado com `REFRESH_TOKEN_AUTH`
///   60 s antes de vencer. Tokens no armazenamento seguro ([CognitoTokenStore]).
class CognitoCustomerAuthRepository implements AuthRepository {
  CognitoCustomerAuthRepository({
    required this.config,
    required this.client,
    required CognitoTokenStore store,
    WebAuthBrowser browser = const FlutterWebAuthBrowser(),
    StoredTokens? restored,
    DateTime Function()? now,
  })  : _store = store,
        _browser = browser,
        _tokens = restored,
        _now = now ?? DateTime.now;

  static Future<CognitoCustomerAuthRepository> restore(CognitoConfig config, {CognitoTokenStore? store}) async {
    final s = store ?? SecureCognitoTokenStore();
    return CognitoCustomerAuthRepository(
      config: config,
      client: CognitoIdentityClient(config, DioCognitoTransport(config)),
      store: s,
      restored: await s.read(),
    );
  }

  final CognitoConfig config;
  final CognitoIdentityClient client;
  final CognitoTokenStore _store;
  final WebAuthBrowser _browser;
  final DateTime Function() _now;
  StoredTokens? _tokens;
  Future<String?>? _refreshing;

  static const refreshMargin = Duration(seconds: 60);

  @override
  AuthMode get mode => AuthMode.cognito;

  @override
  AuthSession? get session {
    final t = _tokens;
    if (t == null) return null;
    return AuthSession(accessToken: t.accessToken, expiresAt: t.expiresAt, email: t.displayName);
  }

  /// Guarda os tokens de um login concluido. A renovacao nao devolve refresh token:
  /// o anterior e mantido.
  Future<void> adopt(CognitoTokens t) async {
    final claims = t.idClaims;
    final next = StoredTokens(
      accessToken: t.accessToken,
      refreshToken: t.refreshToken ?? _tokens?.refreshToken,
      expiresAt: _now().add(Duration(seconds: t.expiresIn)),
      email: (claims['email'] as String?) ?? _tokens?.email,
      phone: (claims['phone_number'] as String?) ?? _tokens?.phone,
    );
    _tokens = next;
    await _store.write(next);
  }

  /// Google ou Apple pelo Hosted UI. Cancelamento: [CognitoException] `Canceled`.
  Future<void> signInWithProvider(IdentityProvider provider) async {
    if (!config.hasHostedUi) throw const CognitoException('NotConfigured');
    final ui = CognitoHostedUi(config);
    final pkce = Pkce.generate();
    final state = Pkce.randomUrlSafe(32);
    final callback = await _browser.authenticate(
      ui.authorizeUri(provider: provider, pkce: pkce, state: state),
      callbackScheme: config.callbackScheme,
    );
    final code = ui.codeFromCallback(callback, expectedState: state);
    await adopt(await client.exchangeCode(code: code, pkce: pkce));
  }

  @override
  Future<String?> accessToken() {
    final t = _tokens;
    if (t == null) return Future.value(null);
    if (_now().isBefore(t.expiresAt.subtract(refreshMargin))) return Future.value(t.accessToken);
    return _refreshing ??= _refresh().whenComplete(() => _refreshing = null);
  }

  Future<String?> _refresh() async {
    final refreshToken = _tokens?.refreshToken;
    if (refreshToken == null) return null;
    try {
      await adopt(await client.refresh(refreshToken));
      return _tokens?.accessToken;
    } on CognitoException catch (e) {
      // Refresh revogado/expirado: sessao encerrada.
      if (e.type == 'NotAuthorizedException') {
        _tokens = null;
        await _store.clear();
        return null;
      }
      // Sem rede/erro transitorio: manda o token atual (a API responde 401 se ja
      // venceu, em vez de uma chamada sem bearer) e tenta renovar na proxima.
      return _tokens?.accessToken;
    }
  }

  @override
  Future<void> signOut() async {
    final refreshToken = _tokens?.refreshToken;
    _tokens = null;
    await _store.clear();
    if (refreshToken != null) {
      try {
        await client.revoke(refreshToken);
      } catch (_) {
        // sem rede: o refresh token expira sozinho (30 dias)
      }
    }
  }
}
