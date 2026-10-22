// Task 10 do galpao: "Confira sua moto", trocar bateria e devolucao no galpao.
import 'dart:async';

import 'package:built_collection/built_collection.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/launcher.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

HandoverChecklistItem item(String code, bool ok, {String? note}) => HandoverChecklistItem((b) => b
  ..code = code
  ..ok = ok
  ..note = note);

Handover handoverFixture({
  String id = 'h1',
  HandoverStatus status = HandoverStatus.pendingCustomer,
  HandoverType type = HandoverType.pickup,
  String? lastError,
  String? rentalId,
  String? reservationId = 'res1',
  String? disputeReason,
}) =>
    Handover((b) => b
      ..id = id
      ..type = type
      ..depotId = 'dep1'
      ..reservationId = reservationId
      ..rentalId = rentalId
      ..vehicleId = 'v1'
      ..vehicleCode = 'VLT-001'
      ..operatorId = 'op1'
      ..operatorFirstName = 'Carlos'
      ..checklist = ListBuilder<HandoverChecklistItem>([
        item('freios', true),
        item('pneus', true),
        item('carenagem', false, note: 'Risco na lateral'),
      ])
      ..photoKeys = ListBuilder<String>(['handovers/h1/1.jpg', 'handovers/h1/2.jpg'])
      ..photoUrls = ListBuilder<String>(['https://s3.local/1.jpg', 'https://s3.local/2.jpg'])
      ..batteryPct = 96
      ..batterySerial = 'BAT-0042'
      ..status = status
      ..lastError = lastError
      ..disputeReason = disputeReason
      ..createdAt = thu10);

Reservation reservationFixture({ReservationStatus status = ReservationStatus.active, String? handoverId}) => Reservation((b) => b
  ..id = 'res1'
  ..vehicleId = 'v1'
  ..vehicle.replace(VehicleSummary((v) => v
    ..id = 'v1'
    ..code = 'VLT-001'
    ..model = 'Volti Flash'
    ..status = VehicleStatus.reserved
    ..lat = -23.566
    ..lng = -46.684
    ..batteryPct = 90
    ..estimatedRangeKm = 40))
  ..status = status
  ..createdAt = thu10
  ..expiresAt = thu10.add(const Duration(hours: 2))
  ..depotId = 'dep1'
  ..pickupMode = PickupMode.now
  ..planCode = PlanCode.day
  ..coverage = InsuranceCoverage.basic
  ..depositMethod = DepositMethod.card
  ..pickupCode = 'VOLTI-RES1-SIG'
  ..handoverId = handoverId);

SwapStation station(String id, String name, {double lat = -23.57, double lng = -46.69, int available = 6}) => SwapStation((b) => b
  ..id = id
  ..name = name
  ..address = 'Av. $name, 100'
  ..lat = lat
  ..lng = lng
  ..availableBatteries = available
  ..totalSlots = 10
  ..openingHours = '07:00-22:00');

DioException problem(int status, String slug, {String? detail}) => DioException(
      requestOptions: RequestOptions(path: '/handovers'),
      response: Response(
        requestOptions: RequestOptions(path: '/handovers'),
        statusCode: status,
        data: {'type': 'https://api.volti.com.br/problems/$slug', 'title': 'Erro', 'status': status, 'detail': ?detail},
      ),
    );

class HandoverBackend extends GalpaoBackend {
  HandoverBackend({super.depots});

  final handovers = <String, Handover>{'h1': handoverFixture()};
  int handoverCalls = 0;
  final acceptKeys = <String>[];
  final disputeReasons = <String>[];

  /// Segura o aceite ate o teste completar (toque duplo).
  Completer<void>? acceptGate;

  /// Erros do aceite, um por chamada (vazio = sucesso).
  final acceptErrors = <Object>[];
  Rental? rentalNow;
  List<SwapStation> stations = [];
  Object? stationsError;
  Object? disputeError;

  /// Status devolvido por `GET /rentals/{id}` (a consulta da devolucao no galpao).
  RentalStatus rentalStatus = RentalStatus.active;
  int rentalCalls = 0;
  int vehicleByCodeCalls = 0;

