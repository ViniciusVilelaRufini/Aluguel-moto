import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'app.dart';
import 'core/auth_mode.dart';
import 'core/auth_store.dart';
import 'core/cognito.dart';
import 'core/cognito_auth.dart';
import 'core/map_tiles.dart';
import 'core/release_env.dart';

/// `--dart-define=API_BASE_URL=http://10.0.2.2:3000` (ou o Prism em :4010).
/// `--dart-define=AUTH_MODE=dev|cognito` (padrao dev; release sempre cognito). No modo cognito:
/// `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_DOMAIN`,
/// `COGNITO_REDIRECT_URI` (ver README).
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Release sem API_BASE_URL / SUPPORT_PHONE reais: falha aqui, com mensagem clara.
  assertReleaseEnvironment();
  await SystemChrome.setPreferredOrientations(const [DeviceOrientation.portraitUp]);
  // Release: nenhum log de depuracao (tiles com erro, etc.) sai do aparelho.
  if (kReleaseMode) debugPrint = (String? message, {int? wrapWidth}) {};
  // Provedor de tiles de dev em release / tile de aviso (ex.: falta de chave): avisa.
  unawaited(checkMapTilesAtStartup());
  final mode = resolveAuthMode(AuthRepository.modeFromEnvironment());
  final overrides = [
    authRepositoryProvider.overrideWithValue(
      mode == AuthMode.dev
          ? await PersistentDevAuthRepository.restore(baseUrl: defaultApiBaseUrl())
          : await CognitoCustomerAuthRepository.restore(CognitoConfig.fromEnvironment()),
    ),
  ];
  runApp(ProviderScope(
    overrides: overrides,
    // Sem retry automatico do Riverpod: o Dio ja repete e a UI mostra "Tentar de novo".
    retry: (_, _) => null,
    child: const VoltiClienteApp(),
  ));
}
