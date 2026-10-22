// Troca de bateria na estacao via QR (app do cliente): proximidade, QR,
// confirmacao (taxa, erros, idempotencia), progresso pelo WebSocket, cancelar
// e retomar pelo `currentStationSwap`.
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/home/home_screen.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart';
import 'package:volti_cliente/features/station_swap/swap_confirm_sheet.dart';
import 'package:volti_cliente/features/station_swap/swap_logic.dart';
import 'package:volti_cliente/features/station_swap/swap_progress_screen.dart';
import 'package:volti_cliente/features/station_swap/swap_scan_screen.dart';
import 'package:volti_cliente/l10n/app_localizations_pt.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';

final l = AppLocalizationsPt();

const largoId = 'd0000000-0000-4000-8000-000000000001';
const largoQr = 'vst1.d0000000-0000-4000-8000-000000000001.lMyoiWvb5xuRTHIzBFoxEQ';
const largo = LatLng(-23.5667, -46.6936);

SwapStation station({String id = largoId, String name = 'Estação Largo da Batata', int available = 9, bool open24h = true, LatLng at = largo}) => SwapStation(
  (b) => b
    ..id = id
    ..name = name
    ..address = 'R. Teodoro Sampaio, 2000'
    ..lat = at.latitude
    ..lng = at.longitude
    ..availableBatteries = available
    ..totalSlots = 12
    ..openingHours = 'Seg a sáb, 7h às 22h'
    ..open24h = open24h,
);

StationSwap swapFx({StationSwapStatus status = StationSwapStatus.openingSlot, int? slot, int fee = 500, StationSwapEndReason? reason, DateTime? expiresAt}) => StationSwap(
  (b) => b
    ..id = 'sw1'
    ..stationId = largoId
    ..rentalId = 'r1'
    ..status = status
    ..slotNumber = slot
    ..feeCents = fee
    ..endReason = reason
    ..expiresAt = expiresAt ?? thu10.add(const Duration(minutes: 3))
    ..createdAt = thu10,
);

AppFailure apiError(int status, String slug) => AppFailure(kind: FailureKind.api, status: status, slug: slug, detail: 'texto cru da API');

/// ~[meters] ao norte de [p].
LatLng north(LatLng p, double meters) => LatLng(p.latitude + meters / 111320, p.longitude);

class SwapBackend extends GalpaoBackend {
  Rental? rentalNow = sampleRental();
  List<SwapStation> stationList = [station()];
  StationSwap server = swapFx();
  Object? swapCreateError;
  int swapCreates = 0;
  final keys = <String>[];
  final positions = <LatLng>[];
  int gets = 0;
  int swapCancels = 0;
  int vehicleBattery = 80;

  @override
  Future<Rental?> currentRental() async => rentalNow;
  @override
  Future<Rental> rental(String id) async => rentalNow!;
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle(battery: vehicleBattery);
  @override
  Future<List<SwapStation>> swapStations({double? lat, double? lng}) async => stationList;
  @override
  Future<StationSwap> createStationSwap({
    required String stationId,
    required String stationCode,
    required String rentalId,
    required double lat,
    required double lng,
    required String idempotencyKey,
  }) async {
    swapCreates++;
    keys.add(idempotencyKey);
    positions.add(LatLng(lat, lng));
    final e = swapCreateError;
    if (e != null) throw e;
    return server;
  }

  @override
  Future<StationSwap> stationSwap(String stationId, String swapId) async {
    gets++;
    return server;
  }

  @override
  Future<StationSwap> cancelStationSwap(String stationId, String swapId) async {
    swapCancels++;
    server = server.rebuild((b) => b
      ..status = StationSwapStatus.canceled
      ..endReason = StationSwapEndReason.canceledByCustomer);
    return server;
  }
}