  /// Galpao da moto do aluguel (`Vehicle.depotId`).
  String? vehicleDepotId = 'dep1';

  @override
  Future<Handover> handover(String id) async {
    handoverCalls++;
    final h = handovers[id];
    if (h == null) throw toFailure(problem(404, 'not-found'));
    return h;
  }

  @override
  Future<Rental> acceptHandover(String id, String idempotencyKey) async {
    acceptKeys.add(idempotencyKey);
    if (acceptGate != null) await acceptGate!.future;
    if (acceptErrors.isNotEmpty) throw toFailure(acceptErrors.removeAt(0));
    handovers[id] = handovers[id]!.rebuild((b) => b.status = HandoverStatus.accepted);
    current = null;
    rentalNow = sampleRental();
    return rentalNow!;
  }

  @override
  Future<Handover> disputeHandover(String id, String reason) async {
    disputeReasons.add(reason);
    if (disputeError != null) throw toFailure(disputeError!);
    final h = handovers[id]!.rebuild((b) => b
      ..status = HandoverStatus.disputed
      ..disputeReason = reason);
    handovers[id] = h;
    return h;
  }

  @override
  Future<Rental?> currentRental() async => rentalNow;
  @override
  Future<Rental> rental(String id) async {
    rentalCalls++;
    return (rentalNow ?? sampleRental()).rebuild((b) => b
      ..id = id
      ..status = rentalStatus);
  }

  @override
  Future<Vehicle> vehicleByCode(String code) async {
    vehicleByCodeCalls++;
    return bike('v1', code, 'Volti Flash').rebuild((b) => b.depotId = vehicleDepotId);
  }

  @override
  Future<List<SwapStation>> swapStations({double? lat, double? lng}) async {
    if (stationsError != null) throw toFailure(stationsError!);
    return stations;
  }
  @override
  Future<Me> me() async => Me((b) => b
    ..id = 'c1'
    ..pool = AuthPool.customer
    ..email = 'a@b.c'
    ..customer = customer().toBuilder());
}

/// Fabrica de conexoes de tempo real: o evento vai para todas as abertas.
class RtHub {
  final all = <FakeRealtime>[];
  RealtimeService create() {
    final f = FakeRealtime();
    all.add(f);
    return f;
  }

  void emit(RealtimeEvent e) {
    for (final f in all) {
      try {
        f.emit(e);
      } catch (_) {
        // conexao ja descartada
      }
    }
  }
}

final opened = <Uri>[];

void phone(WidgetTester t, {double scale = 1, Size size = const Size(412, 915)}) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
}

Future<void> settle(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 300));
  }
}

Future<GoRouter> pumpApp(WidgetTester t, HandoverBackend b, RtHub hub, {String initial = '/home', bool reduceMotion = false}) async {
  final router = GoRouter(initialLocation: initial, routes: appRoutes());
  addTearDown(router.dispose);
  final app = testRouterApp(router, overrides: [
    backendProvider.overrideWithValue(b),
    pushServiceProvider.overrideWithValue(NoopPushService()),
    locationServiceProvider.overrideWithValue(FakeLocation()),
    sessionProvider.overrideWith(() => FakeSession(session())),
    clockProvider.overrideWithValue(() => thu10),
    realtimeFactoryProvider.overrideWithValue(hub.create),
    urlLauncherProvider.overrideWithValue((uri) async {
      opened.add(uri);
      return true;
    }),
  ]);
  if (reduceMotion) {
    // Pelo sistema (o MaterialApp le a MediaQuery da janela).
    t.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(t.platformDispatcher.clearAccessibilityFeaturesTestValue);
  }
  await t.pumpWidget(app);
  await settle(t);
  return router;
}

String where(GoRouter r) => r.state.uri.path;

Future<void> tapKey(WidgetTester t, String key) async {
  final f = find.byKey(Key(key));
  await t.ensureVisible(f);
  await t.pump();
  await t.tap(f);
  await settle(t);
}

