import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'app.dart';
import 'core/auth_store.dart';
import 'core/cognito.dart';
import 'core/cognito_auth.dart';

/// `--dart-define=API_BASE_URL=http://10.0.2.2:3000` (ou o Prism em :4010).
/// `--dart-define=AUTH_MODE=dev|cognito` (padrao dev). No modo cognito:
/// `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_DOMAIN`,
/// `COGNITO_REDIRECT_URI` (ver README).
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final mode = AuthRepository.modeFromEnvironment();
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
