import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/cognito_auth.dart';

String _jwt(Map<String, dynamic> claims) {
  String seg(Object o) => base64Url.encode(utf8.encode(jsonEncode(o))).replaceAll('=', '');
  return '${seg({'alg': 'none'})}.${seg(claims)}.sig';
}

const _config = CognitoConfig(
  domain: 'https://volti-staff.auth.sa-east-1.amazoncognito.com/',
  clientId: 'abc123',
  redirectUri: 'br.com.volti.operador://callback',
);

class _FakeClient implements CognitoOAuthClient {
  CognitoTokens? authorizeResult;
  CognitoTokens? refreshResult;
  Object? refreshError;

  /// Erros das primeiras chamadas de refresh (depois usa [refreshResult]).
  final refreshErrors = <Object>[];
  int refreshCalls = 0;
  final revoked = <String>[];
  final endSessions = <String?>[];
  Completer<void>? revokeGate;

  @override
  Future<CognitoTokens> authorize(CognitoConfig config) async => authorizeResult!;

  @override
  Future<CognitoTokens> refresh(CognitoConfig config, String refreshToken) async {
    refreshCalls++;
    if (refreshErrors.isNotEmpty) throw refreshErrors.removeAt(0);
    if (refreshError != null) throw refreshError!;
    return refreshResult!;
  }

  @override
  Future<void> revoke(CognitoConfig config, String refreshToken) async {
    revoked.add(refreshToken);
    if (revokeGate != null) await revokeGate!.future;
  }

  @override
  Future<void> endSession(CognitoConfig config, {String? idToken}) async =>
      endSessions.add(idToken);
}

CognitoTokens _tokens({
  List<String> groups = const ['campo'],
  DateTime? expiresAt,
  String access = 'a',
  String? refresh = 'r1',
}) =>
    CognitoTokens(
      accessToken: _jwt({'sub': 'u1', 'cognito:groups': groups, 'token_use': 'access', 'jti': access}),
      idToken: _jwt({'email': 'rafael@volti.com.br', 'given_name': 'Rafael', 'name': 'Rafael Souza'}),
      refreshToken: refresh,
      expiresAt: expiresAt ?? DateTime.utc(2026, 10, 21, 13),
    );

