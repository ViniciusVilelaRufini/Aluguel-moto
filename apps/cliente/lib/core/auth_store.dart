import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// Guarda a sessao de login em armazenamento seguro (Keychain no iOS, Keystore no Android).
abstract class SessionStore {
  Future<AuthSession?> read();
  Future<void> write(AuthSession session);
  Future<void> clear();
}

class SecureSessionStore implements SessionStore {
  SecureSessionStore([FlutterSecureStorage? storage]) : _s = storage ?? const FlutterSecureStorage();
  final FlutterSecureStorage _s;

  static const _kToken = 'volti.token';
  static const _kExpires = 'volti.expiresAt';
  static const _kEmail = 'volti.email';

  @override
  Future<AuthSession?> read() async {
    try {
      final token = await _s.read(key: _kToken);
      final exp = await _s.read(key: _kExpires);
      if (token == null || exp == null) return null;
      return AuthSession(accessToken: token, expiresAt: DateTime.parse(exp), email: await _s.read(key: _kEmail));
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> write(AuthSession s) async {
    try {
      await _s.write(key: _kToken, value: s.accessToken);
      await _s.write(key: _kExpires, value: s.expiresAt.toIso8601String());
      if (s.email != null) await _s.write(key: _kEmail, value: s.email);
    } catch (_) {
      // sem armazenamento seguro: a sessao vale so ate fechar o app
    }
  }

  @override
  Future<void> clear() async {
    try {
      await _s.delete(key: _kToken);
      await _s.delete(key: _kExpires);
      await _s.delete(key: _kEmail);
    } catch (_) {}
  }
}

/// Modo `dev` com sessao persistida. Ao reabrir o app a sessao e restaurada; se o token
/// expirou, um novo e pedido a `POST /dev/token` com o e-mail guardado (so existe no modo dev).
/// O modo `cognito` usa `CognitoCustomerAuthRepository` (cognito_auth.dart), com refresh token.
class PersistentDevAuthRepository implements AuthRepository {
  PersistentDevAuthRepository({required DevAuthRepository inner, required SessionStore store, AuthSession? restored})
      : _inner = inner,
        _store = store,
        _session = restored;

  static Future<PersistentDevAuthRepository> restore({required String baseUrl, SessionStore? store}) async {
    final s = store ?? SecureSessionStore();
    return PersistentDevAuthRepository(
      inner: DevAuthRepository(baseUrl: baseUrl),
      store: s,
      restored: await s.read(),
    );
  }

  final DevAuthRepository _inner;
  final SessionStore _store;
  AuthSession? _session;

  @override
  AuthMode get mode => AuthMode.dev;

  @override
  AuthSession? get session => _session;

  Future<AuthSession> signIn({
    required String sub,
    required String email,
    List<String> groups = const [],
    DevAuthPool pool = DevAuthPool.customer,
  }) async {
    final s = await _inner.signIn(sub: sub, email: email, groups: groups, pool: pool);
    _session = s;
    await _store.write(s);
    return s;
  }

  @override
  Future<String?> accessToken() async {
    final s = _session;
    if (s == null) return null;
    if (!s.isExpired) return s.accessToken;
    final email = s.email;
    if (email == null) return null;
    try {
      return (await signIn(sub: email.toLowerCase(), email: email)).accessToken;
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> signOut() async {
    _session = null;
    await _inner.signOut();
    await _store.clear();
  }
}

/// Tokens do modo `cognito` guardados entre aberturas do app.
class StoredTokens {
  const StoredTokens({
    required this.accessToken,
    required this.expiresAt,
    this.refreshToken,
    this.email,
    this.phone,
  });

  final String accessToken;
  final DateTime expiresAt;
  final String? refreshToken;
  final String? email;
  final String? phone;

  /// O que mostrar como "logado como": e-mail, senao telefone.
  String? get displayName => email ?? phone;
}

abstract class CognitoTokenStore {
  Future<StoredTokens?> read();
  Future<void> write(StoredTokens tokens);
  Future<void> clear();
}

/// Keychain (iOS) / Keystore (Android). O refresh token nunca vai para log.
class SecureCognitoTokenStore implements CognitoTokenStore {
  SecureCognitoTokenStore([FlutterSecureStorage? storage]) : _s = storage ?? const FlutterSecureStorage();
  final FlutterSecureStorage _s;

  static const _kAccess = 'volti.cognito.access';
  static const _kRefresh = 'volti.cognito.refresh';
  static const _kExpires = 'volti.cognito.expiresAt';
  static const _kEmail = 'volti.cognito.email';
  static const _kPhone = 'volti.cognito.phone';

  @override
  Future<StoredTokens?> read() async {
    try {
      final access = await _s.read(key: _kAccess);
      final exp = await _s.read(key: _kExpires);
      if (access == null || exp == null) return null;
      return StoredTokens(
        accessToken: access,
        expiresAt: DateTime.parse(exp),
        refreshToken: await _s.read(key: _kRefresh),
        email: await _s.read(key: _kEmail),
        phone: await _s.read(key: _kPhone),
      );
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> write(StoredTokens t) async {
    try {
      await _s.write(key: _kAccess, value: t.accessToken);
      await _s.write(key: _kExpires, value: t.expiresAt.toIso8601String());
      await _s.write(key: _kRefresh, value: t.refreshToken);
      await _s.write(key: _kEmail, value: t.email);
      await _s.write(key: _kPhone, value: t.phone);
    } catch (_) {
      // sem armazenamento seguro: a sessao vale so ate fechar o app
    }
  }

  @override
  Future<void> clear() async {
    try {
      for (final k in [_kAccess, _kRefresh, _kExpires, _kEmail, _kPhone]) {
        await _s.delete(key: k);
      }
    } catch (_) {}
  }
}

/// Store em memoria (testes e plataformas sem armazenamento seguro).
class MemoryCognitoTokenStore implements CognitoTokenStore {
  StoredTokens? value;
  @override
  Future<StoredTokens?> read() async => value;
  @override
  Future<void> write(StoredTokens tokens) async => value = tokens;
  @override
  Future<void> clear() async => value = null;
}
