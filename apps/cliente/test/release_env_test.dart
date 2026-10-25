// Validacao do ambiente de build release (API_BASE_URL, SUPPORT_PHONE, MP_PUBLIC_KEY e COGNITO_*).

import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/core/cognito.dart';
import 'package:volti_cliente/core/release_env.dart';

const _key = 'APP_USR-0000';
const _cognito = CognitoConfig(region: 'sa-east-1', userPoolId: '', clientId: 'abc123', domain: 'volti.auth.sa-east-1.amazoncognito.com');

void main() {
  group('releaseEnvironmentProblems', () {
    test('fora de release nao exige nada', () {
      expect(releaseEnvironmentProblems(isRelease: false, apiBaseUrl: '', supportPhone: kSupportPhonePlaceholder, mpPublicKey: '', cognito: _cognito), isEmpty);
    });

    test('release completo e valido', () {
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://api.volti.com.br', supportPhone: '+5511999990000', mpPublicKey: _key, cognito: _cognito), isEmpty);
    });

    test('release sem API_BASE_URL', () {
      final p = releaseEnvironmentProblems(isRelease: true, apiBaseUrl: ' ', supportPhone: '+5511999990000', mpPublicKey: _key, cognito: _cognito);
      expect(p, hasLength(1));
      expect(p.single, contains('API_BASE_URL'));
    });

    test('release sem SUPPORT_PHONE ou com o valor de exemplo', () {
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: '', mpPublicKey: _key, cognito: _cognito).single, contains('SUPPORT_PHONE'));
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: kSupportPhonePlaceholder, mpPublicKey: _key, cognito: _cognito).single, contains('exemplo'));
    });

    test('release sem MP_PUBLIC_KEY', () {
      final p = releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: '+5511999990000', mpPublicKey: '  ', cognito: _cognito);
      expect(p, hasLength(1));
      expect(p.single, contains('MP_PUBLIC_KEY'));
    });

    test('release sem COGNITO_REGION, COGNITO_CLIENT_ID ou COGNITO_DOMAIN (login do cliente)', () {
      const none = CognitoConfig(region: '', userPoolId: '', clientId: ' ', domain: '');
      final p = releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: '+5511999990000', mpPublicKey: _key, cognito: none);
      expect(p, hasLength(3));
      expect(p[0], contains('COGNITO_REGION'));
      expect(p[1], contains('COGNITO_CLIENT_ID'));
      expect(p[2], contains('COGNITO_DOMAIN'));
      const noDomain = CognitoConfig(region: 'sa-east-1', userPoolId: '', clientId: 'abc', domain: '');
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: '+5511999990000', mpPublicKey: _key, cognito: noDomain).single, contains('COGNITO_DOMAIN'));
      expect(releaseEnvironmentProblems(isRelease: false, apiBaseUrl: 'https://a', supportPhone: '+5511999990000', mpPublicKey: _key, cognito: none), isEmpty);
    });

    test('release com tudo errado lista todos os problemas', () {
      const none = CognitoConfig(region: '', userPoolId: '', clientId: '');
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: '', supportPhone: kSupportPhonePlaceholder, mpPublicKey: '', cognito: none), hasLength(6));
    });
  });

  test('SUPPORT_PHONE que nao parece telefone e recusado', () {
    for (final bad in ['abc', '12', '+55 (11) 9999']) {
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: bad, mpPublicKey: _key, cognito: _cognito).single, contains('invalido'), reason: bad);
    }
    expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: '1133334444', mpPublicKey: _key, cognito: _cognito), isEmpty);
  });
}
