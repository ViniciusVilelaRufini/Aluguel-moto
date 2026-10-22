// Troca na estacao, fix round 1: releitura do QR (I-1), segundo plano (I-2),
// folha travada durante o POST (I-3), GET atrasado depois do cancelamento
// (I-4), horario da estacao (m-3), dica da estacao (m-5), taxa exata (m-6),
// socket da corrida (m-1), devolucao com troca aberta (m-8) e chave em 5xx/429 (m-9).
import 'dart:async';
import 'dart:typed_data';

import 'package:built_collection/built_collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/ride/ride_data.dart';
import 'package:volti_cliente/features/station_swap/swap_confirm_sheet.dart';
import 'package:volti_cliente/features/station_swap/swap_logic.dart';
import 'package:volti_cliente/features/station_swap/swap_progress_screen.dart';
import 'package:volti_cliente/features/station_swap/swap_scan_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';
import 'swap_fixtures.dart';

class _EndSwapOpenBackend extends SwapBackend {
  // Sem posicao da moto: a devolucao nao bloqueia por zona (como no fix_round_test).
  @override
  Future<Rental> rental(String id) async => throw AppFailure(kind: FailureKind.network);
  @override
  Future<List<GeoZone>> zones() async => [];
  @override
  Future<PresignedUpload> returnPhotoUpload(String rentalId) async => PresignedUpload((b) => b
    ..objectKey = 'k1'
    ..uploadUrl = 'http://x'
    ..method = PresignedUploadMethodEnum.PUT
    ..headers = MapBuilder<String, String>()
    ..expiresAt = DateTime.utc(2030));
  @override
  Future<void> upload(PresignedUpload target, Uint8List bytes, String contentType) async {}
  @override
  Future<Rental> endRental(String rentalId, String photoKey, {String? idempotencyKey}) async => throw apiError(409, 'swap-open');
}

Future<GoRouter> pumpScanAt(WidgetTester t, SwapBackend b, void Function(ValueChanged<String>) grab, {String initial = '/station-swap/scan'}) async {
  tallScreen(t);
  scanNow = thu10;
  final router = GoRouter(initialLocation: initial, routes: appRoutes());
  addTearDown(router.dispose);
  await t.pumpWidget(testRouterApp(router, overrides: [
    backendProvider.overrideWithValue(b),
    locationServiceProvider.overrideWithValue(PhoneAt(largo)),
    sessionProvider.overrideWith(() => FakeSession(session())),
    clockProvider.overrideWithValue(() => scanNow),
    realtimeFactoryProvider.overrideWithValue(() => FakeRealtime()),
    qrScannerBuilderProvider.overrideWithValue((context, {required onCode, required onManual}) {
      grab(onCode);
      return const SizedBox.expand();
    }),
  ]));
  await settle(t);
  return router;
}

String stepTitle(WidgetTester t) => t.widget<Text>(find.byKey(const Key('swap-step-title'))).data!;

