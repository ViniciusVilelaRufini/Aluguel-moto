import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/data/tasks_provider.dart';
import 'package:volti_operador/features/auth/auth.dart';
import 'package:volti_operador/features/battery/battery_swap_page.dart';
import 'package:volti_operador/features/home/home_shell.dart';
import 'package:volti_operador/features/fleet/fleet_service_page.dart';
import 'package:volti_operador/features/fleet/van_stock_page.dart';
import 'package:volti_operador/features/inspection/inspection_page.dart';
import 'package:volti_operador/features/sync/sync_page.dart';
import 'package:volti_operador/features/tasks/task_detail_page.dart';
import 'package:volti_operador/l10n/app_localizations.dart';

/// Rotas: `/login`, `/tasks` (abas Tarefas e Retiradas), `/tasks/:id`, `/tasks/:id/inspection`, `/tasks/:id/battery`, `/sync`.
/// Rotas: `/login`, `/tasks`, `/tasks/:id`, `/tasks/:id/inspection`, `/tasks/:id/battery`, `/sync`,
/// `/van` (baterias na van) e `/maintenance` (revisoes da frota).
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(sessionProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);
  return GoRouter(
    initialLocation: '/tasks',
    refreshListenable: refresh,
    redirect: (context, state) {
      final signedIn = ref.read(sessionProvider) != null;
      final atLogin = state.matchedLocation == '/login';
      if (!signedIn) return atLogin ? null : '/login';
      if (atLogin) {
        ref.invalidate(tasksProvider);
        return '/tasks';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, _) => const LoginPage()),
      GoRoute(
        path: '/tasks',
        builder: (_, _) => const HomeShell(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (_, s) => TaskDetailPage(taskId: s.pathParameters['id']!),
            routes: [
              GoRoute(
                path: 'inspection',
                builder: (ctx, s) => InspectionPage(
                    taskId: s.pathParameters['id']!, onDone: () => ctx.pop()),
              ),
              GoRoute(
                path: 'battery',
                builder: (ctx, s) => BatterySwapPage(
                    taskId: s.pathParameters['id']!, onDone: () => ctx.pop()),
              ),
            ],
          ),
        ],
      ),
      GoRoute(path: '/sync', builder: (_, _) => const SyncPage()),
      GoRoute(path: '/van', builder: (_, _) => const VanStockPage()),
      GoRoute(path: '/maintenance', builder: (_, _) => const FleetServicePage()),
    ],
  );
});

class OperatorApp extends ConsumerWidget {
  const OperatorApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(syncControllerProvider); // mantem a fila ouvindo a rede
    return MaterialApp.router(
      onGenerateTitle: (c) => AppLocalizations.of(c).appTitle,
      theme: VoltiTheme.light(),
      darkTheme: VoltiTheme.dark(),
      locale: const Locale('pt', 'BR'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: ref.watch(routerProvider),
      // Textos de leitor de tela do loading/sucesso dos botoes (E-21).
      builder: (context, child) => VoltiButtonLabels(
        loading: AppLocalizations.of(context).buttonBusy,
        success: AppLocalizations.of(context).buttonDone,
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}
