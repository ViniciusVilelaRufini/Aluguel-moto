
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../features/account/account_screens.dart';
import '../features/home/home_screen.dart';
import '../features/onboarding/login_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/pick/pick_screen.dart';
import '../features/plan/plan_screen.dart';
import '../features/reservation/reserved_screen.dart';
import '../features/return_flow/return_screen.dart';
import '../features/ride/ride_screen.dart';
import '../features/scan/scan_screen.dart';
import '../features/summary/summary_screen.dart';
import 'session.dart';

const _publicPaths = {'/welcome', '/login'};

/// Pagina com as transicoes do design: push lateral de 440 ms (`--ease-screen`)
/// ou, com [modal], sobe de baixo enquanto a tela de tras recua (scan).
/// Reduced motion: sem animacao.
CustomTransitionPage<T> voltiPage<T>(BuildContext context, GoRouterState state, Widget child, {bool modal = false}) {
  final d = VoltiPageTransitions.durationOf(context);
  return CustomTransitionPage<T>(
    key: state.pageKey,
    name: state.name ?? state.path,
    arguments: <String, String>{...state.pathParameters, ...state.uri.queryParameters},
    restorationId: state.pageKey.value,
    child: child,
    transitionDuration: d,
    reverseTransitionDuration: d,
    transitionsBuilder: modal ? VoltiPageTransitions.modal : VoltiPageTransitions.push,
  );
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(sessionProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/home',
    refreshListenable: refresh,
    redirect: (context, state) {
      final session = ref.read(sessionProvider);
      final path = state.uri.path;
      if (session.isLoading && !session.hasValue) return null;
      final s = session.value;
      if (s == null || !s.signedIn) {
        return _publicPaths.contains(path) ? null : '/welcome';
      }
      if (!s.onboardingDone) {
        return path == '/onboarding' ? null : '/onboarding';
      }
      if (_publicPaths.contains(path)) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/welcome', pageBuilder: (c, state) => voltiPage(c, state, const WelcomeScreen())),
      GoRoute(path: '/login', pageBuilder: (c, state) => voltiPage(c, state, const LoginScreen())),
      GoRoute(path: '/onboarding', pageBuilder: (c, state) => voltiPage(c, state, const OnboardingScreen())),
      GoRoute(path: '/home', pageBuilder: (c, state) => voltiPage(c, state, const HomeScreen())),
      GoRoute(path: '/pick', pageBuilder: (c, state) => voltiPage(c, state, const PickScreen())),
      GoRoute(path: '/reserved', pageBuilder: (c, state) => voltiPage(c, state, const ReservedScreen())),
      GoRoute(
        path: '/scan',
        pageBuilder: (c, state) => voltiPage(c, state, ScanScreen(swapRentalId: state.uri.queryParameters['swap'], expectedCode: state.uri.queryParameters['v']), modal: true),
      ),
      GoRoute(path: '/plan', pageBuilder: (c, state) => voltiPage(c, state, PlanScreen(vehicle: state.extra! as Vehicle))),
      GoRoute(path: '/ride', pageBuilder: (c, state) => voltiPage(c, state, const RideScreen())),
      GoRoute(path: '/return/:id', pageBuilder: (c, state) => voltiPage(c, state, ReturnScreen(rentalId: state.pathParameters['id']!))),
      GoRoute(path: '/summary/:id', pageBuilder: (c, state) => voltiPage(c, state, SummaryScreen(rentalId: state.pathParameters['id']!))),
      GoRoute(
        path: '/account',
        pageBuilder: (c, state) => voltiPage(c, state, const AccountScreen()),
        routes: [
          GoRoute(path: 'history', pageBuilder: (c, state) => voltiPage(c, state, const HistoryScreen())),
          GoRoute(path: 'wallet', pageBuilder: (c, state) => voltiPage(c, state, const WalletScreen())),
          GoRoute(path: 'subscriptions', pageBuilder: (c, state) => voltiPage(c, state, const SubscriptionsScreen())),
          GoRoute(path: 'support', pageBuilder: (c, state) => voltiPage(c, state, const SupportScreen())),
          GoRoute(path: 'support/:id', pageBuilder: (c, state) => voltiPage(c, state, SupportChatScreen(conversationId: state.pathParameters['id']!))),
          GoRoute(path: 'help', pageBuilder: (c, state) => voltiPage(c, state, const HelpScreen())),
          GoRoute(path: 'privacy', pageBuilder: (c, state) => voltiPage(c, state, const PrivacyScreen())),
          GoRoute(path: 'verification', pageBuilder: (c, state) => voltiPage(c, state, const VerificationStatusScreen())),
          GoRoute(path: 'claim/:rentalId', pageBuilder: (c, state) => voltiPage(c, state, ClaimScreen(rentalId: state.pathParameters['rentalId']!))),
        ],
      ),
    ],
  );
});
