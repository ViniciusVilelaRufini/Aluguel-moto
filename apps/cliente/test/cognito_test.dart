import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/core/auth_mode.dart';
import 'package:volti_cliente/core/auth_store.dart';
import 'package:volti_cliente/core/cognito.dart';
import 'package:volti_cliente/core/cognito_auth.dart';
import 'package:volti_flutter/volti_flutter.dart' show AuthMode;

const config = CognitoConfig(
  region: 'sa-east-1',
  userPoolId: 'sa-east-1_abc',
  clientId: 'client123',
  domain: 'https://volti-dev.auth.sa-east-1.amazoncognito.com/',
  redirectUri: 'volti://auth/callback',
);

/// Transporte falso: grava as chamadas e responde por operacao.
class FakeTransport implements CognitoTransport {
  final calls = <(String, Map<String, dynamic>)>[];
  final forms = <(Uri, Map<String, String>)>[];
  final responses = <String, List<Object>>{};

  void on(String target, Object responseOrError) => (responses[target] ??= []).add(responseOrError);

  @override
  Future<Map<String, dynamic>> call(String target, Map<String, dynamic> body) async {
    calls.add((target, body));
    final queue = responses[target];
    if (queue == null || queue.isEmpty) return {};
    final r = queue.length == 1 ? queue.first : queue.removeAt(0);
    if (r is Exception) throw r;
    return r as Map<String, dynamic>;
  }

  @override
  Future<Map<String, dynamic>> postForm(Uri uri, Map<String, String> form) async {
    forms.add((uri, form));
    return {'access_token': jwt({'sub': 'u1'}), 'id_token': jwt({'email': 'ana@x.com'}), 'refresh_token': 'r1', 'expires_in': 3600};
  }
}

String jwt(Map<String, dynamic> claims) =>
    'h.${base64Url.encode(utf8.encode(jsonEncode(claims))).replaceAll('=', '')}.s';

class FakeBrowser implements WebAuthBrowser {
  Uri? opened;
  String? scheme;
  String Function(Uri url) reply = (url) => 'volti://auth/callback?code=abc&state=${url.queryParameters['state']}';
  @override
  Future<String> authenticate(Uri url, {required String callbackScheme}) async {
    opened = url;
    scheme = callbackScheme;
    return reply(url);
  }
}

