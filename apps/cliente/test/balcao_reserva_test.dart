// Task 9 da pre-reserva no balcao: pre-reservar direto da moto (sem plano, seguro
// nem caucao), precos de referencia, consentimento de localizacao antes de enviar
// e "Sua moto está sendo preparada" (sem aceitar; a corrida abre pelo evento).
import 'package:built_collection/built_collection.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/app_channel.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/launcher.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/pick/depot_selection.dart';
import 'package:volti_cliente/features/pickup/pickup_screen.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';

Handover _handover({HandoverStatus status = HandoverStatus.pendingCustomer, String? rentalId}) => Handover((b) => b
  ..id = 'h1'
  ..type = HandoverType.pickup
  ..depotId = 'dep1'
  ..reservationId = 'res1'
  ..rentalId = rentalId
  ..vehicleId = 'v1'
  ..vehicleCode = 'VLT-001'
  ..operatorId = 'op1'
  ..operatorFirstName = 'Carlos'
  ..checklist = ListBuilder<HandoverChecklistItem>([
    HandoverChecklistItem((i) => i
      ..code = 'freios'
      ..ok = true),
    HandoverChecklistItem((i) => i
      ..code = 'carenagem'
      ..ok = false
      ..note = 'Risco na lateral'),
  ])
  ..photoKeys = ListBuilder<String>(['handovers/h1/1.jpg'])
  ..photoUrls = ListBuilder<String>(['https://s3.local/1.jpg'])
  ..batteryPct = 96
  ..batterySerial = 'BAT-0042'
  ..status = status
  ..createdAt = thu10);

Reservation _reservation({ReservationStatus status = ReservationStatus.active, String? handoverId}) => Reservation((b) => b
  ..id = 'res1'
  ..vehicleId = 'v1'
  ..vehicle.replace(VehicleSummary((v) => v
    ..id = 'v1'
    ..code = 'VLT-001'
    ..model = 'Volti Urbana'
    ..status = VehicleStatus.reserved
    ..lat = -23.566
    ..lng = -46.684
    ..batteryPct = 90
    ..estimatedRangeKm = 40))
  ..status = status
  ..createdAt = thu10
  ..expiresAt = DateTime.utc(2026, 10, 22, 15)
  ..depotId = 'dep1'
  ..pickupMode = PickupMode.now
  ..pickupCode = 'VOLTI-RES1-SIG'
  ..handoverId = handoverId);

DioException _problem(int status, String slug) => DioException(
      requestOptions: RequestOptions(path: '/reservations'),
      response: Response(
        requestOptions: RequestOptions(path: '/reservations'),
        statusCode: status,
        data: {'type': 'https://api.volti.com.br/problems/$slug', 'title': 'Erro', 'status': status},
      ),
    );

class _BalcaoBackend extends GalpaoBackend {
  Handover handoverNow = _handover();
  Rental? rentalNow;
  final createErrors = <Object>[];
  final testHandoverCalls = <String>[];

  @override
  Future<Reservation> createDepotReservation(ReservationCreate request, {String? idempotencyKey}) async {
    if (createErrors.isNotEmpty) {
      sent = request;
      creates++;
      throw toFailure(createErrors.removeAt(0));
    }
    return super.createDepotReservation(request, idempotencyKey: idempotencyKey);
  }

  @override
  Future<Handover> handover(String id) async => handoverNow;

  @override
  Future<Handover> createTestHandover(String reservationId) async {
    testHandoverCalls.add(reservationId);
    // A API simula a equipe e o checkout do balcao: a entrega ja volta aceita.
    handoverNow = _handover(status: HandoverStatus.accepted, rentalId: 'r1');
    current = null;
    rentalNow = sampleRental();
    return handoverNow;
  }

  @override
  Future<Rental?> currentRental() async => rentalNow;
}

class _Hub {
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

void _phone(WidgetTester t, {double scale = 1, Size size = const Size(412, 915)}) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
}

Future<void> _settle(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 300));
  }
}

late FakeSession _session;

