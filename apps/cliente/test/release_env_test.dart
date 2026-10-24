// Validacao do ambiente de build release (API_BASE_URL e SUPPORT_PHONE).

import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/core/release_env.dart';

void main() {
  group('releaseEnvironmentProblems', () {
    test('fora de release nao exige nada', () {
      expect(releaseEnvironmentProblems(isRelease: false, apiBaseUrl: '', supportPhone: kSupportPhonePlaceholder), isEmpty);
    });

    test('release completo e valido', () {
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://api.volti.com.br', supportPhone: '+5511999990000'), isEmpty);
    });

    test('release sem API_BASE_URL', () {
      final p = releaseEnvironmentProblems(isRelease: true, apiBaseUrl: ' ', supportPhone: '+5511999990000');
      expect(p, hasLength(1));
      expect(p.single, contains('API_BASE_URL'));
    });

    test('release sem SUPPORT_PHONE ou com o valor de exemplo', () {
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: '').single, contains('SUPPORT_PHONE'));
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: kSupportPhonePlaceholder).single, contains('exemplo'));
    });

    test('release com tudo errado lista todos os problemas', () {
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: '', supportPhone: kSupportPhonePlaceholder), hasLength(2));
    });
  });

  test('SUPPORT_PHONE que nao parece telefone e recusado', () {
    for (final bad in ['abc', '12', '+55 (11) 9999']) {
      expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: bad).single, contains('invalido'), reason: bad);
    }
    expect(releaseEnvironmentProblems(isRelease: true, apiBaseUrl: 'https://a', supportPhone: '1133334444'), isEmpty);
  });
}
