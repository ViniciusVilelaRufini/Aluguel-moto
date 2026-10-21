
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';

import '../features/account/account_screens.dart';
import '../features/home/home_screen.dart';
import '../features/onboarding/login_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/plan/plan_screen.dart';
import '../features/reservation/reserved_screen.dart';
import '../features/return_flow/return_screen.dart';
import '../features/ride/ride_screen.dart';
import '../features/scan/scan_screen.dart';
import '../features/summary/summary_screen.dart';
import 'session.dart';

const _publicPaths = {'/welcome', '/login'};

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
      GoRoute(path: '/welcome', builder: (_, _) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/onboarding', builder: (_, _) => const OnboardingScreen()),
      GoRoute(path: '/home', builder: (_, _) => const HomeScreen()),
      GoRoute(path: '/reserved', builder: (_, _) => const ReservedScreen()),
      GoRoute(
        path: '/scan',
        builder: (_, state) => ScanScreen(swapRentalId: state.uri.queryParameters['swap']),
      ),
      GoRoute(path: '/plan', builder: (_, state) => PlanScreen(vehicle: state.extra! as Vehicle)),
      GoRoute(path: '/ride', builder: (_, _) => const RideScreen()),
      GoRoute(path: '/return/:id', builder: (_, state) => ReturnScreen(rentalId: state.pathParameters['id']!)),
      GoRoute(path: '/summary/:id', builder: (_, state) => SummaryScreen(rentalId: state.pathParameters['id']!)),
      GoRoute(
        path: '/account',
        builder: (_, _) => const AccountScreen(),
        routes: [
          GoRoute(path: 'history', builder: (_, _) => const HistoryScreen()),
          GoRoute(path: 'wallet', builder: (_, _) => const WalletScreen()),
          GoRoute(path: 'subscriptions', builder: (_, _) => const SubscriptionsScreen()),
          GoRoute(path: 'support', builder: (_, _) => const SupportScreen()),
          GoRoute(path: 'support/:id', builder: (_, state) => SupportChatScreen(conversationId: state.pathParameters['id']!)),
          GoRoute(path: 'help', builder: (_, _) => const HelpScreen()),
          GoRoute(path: 'privacy', builder: (_, _) => const PrivacyScreen()),
          GoRoute(path: 'verification', builder: (_, _) => const VerificationStatusScreen()),
          GoRoute(path: 'claim/:rentalId', builder: (_, state) => ClaimScreen(rentalId: state.pathParameters['rentalId']!)),
        ],
      ),
    ],
  );
});
