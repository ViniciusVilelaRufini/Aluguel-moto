// Cartao "Sua reserva" da home (retirada em galpao): substitui a faixa escura
// "Moto reservada · Ver reserva" e o cartao do galpao enquanto ha reserva.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/launcher.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/handover/handover_watch.dart';
import 'package:volti_cliente/features/home/home_reservation_card.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'handover_test.dart' show HandoverBackend;
import 'helpers.dart';

// 18:28Z = 15:28 em Sao Paulo. Reserva "retirar agora" de 2 h, criada as 13:28.
final created = DateTime.utc(2026, 10, 22, 16, 28);
final expires = DateTime.utc(2026, 10, 22, 18, 28);

Reservation res({
  ReservationStatus status = ReservationStatus.active,
  PickupMode mode = PickupMode.now,
  DateTime? pickupAt,
  DateTime? expiresAt,
  String? handoverId,
}) => Reservation(
  (b) => b
    ..id = 'res1'
    ..vehicleId = 'v26'
    ..vehicle.replace(
      VehicleSummary(
        (v) => v
          ..id = 'v26'
          ..code = 'VLT-0026'
          ..model = 'Volti Urbana'
          ..vehicleModelId = 'm-urbana'
          ..status = VehicleStatus.reserved
          ..lat = -23.566
          ..lng = -46.684
          ..batteryPct = 90
          ..estimatedRangeKm = 40,
      ),
    )
    ..status = status
    ..createdAt = created
    ..expiresAt = expiresAt ?? expires
    ..depotId = 'dep1'
    ..pickupMode = mode
    ..pickupAt = pickupAt
    ..planCode = PlanCode.day
    ..coverage = InsuranceCoverage.basic
    ..depositMethod = DepositMethod.card
    ..pickupCode = 'VOLTI-RES1-SIG'
    ..handoverId = handoverId,
);

void phone(WidgetTester t, {double scale = 1, Size size = const Size(412, 915)}) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
}

/// Entrega ja aberta nesta sessao: o [HandoverWatcher] nao empurra a tela sozinho.
class _Claimed extends AutoOpenedHandovers {
  @override
  Set<String> build() => {'h1'};
}

final opened = <Uri>[];

Future<GoRouter> pumpHome(
  WidgetTester t,
  GalpaoBackend b, {
  required DateTime Function() clock,
  bool reduceMotion = false,
  KycStatus kyc = KycStatus.approved,
}) async {
  final router = GoRouter(initialLocation: '/home', routes: appRoutes());
  addTearDown(router.dispose);
  final app = testRouterApp(
    router,
    overrides: [
      backendProvider.overrideWithValue(b),
      pushServiceProvider.overrideWithValue(NoopPushService()),
      locationServiceProvider.overrideWithValue(FakeLocation()),
      sessionProvider.overrideWith(() => FakeSession(session(kyc: kyc))),
      clockProvider.overrideWithValue(clock),
      autoOpenedHandoversProvider.overrideWith(_Claimed.new),
      urlLauncherProvider.overrideWithValue((uri) async {
        opened.add(uri);
        return true;
      }),
    ],
  );
  await t.pumpWidget(reduceMotion ? MediaQuery(data: const MediaQueryData(disableAnimations: true), child: app) : app);
  await settle(t);
  return router;
}

Future<void> settle(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 300));
  }
}

final card = find.byKey(const Key('home-reservation-card'));
final countdown = find.byKey(const Key('home-reservation-countdown'));
final depotCard = find.byKey(const Key('depot-card'));

String countdownText(WidgetTester t) => t.widget<Text>(countdown).data!;

