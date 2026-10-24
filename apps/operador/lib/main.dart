import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';
import 'package:path_provider/path_provider.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/app.dart';
import 'package:volti_operador/data/cognito_auth.dart';
import 'package:volti_operador/data/offline_queue.dart';
import 'package:volti_operador/data/service_unlock.dart';
import 'package:volti_operador/data/sync.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Release sem API_BASE_URL falha aqui, com mensagem clara (nao cai em localhost).
  defaultApiBaseUrl();
  final dir = await getApplicationDocumentsDirectory();
  Hive.init(dir.path);
  final queue = await HiveOfflineQueue.open();
  final unlocks = await HiveServiceUnlockStore.open();

  // AUTH_MODE=cognito: Hosted UI do pool interno; restaura a sessao salva.
  OperatorCognitoAuthRepository? cognito;
  if (AuthRepository.modeFromEnvironment() == AuthMode.cognito) {
    cognito = OperatorCognitoAuthRepository(
      config: CognitoConfig.fromEnvironment(),
      client: AppAuthCognitoClient(),
      store: SecureRefreshTokenStore(),
    );
    await cognito.restore();
  }

  runApp(ProviderScope(
    overrides: [
      offlineQueueProvider.overrideWithValue(queue),
      serviceUnlockStoreProvider.overrideWithValue(unlocks),
      if (cognito != null) authRepositoryProvider.overrideWithValue(cognito),
    ],
    child: const OperatorApp(),
  ));
}
