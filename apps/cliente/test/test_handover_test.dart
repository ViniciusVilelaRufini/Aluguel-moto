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
/// equipe do galpao (`POST /reservations/{id}/test-handover`) e abre a entrega.
class _TestHandoverBackend extends GalpaoBackend {
  final calls = <String>[];
  Object? error;

  @override
  Future<Handover> createTestHandover(String reservationId) async {
    calls.add(reservationId);
    if (error != null) throw toFailure(error!);
    final h = _handover();
    // A reserva passa a `handover` com a entrega aberta (como na API).
    current = current!.rebuild((b) => b
      ..status = ReservationStatus.handover
      ..handoverId = h.id);
    return h;
  }

  @override
  Future<Handover> handover(String id) async => _handover();
}

Handover _handover() => Handover((b) => b
  ..id = 'h-teste'
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
  ..status = HandoverStatus.pendingCustomer
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

Future<GoRouter> _pump(WidgetTester t, GalpaoBackend b, AppChannel channel) async {
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

  testWidgets('teste com reserva ativa: botao e legenda acima de "Cancelar reserva"', (t) async {
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

  testWidgets('teste: tocar cria a entrega simulada e abre "Confira sua moto"', (t) async {
    final b = _TestHandoverBackend()..current = _reservation();
    final router = await _pump(t, b, AppChannel.beta);
    await t.ensureVisible(find.byKey(button));
    await t.pump();
    await t.tap(find.byKey(button));
    await _settle(t);
    expect(b.calls, ['res1']);
    expect(router.state.uri.path, '/handover/h-teste');
    // Uma tela de entrega so (o HandoverWatcher nao empurra de novo).
    await _settle(t);
    expect(router.state.uri.path, '/handover/h-teste');
    expect(b.calls, ['res1']);
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
