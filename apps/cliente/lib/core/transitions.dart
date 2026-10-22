import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// Mapa rota -> transicao do app do cliente (docs/design/evolucoes-app.md,
/// "Mapa de transicoes"). Chave = `GoRouterState.fullPath`. Toda rota com tela
/// precisa estar aqui (o teste `transitions_test.dart` cobra).
///
/// - [VoltiScreenTransition.fadeThrough]: trocas de raiz (boas-vindas, cadastro,
///   inicio, corrida).
/// - [VoltiScreenTransition.modal]: telas de "momento" que sobem de baixo (QR da
///   reserva, confira sua moto, recibo).
/// - [VoltiScreenTransition.push]: o funil (escolher moto -> plano -> seguro ->
///   retirada), a devolucao e a conta.
const routeTransitions = <String, VoltiScreenTransition>{
  '/welcome': VoltiScreenTransition.fadeThrough,
  '/login': VoltiScreenTransition.push,
  '/onboarding': VoltiScreenTransition.fadeThrough,
  '/home': VoltiScreenTransition.fadeThrough,
  '/pick': VoltiScreenTransition.push,
  '/plan': VoltiScreenTransition.push,
  '/insurance': VoltiScreenTransition.push,
  '/pickup': VoltiScreenTransition.push,
  '/reservation/:id': VoltiScreenTransition.modal,
  '/handover/:id': VoltiScreenTransition.modal,
  '/ride': VoltiScreenTransition.fadeThrough,
  '/return/:id': VoltiScreenTransition.push,
  '/station-swap/scan': VoltiScreenTransition.push,
  '/station-swap/:stationId/:swapId': VoltiScreenTransition.modal,
  '/summary/:id': VoltiScreenTransition.modal,
  '/account': VoltiScreenTransition.push,
  '/account/history': VoltiScreenTransition.push,
  '/account/wallet': VoltiScreenTransition.push,
  '/account/subscriptions': VoltiScreenTransition.push,
  '/account/support': VoltiScreenTransition.push,
  '/account/support/:id': VoltiScreenTransition.push,
  '/account/help': VoltiScreenTransition.push,
  '/account/rules': VoltiScreenTransition.push,
  '/account/requests': VoltiScreenTransition.push,
  '/account/emergency': VoltiScreenTransition.push,
  '/account/privacy': VoltiScreenTransition.push,
  '/account/verification': VoltiScreenTransition.push,
  '/account/claim/:rentalId': VoltiScreenTransition.push,
};

/// Transicao da rota [fullPath]; push quando nao mapeada.
VoltiScreenTransition transitionFor(String? fullPath) =>
    routeTransitions[fullPath] ?? VoltiScreenTransition.push;

/// Pagina do go_router com a transicao do design para a rota ([transitionFor]
/// pelo `fullPath`, ou [transition] explicito). Duracao `--dur-screen` (zero com
/// reduced motion ou leitor de tela). As paginas ficam vivas por baixo
/// (`maintainState`): o mapa do inicio nao e reconstruido ao voltar.
CustomTransitionPage<T> voltiPage<T>(
  BuildContext context,
  GoRouterState state,
  Widget child, {
  VoltiScreenTransition? transition,
}) {
  final d = VoltiPageTransitions.durationOf(context);
  return CustomTransitionPage<T>(
    key: state.pageKey,
    name: state.name ?? state.path,
    arguments: <String, String>{...state.pathParameters, ...state.uri.queryParameters},
    restorationId: state.pageKey.value,
    child: child,
    transitionDuration: d,
    reverseTransitionDuration: d,
    transitionsBuilder: VoltiPageTransitions.builderFor(transition ?? transitionFor(state.fullPath)),
  );
}
