import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_channel.dart';
import 'cognito.dart';

/// Telefone do suporte (`--dart-define=SUPPORT_PHONE=+55...`). Sem valor real,
/// o SOS nao pode ligar para ninguem: em release isso e erro de inicializacao.
const kSupportPhone = String.fromEnvironment('SUPPORT_PHONE', defaultValue: kSupportPhonePlaceholder);

/// Valor de exemplo que nunca pode ir para producao.
const kSupportPhonePlaceholder = '+551100000000';

final _phoneShape = RegExp(r'^\+?\d{8,15}$');

/// No canal `beta` (TestFlight/dev) o telefone de exemplo e a falta de `MP_PUBLIC_KEY` sao aceitos;
/// telefone vazio ou invalido, API e Cognito continuam exigidos. Canal `store`: sem excecoes.
/// Problemas do ambiente de build. Fora de release ([isRelease] falso) nao ha
/// exigencias. Em release exige `API_BASE_URL`, um `SUPPORT_PHONE` real, `MP_PUBLIC_KEY`
/// (chave publica do Mercado Pago; sem ela o cartao nao pode ser tokenizado) e o login do Cognito
/// (release sempre usa AUTH_MODE=cognito): `COGNITO_REGION` e `COGNITO_CLIENT_ID` (celular/e-mail com
/// codigo) e `COGNITO_DOMAIN` (Hosted UI do Google/Apple). `COGNITO_REDIRECT_URI` tem padrao.
List<String> releaseEnvironmentProblems({
  required bool isRelease,
  required String apiBaseUrl,
  required String supportPhone,
  required String mpPublicKey,
  required CognitoConfig cognito,
  AppChannel channel = AppChannel.store,
}) {
  if (!isRelease) return const [];
  final beta = channel == AppChannel.beta;
  final phone = supportPhone.trim();
  return [
    if (apiBaseUrl.trim().isEmpty) 'API_BASE_URL ausente (--dart-define=API_BASE_URL=https://...)',
    if (phone.isEmpty)
      'SUPPORT_PHONE ausente (--dart-define=SUPPORT_PHONE=+55...)'
    else if (phone == kSupportPhonePlaceholder && !beta)
      'SUPPORT_PHONE e o valor de exemplo $kSupportPhonePlaceholder'
    else if (!_phoneShape.hasMatch(phone))
      'SUPPORT_PHONE invalido (use so digitos, ex.: +5511999990000)',
    if (mpPublicKey.trim().isEmpty && !beta) 'MP_PUBLIC_KEY ausente (--dart-define=MP_PUBLIC_KEY=APP_USR-...)',
    if (cognito.region.trim().isEmpty) 'COGNITO_REGION ausente (--dart-define=COGNITO_REGION=sa-east-1)',
    if (cognito.clientId.trim().isEmpty) 'COGNITO_CLIENT_ID ausente (--dart-define=COGNITO_CLIENT_ID=...)',
    if (cognito.domain.trim().isEmpty) 'COGNITO_DOMAIN ausente (--dart-define=COGNITO_DOMAIN=<dominio>.auth.sa-east-1.amazoncognito.com)',
  ];
}

/// Telefones de emergencia do Brasil (atalhos do SOS).
const kSamuPhone = '192';
const kPolicePhone = '190';

/// Telefone do suporte usado pelo SOS (sobrescrevivel nos testes).
final supportPhoneProvider = Provider<String>((ref) => kSupportPhone);

/// No canal `beta` o telefone de exemplo nao e discado: o SOS avisa que o suporte esta indisponivel.
bool isSupportPhoneUnavailable({required AppChannel channel, required String phone}) =>
    channel == AppChannel.beta && phone.trim() == kSupportPhonePlaceholder;