Future<GoRouter> _pump(
  WidgetTester t,
  _BalcaoBackend b, {
  String initial = '/pickup',
  Object? extra,
  bool location = true,
  _Hub? hub,
  AppChannel channel = AppChannel.store,
  bool reduceMotion = false,
  SessionState? initialSession,
}) async {
  final router = GoRouter(initialLocation: initial, initialExtra: extra, routes: appRoutes());
  addTearDown(router.dispose);
  _session = FakeSession(initialSession ?? session(location: location));
  if (reduceMotion) {
    t.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(t.platformDispatcher.clearAccessibilityFeaturesTestValue);
  }
  await t.pumpWidget(testRouterApp(router, overrides: [
    backendProvider.overrideWithValue(b),
    pushServiceProvider.overrideWithValue(NoopPushService()),
    locationServiceProvider.overrideWithValue(FakeLocation()),
    sessionProvider.overrideWith(() => _session),
    clockProvider.overrideWithValue(() => thu10),
    appChannelProvider.overrideWithValue(channel),
    realtimeFactoryProvider.overrideWithValue((hub ?? _Hub()).create),
    urlLauncherProvider.overrideWithValue((_) async => true),
  ]));
  await _settle(t);
  return router;
}

Future<void> _tapKey(WidgetTester t, String key) async {
  final f = find.byKey(Key(key));
  await t.ensureVisible(f);
  await t.pump();
  await t.tap(f);
  await _settle(t);
}

Future<void> _tapText(WidgetTester t, String text) async {
  await t.ensureVisible(find.text(text).last);
  await t.pump();
  await t.tap(find.text(text).last);
  await _settle(t);
}

DepotSelection _selection() => DepotSelection(depot: depotFixture(), vehicle: bike('v1', 'VLT-001', 'Volti Urbana'));

String _where(GoRouter r) => r.state.uri.path;

