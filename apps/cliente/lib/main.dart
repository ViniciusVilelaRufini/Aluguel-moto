import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';

/// `--dart-define=API_BASE_URL=http://10.0.2.2:3000` (ou o Prism em :4010).
/// `--dart-define=AUTH_MODE=dev|cognito` (padrao dev).
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(ProviderScope(
    // Sem retry automatico do Riverpod: o Dio ja repete e a UI mostra "Tentar de novo".
    retry: (_, _) => null,
    child: const VoltiClienteApp()));
}