void main() {
  test('m-3: fechada so quando o horario e legivel e agora cai fora dele', () {
    final s = station(open24h: false); // Seg a sáb, 7h às 22h
    expect(stationClosedAt(s, thu10), isFalse); // qui 10h em SP
    expect(stationClosedAt(s, DateTime.utc(2026, 10, 23, 2)), isTrue); // qui 23h
    expect(stationClosedAt(s, DateTime.utc(2026, 10, 25, 15)), isTrue); // dom 12h
    expect(stationClosedAt(station(open24h: true), DateTime.utc(2026, 10, 25, 15)), isFalse);
    expect(stationClosedAt(station(open24h: false).rebuild((b) => b.openingHours = 'Horário do shopping'), DateTime.utc(2026, 10, 23, 2)), isFalse);
    final night = station(open24h: false).rebuild((b) => b.openingHours = 'Todos os dias, 18h às 2h');
    expect(stationClosedAt(night, DateTime.utc(2026, 10, 23, 2)), isFalse); // 23h
    expect(stationClosedAt(night, thu10), isTrue); // 10h
  });

  test('I-4: GET com updatedAt mais antigo que a troca mostrada e descartado', () {
    final t0 = thu10, t1 = thu10.add(const Duration(seconds: 5));
    final canceled = swapFx(status: StationSwapStatus.canceled, reason: StationSwapEndReason.canceledByCustomer, updatedAt: t1);
    expect(mergeSwapFetch(canceled, swapFx(status: StationSwapStatus.awaitingReturn, slot: 2, updatedAt: t0)).status, StationSwapStatus.canceled);
    // Devolucao atrasada (mais nova) vale.
    expect(mergeSwapFetch(canceled, swapFx(status: StationSwapStatus.releasing, updatedAt: t1.add(const Duration(seconds: 1)))).status, StationSwapStatus.releasing);
    // Sem updatedAt: ordem dos passos.
    expect(mergeSwapFetch(swapFx(status: StationSwapStatus.returned), swapFx(status: StationSwapStatus.awaitingReturn)).status, StationSwapStatus.returned);
  });

  group('leitor e confirmacao', () {
    testWidgets('I-1: mesmo QR depois de cancelar a folha: ignorado por 2 s, depois reabre', (t) async {
      final b = SwapBackend();
      late ValueChanged<String> read;
      await pumpScanAt(t, b, (f) => read = f);
      read(largoQr);
      await settle(t);
      expect(find.byType(SwapConfirmSheet), findsOneWidget);
      await t.tap(find.widgetWithText(VoltiButton, 'Cancelar'));
      await settle(t);
      expect(find.byType(SwapConfirmSheet), findsNothing);
      // O visor continua entregando o mesmo QR.
      read(largoQr);
      await settle(t);
      expect(find.byType(SwapConfirmSheet), findsNothing);
      scanNow = thu10.add(const Duration(seconds: 3));
      read(largoQr);
      await settle(t);
      expect(find.byType(SwapConfirmSheet), findsOneWidget);
    });

    testWidgets('I-3: durante o POST a folha nao fecha (voltar nem arrastar)', (t) async {
      final b = SwapBackend()..createGate = Completer<void>();
      late ValueChanged<String> read;
      final router = await pumpScanAt(t, b, (f) => read = f);
      read(largoQr);
      await settle(t);
      await t.tap(find.byKey(const Key('swap-open-slot')));
      await t.pump();
      await t.binding.handlePopRoute();
      await t.pump(const Duration(milliseconds: 500));
      expect(find.byType(SwapConfirmSheet), findsOneWidget);
      await t.drag(find.byKey(const Key('swap-confirm-title')), const Offset(0, 600), warnIfMissed: false);
      await t.pump(const Duration(milliseconds: 500));
      expect(find.byType(SwapConfirmSheet), findsOneWidget);
      b.createGate!.complete();
      await settle(t);
      expect(router.routerDelegate.currentConfiguration.uri.path, '/station-swap/$largoId/sw1');
    });

    testWidgets('I-3: folha fechada sem troca, mas a API criou uma: retoma o progresso', (t) async {
      final b = SwapBackend();
      late ValueChanged<String> read;
      final router = await pumpScanAt(t, b, (f) => read = f);
      read(largoQr);
      await settle(t);
      b.currentStationSwap = swapFx(status: StationSwapStatus.awaitingReturn, slot: 6);
      b.server = b.currentStationSwap!;
      await t.tap(find.widgetWithText(VoltiButton, 'Cancelar'));
      await settle(t);
      expect(router.routerDelegate.currentConfiguration.uri.path, '/station-swap/$largoId/sw1');
      expect(find.text('Devolva a bateria na vaga 6'), findsOneWidget);
    });

    testWidgets('m-5: "Estação: <nome>" a partir da dica de proximidade', (t) async {
      await pumpScanAt(t, SwapBackend(), (_) {}, initial: '/station-swap/scan?station=$largoId');
      expect(find.text('Estação: Estação Largo da Batata'), findsOneWidget);
    });

    testWidgets('m-6: taxa exata do aluguel (batterySwapFeeCents) na confirmacao', (t) async {
      final b = SwapBackend()..batterySwapFeeCents = 500;
      late ValueChanged<String> read;
      await pumpScanAt(t, b, (f) => read = f);
      read(largoQr);
      await settle(t);
      expect(find.text('Taxa R\$ 5,00'), findsOneWidget);
    });

    testWidgets('m-6: batterySwapFeeCents 0 (plano por minuto com taxa zerada): sem linha de taxa', (t) async {
      final b = SwapBackend()..batterySwapFeeCents = 0;
      late ValueChanged<String> read;
      await pumpScanAt(t, b, (f) => read = f);
      read(largoQr);
      await settle(t);
      expect(find.byKey(const Key('swap-confirm-fee')), findsNothing);
    });

    testWidgets('m-9: 503 e 429 mantem a Idempotency-Key; 422 gera outra', (t) async {
      final b = SwapBackend()..swapCreateError = apiError(503, 'service-unavailable');
      late ValueChanged<String> read;
      await pumpScanAt(t, b, (f) => read = f);
      read(largoQr);
      await settle(t);
      Future<void> tapOpen() async {
        await t.tap(find.byKey(const Key('swap-open-slot')));
        await settle(t);
      }

      await tapOpen();
      b.swapCreateError = apiError(429, 'too-many-requests');
      await tapOpen();
      b.swapCreateError = apiError(422, 'too-far');
      await tapOpen();
      await tapOpen();
      expect(b.keys, hasLength(4));
      expect(b.keys[1], b.keys[0]);
      expect(b.keys[2], b.keys[1]);
      expect(b.keys[3], isNot(b.keys[2]));
    });
  });

  group('progresso', () {
    late FakeRealtime rt;
    late ProviderContainer container;

    Future<void> pump(WidgetTester t, SwapBackend b, {StationSwap? initial, bool rideOpen = false}) async {
      tallScreen(t);
      rt = FakeRealtime();
      var factoryCalls = 0;
      await t.pumpWidget(testApp(
        Consumer(builder: (context, ref, _) {
          container = ProviderScope.containerOf(context);
          return SwapProgressScreen(stationId: largoId, swapId: 'sw1', initial: initial);
        }),
        overrides: [
          backendProvider.overrideWithValue(b),
          realtimeFactoryProvider.overrideWithValue(() {
            factoryCalls++;
            return rt;
          }),
          clockProvider.overrideWithValue(() => thu10),
          if (rideOpen) rideRealtimeLinkProvider.overrideWithValue(RideRealtimeLink()..openCount = 1),
        ],
      ));
      await settle(t);
      expect(factoryCalls, rideOpen ? 0 : 1);
    }

    testWidgets('I-4: cancelar e depois um GET atrasado com awaiting_return nao desfaz o cancelamento', (t) async {
      final b = SwapBackend()..server = swapFx(status: StationSwapStatus.awaitingReturn, slot: 1, updatedAt: thu10);
      await pump(t, b);
      // GET pedido antes do cancelamento (snapshot awaiting_return), que chega depois.
      final gate = b.getGate = Completer<void>();
      rt.emit(const StationSwapUpdated(swapId: 'sw1', status: 'awaiting_return'));
      await t.pump();
      await t.tap(find.byKey(const Key('swap-cancel')));
      await settle(t);
      await t.tap(find.byKey(const Key('swap-cancel-confirm')));
      await settle(t);
      expect(b.swapCancels, 1);
      expect(stepTitle(t), l.swapCanceledTitle);
      expect(b.getGate, isNull); // o GET atrasado esta preso no portao
      gate.complete();
      await settle(t);
      expect(stepTitle(t), l.swapCanceledTitle);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('m-A: evento canceled descarta GET ja em voo (awaiting_return atrasado)', (t) async {
      final b = SwapBackend()..server = swapFx(status: StationSwapStatus.awaitingReturn, slot: 1);
      await pump(t, b);
      // GET em voo com o snapshot awaiting_return (sem updatedAt: so a sequencia protege).
      final gate = b.getGate = Completer<void>();
      rt.conn.add(false);
      await t.pump();
      await t.pump(kSwapPollWhileOffline);
      expect(b.getGate, isNull);
      // Evento: cancelada; o GET disparado por ele ja ve canceled.
      b.server = swapFx(status: StationSwapStatus.canceled, reason: StationSwapEndReason.returnTimeout);
      rt.emit(const StationSwapUpdated(swapId: 'sw1', status: 'canceled'));
      // O GET disparado pelo evento tambem demora: o atrasado chega antes dele.
      final gate2 = b.getGate = Completer<void>();
      await settle(t);
      expect(stepTitle(t), l.swapCanceledTitle);
      gate.complete();
      await settle(t);
      expect(stepTitle(t), l.swapCanceledTitle);
      gate2.complete();
      await settle(t);
      expect(stepTitle(t), l.swapCanceledTitle);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('I-2: segundo plano para o GET periodico; ao voltar, GET na hora e o periodico volta', (t) async {
      final b = SwapBackend()..server = swapFx(status: StationSwapStatus.awaitingReturn, slot: 1);
      await pump(t, b);
      rt.conn.add(false); // socket fora: GET a cada 10 s
      await t.pump();
      await t.pump(kSwapPollWhileOffline);
      final polling = b.gets;
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await t.pump(kSwapPollWhileOffline * 3);
      expect(b.gets, polling);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await t.pump();
      expect(b.gets, polling + 1);
      await t.pump(kSwapPollWhileOffline);
      expect(b.gets, polling + 2);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('m-1: com a corrida aberta, usa o socket dela (sem abrir outro)', (t) async {
      final b = SwapBackend()..server = swapFx();
      await pump(t, b, initial: swapFx(), rideOpen: true);
      b.server = swapFx(status: StationSwapStatus.awaitingReturn, slot: 7);
      container.read(rideEventBusProvider).add(const StationSwapUpdated(swapId: 'sw1', status: 'awaiting_return'));
      await settle(t);
      expect(stepTitle(t), 'Devolva a bateria na vaga 7');
      // A corrida reconectou: GET.
      final gets = b.gets;
      final link = container.read(rideRealtimeLinkProvider);
      link.connected.value = false;
      await t.pump();
      link.connected.value = true;
      await settle(t);
      expect(b.gets, gets + 1);
      await t.pumpWidget(const SizedBox());
    });
  });

  testWidgets('m-2: toque duplo em "Trocar bateria" abre um leitor so; depois da troca, a entrada volta a funcionar', (t) async {
    tallScreen(t);
    final b = SwapBackend();
    final router = GoRouter(initialLocation: '/home', routes: appRoutes());
    addTearDown(router.dispose);
    await t.pumpWidget(testRouterApp(router, overrides: [
      backendProvider.overrideWithValue(b),
      pushServiceProvider.overrideWithValue(NoopPushService()),
      locationServiceProvider.overrideWithValue(PhoneAt(north(largo, 15))),
      sessionProvider.overrideWith(() => FakeSession(session())),
      clockProvider.overrideWithValue(() => thu10),
      realtimeFactoryProvider.overrideWithValue(() => FakeRealtime()),
      qrScannerBuilderProvider.overrideWithValue((context, {required onCode, required onManual}) => const SizedBox.expand()),
    ]));
    await settle(t);
    final action = find.byKey(const Key('swap-nearby-action'));
    await t.tap(action);
    await t.tap(action, warnIfMissed: false);
    await settle(t);
    expect(find.byType(SwapScanScreen), findsOneWidget);

    // Leitor -> confirmacao -> progresso (substitui o leitor) -> fechar.
    b.server = swapFx(status: StationSwapStatus.completed);
    await t.enterText(find.byKey(const Key('swap-manual-code')), largoQr);
    await t.pump();
    await t.tap(find.byKey(const Key('swap-manual-continue')));
    await settle(t);
    await t.tap(find.byKey(const Key('swap-open-slot')));
    await settle(t);
    expect(find.byType(SwapProgressScreen), findsOneWidget);
    await t.tap(find.byKey(const Key('swap-close')));
    await settle(t);
    expect(find.byType(SwapProgressScreen), findsNothing);
    await t.tap(find.byKey(const Key('swap-nearby-action')));
    await settle(t);
    expect(find.byType(SwapScanScreen), findsOneWidget);
  });

  testWidgets('m-8: devolucao recusada por troca aberta oferece "Continuar troca"', (t) async {
    tallScreen(t);
    final b = _EndSwapOpenBackend()..currentStationSwap = swapFx(status: StationSwapStatus.awaitingReturn, slot: 3);
    b.server = b.currentStationSwap!;
    final router = GoRouter(initialLocation: '/return/r1', routes: appRoutes());
    addTearDown(router.dispose);
    await t.pumpWidget(testRouterApp(router, overrides: [
      backendProvider.overrideWithValue(b),
      photoPickerProvider.overrideWithValue(FakePhotoPicker()),
      clockProvider.overrideWithValue(() => thu10),
      realtimeFactoryProvider.overrideWithValue(() => FakeRealtime()),
    ]));
    await settle(t);
    await t.tap(find.byType(PhotoCapture));
    await settle(t);
    await t.tap(find.widgetWithText(VoltiButton, 'Travar e encerrar'));
    await settle(t);
    final inDialog = find.descendant(of: find.byType(Dialog), matching: find.widgetWithText(VoltiButton, 'Travar e encerrar'));
    if (inDialog.evaluate().isNotEmpty) {
      await t.tap(inDialog);
      await settle(t);
    }
    expect(find.text(l.swapErrorOpen), findsOneWidget);
    await t.tap(find.byKey(const Key('return-continue-swap')));
    await settle(t);
    expect(find.byType(SwapProgressScreen), findsOneWidget);
    expect(find.text('Devolva a bateria na vaga 3'), findsOneWidget);
  });
}