void main() {
  setUp(opened.clear);

  group('logica', () {
    test('restante: nunca passa da duracao da reserva nem fica negativo', () {
      final r = res();
      expect(reservationRemaining(r, DateTime.utc(2026, 10, 22, 17)), const Duration(minutes: 88));
      // Relogio atrasado (antes da criacao): no maximo as 2 h da reserva.
      expect(reservationRemaining(r, DateTime.utc(2026, 10, 22, 12)), const Duration(hours: 2));
      // Prazo do galpao menor que a diferenca (admin mudou a janela): usa o menor.
      expect(reservationRemaining(r, DateTime.utc(2026, 10, 22, 12), windowMinutes: 90), const Duration(minutes: 90));
      expect(reservationRemaining(r, DateTime.utc(2026, 10, 22, 19)), Duration.zero);
    });

    test('formato da contagem', () {
      expect(formatCountdown(const Duration(hours: 1, minutes: 28)), '1:28:00');
      expect(formatCountdown(const Duration(minutes: 9, seconds: 5)), '09:05');
      expect(formatCountdown(Duration.zero), '00:00');
    });

    test('reserva em aberto: ativa ou em entrega', () {
      expect(isPendingReservation(null), isFalse);
      expect(isPendingReservation(res()), isTrue);
      expect(isPendingReservation(res(status: ReservationStatus.handover)), isTrue);
      expect(isPendingReservation(res(status: ReservationStatus.expired)), isFalse);
      expect(isPendingReservation(res(status: ReservationStatus.converted)), isFalse);
    });
  });

  group('cartao "Sua reserva"', () {
    testWidgets('ativa agora: modelo, codigo, "Retire até 15:28" com contagem ao vivo, galpao e QR', (t) async {
      phone(t);
      var now = DateTime.utc(2026, 10, 22, 17);
      final b = GalpaoBackend()..current = res();
      final router = await pumpHome(t, b, clock: () => now);
      expect(card, findsOneWidget);
      expect(depotCard, findsNothing);
      expect(find.text('Sua reserva'), findsOneWidget);
      expect(find.text('Volti Urbana'), findsOneWidget);
      expect(find.text('VLT-0026'), findsOneWidget);
      expect(find.text('Retire até 15:28'), findsOneWidget);
      expect(countdownText(t), '1:28:00');
      expect(find.descendant(of: card, matching: find.text('Galpão Volti · Pinheiros')), findsOneWidget);
      expect(find.text('R. dos Pinheiros, 1000'), findsOneWidget);
      // A faixa escura antiga nao existe mais.
      expect(find.text('Moto reservada'), findsNothing);
      expect(find.text('Ver reserva'), findsNothing);

      now = now.add(const Duration(seconds: 1));
      await t.pump(const Duration(seconds: 1));
      expect(countdownText(t), '1:27:59');

      // "Como chegar" so abre o mapa quando o cliente toca.
      expect(opened, isEmpty);
      await t.tap(find.text('Como chegar'));
      await t.pump();
      expect(opened, hasLength(1));

      await t.tap(find.text('Ver QR da reserva'));
      await settle(t);
      expect(router.state.uri.path, '/reservation/res1');
    });

    testWidgets('a contagem nunca mostra mais que a duracao da reserva', (t) async {
      phone(t);
      final b = GalpaoBackend()..current = res();
      await pumpHome(t, b, clock: () => DateTime.utc(2026, 10, 22, 12));
      expect(countdownText(t), '2:00:00');
    });

    testWidgets('agendada: "Retirada agendada · amanhã às 09:00", sem contagem', (t) async {
      phone(t);
      final at = DateTime.utc(2026, 10, 23, 12);
      final b = GalpaoBackend()..current = res(mode: PickupMode.scheduled, pickupAt: at, expiresAt: at.add(const Duration(minutes: 30)));
      await pumpHome(t, b, clock: () => DateTime.utc(2026, 10, 22, 17));
      expect(find.text('Retirada agendada · amanhã às 09:00'), findsOneWidget);
      expect(countdown, findsNothing);
      expect(find.text('Ver QR da reserva'), findsOneWidget);
    });

    testWidgets('em entrega: "Sua moto está sendo entregue" e "Conferir moto" abre /handover/:id', (t) async {
      phone(t);
      final b = HandoverBackend()..current = res(status: ReservationStatus.handover, handoverId: 'h1');
      final router = await pumpHome(t, b, clock: () => DateTime.utc(2026, 10, 22, 17));
      expect(router.state.uri.path, '/home');
      expect(find.text('Sua moto está sendo entregue'), findsOneWidget);
      expect(countdown, findsNothing);
      expect(find.text('Ver QR da reserva'), findsNothing);
      await t.tap(find.text('Conferir moto'));
      await settle(t);
      expect(router.state.uri.path, '/handover/h1');
    });

    testWidgets('com reserva: sem "Escolher moto", sem seletor de galpao e sem o passe', (t) async {
      phone(t);
      final b = GalpaoBackend(
        depots: [
          depotFixture(id: 'dep1', distanceM: 1200),
          depotFixture(id: 'far', name: 'Galpão Volti — Mooca', district: 'Mooca', count: 1, distanceM: 9000),
        ],
      )..current = res();
      await pumpHome(t, b, clock: () => DateTime.utc(2026, 10, 22, 17));
      expect(find.byKey(const Key('home-pick')), findsNothing);
      expect(find.text('Escolher moto'), findsNothing);
      expect(find.byKey(const Key('depot-picker')), findsNothing);
      expect(find.text('Desbloqueie seu plano'), findsNothing);
    });

    testWidgets('sem reserva o passe aparece; no modo estacoes some e volta ao sair', (t) async {
      phone(t);
      final b = GalpaoBackend();
      await pumpHome(t, b, clock: () => thu10);
      expect(find.text('Desbloqueie seu plano'), findsOneWidget);
      expect(find.byKey(const Key('home-pick')), findsOneWidget);
      await t.tap(find.byKey(const Key('home-stations-toggle')));
      await settle(t);
      expect(find.text('Desbloqueie seu plano'), findsNothing);
      await t.tap(find.byKey(const Key('home-stations-toggle')));
      await settle(t);
      expect(find.text('Desbloqueie seu plano'), findsOneWidget);
    });

    testWidgets('ao zerar, recarrega a reserva e volta o cartao do galpao', (t) async {
      phone(t);
      var now = expires.subtract(const Duration(seconds: 2));
      final b = GalpaoBackend()..current = res();
      await pumpHome(t, b, clock: () => now);
      expect(countdownText(t), '00:02');
      final calls = b.currentCalls;
      // A API expirou a reserva.
      b.current = null;
      now = expires;
      await t.pump(const Duration(seconds: 1));
      await settle(t);
      expect(b.currentCalls, greaterThan(calls));
      expect(card, findsNothing);
      expect(depotCard, findsOneWidget);
      expect(find.text('Escolher moto'), findsOneWidget);
      expect(find.text('Desbloqueie seu plano'), findsOneWidget);
    });

    testWidgets('zerou mas a API ainda devolve ativa: mostra o prazo encerrado (recarrega uma vez)', (t) async {
      phone(t);
      var now = expires.subtract(const Duration(seconds: 1));
      final b = GalpaoBackend()..current = res();
      await pumpHome(t, b, clock: () => now);
      final calls = b.currentCalls;
      now = expires;
      await t.pump(const Duration(seconds: 1));
      await settle(t);
      expect(b.currentCalls, calls + 1);
      expect(find.text('O prazo de retirada acabou'), findsOneWidget);
      expect(countdown, findsNothing);
      await t.pump(const Duration(seconds: 3));
      expect(b.currentCalls, calls + 1, reason: 'nao recarrega a cada segundo');
    });

    testWidgets('em segundo plano a contagem para; ao voltar atualiza', (t) async {
      phone(t);
      var now = DateTime.utc(2026, 10, 22, 17);
      final b = GalpaoBackend()..current = res();
      await pumpHome(t, b, clock: () => now);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      now = now.add(const Duration(seconds: 5));
      await t.pump(const Duration(seconds: 5));
      expect(countdownText(t), '1:28:00');
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await t.pump();
      await t.pump();
      expect(countdownText(t), '1:27:55');
    });

    testWidgets('troca galpao <-> reserva animada; com reduced motion e instantanea', (t) async {
      phone(t);
      final b = GalpaoBackend()..current = res();
      await pumpHome(t, b, clock: () => DateTime.utc(2026, 10, 22, 17));
      final animated = t.widget<AnimatedSwitcher>(find.byKey(const Key('home-bottom-switcher')));
      expect(animated.duration, VoltiMotion.durScreen);
      await t.pumpWidget(const SizedBox());

      await pumpHome(t, GalpaoBackend()..current = res(), clock: () => DateTime.utc(2026, 10, 22, 17), reduceMotion: true);
      final instant = t.widget<AnimatedSwitcher>(find.byKey(const Key('home-bottom-switcher')));
      expect(instant.duration, Duration.zero);
    });
  });

  group('acessibilidade', () {
    testWidgets('container com rotulo claro; contagem anunciada por minuto, nao por segundo', (t) async {
      phone(t);
      final h = t.ensureSemantics();
      var now = DateTime.utc(2026, 10, 22, 17);
      final b = GalpaoBackend()..current = res();
      await pumpHome(t, b, clock: () => now);
      expect(find.bySemanticsLabel('Reserva da Volti Urbana VLT-0026, retire até 15:28'), findsOneWidget);
      final node = t.getSemantics(find.byKey(const Key('home-reservation-card')));
      expect(node.label, contains('Reserva da Volti Urbana VLT-0026, retire até 15:28'));
      expect(find.bySemanticsLabel('Faltam 88 minutos'), findsOneWidget);
      // O texto por segundo nao vai para o leitor de tela.
      expect(find.bySemanticsLabel('1:28:00'), findsNothing);
      now = now.add(const Duration(seconds: 1));
      await t.pump(const Duration(seconds: 1));
      expect(countdownText(t), '1:27:59');
      expect(find.bySemanticsLabel('Faltam 88 minutos'), findsOneWidget, reason: 'mesmo minuto: rotulo igual');
      h.dispose();
    });

    testWidgets('agendada e entrega: rotulos do container', (t) async {
      phone(t);
      final h = t.ensureSemantics();
      final at = DateTime.utc(2026, 10, 23, 12);
      await pumpHome(
        t,
        GalpaoBackend()..current = res(mode: PickupMode.scheduled, pickupAt: at, expiresAt: at.add(const Duration(minutes: 30))),
        clock: () => DateTime.utc(2026, 10, 22, 17),
      );
      expect(find.bySemanticsLabel('Reserva da Volti Urbana VLT-0026, retirada agendada amanhã às 09:00'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
      await pumpHome(
        t,
        HandoverBackend()..current = res(status: ReservationStatus.handover, handoverId: 'h1'),
        clock: () => DateTime.utc(2026, 10, 22, 17),
      );
      expect(find.bySemanticsLabel('Reserva da Volti Urbana VLT-0026, sua moto está sendo entregue'), findsOneWidget);
      h.dispose();
    });

    for (final status in [ReservationStatus.active, ReservationStatus.handover]) {
      testWidgets('texto a 200% em 360x740 sem estouro (${status.name}), botoes >= 44 px', (t) async {
        phone(t, scale: 2, size: const Size(360, 740));
        final b = (status == ReservationStatus.handover ? HandoverBackend() : GalpaoBackend())..current = res(status: status, handoverId: 'h1');
        await pumpHome(t, b, clock: () => DateTime.utc(2026, 10, 22, 17), kyc: KycStatus.pending);
        expect(t.takeException(), isNull);
        expect(card, findsOneWidget);
        final c = t.getRect(card);
        final top = t.getRect(find.byKey(const Key('home-top')));
        expect(top.bottom, lessThanOrEqualTo(c.top), reason: 'cabecalho e avisos acima do cartao');
        expect(c.bottom, lessThanOrEqualTo(740));
        final open = find.byKey(const Key('home-reservation-open'));
        final r = t.getRect(open);
        expect(r.bottom, lessThanOrEqualTo(c.bottom), reason: 'botao principal sempre a vista');
        expect(r.height, greaterThanOrEqualTo(44));
        expect(t.getSize(find.byKey(const Key('home-reservation-directions'))).height, greaterThanOrEqualTo(44));
      });
    }
  });
}
