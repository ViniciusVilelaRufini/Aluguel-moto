import 'package:flutter/foundation.dart';

/// Telefone do suporte (`--dart-define=SUPPORT_PHONE=+55...`). Sem valor real,
/// o SOS nao pode ligar para ninguem: em release isso e erro de inicializacao.
const kSupportPhone = String.fromEnvironment('SUPPORT_PHONE', defaultValue: kSupportPhonePlaceholder);

/// Valor de exemplo que nunca pode ir para producao.
const kSupportPhonePlaceholder = '+551100000000';

/// Erro de configuracao de um build release (define obrigatorio ausente).
class ReleaseEnvironmentError extends StateError {
  ReleaseEnvironmentError(List<String> problems)
      : problems = List.unmodifiable(problems),
        super('Configuracao de release invalida: ${problems.join('; ')}');
  final List<String> problems;
}

/// Problemas do ambiente de build. Fora de release ([isRelease] falso) nao ha
/// exigencias. Em release exige `API_BASE_URL` e um `SUPPORT_PHONE` real.
List<String> releaseEnvironmentProblems({
  required bool isRelease,
  required String apiBaseUrl,
  required String supportPhone,
}) {
  if (!isRelease) return const [];
  final phone = supportPhone.trim();
  return [
    if (apiBaseUrl.trim().isEmpty) 'API_BASE_URL ausente (--dart-define=API_BASE_URL=https://...)',
    if (phone.isEmpty) 'SUPPORT_PHONE ausente (--dart-define=SUPPORT_PHONE=+55...)',
    if (phone == kSupportPhonePlaceholder) 'SUPPORT_PHONE e o valor de exemplo $kSupportPhonePlaceholder',
  ];
}

/// Falha na inicializacao (antes do `runApp`) se o build release estiver mal configurado.
void assertReleaseEnvironment({
  bool isRelease = kReleaseMode,
  String apiBaseUrl = const String.fromEnvironment('API_BASE_URL'),
  String supportPhone = kSupportPhone,
}) {
  final problems = releaseEnvironmentProblems(isRelease: isRelease, apiBaseUrl: apiBaseUrl, supportPhone: supportPhone);
  if (problems.isNotEmpty) throw ReleaseEnvironmentError(problems);
}

/// Telefones de emergencia do Brasil (atalhos do SOS).
const kSamuPhone = '192';
const kPolicePhone = '190';