void main() {
  setUp(opened.clear);

  group('Confira sua moto', () {
    testWidgets('handover.pending da reserva atual abre a tela com fotos, checklist e bateria', (t) async {
      phone(t);
      final b = HandoverBackend()..current = reservationFixture();
      final hub = RtHub();
      final router = await pumpApp(t, b, hub, initial: '/reservation/res1');
      expect(find.byKey(const Key('reservation-qr')), findsOneWidget);

      // Evento de outra reserva: nada muda.
      hub.emit(const HandoverPending(handoverId: 'h9', reservationId: 'outra'));
      await settle(t);
      expect(where(router), '/reservation/res1');

      hub.emit(const HandoverPending(handoverId: 'h1', reservationId: 'res1'));
      await settle(t);
      expect(where(router), '/handover/h1');
      expect(find.text('Confira sua moto'), findsWidgets);
      expect(find.bySemanticsLabel('Foto 1 de 2 da moto'), findsOneWidget);
      expect(find.bySemanticsLabel('Foto 2 de 2 da moto'), findsOneWidget);
      expect(find.text('Freios'), findsOneWidget);
      expect(find.text('Pneus'), findsOneWidget);
      expect(find.text('Carenagem'), findsOneWidget);
      expect(find.text('Risco na lateral'), findsOneWidget);
      expect(find.textContaining('96%'), findsWidgets);
      expect(find.textContaining('BAT-0042'), findsOneWidget);
      expect(find.text('Aceitar e destravar'), findsOneWidget);
      expect(find.text('Apontar problema'), findsOneWidget);
      // O plano nao e cobrado no aceite: o aluguel comeca agora.
      expect(find.textContaining('cobrado agora'), findsNothing);
      expect(find.textContaining('o aluguel começa agora'), findsOneWidget);
      expect(t.takeException(), isNull);
    });

    testWidgets('abrir o app com a reserva em handover leva direto a entrega (uma vez)', (t) async {
      phone(t);
      final b = HandoverBackend()..current = reservationFixture(status: ReservationStatus.handover, handoverId: 'h1');
      final router = await pumpApp(t, b, RtHub());
      expect(where(router), '/handover/h1');
      expect(find.text('Aceitar e destravar'), findsOneWidget);

      // Voltou para o inicio: nao e empurrado de novo para a mesma entrega.
      await tapKey(t, 'handover-back');
      expect(where(router), '/home');
      await settle(t);
      expect(where(router), '/home');
    });

    testWidgets('reserva em handover: o aviso tem "Conferir moto" e nao ha cancelar', (t) async {
      phone(t);
      final b = HandoverBackend()..current = reservationFixture(status: ReservationStatus.handover, handoverId: 'h1');
      final router = await pumpApp(t, b, RtHub(), initial: '/reservation/res1');
      // A reserva aberta direto tambem conta como "ja levou": a tela fica.
      if (where(router) == '/handover/h1') {
        await tapKey(t, 'handover-back');
      }
      router.go('/reservation/res1');
      await settle(t);
      expect(find.text('Sua moto já está sendo entregue. Use Apontar problema.'), findsOneWidget);
      expect(find.byKey(const Key('reservation-cancel')), findsNothing);
      await tapKey(t, 'reservation-see-handover');
      expect(where(router), '/handover/h1');
    });

    testWidgets('"Aceitar e destravar" com toque duplo chama o aceite uma vez e abre a corrida', (t) async {
      phone(t);
      final b = HandoverBackend()
        ..current = reservationFixture(status: ReservationStatus.handover, handoverId: 'h1')
        ..acceptGate = Completer<void>();
      final router = await pumpApp(t, b, RtHub(), initial: '/handover/h1');
      final accept = find.byKey(const Key('handover-accept'));
      await t.ensureVisible(accept);
      await t.pump();
      await t.tap(accept);
      await t.pump();
      await t.tap(accept, warnIfMissed: false);
      await t.pump();
      expect(b.acceptKeys, hasLength(1));
      b.acceptGate!.complete();
      await settle(t);
      expect(b.acceptKeys, hasLength(1));
      expect(where(router), '/ride');
    });

    testWidgets('pagamento recusado mostra o motivo, mantem a tela e a nova tentativa usa a mesma chave', (t) async {
      phone(t);
      final b = HandoverBackend()..acceptErrors.add(problem(422, 'payment-declined', detail: 'Cartão recusado'));
      final router = await pumpApp(t, b, RtHub(), initial: '/handover/h1');
      // O servidor grava o motivo na entrega.
      b.handovers['h1'] = handoverFixture(lastError: 'payment-declined');
      await tapKey(t, 'handover-accept');
      expect(where(router), '/handover/h1');
      expect(find.text('O pagamento não foi aprovado. Tente de novo ou fale com o operador.'), findsOneWidget);
      expect(find.text('Aceitar e destravar'), findsOneWidget);

      await tapKey(t, 'handover-accept');
      expect(b.acceptKeys, hasLength(2));
      expect(b.acceptKeys[0], b.acceptKeys[1]);
      expect(where(router), '/ride');
    });

    testWidgets('caução não retida mostra o aviso e mantem a tela', (t) async {
      phone(t);
      final b = HandoverBackend()..acceptErrors.add(problem(422, 'deposit-not-held'));
      final router = await pumpApp(t, b, RtHub(), initial: '/handover/h1');
      await tapKey(t, 'handover-accept');
      expect(where(router), '/handover/h1');
      expect(find.text('A caução da reserva não está retida. Fale com o suporte.'), findsOneWidget);
    });

    testWidgets('entrega que deixou de estar pendente: recarrega e mostra o estado novo', (t) async {
      phone(t);
      final b = HandoverBackend()..acceptErrors.add(problem(422, 'handover-not-pending'));
      await pumpApp(t, b, RtHub(), initial: '/handover/h1');
      final before = b.handoverCalls;
      b.handovers['h1'] = handoverFixture(status: HandoverStatus.canceled);
      await tapKey(t, 'handover-accept');
      expect(b.handoverCalls, greaterThan(before));
      expect(find.text('Entrega cancelada'), findsOneWidget);
      expect(find.text('Aceitar e destravar'), findsNothing);
    });

    testWidgets('404 no aceite: nao e sua, volta ao inicio', (t) async {
      phone(t);
      final b = HandoverBackend()..acceptErrors.add(problem(404, 'not-found'));
      final router = await pumpApp(t, b, RtHub(), initial: '/handover/h1');
      await tapKey(t, 'handover-accept');
      expect(where(router), '/home');
    });

    testWidgets('entrega inexistente ao abrir: volta ao inicio', (t) async {
      phone(t);
      final router = await pumpApp(t, HandoverBackend(), RtHub(), initial: '/handover/nao-existe');
      expect(where(router), '/home');
    });

    testWidgets('"Apontar problema" envia o motivo e mostra "O suporte vai falar com você"', (t) async {
      phone(t);
      final b = HandoverBackend();
      final router = await pumpApp(t, b, RtHub(), initial: '/handover/h1');
      await tapKey(t, 'handover-report');
      final send = find.byKey(const Key('handover-dispute-send'));
      expect(t.widget<VoltiButton>(send).onPressed, isNull, reason: 'motivo curto demais');
      await t.enterText(find.byKey(const Key('handover-dispute-reason')), 'Retrovisor quebrado');
      await t.pump();
      await tapKey(t, 'handover-dispute-send');
      expect(b.disputeReasons, ['Retrovisor quebrado']);
      expect(find.text('O suporte vai falar com você.'), findsOneWidget);
      expect(find.text('Aceitar e destravar'), findsNothing);
      await tapKey(t, 'handover-support');
      expect(where(router), '/account/support');
    });

    testWidgets('handover.updated da entrega aberta recarrega a tela', (t) async {
      phone(t);
      final b = HandoverBackend();
      final hub = RtHub();
      await pumpApp(t, b, hub, initial: '/handover/h1');
      b.handovers['h1'] = handoverFixture(lastError: 'payment-declined');
      hub.emit(const HandoverUpdated(handoverId: 'h1', status: 'pending_customer', lastError: 'payment-declined'));
      await settle(t);
      expect(find.text('O pagamento não foi aprovado. Tente de novo ou fale com o operador.'), findsOneWidget);
    });

    for (final status in [HandoverStatus.pendingCustomer, HandoverStatus.disputed, HandoverStatus.accepted]) {
      testWidgets('200% em 360x740 sem overflow ($status)', (t) async {
        phone(t, scale: 2, size: const Size(360, 740));
        final b = HandoverBackend()
          ..handovers['h1'] = handoverFixture(status: status, lastError: 'payment-declined', disputeReason: 'Retrovisor quebrado');
        await pumpApp(t, b, RtHub(), initial: '/handover/h1');
        expect(t.takeException(), isNull);
        if (status == HandoverStatus.pendingCustomer) {
          await tapKey(t, 'handover-report');
          expect(t.takeException(), isNull);
        }
      });
    }

    testWidgets('reduced motion: abre e aceita sem animacao pendente', (t) async {
      phone(t);
      final b = HandoverBackend();
      final router = await pumpApp(t, b, RtHub(), initial: '/handover/h1', reduceMotion: true);
      expect(find.text('Aceitar e destravar'), findsOneWidget);
      await tapKey(t, 'handover-accept');
      expect(where(router), '/ride');
    });

    testWidgets('semantica: botoes com rotulo e acao de toque', (t) async {
      phone(t);
      final handle = t.ensureSemantics();
      await pumpApp(t, HandoverBackend(), RtHub(), initial: '/handover/h1');
      expect(
        t.getSemantics(find.byKey(const Key('handover-accept'))),
        matchesSemantics(label: 'Aceitar e destravar', isButton: true, hasTapAction: true, isEnabled: true, hasEnabledState: true),
      );
      expect(find.bySemanticsLabel(RegExp(r'^Carenagem: Com problema')), findsOneWidget);
      handle.dispose();
    });
    testWidgets('aviso antigo de lastError some enquanto aceita', (t) async {
      phone(t);
      final b = HandoverBackend()
        ..handovers['h1'] = handoverFixture(lastError: 'payment-declined')
        ..acceptGate = Completer<void>();
      await pumpApp(t, b, RtHub(), initial: '/handover/h1');
      expect(find.byKey(const Key('handover-error')), findsOneWidget);
      final accept = find.byKey(const Key('handover-accept'));
      await t.ensureVisible(accept);
      await t.pump();
      await t.tap(accept);
      await t.pump();
      expect(find.byKey(const Key('handover-error')), findsNothing);
      b.acceptGate!.complete();
      await settle(t);
    });

    testWidgets('apontar problema com a entrega ja nao pendente fecha a folha e recarrega', (t) async {
      phone(t);
      final b = HandoverBackend()..disputeError = problem(422, 'handover-not-pending');
      await pumpApp(t, b, RtHub(), initial: '/handover/h1');
      await tapKey(t, 'handover-report');
      await t.enterText(find.byKey(const Key('handover-dispute-reason')), 'Retrovisor quebrado');
      await t.pump();
      b.handovers['h1'] = handoverFixture(status: HandoverStatus.canceled);
      await tapKey(t, 'handover-dispute-send');
      expect(find.byKey(const Key('handover-dispute-reason')), findsNothing);
      expect(find.text('Entrega cancelada'), findsOneWidget);
    });
  });

  group('consulta da reserva (HandoverWatcher)', () {
    testWidgets('reserva ativa: uma consulta a cada 15 s mesmo com inicio e reserva abertos', (t) async {
      phone(t);
      final b = HandoverBackend()..current = reservationFixture();
      final router = await pumpApp(t, b, RtHub());
      router.push('/reservation/res1');
      await settle(t);
      final c0 = b.currentCalls;
      await t.pump(const Duration(seconds: 15));
      await t.pump();
      expect(b.currentCalls, c0 + 1);
      await t.pump(const Duration(seconds: 15));
      await t.pump();
      expect(b.currentCalls, c0 + 2);
    });

    testWidgets('app em segundo plano pausa a consulta; ao voltar consulta e retoma', (t) async {
      phone(t);
      addTearDown(() => t.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed));
      final b = HandoverBackend()..current = reservationFixture();
      await pumpApp(t, b, RtHub());
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await t.pump();
      final c0 = b.currentCalls;
      await t.pump(const Duration(seconds: 60));
      await t.pump();
      expect(b.currentCalls, c0, reason: 'parada em segundo plano');
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await t.pump();
      await t.pump();
      expect(b.currentCalls, c0 + 1, reason: 'consulta ao voltar');
      await t.pump(const Duration(seconds: 15));
      await t.pump();
      expect(b.currentCalls, c0 + 2, reason: 'retomou');
    });

    testWidgets('para quando a reserva vira handover e volta quando fica ativa', (t) async {
      phone(t);
      final b = HandoverBackend()..current = reservationFixture();
      final hub = RtHub();
      final router = await pumpApp(t, b, hub);
      b.current = reservationFixture(status: ReservationStatus.handover, handoverId: 'h1');
      await t.pump(const Duration(seconds: 15));
      await settle(t);
      expect(where(router), '/handover/h1');
      // De volta ao inicio (visivel), a reserva continua em handover: sem consulta.
      await tapKey(t, 'handover-back');
      expect(where(router), '/home');
      final c1 = b.currentCalls;
      await t.pump(const Duration(seconds: 60));
      await t.pump();
      expect(b.currentCalls, c1, reason: 'parada em handover');

      // Entrega cancelada: a reserva volta a ativa e a consulta retoma.
      b.current = reservationFixture();
      hub.emit(const HandoverUpdated(handoverId: 'h1', status: 'canceled'));
      await settle(t);
      final c2 = b.currentCalls;
      await t.pump(const Duration(seconds: 15));
      await t.pump();
      expect(b.currentCalls, c2 + 1);
    });
  });

  group('Trocar bateria (erros)', () {
    testWidgets('falha das estacoes mostra erro com "Tentar de novo"; o galpao continua', (t) async {
      phone(t);
      final b = HandoverBackend()
        ..rentalNow = sampleRental()
        ..stationsError = problem(500, 'internal');
      await pumpApp(t, b, RtHub(), initial: '/ride');
      await t.tap(find.text('Trocar bateria'));
      await settle(t);
      expect(find.byKey(const Key('swap-depot')), findsOneWidget);
      expect(find.byKey(const Key('swap-stations-error')), findsOneWidget);
      b
        ..stationsError = null
        ..stations = [station('st1', 'Faria Lima')];
      final retry = find.descendant(of: find.byKey(const Key('swap-stations-error')), matching: find.text('Tentar de novo'));
      await t.ensureVisible(retry);
      await t.pump();
      await t.tap(retry);
      await settle(t);
      expect(find.byKey(const Key('swap-station-st1')), findsOneWidget);
    });
  });

  group('Trocar bateria', () {
    testWidgets('lista o galpao primeiro e depois as estacoes; rota so no toque', (t) async {
      phone(t);
      final b = HandoverBackend()
        ..rentalNow = sampleRental()
        ..stations = [station('st1', 'Faria Lima'), station('st2', 'Paulista', lat: -23.56, lng: -46.65)];
      await pumpApp(t, b, RtHub(), initial: '/ride');
      await t.tap(find.text('Trocar bateria'));
      await settle(t);
      expect(opened, isEmpty);
      final depot = find.byKey(const Key('swap-depot'));
      final st1 = find.byKey(const Key('swap-station-st1'));
      final st2 = find.byKey(const Key('swap-station-st2'));
      expect(depot, findsOneWidget);
      expect(st1, findsOneWidget);
      expect(st2, findsOneWidget);
      expect(t.getTopLeft(depot).dy, lessThan(t.getTopLeft(st1).dy));
      expect(find.text('Galpão Volti · Pinheiros'), findsOneWidget);
      expect(find.textContaining('R. dos Pinheiros, 1000'), findsOneWidget);
      await t.tap(st2);
      await settle(t);
      expect(opened, hasLength(1));
      expect(opened.single.toString(), contains('-23.56,-46.65'));
    });

    testWidgets('galpao com estacao propria (swapStationId): aparece uma vez, primeiro', (t) async {
      phone(t);
      final b = HandoverBackend(depots: [depotFixture().rebuild((d) => d.swapStationId = 'st-dep')])
        ..rentalNow = sampleRental()
        ..stations = [station('st1', 'Faria Lima'), station('st-dep', 'Estação do galpão', available: 9)];
      await pumpApp(t, b, RtHub(), initial: '/ride');
      await t.tap(find.text('Trocar bateria'));
      await settle(t);
      expect(find.byKey(const Key('swap-station-st-dep')), findsNothing);
      final depot = find.byKey(const Key('swap-depot'));
      expect(depot, findsOneWidget);
      expect(find.textContaining('9 baterias disponíveis'), findsOneWidget);
      expect(t.getTopLeft(depot).dy, lessThan(t.getTopLeft(find.byKey(const Key('swap-station-st1'))).dy));
      await t.tap(depot);
      await settle(t);
      expect(opened.single.toString(), contains('-23.566,-46.684'));
    });

    testWidgets('200% em 360x740 sem overflow', (t) async {
      phone(t, scale: 2, size: const Size(360, 740));
      final b = HandoverBackend()
        ..rentalNow = sampleRental()
        ..stations = [station('st1', 'Faria Lima'), station('st2', 'Paulista')];
      await pumpApp(t, b, RtHub(), initial: '/ride');
      final chip = find.text('Trocar bateria');
      await t.ensureVisible(chip);
      await t.pump();
      await t.tap(chip);
      await settle(t);
      expect(find.byKey(const Key('swap-depot')), findsOneWidget);
      expect(t.takeException(), isNull);
    });
  });

  group('devolucao no galpao', () {
    testWidgets('mostra o endereco, manda entregar ao operador e abre o recibo com handover.updated (um handler, um socket)', (t) async {
      phone(t);
      final b = HandoverBackend()..rentalNow = sampleRental();
      b.handovers['h-other'] = handoverFixture(id: 'h-other', type: HandoverType.returnDepot, rentalId: 'outro', reservationId: null, status: HandoverStatus.accepted);
      b.handovers['h-ret'] = handoverFixture(id: 'h-ret', type: HandoverType.returnDepot, rentalId: 'r1', reservationId: null, status: HandoverStatus.accepted);
      final hub = RtHub();
      final router = await pumpApp(t, b, hub, initial: '/ride');
      router.push('/return/r1');
      await settle(t);
      await t.tap(find.text('Galpão'));
      await settle(t);
      expect(find.text('Devolver no galpão'), findsWidgets);
      expect(find.text('R. dos Pinheiros, 1000'), findsOneWidget);
      expect(find.textContaining('entregue ao operador'), findsOneWidget);
      expect(find.text('Travar e encerrar'), findsNothing);
      // So o socket da corrida: a devolucao reusa os eventos dela.
      expect(hub.all, hasLength(1));

      // Chegada de outro aluguel: fica.
      final before = b.handoverCalls;
      hub.emit(const HandoverUpdated(handoverId: 'h-other', status: 'accepted'));
      await settle(t);
      expect(where(router), '/return/r1');
      expect(b.handoverCalls, before + 1, reason: 'um handler so');

      hub.emit(const HandoverUpdated(handoverId: 'h-ret', status: 'accepted'));
      await settle(t);
      expect(b.handoverCalls, before + 2, reason: 'um handler so');
      expect(where(router), '/summary/r1');
    });

    testWidgets('rental.updated encerrado (pela corrida) abre o recibo', (t) async {
      phone(t);
      final b = HandoverBackend()..rentalNow = sampleRental();
      final hub = RtHub();
      final router = await pumpApp(t, b, hub, initial: '/ride');
      router.push('/return/r1');
      await settle(t);
      await t.tap(find.text('Galpão'));
      await settle(t);
      hub.emit(const RentalUpdated(rentalId: 'r1', status: 'ended', elapsedSeconds: 600, costCents: 8900));
      await settle(t);
      expect(where(router), '/summary/r1');
    });

    testWidgets('consulta do aluguel a cada 10 s abre o recibo e para depois', (t) async {
      phone(t);
      final b = HandoverBackend()..rentalNow = sampleRental();
      final router = await pumpApp(t, b, RtHub(), initial: '/return/r1');
      await t.tap(find.text('Galpão'));
      await settle(t);
      final start = b.rentalCalls;
      await t.pump(const Duration(seconds: 10));
      await t.pump();
      expect(b.rentalCalls, start + 1);
      expect(where(router), '/return/r1');
      b.rentalStatus = RentalStatus.ended;
      await t.pump(const Duration(seconds: 10));
      await settle(t);
      expect(where(router), '/summary/r1');
      final after = b.rentalCalls;
      await t.pump(const Duration(seconds: 60));
      expect(b.rentalCalls, after, reason: 'timer parado depois do recibo');
    });

    testWidgets('voltar para "Ponto verde" para a consulta', (t) async {
      phone(t);
      final b = HandoverBackend()..rentalNow = sampleRental();
      final router = await pumpApp(t, b, RtHub(), initial: '/return/r1');
      await t.tap(find.text('Galpão'));
      await settle(t);
      await t.tap(find.text('Ponto verde'));
      await settle(t);
      final calls = b.rentalCalls;
      await t.pump(const Duration(seconds: 60));
      expect(b.rentalCalls, calls);
      expect(where(router), '/return/r1');
    });

    testWidgets('usa o galpao da moto (Vehicle.depotId), nao o mais perto', (t) async {
      phone(t);
      final b = HandoverBackend(depots: [
        depotFixture(id: 'near', district: 'Mooca', distanceM: 100).rebuild((d) => d.address = 'Rua Perto, 1'),
        depotFixture(distanceM: 5000),
      ])
        ..rentalNow = sampleRental()
        ..stations = [station('st1', 'Faria Lima')];
      await pumpApp(t, b, RtHub(), initial: '/return/r1');
      await t.tap(find.text('Galpão'));
      await settle(t);
      expect(b.vehicleByCodeCalls, greaterThan(0));
      expect(find.text('R. dos Pinheiros, 1000'), findsOneWidget);
      expect(find.text('Rua Perto, 1'), findsNothing);
    });

    testWidgets('galpao nao encontrado: "Tentar de novo" busca de novo', (t) async {
      phone(t);
      final b = HandoverBackend(depots: [])
        ..rentalNow = sampleRental()
        ..vehicleDepotId = null;
      await pumpApp(t, b, RtHub(), initial: '/return/r1');
      await t.tap(find.text('Galpão'));
      await settle(t);
      expect(find.text('Não encontramos o galpão. Tente de novo.'), findsOneWidget);
      b.depotList.add(depotFixture());
      await tapKey(t, 'return-depot-retry');
      expect(find.text('R. dos Pinheiros, 1000'), findsOneWidget);
    });

    testWidgets('reduced motion: icone fixo no lugar do spinner', (t) async {
      phone(t);
      final b = HandoverBackend()..rentalNow = sampleRental();
      await pumpApp(t, b, RtHub(), initial: '/return/r1', reduceMotion: true);
      await t.tap(find.text('Galpão'));
      await settle(t);
      expect(find.byKey(const Key('return-depot-waiting-icon')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('return-depot')), matching: find.byType(CircularProgressIndicator)), findsNothing);
    });

    testWidgets('corrida aberta tambem abre o recibo com handover.updated de return_depot', (t) async {
      phone(t);
      final b = HandoverBackend()..rentalNow = sampleRental();
      b.handovers['h-ret'] = handoverFixture(id: 'h-ret', type: HandoverType.returnDepot, rentalId: 'r1', reservationId: null, status: HandoverStatus.accepted);
      final hub = RtHub();
      final router = await pumpApp(t, b, hub, initial: '/ride');
      hub.emit(const HandoverUpdated(handoverId: 'h-ret', status: 'accepted'));
      await settle(t);
      expect(where(router), '/summary/r1');
    });

    testWidgets('200% em 360x740 sem overflow', (t) async {
      phone(t, scale: 2, size: const Size(360, 740));
      final b = HandoverBackend()..rentalNow = sampleRental();
      await pumpApp(t, b, RtHub(), initial: '/return/r1');
      await t.tap(find.text('Galpão'));
      await settle(t);
      expect(find.text('R. dos Pinheiros, 1000'), findsOneWidget);
      expect(t.takeException(), isNull);
    });
  });
}