class PhoneAt extends FakeLocation {
  PhoneAt(this.at, {this.track = const []});
  final LatLng? at;
  final List<LatLng> track;
  @override
  Future<bool> ensurePermission() async => true;
  @override
  Future<bool> hasPermission() async => true;
  @override
  Future<LatLng?> currentPosition({bool requestPermission = false}) async => at;
  @override
  Stream<LatLng> trackDuringRental({required String notificationTitle, required String notificationText}) => Stream.fromIterable(track);
}

Future<void> settle(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 300));
  }
}

void main() {
  group('proximidade (50 m, haversine)', () {
    final rental = sampleRental();

    test('a ~30 m: aviso da estacao', () {
      final s = swapPromptStation(rental: rental, locationConsent: true, phone: north(largo, 30), stations: [station()]);
      expect(s?.id, largoId);
    });

    test('a ~80 m: sem aviso', () {
      expect(swapPromptStation(rental: rental, locationConsent: true, phone: north(largo, 80), stations: [station()]), isNull);
    });

    test('duas estacoes perto: a mais proxima', () {
      final other = station(id: 'b', name: 'B', at: north(largo, 40));
      final s = swapPromptStation(rental: rental, locationConsent: true, phone: north(largo, 35), stations: [station(), other]);
      expect(s?.id, 'b');
    });

    test('sem aluguel em andamento, sem consentimento ou sem posicao: nada', () {
      final near = north(largo, 10);
      expect(swapPromptStation(rental: null, locationConsent: true, phone: near, stations: [station()]), isNull);
      expect(swapPromptStation(rental: sampleRental(status: RentalStatus.ended), locationConsent: true, phone: near, stations: [station()]), isNull);
      expect(swapPromptStation(rental: rental, locationConsent: false, phone: near, stations: [station()]), isNull);
      expect(swapPromptStation(rental: rental, locationConsent: true, phone: null, stations: [station()]), isNull);
      expect(swapPromptStation(rental: sampleRental(status: RentalStatus.paused), locationConsent: true, phone: near, stations: [station()])?.id, largoId);
    });

    test('haversine confere com 1 grau de latitude (~111 km)', () {
      expect(haversineMeters(const LatLng(0, 0), const LatLng(1, 0)), closeTo(111195, 5));
    });
  });

  group('QR da estacao', () {
    test('payload de dev vira o id da estacao', () {
      expect(stationIdFromQr(largoQr), largoId);
      expect(stationIdFromQr('  $largoQr\n'), largoId);
    });

    test('formatos invalidos', () {
      expect(stationIdFromQr(''), isNull);
      expect(stationIdFromQr('VLT-001'), isNull);
      expect(stationIdFromQr('vst1.nao-e-uuid.abcdefgh'), isNull);
      expect(stationIdFromQr('vst2.$largoId.lMyoiWvb5xuRTHIzBFoxEQ'), isNull);
    });
  });

  group('taxa e erros', () {
    test('taxa so nos planos por minuto e por hora', () {
      expect(swapFeeApplies(PlanCode.minute), isTrue);
      expect(swapFeeApplies(PlanCode.hour), isTrue);
      expect(swapFeeApplies(PlanCode.day), isFalse);
      expect(swapFeeApplies(PlanCode.weekly), isFalse);
      expect(swapFeeApplies(PlanCode.monthly), isFalse);
    });

    test('cada slug vira uma mensagem clara (nunca o texto cru da API)', () {
      expect(swapErrorMessage(l, apiError(404, 'station-not-found')), l.swapErrorInvalidQr);
      expect(swapErrorMessage(l, apiError(422, 'too-far')), l.swapErrorTooFar);
      expect(swapErrorMessage(l, apiError(422, 'vehicle-moving')), 'Pare e trave a moto antes de trocar a bateria.');
      expect(swapErrorMessage(l, apiError(409, 'swap-open')), l.swapErrorOpen);
      expect(swapErrorMessage(l, apiError(409, 'rental-not-active')), l.swapErrorRentalNotActive);
      expect(swapErrorMessage(l, apiError(422, 'station-unavailable'), station: station(available: 0)), l.swapErrorNoBattery);
      expect(
        swapErrorMessage(l, apiError(422, 'station-unavailable'), station: station(open24h: false)),
        'Esta estação está fechada agora (Seg a sáb, 7h às 22h).',
      );
      expect(swapErrorMessage(l, apiError(422, 'station-unavailable'), station: station()), l.swapErrorUnavailable);
      expect(swapErrorMessage(l, apiError(422, 'station-unavailable')), l.swapErrorUnavailable);
      expect(swapErrorMessage(l, AppFailure(kind: FailureKind.network)), l.errorNetwork);
    });

    test('motivos de fim: devolucao atrasada e suporte', () {
      final late = swapFx(status: StationSwapStatus.canceled, reason: StationSwapEndReason.returnTimeout);
      expect(swapEndMessage(l, late), l.swapEndReturnTimeout);
      expect(swapLateReturnAccepted(late), isTrue);
      expect(swapLateReturnAccepted(swapFx(status: StationSwapStatus.canceled, reason: StationSwapEndReason.slotClosedWithoutReturn)), isFalse);
      expect(swapNeedsSupport(swapFx(status: StationSwapStatus.failed, reason: StationSwapEndReason.noBatteryAfterReturn)), isTrue);
      expect(swapEndTitle(l, swapFx(status: StationSwapStatus.failed, reason: StationSwapEndReason.releaseTimeout)), l.swapFailedTitle);
    });

    test('motivos novos (return_after_close, rental_force_ended) e desconhecidos', () {
      final afterClose = swapFx(status: StationSwapStatus.failed, reason: StationSwapEndReason.returnAfterClose);
      expect(swapEndMessage(l, afterClose), l.swapEndReturnAfterClose);
      expect(l.swapEndReturnAfterClose, contains('operação já foi avisada'));
      expect(swapNeedsSupport(afterClose), isTrue);
      expect(swapLateReturnAccepted(afterClose), isFalse);
      expect(swapEndTitle(l, afterClose), l.swapFailedTitle);

      final forced = swapFx(status: StationSwapStatus.canceled, reason: StationSwapEndReason.rentalForceEnded);
      expect(swapEndMessage(l, forced), l.swapEndRentalForceEnded);
      expect(swapEndTitle(l, forced), l.swapCanceledTitle);
      expect(swapLateReturnAccepted(forced), isFalse);
      expect(swapNeedsSupport(forced), isFalse);

      // Valor que esta versao nao conhece (o cliente gerado cai no fallback) ou ausente: mensagem generica.
      expect(swapEndMessage(l, swapFx(status: StationSwapStatus.failed, reason: StationSwapEndReason.unknownDefaultOpenApi)), l.swapEndGeneric);
      expect(swapEndMessage(l, swapFx(status: StationSwapStatus.failed)), l.swapEndGeneric);
    });
  });

  group('maquina de estados (station_swap.updated)', () {
    StationSwap step(StationSwap s, String status, {String id = 'sw1'}) => applySwapEvent(s, swapId: id, status: swapStatusFromWire(status));

    test('caminho feliz e eventos fora de ordem', () {
      var s = swapFx();
      s = step(s, 'awaiting_return');
      expect(s.status, StationSwapStatus.awaitingReturn);
      s = step(s, 'opening_slot'); // atrasado: nao volta
      expect(s.status, StationSwapStatus.awaitingReturn);
      s = step(s, 'returned', id: 'outra'); // outra troca
      expect(s.status, StationSwapStatus.awaitingReturn);
      for (final st in ['returned', 'releasing', 'completed']) {
        s = step(s, st);
      }
      expect(s.status, StationSwapStatus.completed);
      expect(step(s, 'failed').status, StationSwapStatus.completed); // final de verdade
      expect(step(s, 'algo_novo').status, StationSwapStatus.completed);
    });

    test('devolucao atrasada: canceled volta a releasing', () {
      final canceled = swapFx(status: StationSwapStatus.canceled, reason: StationSwapEndReason.returnTimeout);
      final s = step(canceled, 'releasing');
      expect(s.status, StationSwapStatus.releasing);
      expect(s.endReason, isNull);
    });

    test('GET mais antigo que o evento nao faz a tela voltar', () {
      final shown = swapFx(status: StationSwapStatus.returned);
      expect(mergeSwapFetch(shown, swapFx(status: StationSwapStatus.awaitingReturn, slot: 3)).status, StationSwapStatus.returned);
      expect(mergeSwapFetch(shown, swapFx(status: StationSwapStatus.releasing)).status, StationSwapStatus.releasing);
    });

    test('cancelar so antes da devolucao', () {
      expect(canCancelSwap(StationSwapStatus.openingSlot), isTrue);
      expect(canCancelSwap(StationSwapStatus.awaitingReturn), isTrue);
      expect(canCancelSwap(StationSwapStatus.returned), isFalse);
      expect(canCancelSwap(StationSwapStatus.releasing), isFalse);
    });
  });

  group('confirmacao', () {
    Future<void> pumpSheet(WidgetTester t, SwapBackend b, {SwapStation? st, LatLng? phone = largo}) async {
      tallScreen(t);
      await t.pumpWidget(testApp(
        Scaffold(
          body: Builder(
            builder: (context) => Center(
              child: TextButton(
                onPressed: () => SwapConfirmSheet.show(context, rental: b.rentalNow!, stationId: largoId, stationCode: largoQr, station: st ?? station()),
                child: const Text('abrir'),
              ),
            ),
          ),
        ),
        overrides: [
          backendProvider.overrideWithValue(b),
          locationServiceProvider.overrideWithValue(PhoneAt(phone)),
          sessionProvider.overrideWith(() => FakeSession(session())),
        ],
      ));
      await t.tap(find.text('abrir'));
      await settle(t);
    }

    testWidgets('plano por minuto: codigo da moto, baterias e a taxa', (t) async {
      final b = SwapBackend();
      await pumpSheet(t, b);
      expect(find.text('Trocar a bateria da VLT-001 aqui?'), findsOneWidget);
      expect(find.text('Baterias disponíveis: 9'), findsOneWidget);
      expect(find.byKey(const Key('swap-confirm-fee')), findsOneWidget);
    });

    testWidgets('plano diario: sem taxa', (t) async {
      final b = SwapBackend()..rentalNow = sampleRental().rebuild((r) => r.planCode = PlanCode.day);
      await pumpSheet(t, b);
      expect(find.byKey(const Key('swap-confirm-fee')), findsNothing);
    });

    testWidgets('moto andando: mensagem clara; nova tentativa usa outra chave', (t) async {
      final b = SwapBackend()..swapCreateError = apiError(422, 'vehicle-moving');
      await pumpSheet(t, b);
      await t.tap(find.byKey(const Key('swap-open-slot')));
      await settle(t);
      expect(find.text('Pare e trave a moto antes de trocar a bateria.'), findsOneWidget);
      expect(find.text('texto cru da API'), findsNothing);
      await t.tap(find.byKey(const Key('swap-open-slot')));
      await settle(t);
      expect(b.keys, hasLength(2));
      expect(b.keys[0], isNot(b.keys[1]));
    });

    testWidgets('falha de rede: repete com a mesma Idempotency-Key e a mesma posicao', (t) async {
      final b = SwapBackend()..swapCreateError = AppFailure(kind: FailureKind.network);
      await pumpSheet(t, b);
      await t.tap(find.byKey(const Key('swap-open-slot')));
      await settle(t);
      expect(find.text(l.errorNetwork), findsOneWidget);
      b.swapCreateError = null;
      await t.tap(find.byKey(const Key('swap-open-slot')));
      await settle(t);
      expect(b.keys, hasLength(2));
      expect(b.keys[0], b.keys[1]);
      expect(b.positions[0], b.positions[1]);
      expect(find.byType(SwapConfirmSheet), findsNothing);
    });

    testWidgets('sem posicao do celular: pede a localizacao, sem chamar a API', (t) async {
      final b = SwapBackend();
      await pumpSheet(t, b, phone: null);
      await t.tap(find.byKey(const Key('swap-open-slot')));
      await settle(t);
      expect(find.text(l.swapLocationNeeded), findsOneWidget);
      expect(b.swapCreates, 0);
    });

    testWidgets('troca ja aberta (409): leva a troca em andamento', (t) async {
      final b = SwapBackend()
        ..swapCreateError = apiError(409, 'swap-open')
        ..currentStationSwap = swapFx(status: StationSwapStatus.awaitingReturn, slot: 2);
      await pumpSheet(t, b);
      await t.tap(find.byKey(const Key('swap-open-slot')));
      await settle(t);
      expect(find.text(l.swapErrorOpen), findsOneWidget);
      await t.tap(find.byKey(const Key('swap-see-open')));
      await settle(t);
      expect(find.byType(SwapConfirmSheet), findsNothing);
    });
  });

  group('leitor', () {
    Future<GoRouter> pumpScan(WidgetTester t, SwapBackend b, {QrScannerBuilder? scanner}) async {
      tallScreen(t);
      final router = GoRouter(initialLocation: '/station-swap/scan', routes: appRoutes());
      addTearDown(router.dispose);
      await t.pumpWidget(testRouterApp(router, overrides: [
        backendProvider.overrideWithValue(b),
        locationServiceProvider.overrideWithValue(PhoneAt(largo)),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => thu10),
        realtimeFactoryProvider.overrideWithValue(() => FakeRealtime()),
        qrScannerBuilderProvider.overrideWithValue(
          scanner ?? (context, {required onCode, required onManual}) => const ColoredBox(color: Colors.black),
        ),
      ]));
      await settle(t);
      return router;
    }

    testWidgets('codigo digitado (emulador) abre a confirmacao e, criada a troca, o progresso', (t) async {
      final b = SwapBackend();
      final router = await pumpScan(t, b);
      await t.enterText(find.byKey(const Key('swap-manual-code')), largoQr);
      await t.pump();
      await t.tap(find.byKey(const Key('swap-manual-continue')));
      await settle(t);
      expect(find.text('Trocar a bateria da VLT-001 aqui?'), findsOneWidget);
      await t.tap(find.byKey(const Key('swap-open-slot')));
      await settle(t);
      expect(router.routerDelegate.currentConfiguration.uri.path, '/station-swap/$largoId/sw1');
      expect(find.byType(SwapProgressScreen), findsOneWidget);
    });

    testWidgets('QR invalido: aviso, sem confirmacao', (t) async {
      final b = SwapBackend();
      await pumpScan(t, b);
      await t.enterText(find.byKey(const Key('swap-manual-code')), 'VLT-001');
      await t.pump();
      await t.tap(find.byKey(const Key('swap-manual-continue')));
      await t.pump();
      expect(find.text(l.swapErrorInvalidQr), findsOneWidget);
      expect(find.byType(SwapConfirmSheet), findsNothing);
      await settle(t);
    });

    testWidgets('camera negada: explica e oferece o codigo digitado', (t) async {
      final b = SwapBackend();
      await pumpScan(t, b, scanner: (context, {required onCode, required onManual}) => CameraUnavailable(denied: true, onManual: onManual));
      expect(find.text(l.swapScanDenied), findsOneWidget);
      await t.tap(find.byKey(const Key('swap-camera-manual')));
      await t.pump();
      final field = t.widget<TextField>(find.byKey(const Key('swap-manual-code')));
      expect(field.focusNode!.hasFocus, isTrue);
    });

    testWidgets('QR lido pela camera tambem abre a confirmacao', (t) async {
      final b = SwapBackend();
      late ValueChanged<String> read;
      await pumpScan(t, b, scanner: (context, {required onCode, required onManual}) {
        read = onCode;
        return const SizedBox.expand();
      });
      read(largoQr);
      await settle(t);
      expect(find.byType(SwapConfirmSheet), findsOneWidget);
    });

    testWidgets('troca ja em andamento: o leitor leva direto ao progresso', (t) async {
      final b = SwapBackend()..currentStationSwap = swapFx(status: StationSwapStatus.awaitingReturn, slot: 4);
      b.server = b.currentStationSwap!;
      final router = await pumpScan(t, b);
      expect(router.routerDelegate.currentConfiguration.uri.path, '/station-swap/$largoId/sw1');
      expect(find.text('Devolva a bateria na vaga 4'), findsOneWidget);
    });
  });

  group('progresso', () {
    late FakeRealtime rt;
    var now = thu10;

    Future<void> pumpProgress(WidgetTester t, SwapBackend b, {StationSwap? initial}) async {
      tallScreen(t);
      rt = FakeRealtime();
      now = thu10;
      await t.pumpWidget(testApp(
        SwapProgressScreen(stationId: largoId, swapId: 'sw1', initial: initial),
        overrides: [
          backendProvider.overrideWithValue(b),
          realtimeFactoryProvider.overrideWithValue(() => rt),
          clockProvider.overrideWithValue(() => now),
        ],
      ));
      await settle(t);
    }

    Future<void> push(WidgetTester t, SwapBackend b, StationSwap server, String wire) async {
      b.server = server;
      rt.emit(StationSwapUpdated(swapId: 'sw1', status: wire));
      await settle(t);
    }

    String title(WidgetTester t) => t.widget<Text>(find.byKey(const Key('swap-step-title'))).data!;

    testWidgets('passos pelo WebSocket; cancelar some depois da devolucao; concluida recarrega a bateria', (t) async {
      final b = SwapBackend()..vehicleBattery = 98;
      await pumpProgress(t, b, initial: swapFx());
      expect(title(t), l.swapStepOpening);
      expect(find.byKey(const Key('swap-cancel')), findsOneWidget);
      expect(find.text('Taxa R\$ 5,00 · cobrada no fechamento do aluguel'), findsOneWidget);
      expect(find.text('Prazo: 03:00'), findsOneWidget);

      await push(t, b, swapFx(status: StationSwapStatus.awaitingReturn, slot: 3, expiresAt: thu10.add(const Duration(minutes: 4))), 'awaiting_return');
      expect(title(t), 'Devolva a bateria na vaga 3');
      expect(find.byKey(const Key('swap-cancel')), findsOneWidget);
      now = thu10.add(const Duration(seconds: 61));
      await t.pump(const Duration(seconds: 1));
      expect(find.text('Prazo: 02:59'), findsOneWidget);

      await push(t, b, swapFx(status: StationSwapStatus.returned, slot: 3), 'returned');
      expect(title(t), l.swapStepReturned);
      expect(find.byKey(const Key('swap-cancel')), findsNothing);

      await push(t, b, swapFx(status: StationSwapStatus.releasing, slot: 3), 'releasing');
      expect(title(t), 'Pegue a bateria carregada');
      expect(find.byKey(const Key('swap-cancel')), findsNothing);

      await push(t, b, swapFx(status: StationSwapStatus.completed, slot: 3), 'completed');
      expect(title(t), 'Bateria trocada · 98%');
      expect(find.byKey(const Key('swap-countdown')), findsNothing);
      expect(find.byKey(const Key('swap-close')), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('plano diario (feeCents 0): sem linha de taxa', (t) async {
      final b = SwapBackend()..server = swapFx(fee: 0);
      await pumpProgress(t, b, initial: swapFx(fee: 0));
      expect(find.byKey(const Key('swap-fee')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('evento de outra troca e ignorado', (t) async {
      final b = SwapBackend();
      await pumpProgress(t, b, initial: swapFx());
      final gets = b.gets;
      rt.emit(const StationSwapUpdated(swapId: 'outra', status: 'completed'));
      await settle(t);
      expect(title(t), l.swapStepOpening);
      expect(b.gets, gets);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('reconexao do socket: GET da troca', (t) async {
      final b = SwapBackend();
      await pumpProgress(t, b, initial: swapFx());
      rt.conn.add(false);
      await t.pump();
      b.server = swapFx(status: StationSwapStatus.awaitingReturn, slot: 5);
      rt.conn.add(true);
      await settle(t);
      expect(title(t), 'Devolva a bateria na vaga 5');
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('cancelar antes da devolucao: confirma e mostra a troca cancelada', (t) async {
      final b = SwapBackend()..server = swapFx(status: StationSwapStatus.awaitingReturn, slot: 1);
      await pumpProgress(t, b);
      await t.tap(find.byKey(const Key('swap-cancel')));
      await settle(t);
      await t.tap(find.byKey(const Key('swap-cancel-confirm')));
      await settle(t);
      expect(b.swapCancels, 1);
      expect(title(t), l.swapCanceledTitle);
      expect(find.text(l.swapEndCanceledByCustomer), findsOneWidget);
      expect(find.byKey(const Key('swap-cancel')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('prazo de devolucao vencido: mensagem e a devolucao atrasada ainda vale', (t) async {
      final b = SwapBackend()..server = swapFx(status: StationSwapStatus.canceled, reason: StationSwapEndReason.returnTimeout);
      await pumpProgress(t, b);
      expect(title(t), l.swapCanceledTitle);
      expect(find.text(l.swapEndReturnTimeout), findsOneWidget);
      expect(find.byKey(const Key('swap-late-return')), findsOneWidget);
      expect(find.byKey(const Key('swap-steps')), findsNothing);
      // A estacao recebeu a bateria atrasada e libera uma carregada.
      await push(t, b, swapFx(status: StationSwapStatus.releasing, slot: 2), 'releasing');
      expect(title(t), 'Pegue a bateria carregada');
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('bateria devolvida depois do fim (return_after_close): operacao avisada, suporte', (t) async {
      final b = SwapBackend()..server = swapFx(status: StationSwapStatus.failed, reason: StationSwapEndReason.returnAfterClose);
      await pumpProgress(t, b);
      expect(find.text(l.swapEndReturnAfterClose), findsOneWidget);
      expect(find.byKey(const Key('swap-support')), findsOneWidget);
      expect(find.byKey(const Key('swap-late-return')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('aluguel encerrado pela equipe (rental_force_ended): troca cancelada', (t) async {
      final b = SwapBackend()..server = swapFx(status: StationSwapStatus.canceled, reason: StationSwapEndReason.rentalForceEnded);
      await pumpProgress(t, b);
      expect(t.widget<Text>(find.byKey(const Key('swap-step-title'))).data, l.swapCanceledTitle);
      expect(find.text(l.swapEndRentalForceEnded), findsOneWidget);
      expect(find.byKey(const Key('swap-late-return')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('falha sem bateria para liberar: pede o suporte', (t) async {
      final b = SwapBackend()..server = swapFx(status: StationSwapStatus.failed, reason: StationSwapEndReason.noBatteryAfterReturn);
      await pumpProgress(t, b);
      expect(title(t), l.swapFailedTitle);
      expect(find.byKey(const Key('swap-support')), findsOneWidget);
      expect(find.byKey(const Key('swap-late-return')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });
  });

  group('retomar e aviso na corrida', () {
    Future<void> pumpRide(WidgetTester t, SwapBackend b, {LocationService? location}) async {
      tallScreen(t);
      final rt = FakeRealtime();
      await t.pumpWidget(testApp(const RideScreen(), overrides: [
        backendProvider.overrideWithValue(b),
        realtimeFactoryProvider.overrideWithValue(() => rt),
        locationServiceProvider.overrideWithValue(location ?? FakeLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
      ]));
      await settle(t);
    }

    testWidgets('troca aberta no aluguel (currentStationSwap): corrida oferece continuar', (t) async {
      final b = SwapBackend()..currentStationSwap = swapFx(status: StationSwapStatus.awaitingReturn, slot: 2);
      await pumpRide(t, b);
      expect(find.byKey(const Key('swap-resume-card')), findsOneWidget);
      expect(find.byKey(const Key('swap-nearby-card')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('troca encerrada nao e oferecida', (t) async {
      final b = SwapBackend()..currentStationSwap = swapFx(status: StationSwapStatus.completed);
      await pumpRide(t, b);
      expect(find.byKey(const Key('swap-resume-card')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('rastreio da corrida a ~20 m da estacao: aviso "Voce esta na..."', (t) async {
      final b = SwapBackend();
      await pumpRide(t, b, location: PhoneAt(null, track: [north(largo, 20)]));
      expect(find.byKey(const Key('swap-nearby-card')), findsOneWidget);
      expect(find.text('Você está na Estação Largo da Batata'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('rastreio a ~200 m: sem aviso', (t) async {
      final b = SwapBackend();
      await pumpRide(t, b, location: PhoneAt(null, track: [north(largo, 200)]));
      expect(find.byKey(const Key('swap-nearby-card')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });
  });

  group('home', () {
    Future<void> pumpHome(WidgetTester t, SwapBackend b, {LatLng? phone}) async {
      tallScreen(t);
      final router = GoRouter(initialLocation: '/home', routes: appRoutes());
      addTearDown(router.dispose);
      await t.pumpWidget(testRouterApp(router, overrides: [
        backendProvider.overrideWithValue(b),
        pushServiceProvider.overrideWithValue(NoopPushService()),
        locationServiceProvider.overrideWithValue(PhoneAt(phone)),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => thu10),
        realtimeFactoryProvider.overrideWithValue(() => FakeRealtime()),
      ]));
      await settle(t);
    }

    testWidgets('perto com aluguel: cartao e "Trocar aqui" na folha de estacoes', (t) async {
      final b = SwapBackend();
      await pumpHome(t, b, phone: north(largo, 15));
      expect(find.byType(HomeScreen), findsOneWidget);
      expect(find.byKey(const Key('swap-nearby-card')), findsOneWidget);
      await t.tap(find.byKey(const Key('home-stations-toggle')));
      await settle(t);
      expect(find.byKey(const Key('station-swap-here-$largoId')), findsOneWidget);
    });

    testWidgets('longe: sem cartao nem "Trocar aqui"', (t) async {
      final b = SwapBackend();
      await pumpHome(t, b, phone: north(largo, 400));
      expect(find.byKey(const Key('swap-nearby-card')), findsNothing);
      await t.tap(find.byKey(const Key('home-stations-toggle')));
      await settle(t);
      expect(find.byKey(const Key('station-swap-here-$largoId')), findsNothing);
    });

    testWidgets('perto sem aluguel: nada', (t) async {
      final b = SwapBackend()..rentalNow = null;
      await pumpHome(t, b, phone: north(largo, 15));
      expect(find.byKey(const Key('swap-nearby-card')), findsNothing);
    });

    testWidgets('troca em andamento: home oferece continuar e abre o progresso', (t) async {
      final b = SwapBackend()..currentStationSwap = swapFx(status: StationSwapStatus.returned, slot: 2);
      b.server = b.currentStationSwap!;
      await pumpHome(t, b, phone: north(largo, 15));
      expect(find.byKey(const Key('swap-resume-card')), findsOneWidget);
      expect(find.byKey(const Key('swap-nearby-card')), findsNothing);
      await t.tap(find.byKey(const Key('swap-resume-action')));
      await settle(t);
      expect(find.byType(SwapProgressScreen), findsOneWidget);
      expect(find.byKey(const Key('swap-cancel')), findsNothing);
    });
  });

  test('DioException 404 sem slug tambem vira QR invalido', () {
    final e = DioException(
      requestOptions: RequestOptions(path: '/swap-stations/x/swaps'),
      response: Response(requestOptions: RequestOptions(path: '/x'), statusCode: 404, data: {'title': 'Not Found'}),
    );
    expect(swapErrorMessage(l, e), l.swapErrorInvalidQr);
  });
}

