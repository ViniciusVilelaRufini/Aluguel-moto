
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart' show StationSwap;

import '../features/account/account_screens.dart';
import '../features/handover/handover_screen.dart';
import '../features/home/home_screen.dart';
import '../features/onboarding/login_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/pick/depot_selection.dart';
import '../features/pick/pick_screen.dart';
import '../features/pickup/pickup_screen.dart';
import '../features/plan/insurance_screen.dart';
import '../features/plan/plan_screen.dart';
import '../features/reservation/depot_reservation_screen.dart';
import '../features/return_flow/return_screen.dart';
import '../features/station_swap/swap_progress_screen.dart';
import '../features/station_swap/swap_scan_screen.dart';
import '../features/ride/ride_screen.dart';
import '../features/summary/summary_screen.dart';
import 'session.dart';
import 'transitions.dart';

export 'transitions.dart' show voltiPage, transitionFor, routeTransitions;

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
    routes: appRoutes(),
  );
});

/// Rotas do app (o [routerProvider] acrescenta os redirecionamentos da sessao).
/// A transicao de cada tela vem de [routeTransitions] (core/transitions.dart).
/// Telas do fluxo do galpao que dependem do `extra` ([DepotSelection]) voltam a
/// home quando ele falta (link antigo ou app restaurado).
List<RouteBase> appRoutes() => [
      GoRoute(path: '/welcome', pageBuilder: (c, state) => voltiPage(c, state, const WelcomeScreen())),
      GoRoute(path: '/login', pageBuilder: (c, state) => voltiPage(c, state, const LoginScreen())),
      GoRoute(path: '/onboarding', pageBuilder: (c, state) => voltiPage(c, state, const OnboardingScreen())),
      GoRoute(path: '/home', pageBuilder: (c, state) => voltiPage(c, state, const HomeScreen())),
      GoRoute(path: '/pick', pageBuilder: (c, state) => voltiPage(c, state, const PickScreen())),
      // Reserva de rua (antiga): leva ao inicio, que mostra a reserva atual se houver.
      GoRoute(path: '/reserved', redirect: (_, _) => '/home'),
      // Retirada em galpao: o cliente nao escaneia moto (nem para alugar nem para trocar
      // no meio da corrida, docs/decisoes.md 2026-10-22). Links antigos voltam ao inicio.
      GoRoute(path: '/scan', redirect: (_, _) => '/home'),
      GoRoute(path: '/plan', redirect: _needsSelection, pageBuilder: (c, state) => voltiPage(c, state, PlanScreen(selection: state.extra! as DepotSelection))),
      GoRoute(path: '/insurance', redirect: _needsSelection, pageBuilder: (c, state) => voltiPage(c, state, InsuranceScreen(selection: state.extra! as DepotSelection))),
      GoRoute(path: '/pickup', redirect: _needsSelection, pageBuilder: (c, state) => voltiPage(c, state, PickupScreen(selection: state.extra! as DepotSelection))),
      GoRoute(path: '/reservation/:id', pageBuilder: (c, state) => voltiPage(c, state, DepotReservationScreen(reservationId: state.pathParameters['id']!))),
      // "Confira sua moto": aberta pelo evento `handover.pending` ou pela reserva em `handover`.
      GoRoute(path: '/handover/:id', pageBuilder: (c, state) => voltiPage(c, state, HandoverScreen(handoverId: state.pathParameters['id']!))),
      GoRoute(path: '/ride', pageBuilder: (c, state) => voltiPage(c, state, const RideScreen())),
      GoRoute(path: '/return/:id', pageBuilder: (c, state) => voltiPage(c, state, ReturnScreen(rentalId: state.pathParameters['id']!))),
      // Troca de bateria na estacao (QR): leitor + confirmacao e progresso.
      GoRoute(
        path: '/station-swap/scan',
        pageBuilder: (c, state) => voltiPage(c, state, SwapScanScreen(stationHint: state.uri.queryParameters['station'])),
      ),
      GoRoute(
        path: '/station-swap/:stationId/:swapId',
        pageBuilder: (c, state) => voltiPage(
          c,
          state,
          SwapProgressScreen(
            stationId: state.pathParameters['stationId']!,
            swapId: state.pathParameters['swapId']!,
            initial: state.extra is StationSwap ? state.extra! as StationSwap : null,
          ),
        ),
      ),
      GoRoute(path: '/summary/:id', pageBuilder: (c, state) => voltiPage(c, state, SummaryScreen(rentalId: state.pathParameters['id']!))),
      GoRoute(
        path: '/account',
        pageBuilder: (c, state) => voltiPage(c, state, const AccountScreen()),
        routes: [
          GoRoute(
            path: 'history',
            pageBuilder: (c, state) => voltiPage(c, state, HistoryScreen(pick: state.uri.queryParameters['pick'] == '1')),
          ),
          GoRoute(path: 'wallet', pageBuilder: (c, state) => voltiPage(c, state, const WalletScreen())),
          GoRoute(path: 'cards', pageBuilder: (c, state) => voltiPage(c, state, const CardsScreen())),
          GoRoute(path: 'subscriptions', pageBuilder: (c, state) => voltiPage(c, state, const SubscriptionsScreen())),
          GoRoute(path: 'support', pageBuilder: (c, state) => voltiPage(c, state, const SupportScreen())),
          GoRoute(path: 'support/:id', pageBuilder: (c, state) => voltiPage(c, state, SupportChatScreen(conversationId: state.pathParameters['id']!))),
          GoRoute(path: 'help', pageBuilder: (c, state) => voltiPage(c, state, const HelpScreen())),
          GoRoute(path: 'rules', pageBuilder: (c, state) => voltiPage(c, state, const TrafficRulesScreen())),
          GoRoute(path: 'requests', pageBuilder: (c, state) => voltiPage(c, state, const RequestsScreen())),
          GoRoute(path: 'emergency', pageBuilder: (c, state) => voltiPage(c, state, const EmergencyContactScreen())),
          GoRoute(path: 'privacy', pageBuilder: (c, state) => voltiPage(c, state, const PrivacyScreen())),
          GoRoute(path: 'verification', pageBuilder: (c, state) => voltiPage(c, state, const VerificationStatusScreen())),
          GoRoute(path: 'claim/:rentalId', pageBuilder: (c, state) => voltiPage(c, state, ClaimScreen(rentalId: state.pathParameters['rentalId']!))),
        ],
      ),
    ];

String? _needsSelection(BuildContext _, GoRouterState state) => state.extra is DepotSelection ? null : '/home';