void main() {
  group('CognitoConfig', () {
    test('normaliza o dominio e monta os endpoints do Hosted UI', () {
      expect(_config.host, 'volti-staff.auth.sa-east-1.amazoncognito.com');
      expect(_config.authorizationEndpoint.toString(),
          'https://volti-staff.auth.sa-east-1.amazoncognito.com/oauth2/authorize');
      expect(_config.tokenEndpoint.toString(),
          'https://volti-staff.auth.sa-east-1.amazoncognito.com/oauth2/token');
      expect(_config.revokeEndpoint.toString(),
          'https://volti-staff.auth.sa-east-1.amazoncognito.com/oauth2/revoke');
      expect(_config.redirectScheme, 'br.com.volti.operador');
      expect(_config.scopes, ['openid', 'email', 'profile']);
      expect(_config.isComplete, isTrue);
    });

    test('monta o logout do Hosted UI com client_id e logout_uri', () {
      expect(_config.logoutUri.toString(),
          'https://volti-staff.auth.sa-east-1.amazoncognito.com/logout'
          '?client_id=abc123&logout_uri=br.com.volti.operador%3A%2F%2Fcallback');
      const custom = CognitoConfig(
          domain: 'd.example.com',
          clientId: 'c',
          redirectUri: 'x://cb',
          logoutRedirectUri: 'x://saiu');
      expect(custom.logoutParameters, {'client_id': 'c', 'logout_uri': 'x://saiu'});
    });

    test('lista os defines que faltam', () {
      const c = CognitoConfig(domain: ' ', clientId: '', redirectUri: 'sem-esquema');
      expect(c.missing, ['COGNITO_DOMAIN', 'COGNITO_CLIENT_ID', 'COGNITO_REDIRECT_URI']);
      expect(c.isComplete, isFalse);
    });

    test('sem defines (teste) a configuracao do ambiente esta incompleta', () {
      expect(CognitoConfig.fromEnvironment().isComplete, isFalse);
    });
  });

  group('tokens', () {
    test('decodifica claims base64url sem padding', () {
      final claims = decodeJwtClaims(_jwt({'email': 'ação@volti.dev', 'exp': 10}));
      expect(claims['email'], 'ação@volti.dev');
      expect(() => decodeJwtClaims('nao.e-jwt'), throwsFormatException);
    });

    test('sessao le e-mail e nome do id token e grupos do access token', () {
      final s = OperatorSession.fromTokens(_tokens());
      expect(s.email, 'rafael@volti.com.br');
      expect(s.name, 'Rafael');
      expect(s.groups, ['campo']);
      expect(s.expiresAt, DateTime.utc(2026, 10, 21, 13));
    });

    test('sem expiracao informada usa a claim exp', () {
      final s = OperatorSession.fromTokens(CognitoTokens(
          accessToken: _jwt({'exp': 1800000000, 'cognito:groups': ['campo']})));
      expect(s.expiresAt, DateTime.fromMillisecondsSinceEpoch(1800000000 * 1000));
    });
  });

  group('OperatorCognitoAuthRepository', () {
    late _FakeClient client;
    late MemoryRefreshTokenStore store;
    var now = DateTime.utc(2026, 10, 21, 12);
    OperatorCognitoAuthRepository repo({CognitoConfig config = _config}) =>
        OperatorCognitoAuthRepository(
            config: config,
            client: client,
            store: store,
            clock: () => now,
            restoreRetryDelay: Duration.zero);

    setUp(() {
      client = _FakeClient();
      store = MemoryRefreshTokenStore();
      now = DateTime.utc(2026, 10, 21, 12);
    });

    test('login guarda o refresh token e expoe o access token', () async {
      client.authorizeResult = _tokens();
      final r = repo();
      expect(r.mode, AuthMode.cognito);
      final s = await r.signIn();
      expect(s.name, 'Rafael');
      expect(store.value, 'r1');
      expect(await r.accessToken(), s.accessToken);
      expect(client.refreshCalls, 0);
    });

    test('recusa quem nao esta no grupo campo', () async {
      client.authorizeResult = _tokens(groups: const ['suporte']);
      final r = repo();
      await expectLater(r.signIn(), throwsA(isA<CampoGroupRequired>()));
      expect(r.session, isNull);
      expect(store.value, isNull);
    });

    test('sem configuracao nao abre o Hosted UI', () async {
      final r = repo(config: const CognitoConfig(domain: '', clientId: '', redirectUri: ''));
      await expectLater(r.signIn(), throwsA(isA<CognitoNotConfigured>()));
    });

    test('renova o access token perto de expirar (uma renovacao por vez)', () async {
      client.authorizeResult = _tokens(expiresAt: DateTime.utc(2026, 10, 21, 12, 30));
      final r = repo();
      await r.signIn();
      client.refreshResult = _tokens(access: 'novo', refresh: null);
      now = DateTime.utc(2026, 10, 21, 12, 29, 30); // a 30 s da expiracao
      final both = await Future.wait([r.accessToken(), r.accessToken()]);
      expect(client.refreshCalls, 1);
      expect(both[0], both[1]);
      expect(decodeJwtClaims(both[0]!)['jti'], 'novo');
      // O Cognito nao devolve refresh novo: mantem o anterior.
      expect(store.value, 'r1');
    });

    test('refresh recusado devolve null (a API pede login de novo)', () async {
      client.authorizeResult = _tokens(expiresAt: DateTime.utc(2026, 10, 21, 12));
      final r = repo();
      await r.signIn();
      client.refreshError = Exception('invalid_grant');
      expect(await r.accessToken(), isNull);
    });

    test('restaura a sessao com o refresh token salvo', () async {
      store.value = 'salvo';
      client.refreshResult = _tokens(refresh: null);
      final r = repo();
      final s = await r.restore();
      expect(s, isNotNull);
      expect(r.session?.email, 'rafael@volti.com.br');
      expect(store.value, 'salvo');
    });

    test('sem refresh salvo ou com falha de rede repetida, nao restaura', () async {
      expect(await repo().restore(), isNull);
      store.value = 'velho';
      client.refreshError = Exception('offline');
      expect(await repo().restore(), isNull);
      expect(client.refreshCalls, 2); // uma nova tentativa
      expect(store.value, 'velho'); // falha de rede nao apaga o token
    });

    test('falha de rede na abertura: tenta de novo e restaura', () async {
      store.value = 'salvo';
      client.refreshErrors.add(Exception('timeout'));
      client.refreshResult = _tokens(refresh: null);
      expect(await repo().restore(), isNotNull);
      expect(client.refreshCalls, 2);
    });

    test('refresh recusado na abertura apaga o token e nao repete', () async {
      store.value = 'revogado';
      client.refreshError = const CognitoRefreshRejected();
      expect(await repo().restore(), isNull);
      expect(client.refreshCalls, 1);
      expect(store.value, isNull);
    });

    test('sair apaga o token local e revoga no Cognito', () async {
      client.authorizeResult = _tokens();
      final r = repo();
      await r.signIn();
      client.revokeGate = Completer<void>(); // revogacao presa na rede
      await r.signOut(); // nao espera a revogacao
      expect(r.session, isNull);
      expect(store.value, isNull);
      expect(client.revoked, ['r1']);
      expect(client.endSessions, hasLength(1)); // logout do Hosted UI
      expect(client.endSessions.single, isNotNull); // id token como hint
      expect(await r.accessToken(), isNull);
      client.revokeGate!.complete();
    });
  });
}
