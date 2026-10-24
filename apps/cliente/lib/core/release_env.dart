/// Telefone do suporte (`--dart-define=SUPPORT_PHONE=+55...`). Sem valor real,
/// o SOS nao pode ligar para ninguem: em release isso e erro de inicializacao.
const kSupportPhone = String.fromEnvironment('SUPPORT_PHONE', defaultValue: kSupportPhonePlaceholder);

/// Valor de exemplo que nunca pode ir para producao.
const kSupportPhonePlaceholder = '+551100000000';

final _phoneShape = RegExp(r'^\+?\d{8,15}$');

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
    if (phone.isEmpty)
      'SUPPORT_PHONE ausente (--dart-define=SUPPORT_PHONE=+55...)'
    else if (phone == kSupportPhonePlaceholder)
      'SUPPORT_PHONE e o valor de exemplo $kSupportPhonePlaceholder'
    else if (!_phoneShape.hasMatch(phone))
      'SUPPORT_PHONE invalido (use so digitos, ex.: +5511999990000)',
  ];
}

/// Telefones de emergencia do Brasil (atalhos do SOS).
const kSamuPhone = '192';
const kPolicePhone = '190';
