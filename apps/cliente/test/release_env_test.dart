// Validacao do ambiente de build release (API_BASE_URL, SUPPORT_PHONE e MP_PUBLIC_KEY).

import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/core/release_env.dart';

const _key = 'APP_USR-0000';

void main() {
  group('releaseEnvironmentProblems', () {
    test('fora de release nao exige nada', () {
      expect(releaseEnvironmentProblems(isRelease: false, apiBaseUrl: '', supportPhone: kSupportPhonePlaceholder, mpPublicKey: ''), isEmpty);
    });

    test('release completo e valido', () {
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://api.volti.com.br', supportPhone: '+5511999990000', mpPublicKey: _key), isEmpty);
    });

    test('release sem API_BASE_URL', () {
      final p = releaseEnvironmentProblems(isRelease: true, apiBaseUrl: ' ', supportPhone: '+5511999990000', mpPublicKey: _key);
      expect(p, hasLength(1));
      expect(p.single, contains('API_BASE_URL'));
    });

    test('release sem SUPPORT_PHONE ou com o valor de exemplo', () {
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: '', mpPublicKey: _key).single, contains('SUPPORT_PHONE'));
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: kSupportPhonePlaceholder, mpPublicKey: _key).single, contains('exemplo'));
    });

    test('release sem MP_PUBLIC_KEY', () {
      final p = releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: '+5511999990000', mpPublicKey: '  ');
      expect(p, hasLength(1));
      expect(p.single, contains('MP_PUBLIC_KEY'));
    });

    test('release com tudo errado lista todos os problemas', () {
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: '', supportPhone: kSupportPhonePlaceholder, mpPublicKey: ''), hasLength(3));
    });
  });
}