void main() {
  group('pré-reserva', () {
    testWidgets('pré-reserva sem caução nem plano', (t) async {
      _phone(t);
      final b = _BalcaoBackend();
      final router = await _pump(t, b, extra: _selection());
      expect(find.text('Pré-reserva'), findsOneWidget);
      await _tapKey(t, 'pickup-now');
      // Resumo: moto, galpao, horario e o aviso do balcao.
      expect(find.text('Volti Urbana · VLT-001'), findsOneWidget);
      expect(t.widget<Text>(find.byKey(const Key('pickup-depot'))).data, 'Galpão Volti · Pinheiros');
      expect(t.widget<Text>(find.byKey(const Key('pickup-when'))).data, 'Retire até 12:00');
      expect(find.text('Leve documento com foto. O contrato e o pagamento são feitos no galpão.'), findsOneWidget);
      // Precos de referencia: diario, semanal, mensal e o seguro basico (sem minuto/hora).
      expect(find.text('Preços de referência; o plano é escolhido no galpão'), findsOneWidget);
      expect(find.text('Diário'), findsOneWidget);
      expect(find.text('R\$ 89,00/dia'), findsOneWidget);
      expect(find.text('Semanal'), findsOneWidget);
      expect(find.text('R\$ 349,00/semana'), findsOneWidget);
      expect(find.text('Mensal'), findsOneWidget);
      expect(find.text('R\$ 999,00/mês'), findsOneWidget);
      expect(find.text('Por minuto'), findsNothing);
      expect(find.text('Por hora'), findsNothing);
      expect(find.text('Seguro Básico'), findsOneWidget);
      // Nada se paga no app.
      for (final k in ['pickup-card', 'pickup-pix', 'pickup-test-pay', 'pickup-coupon', 'pickup-deposit']) {
        expect(find.byKey(Key(k)), findsNothing, reason: k);
      }
      expect(find.textContaining('Caução'), findsNothing);
      expect(find.textContaining('caução'), findsNothing);

      await _tapKey(t, 'pickup-pre-reserve');
      final req = b.sent!;
      expect(req.vehicleId, 'v1');
      expect(req.depotId, 'dep1');
      expect(req.pickupMode, PickupMode.now);
      expect(req.pickupAt, isNull);
      expect(req.planCode, isNull);
      expect(req.coverage, isNull);
      expect(req.depositMethod, isNull);
      expect(req.cardId, isNull);
      expect(req.couponCode, isNull);
      expect(_where(router), '/reservation/res1');
      expect(find.text('Pré-reserva confirmada'), findsOneWidget);
    });

    testWidgets('agendado envia o horario escolhido', (t) async {
      _phone(t);
      final b = _BalcaoBackend();
      await _pump(t, b, extra: _selection());
      await _tapKey(t, 'pickup-scheduled');
      await _tapText(t, 'sáb. 24/10');
      await _tapText(t, '09:00');
      expect(find.text('sáb. 24/10 às 09:00'), findsOneWidget);
      await _tapKey(t, 'pickup-pre-reserve');
      expect(b.sent!.pickupMode, PickupMode.scheduled);
      expect(b.sent!.pickupAt, DateTime.utc(2026, 10, 24, 12));
    });

    testWidgets('sem consentimento pede antes de enviar', (t) async {
      _phone(t);
      final b = _BalcaoBackend();
      await _pump(t, b, extra: _selection(), location: false);
      await _tapKey(t, 'pickup-pre-reserve');
      expect(find.byKey(const Key('pickup-consent-dialog')), findsOneWidget);
      expect(find.text('Permitir localização durante o aluguel'), findsOneWidget);
      // Recusar: nada e enviado.
      await _tapText(t, 'Agora não');
      expect(find.byKey(const Key('pickup-consent-dialog')), findsNothing);
      expect(b.creates, 0);
      expect(_session.saved, isFalse);

      // Permitir: grava o consentimento (termos e marketing como estavam) e envia.
      await _tapKey(t, 'pickup-pre-reserve');
      await _tapText(t, 'Permitir e continuar');
      expect(_session.saved, isTrue);
      final c = _session.state.value!.consents!;
      expect(c.locationTracking, isTrue);
      expect(c.termsAccepted, isTrue);
      expect(c.marketing, isFalse);
      expect(b.creates, 1);
    });

    testWidgets('consentimento: termos e marketing vêm do servidor, nunca revogados', (t) async {
      _phone(t);
      final b = _BalcaoBackend()
        ..consentsNow = Consents((c) => c
          ..termsAccepted = true
          ..locationTracking = false
          ..marketing = true);
      // Sessao sem consentimentos carregados (falha engolida no carregamento): nao pode virar "termos falso".
      await _pump(t, b, extra: _selection(), initialSession: SessionState(signedIn: true, customer: customer()));
      await _tapKey(t, 'pickup-pre-reserve');
      await _tapText(t, 'Permitir e continuar');
      expect(b.consentsCalls, 1);
      final c = _session.state.value!.consents!;
      expect(c.locationTracking, isTrue);
      expect(c.termsAccepted, isTrue);
      expect(c.marketing, isTrue);
      expect(b.creates, 1);
    });

    testWidgets('consentimento: falha ao ler os consentimentos mostra o erro e não envia nada', (t) async {
      _phone(t);
      final b = _BalcaoBackend()..consentsError = AppFailure(kind: FailureKind.api, status: 500, detail: 'Não deu para ler seus consentimentos.');
      final router = await _pump(t, b, extra: _selection(), location: false);
      await _tapKey(t, 'pickup-pre-reserve');
      await _tapText(t, 'Permitir e continuar');
      expect(find.text('Não deu para ler seus consentimentos.'), findsOneWidget);
      expect(_session.saved, isFalse);
      expect(b.creates, 0);
      expect(_where(router), '/pickup');
    });

    testWidgets('403 location-consent-required da API reabre o diálogo', (t) async {
      _phone(t);
      final b = _BalcaoBackend()..createErrors.add(_problem(403, 'location-consent-required'));
      final router = await _pump(t, b, extra: _selection());
      await _tapKey(t, 'pickup-pre-reserve');
      expect(b.creates, 1);
      expect(find.byKey(const Key('pickup-consent-dialog')), findsOneWidget);
      await _tapText(t, 'Permitir e continuar');
      expect(_session.saved, isTrue);
      expect(b.creates, 2);
      expect(_where(router), '/reservation/res1');
    });

    testWidgets('escolher moto vai direto para a pré-reserva', (t) async {
      _phone(t);
      final router = await _pump(t, _BalcaoBackend(), initial: '/pick');
      await _tapText(t, 'Volti Urbana · VLT-001');
      expect(find.byType(PickupScreen), findsOneWidget);
      expect(_where(router), '/pickup');
    });

    for (final path in ['/plan', '/insurance']) {
      testWidgets('$path redireciona para o início', (t) async {
        _phone(t);
        final router = await _pump(t, _BalcaoBackend(), initial: path, extra: _selection());
        expect(_where(router), '/home');
      });
    }

    testWidgets('texto a 200% em 360x740 sem estouro (agora e agendado)', (t) async {
      _phone(t, scale: 2, size: const Size(360, 740));
      await _pump(t, _BalcaoBackend(), extra: _selection(), location: false);
      expect(t.takeException(), isNull);
      await _tapKey(t, 'pickup-scheduled');
      expect(t.takeException(), isNull);
      await _tapKey(t, 'pickup-pre-reserve');
      expect(t.takeException(), isNull);
    });

    testWidgets('semântica: botão "Pré-reservar" com rótulo e toque', (t) async {
      _phone(t);
      final h = t.ensureSemantics();
      await _pump(t, _BalcaoBackend(), extra: _selection());
      expect(
        t.getSemantics(find.byKey(const Key('pickup-pre-reserve'))),
        matchesSemantics(label: 'Pré-reservar', isButton: true, hasTapAction: true, isEnabled: true, hasEnabledState: true),
      );
      h.dispose();
    });
  });

  group('pré-reserva confirmada', () {
    testWidgets('QR, endereço, como chegar, prazo e "Cancelar (grátis)"; sem caução nem plano', (t) async {
      _phone(t);
      final b = _BalcaoBackend()..current = _reservation();
      final router = await _pump(t, b, initial: '/reservation/res1');
      expect(find.text('Pré-reserva confirmada'), findsOneWidget);
      expect(find.byKey(const Key('reservation-qr')), findsOneWidget);
      expect(find.text('R. dos Pinheiros, 1000'), findsOneWidget);
      expect(find.text('Como chegar'), findsOneWidget);
      expect(find.text('Retire até 12:00'), findsOneWidget);
      expect(find.textContaining('aução'), findsNothing);
      expect(find.textContaining('Pix'), findsNothing);
      await _tapText(t, 'Cancelar (grátis)');
      expect(find.text('O cancelamento é grátis.'), findsOneWidget);
      await t.tap(find.byKey(const Key('reservation-cancel-confirm')));
      await _settle(t);
      expect(b.cancels, 1);
      expect(_where(router), '/home');
    });

    testWidgets('home: cartão "Pré-reserva confirmada"', (t) async {
      _phone(t);
      final b = _BalcaoBackend()..current = _reservation();
      await _pump(t, b, initial: '/home');
      expect(find.text('Pré-reserva confirmada'), findsOneWidget);
      expect(find.textContaining('aução'), findsNothing);
    });

    testWidgets('em preparo: aviso sem "Apontar problema" e sem cancelar', (t) async {
      _phone(t);
      final b = _BalcaoBackend()..current = _reservation(status: ReservationStatus.handover);
      await _pump(t, b, initial: '/reservation/res1');
      expect(find.text('Sua moto está sendo preparada no galpão.'), findsOneWidget);
      expect(find.textContaining('Apontar problema'), findsNothing);
      expect(find.byKey(const Key('reservation-cancel')), findsNothing);
    });
  });

  group('checkout no balcão fora da tela de preparo', () {
    testWidgets('início: rental.updated active recarrega o aluguel e mostra "Corrida em andamento"', (t) async {
      _phone(t);
      final hub = _Hub();
      final b = _BalcaoBackend()..current = _reservation();
      await _pump(t, b, initial: '/home', hub: hub);
      expect(find.text('Pré-reserva confirmada'), findsOneWidget);
      expect(find.text('Corrida em andamento'), findsNothing);
      b
        ..current = null
        ..rentalNow = sampleRental();
      hub.emit(const RentalUpdated(rentalId: 'r1', status: 'active', elapsedSeconds: 0, costCents: 0));
      await _settle(t);
      expect(find.text('Corrida em andamento'), findsOneWidget);
      expect(find.text('Pré-reserva confirmada'), findsNothing);
    });

    testWidgets('início: handover.updated accepted também recarrega o aluguel', (t) async {
      _phone(t);
      final hub = _Hub();
      final b = _BalcaoBackend()..current = _reservation(status: ReservationStatus.handover, handoverId: 'h1');
      final router = await _pump(t, b, initial: '/home', hub: hub);
      // O vigia abriu a entrega; o cliente voltou ao inicio.
      if (_where(router) == '/handover/h1') await _tapKey(t, 'handover-back');
      expect(_where(router), '/home');
      b
        ..current = null
        ..rentalNow = sampleRental();
      hub.emit(const HandoverUpdated(handoverId: 'h1', status: 'accepted'));
      await _settle(t);
      expect(find.text('Corrida em andamento'), findsOneWidget);
    });
  });

  group('sua moto está sendo preparada', () {
    testWidgets('sendo preparada: sem aceitar e abre a corrida pelo evento', (t) async {
      _phone(t);
      final hub = _Hub();
      final b = _BalcaoBackend()..current = _reservation(status: ReservationStatus.handover, handoverId: 'h1');
      final router = await _pump(t, b, initial: '/handover/h1', hub: hub);
      expect(find.text('Sua moto está sendo preparada'), findsOneWidget);
      // Vistoria so para leitura.
      expect(find.text('Freios'), findsOneWidget);
      expect(find.text('Risco na lateral'), findsOneWidget);
      expect(find.bySemanticsLabel('Foto 1 de 1 da moto'), findsOneWidget);
      expect(find.textContaining('BAT-0042'), findsOneWidget);
      expect(find.byKey(const Key('handover-accept')), findsNothing);
      expect(find.byKey(const Key('handover-report')), findsNothing);
      expect(find.text('Apontar problema'), findsNothing);
      expect(find.text('O atendente inicia o aluguel depois do contrato e do pagamento no balcão. A corrida abre aqui sozinha.'), findsOneWidget);

      // Evento de outra entrega: nada muda.
      hub.emit(const HandoverUpdated(handoverId: 'h9', status: 'accepted'));
      await _settle(t);
      expect(_where(router), '/handover/h1');

      b
        ..handoverNow = _handover(status: HandoverStatus.accepted, rentalId: 'r1')
        ..rentalNow = sampleRental()
        ..current = null;
      hub.emit(const HandoverUpdated(handoverId: 'h1', status: 'accepted'));
      await _settle(t);
      expect(_where(router), '/ride');
    });

    testWidgets('da pré-reserva: entrega aberta pelo evento e depois a corrida, sem erro', (t) async {
      _phone(t);
      final hub = _Hub();
      final b = _BalcaoBackend()..current = _reservation();
      final router = await _pump(t, b, initial: '/reservation/res1', hub: hub);
      b.current = _reservation(status: ReservationStatus.handover, handoverId: 'h1');
      hub.emit(const HandoverPending(handoverId: 'h1', reservationId: 'res1'));
      await _settle(t);
      expect(_where(router), '/handover/h1');
      b
        ..handoverNow = _handover(status: HandoverStatus.accepted, rentalId: 'r1')
        ..rentalNow = sampleRental()
        ..current = null;
      hub.emit(const HandoverUpdated(handoverId: 'h1', status: 'accepted'));
      hub.emit(const RentalUpdated(rentalId: 'r1', status: 'active', elapsedSeconds: 0, costCents: 0));
      await _settle(t);
      expect(_where(router), '/ride');
      expect(router.canPop(), isFalse);
      expect(t.takeException(), isNull);
    });

    testWidgets('rental.updated active abre a corrida', (t) async {
      _phone(t);
      final hub = _Hub();
      final b = _BalcaoBackend();
      final router = await _pump(t, b, initial: '/handover/h1', hub: hub);
      b.rentalNow = sampleRental();
      hub.emit(const RentalUpdated(rentalId: 'r1', status: 'active', elapsedSeconds: 0, costCents: 0));
      await _settle(t);
      expect(_where(router), '/ride');
    });

    testWidgets('entrega já aceita ao abrir (GET) vai para a corrida', (t) async {
      _phone(t);
      final b = _BalcaoBackend()
        ..handoverNow = _handover(status: HandoverStatus.accepted, rentalId: 'r1')
        ..rentalNow = sampleRental();
      final router = await _pump(t, b, initial: '/handover/h1');
      expect(_where(router), '/ride');
    });

    testWidgets('texto a 200% em 360x740 sem estouro', (t) async {
      _phone(t, scale: 2, size: const Size(360, 740));
      await _pump(t, _BalcaoBackend(), initial: '/handover/h1');
      expect(t.takeException(), isNull);
    });

    testWidgets('reduzir movimento: abre e segue para a corrida sem animação pendente', (t) async {
      _phone(t);
      final hub = _Hub();
      final b = _BalcaoBackend();
      final router = await _pump(t, b, initial: '/handover/h1', hub: hub, reduceMotion: true);
      expect(find.text('Sua moto está sendo preparada'), findsOneWidget);
      b
        ..handoverNow = _handover(status: HandoverStatus.accepted, rentalId: 'r1')
        ..rentalNow = sampleRental();
      hub.emit(const HandoverUpdated(handoverId: 'h1', status: 'accepted'));
      await _settle(t);
      expect(_where(router), '/ride');
    });

    testWidgets('atalho de teste abre a corrida', (t) async {
      _phone(t);
      final b = _BalcaoBackend()..current = _reservation();
      final router = await _pump(t, b, initial: '/reservation/res1', channel: AppChannel.beta);
      await _tapKey(t, 'reservation-test-handover');
      expect(b.testHandoverCalls, ['res1']);
      expect(_where(router), '/ride');
    });
  });
}