void main() {
  group('CognitoConfig', () {
    test('normaliza o dominio e expoe endpoint e esquema', () {
      expect(config.domainHost, 'volti-dev.auth.sa-east-1.amazoncognito.com');
      expect(config.identityEndpoint.toString(), 'https://cognito-idp.sa-east-1.amazonaws.com/');
      expect(config.callbackScheme, 'volti');
      expect(config.hasHostedUi, isTrue);
      expect(const CognitoConfig(region: '', userPoolId: '', clientId: '').hasIdentityApi, isFalse);
      expect(const CognitoConfig(region: 'r', userPoolId: 'p', clientId: 'c').hasHostedUi, isFalse);
    });
  });

  group('modo de autenticacao', () {
    test('release nunca roda o modo dev', () {
      expect(resolveAuthMode(AuthMode.dev, release: true), AuthMode.cognito);
      expect(resolveAuthMode(AuthMode.cognito, release: true), AuthMode.cognito);
      expect(resolveAuthMode(AuthMode.dev, release: false), AuthMode.dev);
      expect(resolveAuthMode(AuthMode.cognito, release: false), AuthMode.cognito);
    });
  });

  group('PKCE', () {
    test('S256 do vetor da RFC 7636', () {
      final p = Pkce.fromVerifier('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
      expect(p.challenge, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    });

    test('verifier gerado tem 64 caracteres nao reservados', () {
      final p = Pkce.generate();
      expect(p.verifier, hasLength(64));
      expect(RegExp(r'^[A-Za-z0-9\-._~]+$').hasMatch(p.verifier), isTrue);
      expect(p.challenge.contains('='), isFalse);
    });
  });

  group('Hosted UI', () {
    const ui = CognitoHostedUi(config);
    final pkce = Pkce.fromVerifier('v' * 50);

    test('URL de autorizacao com provedor, PKCE e state', () {
      final u = ui.authorizeUri(provider: IdentityProvider.apple, pkce: pkce, state: 'st');
      expect(u.scheme, 'https');
      expect(u.host, 'volti-dev.auth.sa-east-1.amazoncognito.com');
      expect(u.path, '/oauth2/authorize');
      expect(u.queryParameters, {
        'response_type': 'code',
        'client_id': 'client123',
        'redirect_uri': 'volti://auth/callback',
        'identity_provider': 'SignInWithApple',
        'scope': 'openid email phone profile',
        'state': 'st',
        'code_challenge': pkce.challenge,
        'code_challenge_method': 'S256',
      });
      expect(ui.authorizeUri(provider: IdentityProvider.google, pkce: pkce, state: 's').queryParameters['identity_provider'], 'Google');
    });

    test('troca do codigo: corpo form do /oauth2/token', () {
      expect(ui.tokenUri.toString(), 'https://volti-dev.auth.sa-east-1.amazoncognito.com/oauth2/token');
      expect(ui.tokenRequestBody(code: 'c1', pkce: pkce), {
        'grant_type': 'authorization_code',
        'client_id': 'client123',
        'code': 'c1',
        'redirect_uri': 'volti://auth/callback',
        'code_verifier': pkce.verifier,
      });
    });

    test('retorno: confere state, erro e codigo', () {
      expect(ui.codeFromCallback('volti://auth/callback?code=x&state=s', expectedState: 's'), 'x');
      expect(() => ui.codeFromCallback('volti://auth/callback?code=x&state=outro', expectedState: 's'),
          throwsA(isA<CognitoException>().having((e) => e.type, 'type', 'StateMismatch')));
      expect(() => ui.codeFromCallback('volti://auth/callback?error=access_denied&state=s', expectedState: 's'),
          throwsA(isA<CognitoException>().having((e) => e.type, 'type', 'HostedUiError')));
      expect(() => ui.codeFromCallback('volti://auth/callback?state=s', expectedState: 's'), throwsA(isA<CognitoException>()));
    });
  });

  group('CognitoIdentityClient (corpo das requisicoes)', () {
    late FakeTransport t;
    late CognitoIdentityClient api;
    setUp(() {
      t = FakeTransport();
      api = CognitoIdentityClient(config, t);
    });

    test('SignUp sem senha com o atributo do telefone', () async {
      await api.signUp(username: '+5511987654321', attributes: {'phone_number': '+5511987654321'});
      expect(t.calls.single.$1, 'SignUp');
      expect(t.calls.single.$2, {
        'ClientId': 'client123',
        'Username': '+5511987654321',
        'UserAttributes': [
          {'Name': 'phone_number', 'Value': '+5511987654321'},
        ],
      });
    });

    test('InitiateAuth USER_AUTH com desafio preferido; Session so quando houver', () async {
      await api.initiateUserAuth(username: '+55', preferredChallenge: 'SMS_OTP');
      expect(t.calls.last.$2, {
        'ClientId': 'client123',
        'AuthFlow': 'USER_AUTH',
        'AuthParameters': {'USERNAME': '+55', 'PREFERRED_CHALLENGE': 'SMS_OTP'},
      });
      await api.initiateUserAuth(username: '+55', session: 'sess');
      expect(t.calls.last.$2, {
        'ClientId': 'client123',
        'AuthFlow': 'USER_AUTH',
        'AuthParameters': {'USERNAME': '+55'},
        'Session': 'sess',
      });
    });

    test('RespondToAuthChallenge leva <DESAFIO>_CODE', () async {
      await api.respondToOtp(challengeName: 'EMAIL_OTP', username: 'a@b.c', code: '123456', session: 's');
      expect(t.calls.single.$1, 'RespondToAuthChallenge');
      expect(t.calls.single.$2, {
        'ClientId': 'client123',
        'ChallengeName': 'EMAIL_OTP',
        'Session': 's',
        'ChallengeResponses': {'USERNAME': 'a@b.c', 'EMAIL_OTP_CODE': '123456'},
      });
    });

    test('refresh e revoke', () async {
      t.on('InitiateAuth', {
        'AuthenticationResult': {'AccessToken': 'a2', 'ExpiresIn': 3600},
      });
      final tokens = await api.refresh('r1');
      expect(tokens.accessToken, 'a2');
      expect(t.calls.last.$2['AuthFlow'], 'REFRESH_TOKEN_AUTH');
      expect(t.calls.last.$2['AuthParameters'], {'REFRESH_TOKEN': 'r1'});
      await api.revoke('r1');
      expect(t.calls.last.$1, 'RevokeToken');
      expect(t.calls.last.$2, {'ClientId': 'client123', 'Token': 'r1'});
    });
  });

  group('CognitoCustomerAuthRepository', () {
    test('Google: abre o Hosted UI, troca o codigo e guarda os tokens', () async {
      final t = FakeTransport();
      final store = MemoryCognitoTokenStore();
      final browser = FakeBrowser();
      final repo = CognitoCustomerAuthRepository(
          config: config, client: CognitoIdentityClient(config, t), store: store, browser: browser);
      await repo.signInWithProvider(IdentityProvider.google);

      expect(browser.scheme, 'volti');
      expect(browser.opened!.queryParameters['identity_provider'], 'Google');
      final form = t.forms.single.$2;
      expect(form['code'], 'abc');
      expect(Pkce.s256(form['code_verifier']!), browser.opened!.queryParameters['code_challenge']);
      expect(repo.session!.email, 'ana@x.com');
      expect(store.value!.refreshToken, 'r1');
    });

    test('state diferente no retorno: nao troca o codigo', () async {
      final t = FakeTransport();
      final browser = FakeBrowser()..reply = (_) => 'volti://auth/callback?code=abc&state=forjado';
      final repo = CognitoCustomerAuthRepository(
          config: config, client: CognitoIdentityClient(config, t), store: MemoryCognitoTokenStore(), browser: browser);
      await expectLater(repo.signInWithProvider(IdentityProvider.apple), throwsA(isA<CognitoException>()));
      expect(t.forms, isEmpty);
      expect(repo.session, isNull);
    });

    test('token perto de vencer: renova e mantem o refresh token', () async {
      final t = FakeTransport()
        ..on('InitiateAuth', {
          'AuthenticationResult': {'AccessToken': 'novo', 'ExpiresIn': 3600},
        });
      var now = DateTime(2026, 10, 21, 12);
      final store = MemoryCognitoTokenStore();
      final repo = CognitoCustomerAuthRepository(
        config: config,
        client: CognitoIdentityClient(config, t),
        store: store,
        restored: StoredTokens(accessToken: 'velho', refreshToken: 'r1', expiresAt: now.add(const Duration(minutes: 30))),
        now: () => now,
      );
      expect(await repo.accessToken(), 'velho');
      expect(t.calls, isEmpty);
      now = now.add(const Duration(minutes: 29, seconds: 30));
      expect(await repo.accessToken(), 'novo');
      expect(store.value!.refreshToken, 'r1');
    });

    test('refresh recusado encerra a sessao', () async {
      final t = FakeTransport()..on('InitiateAuth', const CognitoException('NotAuthorizedException'));
      final store = MemoryCognitoTokenStore();
      final repo = CognitoCustomerAuthRepository(
        config: config,
        client: CognitoIdentityClient(config, t),
        store: store,
        restored: StoredTokens(accessToken: 'a', refreshToken: 'r', expiresAt: DateTime(2000)),
      );
      expect(await repo.accessToken(), isNull);
      expect(repo.session, isNull);
    });

    test('refresh sem rede: manda o token atual em vez de nenhum bearer', () async {
      final t = FakeTransport()..on('InitiateAuth', const CognitoException(CognitoException.network));
      final repo = CognitoCustomerAuthRepository(
        config: config,
        client: CognitoIdentityClient(config, t),
        store: MemoryCognitoTokenStore(),
        restored: StoredTokens(accessToken: 'velho', refreshToken: 'r', expiresAt: DateTime(2000)),
      );
      expect(await repo.accessToken(), 'velho');
      expect(repo.session, isNotNull, reason: 'sessao mantida para tentar de novo');
    });

    test('sair revoga o refresh token e limpa o armazenamento', () async {
      final t = FakeTransport();
      final store = MemoryCognitoTokenStore();
      final repo = CognitoCustomerAuthRepository(
        config: config,
        client: CognitoIdentityClient(config, t),
        store: store,
        restored: StoredTokens(accessToken: 'a', refreshToken: 'r', expiresAt: DateTime(2100)),
      );
      await repo.signOut();
      expect(t.calls.single.$1, 'RevokeToken');
      expect(repo.session, isNull);
      expect(store.value, isNull);
    });
  });
}
