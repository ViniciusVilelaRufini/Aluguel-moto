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
/// O modo `cognito` usara o refresh token do Cognito atras da mesma interface [AuthRepository].
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
