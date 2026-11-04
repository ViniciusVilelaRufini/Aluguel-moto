import 'dart:async';

import 'package:built_collection/built_collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/app_channel.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';

/// "Retirar moto (teste)": no app de teste (canal beta) a reserva ativa simula a
/// equipe e o checkout do balcao (`POST /reservations/{id}/test-handover`): a
/// entrega volta `accepted` com o aluguel e o app abre a corrida.
class _TestHandoverBackend extends GalpaoBackend {
  final calls = <String>[];
  Object? error;

  /// Segura a resposta do POST (o evento de tempo real chega antes).
  Completer<void>? gate;

  @override
  Future<Handover> createTestHandover(String reservationId) async {
    calls.add(reservationId);
    if (gate != null) await gate!.future;
    if (error != null) throw toFailure(error!);
    // Como na API: entrega criada e checkout do balcao simulado (reserva convertida, aluguel ativo).
    final h = _handover(status: HandoverStatus.accepted, rentalId: 'r1');
    current = null;
    rentalNow = sampleRental();
    return h;
  }

  Rental? rentalNow;

  @override
  Future<Rental?> currentRental() async => rentalNow;

  @override
  Future<Handover> handover(String id) async => _handover();
}

Handover _handover({HandoverStatus status = HandoverStatus.pendingCustomer, String? rentalId}) => Handover((b) => b
  ..id = 'h-teste'
  ..rentalId = rentalId
  ..type = HandoverType.pickup
  ..depotId = 'dep1'
  ..reservationId = 'res1'
  ..vehicleId = 'v1'
  ..vehicleCode = 'VLT-001'
  ..operatorId = '00000000-0000-0000-0000-000000000000'
  ..operatorFirstName = 'Equipe Volti'
  ..checklist = ListBuilder<HandoverChecklistItem>([
    HandoverChecklistItem((i) => i
      ..code = 'teste'
      ..ok = true),
  ])
  ..photoKeys = ListBuilder<String>()
  ..photoUrls = ListBuilder<String>()
  ..batteryPct = 90
  ..status = status
  ..createdAt = thu10);

Reservation _reservation({ReservationStatus status = ReservationStatus.active}) => Reservation((b) => b
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
  ..planCode = PlanCode.day
  ..coverage = InsuranceCoverage.basic
  ..depositMethod = DepositMethod.card
  ..pickupCode = 'VOLTI-RES1-SIG');

/// Conexoes de tempo real abertas pelo app; o evento vai para todas.
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

Future<GoRouter> _pump(WidgetTester t, GalpaoBackend b, AppChannel channel, {_Hub? hub}) async {
  t.view.physicalSize = const Size(412, 915);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  final router = GoRouter(initialLocation: '/reservation/res1', routes: appRoutes());
  addTearDown(router.dispose);
  await t.pumpWidget(testRouterApp(router, overrides: [
    backendProvider.overrideWithValue(b),
    pushServiceProvider.overrideWithValue(NoopPushService()),
    locationServiceProvider.overrideWithValue(FakeLocation()),
    sessionProvider.overrideWith(() => FakeSession(session(kyc: KycStatus.approved))),
    clockProvider.overrideWithValue(() => thu10),
    appChannelProvider.overrideWithValue(channel),
    realtimeFactoryProvider.overrideWithValue((hub ?? _Hub()).create),
  ]));
  await _settle(t);
  return router;
}

Future<void> _settle(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 300));
  }
}

void main() {
  const button = Key('reservation-test-handover');

  testWidgets('loja: sem "Retirar moto (teste)"', (t) async {
    await _pump(t, _TestHandoverBackend()..current = _reservation(), AppChannel.store);
    expect(find.byKey(button), findsNothing);
    expect(find.text('Retirar moto (teste)'), findsNothing);
    expect(find.text('Simula a equipe do galpão · só na versão de teste'), findsNothing);
  });

  testWidgets('teste com reserva ativa: botao e legenda acima de "Cancelar (grátis)"', (t) async {
    await _pump(t, _TestHandoverBackend()..current = _reservation(), AppChannel.beta);
    expect(find.byKey(button), findsOneWidget);
    expect(find.text('Retirar moto (teste)'), findsOneWidget);
    expect(find.text('Simula a equipe do galpão · só na versão de teste'), findsOneWidget);
    expect(t.getTopLeft(find.byKey(button)).dy, lessThan(t.getTopLeft(find.byKey(const Key('reservation-cancel'))).dy));
  });

  testWidgets('teste com a entrega ja aberta: sem o botao', (t) async {
    final b = _TestHandoverBackend()..current = _reservation(status: ReservationStatus.handover);
    await _pump(t, b, AppChannel.beta);
    expect(find.byKey(button), findsNothing);
  });

  testWidgets('teste: tocar simula a equipe e o balcao e abre a corrida', (t) async {
    final b = _TestHandoverBackend()..current = _reservation();
    final router = await _pump(t, b, AppChannel.beta);
    await t.ensureVisible(find.byKey(button));
    await t.pump();
    await t.tap(find.byKey(button));
    await _settle(t);
    expect(b.calls, ['res1']);
    expect(router.state.uri.path, '/ride');
    await _settle(t);
    expect(router.state.uri.path, '/ride');
    expect(b.calls, ['res1']);
    // A corrida e a raiz: nao volta para a pre-reserva convertida.
    expect(router.canPop(), isFalse);
  });

  testWidgets('teste: handover.pending chega antes da resposta → abre a entrega e depois a corrida', (t) async {
    final hub = _Hub();
    final b = _TestHandoverBackend()
      ..current = _reservation()
      ..gate = Completer<void>();
    final router = await _pump(t, b, AppChannel.beta, hub: hub);
    await t.ensureVisible(find.byKey(button));
    await t.pump();
    await t.tap(find.byKey(button));
    await t.pump();
    // O HandoverWatcher abre a entrega pelo evento enquanto o POST ainda nao respondeu.
    hub.emit(const HandoverPending(handoverId: 'h-teste', reservationId: 'res1'));
    await _settle(t);
    expect(router.state.uri.path, '/handover/h-teste');
    b.gate!.complete();
    await _settle(t);
    expect(router.state.uri.path, '/ride');
    expect(router.canPop(), isFalse);
  });

  testWidgets('teste: erro da API mostra a falha e continua na reserva', (t) async {
    final b = _TestHandoverBackend()
      ..current = _reservation()
      ..error = conflict('conflict');
    final router = await _pump(t, b, AppChannel.beta);
    await t.ensureVisible(find.byKey(button));
    await t.pump();
    await t.tap(find.byKey(button));
    await _settle(t);
    expect(b.calls, ['res1']);
    expect(router.state.uri.path, '/reservation/res1');
    expect(find.byKey(button), findsOneWidget);
  });
}
