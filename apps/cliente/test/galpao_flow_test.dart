import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/launcher.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/pickup/pickup_screen.dart';
import 'package:volti_cliente/features/reservation/depot_reservation_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';

void phone(WidgetTester t, {double scale = 1, Size size = const Size(412, 915)}) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
}

final opened = <Uri>[];

Future<GoRouter> pumpApp(
  WidgetTester t,
  GalpaoBackend b, {
  String initial = '/home',
  Object? extra,
  bool reduceMotion = false,
  KycStatus kyc = KycStatus.approved,
  DateTime Function()? clock,
  FakeSession Function()? sessionFactory,
}) async {
  final router = GoRouter(initialLocation: initial, initialExtra: extra, routes: appRoutes());
  addTearDown(router.dispose);
  final app = testRouterApp(router, overrides: [
    backendProvider.overrideWithValue(b),
    pushServiceProvider.overrideWithValue(NoopPushService()),
    locationServiceProvider.overrideWithValue(FakeLocation()),
    sessionProvider.overrideWith(sessionFactory ?? () => FakeSession(session(kyc: kyc))),
    clockProvider.overrideWithValue(clock ?? () => thu10),
    urlLauncherProvider.overrideWithValue((uri) async {
      opened.add(uri);
      return true;
    }),
  ]);
  await t.pumpWidget(reduceMotion ? MediaQuery(data: const MediaQueryData(disableAnimations: true), child: app) : app);
  await settle(t);
  return router;
}

Future<void> settle(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 300));
  }
}

Future<void> tapText(WidgetTester t, String text) async {
  await t.ensureVisible(find.text(text).last);
  await t.pump();
  await t.tap(find.text(text).last);
  await settle(t);
}

