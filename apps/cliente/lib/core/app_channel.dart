import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Canal de distribuicao do app (`--dart-define=APP_CHANNEL=store|beta`).
/// `store` (padrao) e o build da loja, com todas as exigencias de release.
/// `beta` e so para TestFlight/ambiente dev: aceita o telefone de exemplo e funciona
/// sem chave do Mercado Pago (cartao de teste falso). Valor desconhecido = `store`.
enum AppChannel {
  store,
  beta;

  /// Interpreta o valor do define; qualquer coisa fora de `beta` vira [store] (fail-safe).
  static AppChannel parse(String? raw) => raw?.trim().toLowerCase() == 'beta' ? beta : store;
}

/// Canal deste build.
final kAppChannel = AppChannel.parse(const String.fromEnvironment('APP_CHANNEL'));

/// Sobrescrevivel nos testes.
final appChannelProvider = Provider<AppChannel>((ref) => kAppChannel);