void main() {
  setUp(opened.clear);

  group('home do galpao', () {
    testWidgets('cartao do galpao com bairro e motos, horario e "Escolher moto"; sem scan', (t) async {
      phone(t);
      await pumpApp(t, GalpaoBackend());
      expect(find.text('Galpão Volti · Pinheiros · 3 motos disponíveis'), findsOneWidget);
      expect(find.text('Aberto até 20h'), findsOneWidget);
      expect(find.text('R. dos Pinheiros, 1000'), findsOneWidget);
      expect(find.text('Escolher moto'), findsOneWidget);
      expect(find.text('Escanear para andar'), findsNothing);
      expect(t.takeException(), isNull);
    });

    testWidgets('dois galpoes: seletor com o mais perto primeiro e a lista segue o escolhido', (t) async {
      phone(t);
      final b = GalpaoBackend(
        depots: [
          depotFixture(id: 'far', name: 'Galpão Volti — Mooca', district: 'Mooca', count: 1, distanceM: 9000),
          depotFixture(id: 'dep1', distanceM: 1200),
        ],
        vehicles: {
          'dep1': [bike('v1', 'VLT-001', 'Volti Urbana')],
          'far': [bike('v9', 'VLT-009', 'Volti Touring', depotId: 'far')],
        },
      );
      await pumpApp(t, b);
      final pin = find.byKey(const Key('depot-option-dep1'));
      final mooca = find.byKey(const Key('depot-option-far'));
      expect(pin, findsOneWidget);
      expect(mooca, findsOneWidget);
      expect(t.getTopLeft(pin).dx, lessThan(t.getTopLeft(mooca).dx));
      expect(find.text('Galpão Volti · Pinheiros · 3 motos disponíveis'), findsOneWidget);
      await t.ensureVisible(mooca);
      await t.pump();
      await t.tap(mooca);
      await settle(t);
      expect(find.text('Galpão Volti · Mooca · 1 moto disponível'), findsOneWidget);
      await tapText(t, 'Escolher moto');
      expect(find.textContaining('VLT-009'), findsWidgets);
      expect(find.textContaining('VLT-001'), findsNothing);
    });

    testWidgets('sabado depois das 18h: fechado com a proxima abertura (segunda)', (t) async {
      phone(t);
      final router = GoRouter(initialLocation: '/home', routes: appRoutes());
      addTearDown(router.dispose);
      await t.pumpWidget(testRouterApp(router, overrides: [
        backendProvider.overrideWithValue(GalpaoBackend()),
        pushServiceProvider.overrideWithValue(NoopPushService()),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => DateTime.utc(2026, 10, 24, 22)),
      ]));
      await settle(t);
      expect(find.text('Fechado · abre seg. às 7h'), findsOneWidget);
    });

    testWidgets('link antigo de scan volta para a home', (t) async {
      phone(t);
      await pumpApp(t, GalpaoBackend(), initial: '/scan');
      expect(find.text('Escolher moto'), findsOneWidget);
    });
  });

  group('escolher moto', () {
    testWidgets('lista do galpao sem distancia, com preco e categoria do modelo; continuar abre a pre-reserva', (t) async {
      phone(t);
      await pumpApp(t, GalpaoBackend(), initial: '/pick');
      expect(find.text('Escolha sua moto'), findsOneWidget);
      expect(find.text('VLT-001'), findsOneWidget);
      expect(find.text('Esportiva compacta'), findsOneWidget);
      expect(find.text('R\$ 0,79/min'), findsWidgets);
      expect(find.text('R\$ 0,99/min'), findsOneWidget);
      expect(find.textContaining(' m · '), findsNothing);
      expect(find.text('Volti Urbana · VLT-001'), findsOneWidget);
      await t.tap(find.byKey(const Key('pick-card-v2')));
      await t.pump();
      expect(find.text('Volti Sport · VLT-002'), findsOneWidget);
      await tapText(t, 'Volti Sport · VLT-002');
      expect(find.byType(PickupScreen), findsOneWidget);
      expect(t.widget<Text>(find.byKey(const Key('pickup-vehicle'))).data, 'Volti Sport · VLT-002');
    });
  });

  group('escolher moto: bloqueios e estados', () {
    testWidgets('KYC em analise: lista aparece, continuar desligado com o motivo', (t) async {
      phone(t);
      await pumpApp(t, GalpaoBackend(), initial: '/pick', kyc: KycStatus.pending);
      expect(find.text('VLT-001'), findsOneWidget);
      expect(find.text('Verificação em análise'), findsOneWidget);
      expect(t.widget<VoltiButton>(find.byKey(const Key('pick-continue'))).onPressed, isNull);
    });

    testWidgets('reserva ativa bloqueia com o motivo', (t) async {
      phone(t);
      final b = GalpaoBackend();
      await b.createDepotReservation(ReservationCreate((r) => r
        ..vehicleId = 'v9'
        ..depotId = 'dep1'
        ..pickupMode = PickupMode.now));
      await pumpApp(t, b, initial: '/pick');
      expect(find.text('Você já tem uma reserva ativa.'), findsOneWidget);
      expect(t.widget<VoltiButton>(find.byKey(const Key('pick-continue'))).onPressed, isNull);
    });

    testWidgets('galpao sem motos: estado vazio com tentar de novo', (t) async {
      phone(t);
      final b = GalpaoBackend(vehicles: {'dep1': []});
      await pumpApp(t, b, initial: '/pick');
      expect(find.text('Nenhuma moto no galpão agora'), findsOneWidget);
      final calls = b.vehicleCalls;
      await tapText(t, 'Tentar de novo');
      expect(b.vehicleCalls, calls + 1);
    });

    testWidgets('filtro por modelo', (t) async {
      phone(t);
      await pumpApp(t, GalpaoBackend(), initial: '/pick');
      await t.tap(find.widgetWithText(VoltiChip, 'Volti Sport'));
      await settle(t);
      expect(find.text('VLT-001'), findsNothing);
      expect(find.text('Volti Sport · VLT-002'), findsOneWidget);
    });
  });

  group('retirada', () {
    testWidgets('agendar so oferece horarios do galpao e o domingo aparece fechado', (t) async {
      phone(t);
      await pumpApp(t, GalpaoBackend(), initial: '/pickup', extra: selection());
      expect(find.text('Retirar agora'), findsOneWidget);
      expect(find.text('Até 12:00'), findsOneWidget);
      await tapText(t, 'Agendar');
      expect(find.text('dom. 25/10 · Fechado'), findsOneWidget);
      // Hoje (10:00): primeiro horario 10:30, ultimo 19:30.
      expect(find.text('10:30'), findsOneWidget);
      expect(find.text('19:30'), findsOneWidget);
      expect(find.text('10:00'), findsNothing);
      expect(find.text('20:00'), findsNothing);
      // Domingo nao seleciona.
      await t.ensureVisible(find.text('dom. 25/10 · Fechado'));
      await t.tap(find.text('dom. 25/10 · Fechado'));
      await t.pump();
      expect(find.text('10:30'), findsOneWidget);
      // Sabado: 08:00 a 17:30.
      await tapText(t, 'sáb. 24/10');
      expect(find.text('08:00'), findsOneWidget);
      expect(find.text('17:30'), findsOneWidget);
      expect(find.text('18:00'), findsNothing);
    });

    testWidgets('pre-reservar agendado envia so galpao, moto e horario e abre a pre-reserva com QR', (t) async {
      phone(t);
      final b = GalpaoBackend();
      await pumpApp(t, b, initial: '/pickup', extra: selection());
      await tapText(t, 'Agendar');
      await tapText(t, 'sáb. 24/10');
      await tapText(t, '09:00');
      await tapText(t, 'Pré-reservar');
      final s = b.sent!;
      expect(s.vehicleId, 'v1');
      expect(s.depotId, 'dep1');
      expect(s.pickupMode, PickupMode.scheduled);
      expect(s.pickupAt, DateTime.utc(2026, 10, 24, 12));
      expect(s.planCode, isNull);
      expect(s.coverage, isNull);
      expect(s.depositMethod, isNull);
      expect(s.cardId, isNull);
      expect(find.byType(DepotReservationScreen), findsOneWidget);
      expect(find.text('Pré-reserva confirmada'), findsOneWidget);
      final qr = t.widget<QrImageView>(find.byType(QrImageView));
      expect(qr, isNotNull);
      expect(find.byKey(const Key('reservation-qr')), findsOneWidget);
    });

    testWidgets('"Pré-reservar": haptica leve e check de sucesso no botao antes de abrir a pre-reserva', (t) async {
      phone(t);
      final haptics = <VoltiHapticKind>[];
      VoltiHaptics.debugHandler = (k) async => haptics.add(k);
      addTearDown(() => VoltiHaptics.debugHandler = null);
      final b = GalpaoBackend();
      await pumpApp(t, b, initial: '/pickup', extra: selection());
      final confirm = find.byKey(const Key('pickup-pre-reserve'));
      await t.ensureVisible(confirm);
      await t.pump();
      await t.tap(confirm);
      await t.pump();
      await t.pump();
      expect(haptics.first, VoltiHapticKind.tap);
      expect(haptics, contains(VoltiHapticKind.success));
      expect(find.descendant(of: confirm, matching: find.byType(VoltiSuccessCheck)), findsOneWidget);
      expect(find.byType(DepotReservationScreen), findsNothing);
      await settle(t);
      expect(find.byType(DepotReservationScreen), findsOneWidget);
    });

    testWidgets('409 na confirmacao: "Essa moto acabou de ser reservada" e volta a lista', (t) async {
      phone(t);
      final b = GalpaoBackend()..createError = conflict('vehicle-unavailable');
      final router = await pumpApp(t, b, initial: '/pickup', extra: selection());
      await tapText(t, 'Pré-reservar');
      expect(find.text('Essa moto acabou de ser reservada'), findsOneWidget);
      expect(router.state.uri.path, '/pick');
    });
  });

  group('reserva confirmada', () {
    Reservation reservation({ReservationStatus status = ReservationStatus.active}) => Reservation((b) => b
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

    testWidgets('QR, endereco, prazo, Como chegar sob demanda e cancelar volta a home', (t) async {
      phone(t);
      final b = GalpaoBackend()..current = reservation();
      final router = await pumpApp(t, b, initial: '/reservation/res1');
      expect(find.byKey(const Key('reservation-qr')), findsOneWidget);
      expect(find.text('R. dos Pinheiros, 1000'), findsOneWidget);
      expect(find.text('Retire até 12:00'), findsOneWidget);
      expect(opened, isEmpty);
      await tapText(t, 'Como chegar');
      expect(opened, isNotEmpty);
      await tapText(t, 'Cancelar (grátis)');
      // Confirmacao no dialogo.
      await t.tap(find.byKey(const Key('reservation-cancel-confirm')));
      await settle(t);
      expect(b.cancels, 1);
      expect(router.state.uri.path, '/home');
      expect(find.text('Reserva cancelada'), findsOneWidget);
    });

    testWidgets('em entrega: sem cancelar e com o aviso', (t) async {
      phone(t);
      final b = GalpaoBackend()..current = reservation(status: ReservationStatus.handover);
      await pumpApp(t, b, initial: '/reservation/res1');
      expect(find.text('Cancelar (grátis)'), findsNothing);
      expect(find.text('Sua moto está sendo preparada no galpão.'), findsOneWidget);
    });

    testWidgets('409 reservation-in-handover ao cancelar mostra o aviso', (t) async {
      phone(t);
      final b = GalpaoBackend()
        ..current = reservation()
        ..cancelError = conflict('reservation-in-handover');
      await pumpApp(t, b, initial: '/reservation/res1');
      await tapText(t, 'Cancelar (grátis)');
      await t.tap(find.byKey(const Key('reservation-cancel-confirm')));
      await settle(t);
      expect(find.text('Sua moto está sendo preparada no galpão.'), findsWidgets);
    });

    testWidgets('home com reserva ativa leva a reserva', (t) async {
      phone(t);
      final b = GalpaoBackend()..current = reservation();
      final router = await pumpApp(t, b);
      await tapText(t, 'Ver QR da reserva');
      expect(router.state.uri.path, '/reservation/res1');
    });
  });

  group('acessibilidade', () {
    final screens = <String, (String, Object?)>{
      'home': ('/home', null),
      'lista': ('/pick', null),
      'retirada': ('/pickup', selection()),
      'reserva': ('/reservation/res1', null),
    };
    for (final e in screens.entries) {
      testWidgets('${e.key}: texto a 200% em 360x740 sem estouro', (t) async {
        phone(t, scale: 2, size: const Size(360, 740));
        final b = GalpaoBackend();
        if (e.key == 'reserva') {
          await b.createDepotReservation(ReservationCreate((r) => r
            ..vehicleId = 'v1'
            ..depotId = 'dep1'
            ..pickupMode = PickupMode.now));
        }
        await pumpApp(t, b, initial: e.value.$1, extra: e.value.$2);
        await settle(t);
        if (e.key == 'retirada') {
          await tapText(t, 'Agendar');
        }
        expect(t.takeException(), isNull);
      });
    }

    testWidgets('reduzir movimento: lista -> pre-reserva sem voo de Hero e sem animacao pendente', (t) async {
      phone(t);
      await pumpApp(t, GalpaoBackend(), initial: '/pick', reduceMotion: true);
      await t.tap(find.text('Volti Urbana · VLT-001'));
      await t.pump();
      await t.pump();
      // Os precos de referencia e o galpao recarregam em poucos quadros; animacao repetindo nunca para.
      for (var i = 0; i < 5 && t.binding.hasScheduledFrame; i++) {
        await t.pump();
      }
      expect(find.byType(PickupScreen), findsOneWidget);
      // Sem voo: nenhum Hero em voo no overlay e nada agendado depois dos dados.
      final heroModes = t.widgetList<HeroMode>(find.byType(HeroMode));
      expect(heroModes.every((h) => !h.enabled), isTrue);
      expect(t.binding.hasScheduledFrame, isFalse);
    });
  });

  group('fix round 1', () {
    testWidgets('/scan com ?swap= tambem volta para a home', (t) async {
      phone(t);
      final router = await pumpApp(t, GalpaoBackend(), initial: '/scan?swap=r1');
      expect(router.state.uri.path, '/home');
    });

    testWidgets('falha ao salvar o consentimento: toast com o motivo e nada reservado', (t) async {
      phone(t);
      final b = GalpaoBackend();
      await pumpApp(t, b, initial: '/pickup', extra: selection(), sessionFactory: _FailingConsentSession.new);
      await tapText(t, 'Pré-reservar');
      await tapText(t, 'Permitir e continuar');
      expect(find.text('Não deu para salvar o consentimento.'), findsOneWidget);
      expect(b.creates, 0);
    });

    testWidgets('reserva sem pickupCode: aviso e tentar de novo', (t) async {
      phone(t);
      final b = GalpaoBackend();
      await b.createDepotReservation(ReservationCreate((r) => r
        ..vehicleId = 'v1'
        ..depotId = 'dep1'
        ..pickupMode = PickupMode.now));
      b.stripCodeOnGet = true;
      await pumpApp(t, b, initial: '/reservation/res1');
      expect(find.byKey(const Key('reservation-no-code')), findsOneWidget);
      expect(find.byType(QrImageView), findsNothing);
      final calls = b.currentCalls;
      b.stripCodeOnGet = false;
      await tapText(t, 'Tentar de novo');
      expect(b.currentCalls, greaterThan(calls));
      expect(find.byType(QrImageView), findsOneWidget);
    });

    testWidgets('a resposta da criacao semeia o QR mesmo com o GET sem pickupCode', (t) async {
      phone(t);
      final b = GalpaoBackend()..stripCodeOnGet = true;
      await pumpApp(t, b, initial: '/pickup', extra: selection());
      await tapText(t, 'Pré-reservar');
      expect(find.byType(DepotReservationScreen), findsOneWidget);
      expect(find.byType(QrImageView), findsOneWidget);
      expect(find.byKey(const Key('reservation-no-code')), findsNothing);
    });

    testWidgets('retirada atualiza "Até HH:MM" a cada minuto', (t) async {
      phone(t);
      var now = thu10;
      await pumpApp(t, GalpaoBackend(), initial: '/pickup', extra: selection(), clock: () => now);
      expect(find.text('Até 12:00'), findsOneWidget);
      now = now.add(const Duration(minutes: 1));
      await t.pump(const Duration(seconds: 61));
      expect(find.text('Até 12:01'), findsOneWidget);
    });

    testWidgets('lista: erro com tentar de novo recarrega', (t) async {
      phone(t);
      final b = GalpaoBackend()..vehiclesError = Exception('rede');
      await pumpApp(t, b, initial: '/pick');
      expect(find.text('Tentar de novo'), findsOneWidget);
      b.vehiclesError = null;
      await tapText(t, 'Tentar de novo');
      expect(find.text('VLT-001'), findsOneWidget);
    });

    testWidgets('lista vazia aceita puxar para atualizar', (t) async {
      phone(t);
      final b = GalpaoBackend(vehicles: {'dep1': []});
      await pumpApp(t, b, initial: '/pick');
      final calls = b.vehicleCalls;
      b.vehiclesByDepot['dep1'] = [bike('v1', 'VLT-001', 'Volti Urbana')];
      await t.fling(find.text('Nenhuma moto no galpão agora'), const Offset(0, 400), 1000);
      await settle(t);
      expect(b.vehicleCalls, calls + 1);
      expect(find.text('VLT-001'), findsOneWidget);
    });

    testWidgets('lista a 200% em 360x740 com o aviso de KYC', (t) async {
      phone(t, scale: 2, size: const Size(360, 740));
      await pumpApp(t, GalpaoBackend(), initial: '/pick', kyc: KycStatus.pending);
      expect(find.text('Verificação em análise'), findsOneWidget);
      expect(t.takeException(), isNull);
    });

    testWidgets('409 reservation-already-active na pre-reserva: aviso e volta a home', (t) async {
      phone(t);
      final b = GalpaoBackend()..createError = conflict('reservation-already-active');
      final router = await pumpApp(t, b, initial: '/pickup', extra: selection());
      await tapText(t, 'Pré-reservar');
      expect(find.text('Você já tem uma reserva ativa.'), findsOneWidget);
      expect(router.state.uri.path, '/home');
    });

    testWidgets('home a 200% em 360x740 com dois galpoes, reserva e KYC: nada se sobrepoe', (t) async {
      phone(t, scale: 2, size: const Size(360, 740));
      final b = GalpaoBackend(depots: [
        depotFixture(id: 'dep1', distanceM: 1200),
        depotFixture(id: 'far', name: 'Galpão Volti — Mooca', district: 'Mooca', count: 1, distanceM: 9000),
      ]);
      await b.createDepotReservation(ReservationCreate((r) => r
        ..vehicleId = 'v1'
        ..depotId = 'dep1'
        ..pickupMode = PickupMode.now));
      await pumpApp(t, b, kyc: KycStatus.pending);
      expect(t.takeException(), isNull);
      expect(find.text('Ver QR da reserva'), findsOneWidget);
      expect(find.text('Verificação em análise'), findsOneWidget);
      final card = t.getRect(find.byKey(const Key('home-reservation-card')));
      final top = t.getRect(find.byKey(const Key('home-top')));
      expect(top.bottom, lessThanOrEqualTo(card.top), reason: 'cabecalho e avisos acima do cartao da reserva');
      expect(card.bottom, lessThanOrEqualTo(740));
      expect(top.top, greaterThanOrEqualTo(0));
    });
  });
}

class _FailingConsentSession extends FakeSession {
  _FailingConsentSession() : super(session(location: false));
  @override
  Future<void> saveConsents({required bool terms, required bool location, bool marketing = false}) async =>
      throw AppFailure(kind: FailureKind.api, status: 500, detail: 'Não deu para salvar o consentimento.');
}
