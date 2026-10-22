import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show SemanticsNode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/connectivity.dart';
import 'package:volti_cliente/core/flash.dart';
import 'package:volti_cliente/core/geo.dart';
import 'package:volti_cliente/core/launcher.dart';
import 'package:volti_cliente/core/offline_banner.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/core/shared_vehicle.dart';
import 'package:volti_cliente/features/home/home_screen.dart';
import 'package:volti_cliente/features/home/providers.dart';
import 'package:volti_cliente/features/home/vehicle_sheet.dart';
import 'package:volti_cliente/features/plan/plan_screen.dart';
import 'package:volti_cliente/features/reservation/reserved_screen.dart';
import 'package:volti_cliente/features/scan/scan_screen.dart';
import 'package:volti_cliente/l10n/app_localizations.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';

VehicleSummary bike({String id = 'v1', String code = 'VT-4821'}) => VehicleSummary((b) => b
  ..id = id
  ..code = code
  ..model = 'Volti Flash'
  ..status = VehicleStatus.free
  ..lat = -23.5620
  ..lng = -46.6559
  ..batteryPct = 90
  ..estimatedRangeKm = 20);

PricingPlan plan(PlanCode code, String name, PlanUnit unit, int cents) => PricingPlan((b) => b
  ..id = code.name
  ..code = code
  ..name = name
  ..unit = unit
  ..unlockFeeCents = 100
  ..unitPriceCents = cents
  ..pausePerMinuteCents = 20
  ..recurring = false
  ..active = true
  ..createdAt = DateTime.utc(2026)
  ..updatedAt = DateTime.utc(2026));

class GapBackend extends FakeBackend {
  GapBackend({this.reservation, this.vehicles = const []});
  Reservation? reservation;
  final List<VehicleSummary> vehicles;
  final rings = <String>[];
  final incidents = <(IncidentCategory, String, String?, String?)>[];
  final canceled = <String>[];
  final quotes = <(PlanCode, InsuranceCoverage, String?)>[];
  final codes = <String>[];

  @override
  Future<void> ring(String vehicleId) async => rings.add(vehicleId);
  @override
  Future<Incident> reportIncident(IncidentCategory category, String description, {String? rentalId, String? vehicleId}) async {
    incidents.add((category, description, rentalId, vehicleId));
    return Incident((b) => b
      ..id = 'i1'
      ..category = category
      ..description = description
      ..status = IncidentStatus.open
      ..createdAt = DateTime.utc(2026)
      ..updatedAt = DateTime.utc(2026));
  }

  @override
  Future<List<PricingPlan>> plans() async => [
        plan(PlanCode.minute, 'Por minuto', PlanUnit.minute, 79),
        plan(PlanCode.hour, 'Por hora', PlanUnit.hour, 2990),
      ];
  @override
  Future<List<InsuranceCoverageOption>> coverages() async => [
        InsuranceCoverageOption((b) => b
          ..coverage = InsuranceCoverage.basic
          ..name = 'Básico'
          ..description = 'Danos a terceiros'
          ..premiumCents = 150
          ..mandatory = true
          ..active = true),
        InsuranceCoverageOption((b) => b
          ..coverage = InsuranceCoverage.full
          ..name = 'Completo'
          ..description = 'Franquia zero'
          ..premiumCents = 490
          ..mandatory = false
          ..active = true),
      ];
  @override
  Future<Quote> quote(PlanCode plan, InsuranceCoverage coverage, {String? coupon}) async {
    quotes.add((plan, coverage, coupon));
    final applied = coupon == 'VOLTI10';
    final base = plan == PlanCode.hour ? 2990 : 79;
    return Quote((b) => b
      ..planCode = plan
      ..coverage = coverage
      ..depositCents = 15000
      ..couponApplied = applied
      ..breakdown = PriceBreakdown((p) => p
        ..subtotalCents = base
        ..discountCents = applied ? 1200 : 0
        ..insuranceCents = coverage == InsuranceCoverage.full ? 490 : 150
        ..feesCents = 100
        ..totalCents = base + 100).toBuilder());
  }

  @override
  Future<List<PaymentCard>> cards() async => [];
  @override
  Future<Wallet> wallet() async => Wallet((b) => b
    ..balanceCents = 0
    ..minutesBalance = 0
    ..updatedAt = DateTime.utc(2026));
  @override
  Future<Vehicle> vehicleByCode(String code) async {
    codes.add(code);
    return sampleVehicle();
  }

  @override
  Future<Reservation?> currentReservation() async => reservation;
  @override
  Future<void> cancelReservation(String id) async {
    canceled.add(id);
    reservation = null;
  }

  @override
  Future<Rental?> currentRental() async => null;
  @override
  Future<List<VehicleSummary>> nearby(double lat, double lng, {double? minRangeKm}) async => vehicles;
  @override
  Future<List<GeoZone>> zones() async => [];
}

class FakeLauncher {
  FakeLauncher({this.accept = true});
  final bool accept;
  final opened = <Uri>[];
  Future<bool> open(Uri uri) async {
    opened.add(uri);
    return accept;
  }
}

class FakeCamera implements ScanCamera {
  int torch = 0;
  ValueChanged<String>? onCode;
  @override
  Widget preview({required ValueChanged<String> onCode, required WidgetBuilder onError}) {
    this.onCode = onCode;
    return const ColoredBox(key: Key('fake-camera'), color: Colors.black);
  }

  @override
  Future<void> toggleTorch() async => torch++;
  @override
  Future<void> dispose() async {}
}

class FakeConnectivity implements ConnectivitySource {
  final c = StreamController<bool>.broadcast();
  @override
  Stream<bool> get changes => c.stream;
  @override
  Future<bool> isOnline() async => true;
}

/// Como pumpAndSettle, para telas com animacao em loop (linha do visor).
Future<void> settle(WidgetTester t) async {
  for (var i = 0; i < 8; i++) {
    await t.pump(const Duration(milliseconds: 250));
  }
}

void phone(WidgetTester t) {
  t.view.physicalSize = const Size(412, 915);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

Future<GapBackend> pumpSheet(
  WidgetTester t, {
  bool ringAllowed = false,
  bool reserveBlocked = false,
  FakeLauncher? launcher,
  VoidCallback? onScan,
  VoidCallback? onReserve,
}) async {
  phone(t);
  final b = GapBackend();
  await t.pumpWidget(testApp(
    Scaffold(
      body: Align(
        alignment: Alignment.bottomCenter,
        child: VehicleSheet(
          vehicle: bike(),
          ringAllowed: ringAllowed,
          reserveBlocked: reserveBlocked,
          onClose: () {},
          onScan: onScan ?? () {},
          onReserve: onReserve ?? () {},
        ),
      ),
    ),
    overrides: [
      backendProvider.overrideWithValue(b),
      sessionProvider.overrideWith(() => FakeSession(session())),
      urlLauncherProvider.overrideWithValue((launcher ?? FakeLauncher()).open),
    ],
  ));
  await t.pump();
  await t.pump(const Duration(seconds: 1));
  return b;
}

void main() {
  group('cartao da moto (H10-H15)', () {
    testWidgets('resumo, chips, cupom e o par Escanear QR + Reservar como no design', (t) async {
      await pumpSheet(t);
      expect(find.text('Moto elétrica'), findsOneWidget);
      expect(find.text('Volti Flash'), findsOneWidget);
      expect(find.text('R\$ 0,79/min + taxa'), findsOneWidget);
      for (final s in ['Buzinar e piscar', 'Navegar', 'Reportar problema', 'Cupom promocional', 'Escanear QR', 'Reservar']) {
        expect(find.text(s), findsOneWidget, reason: s);
      }
      expect(find.byType(Hero), findsOneWidget, reason: 'midia compartilhada com scan e plano');
      expect(t.takeException(), isNull);
    });

    testWidgets('buzina desligada sem reserva: mostra o motivo e nao chama a API', (t) async {
      final b = await pumpSheet(t);
      final chip = t.widget<VoltiChip>(find.byKey(const Key('sheet-horn')));
      expect(chip.onTap, isNull);
      expect(t.widget<Tooltip>(find.byKey(const Key('sheet-horn-reason'))).message, 'Reserve a moto para buzinar e piscar.');
      await t.tap(find.byKey(const Key('sheet-horn')));
      await t.pump(const Duration(milliseconds: 300));
      expect(find.text('Reserve a moto para buzinar e piscar.'), findsOneWidget);
      expect(b.rings, isEmpty);
      await t.pump(const Duration(seconds: 3));
    });

    testWidgets('buzina na moto reservada chama POST /ring', (t) async {
      final b = await pumpSheet(t, ringAllowed: true);
      await t.tap(find.byKey(const Key('sheet-horn')));
      await t.pump();
      expect(b.rings, ['v1']);
      expect(find.text('Sinal enviado. Procure a moto piscando.'), findsOneWidget);
      await t.pump(const Duration(seconds: 5));
    });

    testWidgets('Navegar abre a rota a pe no app de mapas (so o destino sai do app)', (t) async {
      final launcher = FakeLauncher();
      await pumpSheet(t, launcher: launcher);
      await t.tap(find.byKey(const Key('sheet-navigate')));
      await t.pump();
      expect(launcher.opened, hasLength(1));
      final uri = launcher.opened.single.toString();
      expect(uri, contains('-23.562'));
      expect(uri, contains('-46.6559'));
      expect(uri, anyOf(contains('mode=w'), contains('walking'), contains('dirflg=w')));
    });

    test('links da rota a pe por plataforma, sempre com o Google Maps web por ultimo', () {
      final android = walkingRouteUris(1.5, 2.5, platform: TargetPlatform.android);
      expect(android.first.toString(), 'google.navigation:q=1.5,2.5&mode=w');
      final ios = walkingRouteUris(1.5, 2.5, platform: TargetPlatform.iOS);
      expect(ios.first.host, 'maps.apple.com');
      expect(ios.first.queryParameters['dirflg'], 'w');
      expect(android.last.queryParameters['travelmode'], 'walking');
    });

    testWidgets('Navegar sem app de mapas avisa', (t) async {
      await pumpSheet(t, launcher: FakeLauncher(accept: false));
      await t.tap(find.byKey(const Key('sheet-navigate')));
      await t.pump();
      expect(find.text('Não foi possível abrir o app de mapas.'), findsOneWidget);
      await t.pump(const Duration(seconds: 5));
    });

    testWidgets('Reportar problema antes de alugar manda so o vehicleId', (t) async {
      final b = await pumpSheet(t);
      await t.ensureVisible(find.byKey(const Key('sheet-report')));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const Key('sheet-report')));
      await t.pumpAndSettle();
      await t.tap(find.text('Freio'));
      await t.pumpAndSettle();
      expect(b.incidents.single.$1, IncidentCategory.vehicleProblem);
      expect(b.incidents.single.$3, isNull, reason: 'sem aluguel');
      expect(b.incidents.single.$4, 'v1');
      expect(find.text('Recebemos o seu relato. Obrigado por avisar.'), findsOneWidget);
      await t.pump(const Duration(seconds: 5));
    });

    testWidgets('Cupom promocional guarda o codigo para o plano', (t) async {
      await pumpSheet(t);
      await t.tap(find.byKey(const Key('sheet-coupon')));
      await t.pumpAndSettle();
      await t.enterText(find.byKey(const Key('coupon-field')), 'volti10');
      await t.tap(find.text('Guardar cupom'));
      await t.pumpAndSettle();
      final container = ProviderScope.containerOf(t.element(find.byType(VehicleSheet)));
      expect(container.read(pendingCouponProvider), 'VOLTI10');
      expect(find.text('VOLTI10'), findsOneWidget, reason: 'a linha mostra o cupom guardado');
      await t.pump(const Duration(seconds: 5));
    });

    testWidgets('Escanear QR e Reservar chamam as acoes; reservar bloqueado fica desligado', (t) async {
      var scans = 0, reserves = 0;
      await pumpSheet(t, onScan: () => scans++, onReserve: () => reserves++);
      await t.tap(find.byKey(const Key('sheet-scan')));
      await t.tap(find.byKey(const Key('sheet-reserve')));
      expect((scans, reserves), (1, 1));

      await pumpSheet(t, reserveBlocked: true);
      expect(t.widget<VoltiButton>(find.byKey(const Key('sheet-reserve'))).onPressed, isNull);
    });

    testWidgets('mapa: com o cartao aberto o CTA "Escanear para andar" sai (H7)', (t) async {
      phone(t);
      final b = GapBackend(vehicles: [bike()]);
      await t.pumpWidget(testApp(const HomeScreen(initialSelectedId: 'v1'), overrides: [
        backendProvider.overrideWithValue(b),
        pushServiceProvider.overrideWithValue(NoopPushService()),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
      ]));
      await t.pump();
      await t.pump(const Duration(seconds: 1));
      expect(find.byType(VehicleSheet), findsOneWidget);
      expect(find.byKey(const Key('home-scan-cta')), findsNothing);
      expect(find.text('Escolher moto'), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('mapa mostra o toast deixado por outra tela uma vez (H8)', (t) async {
      phone(t);
      final container = ProviderContainer(overrides: [
        backendProvider.overrideWithValue(GapBackend()),
        pushServiceProvider.overrideWithValue(NoopPushService()),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
      ]);
      addTearDown(container.dispose);
      container.read(flashProvider.notifier).show('Reserva cancelada');
      await t.pumpWidget(UncontrolledProviderScope(container: container, child: testApp(const HomeScreen())));
      await t.pump();
      await t.pump(const Duration(milliseconds: 400));
      expect(find.text('Reserva cancelada'), findsOneWidget);
      expect(container.read(flashProvider), isNull, reason: 'consumido');
      await t.pump(const Duration(seconds: 5));
      await t.pumpWidget(const SizedBox());
    });
  });

  group('reserva (R1-R6)', () {
    final t0 = DateTime.utc(2026, 10, 22, 12);
    Reservation reservation() => Reservation((b) => b
      ..id = 'res1'
      ..vehicleId = 'v1'
      ..vehicle = bike().toBuilder()
      ..status = ReservationStatus.active
      ..createdAt = t0
      ..expiresAt = t0.add(const Duration(minutes: 15)));

    testWidgets('mapa full-bleed, cabecalho, localizar, contagem que anda e Escanear QR', (t) async {
      phone(t);
      var now = t0;
      final b = GapBackend(reservation: reservation());
      await t.pumpWidget(testApp(const ReservedScreen(), overrides: [
        backendProvider.overrideWithValue(b),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => now),
      ]));
      await t.pump();
      await t.pump(const Duration(milliseconds: 100));
      expect(find.byKey(const Key('reserved-map')), findsOneWidget);
      expect(find.byKey(const Key('home-avatar')), findsOneWidget, reason: 'LocationHeader no topo');
      expect(find.byKey(const Key('reserved-locate')), findsOneWidget);
      expect(find.text('Escanear QR'), findsOneWidget);
      expect(find.textContaining('15 : 00'), findsOneWidget);

      now = t0.add(const Duration(minutes: 1, seconds: 1));
      await t.pump(const Duration(seconds: 1));
      expect(find.textContaining('13 : 59'), findsOneWidget);
      expect(t.takeException(), isNull);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('deslizar para cancelar cancela, volta ao mapa e deixa o toast', (t) async {
      phone(t);
      final b = GapBackend(reservation: reservation());
      late ProviderContainer container;
      final router = GoRouter(initialLocation: '/reserved', routes: [
        GoRoute(path: '/reserved', builder: (_, _) => const ReservedScreen()),
        GoRoute(
          path: '/home',
          builder: (context, _) {
            container = ProviderScope.containerOf(context);
            return const Scaffold(body: Text('mapa'));
          },
        ),
      ]);
      await t.pumpWidget(testRouterApp(router, overrides: [
        backendProvider.overrideWithValue(b),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => t0),
      ]));
      await t.pump();
      await t.pump(const Duration(milliseconds: 100));
      await t.drag(find.byKey(const Key('swipe-knob')), const Offset(400, 0));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(b.canceled, ['res1']);
      expect(find.text('mapa'), findsOneWidget);
      expect(container.read(flashProvider)?.text, 'Reserva cancelada');
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('expirada: aviso e o botao leva ao mapa', (t) async {
      phone(t);
      await t.pumpWidget(testApp(const ReservedScreen(), overrides: [
        backendProvider.overrideWithValue(GapBackend(reservation: reservation())),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => t0.add(const Duration(minutes: 16))),
      ]));
      await t.pump();
      await t.pump(const Duration(milliseconds: 100));
      expect(find.text('Reserva expirada'), findsOneWidget);
      expect(find.byKey(const Key('swipe-knob')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });
  });

  group('scan (S1-S6)', () {
    Future<(GapBackend, FakeCamera, GoRouter)> pumpScan(WidgetTester t, {String? expected}) async {
      phone(t);
      final b = GapBackend();
      final cam = FakeCamera();
      final router = GoRouter(initialLocation: '/start', routes: [
        GoRoute(path: '/start', builder: (_, _) => const Scaffold(body: Text('inicio'))),
        GoRoute(path: '/scan', builder: (_, _) => ScanScreen(expectedCode: expected)),
        GoRoute(path: '/plan', builder: (_, s) => Scaffold(body: Text('plano ${(s.extra! as Vehicle).code}'))),
      ]);
      await t.pumpWidget(testRouterApp(router, overrides: [
        backendProvider.overrideWithValue(b),
        scanCameraFactoryProvider.overrideWithValue(() => cam),
      ]));
      router.push('/scan');
      await settle(t);
      return (b, cam, router);
    }

    testWidgets('tela escura com visor, titulo e subtitulo do design', (t) async {
      await pumpScan(t);
      expect(t.widget<Scaffold>(find.byType(Scaffold).last).backgroundColor, scanBackground);
      expect(find.text('Escanear QR'), findsOneWidget);
      expect(find.text('Aponte para o QR no guidão'), findsOneWidget);
      expect(find.text('Ou digite o número da moto.'), findsOneWidget);
      expect(find.text('Digitar número da moto'), findsOneWidget);
      expect(t.getSize(find.byKey(const Key('fake-camera'))), const Size(250, 250));
      final corner = t.widget<Container>(find.byKey(const Key('scan-corner-tl')));
      expect(((corner.decoration! as BoxDecoration).border! as Border).top.color, VoltiColors.green400);
      expect(t.takeException(), isNull);
    });

    testWidgets('lanterna liga e desliga e anuncia o estado', (t) async {
      final (_, cam, _) = await pumpScan(t);
      SemanticsNode torch() => t.getSemantics(find.byKey(const Key('scan-torch')));
      expect(torch(), isSemantics(hasToggledState: true, isToggled: false));
      await t.tap(find.byKey(const Key('scan-torch')));
      await t.pump();
      expect(cam.torch, 1);
      expect(torch(), isSemantics(hasToggledState: true, isToggled: true));
      await t.tap(find.byKey(const Key('scan-torch')));
      await t.pump();
      expect(cam.torch, 2);
      expect(torch(), isSemantics(hasToggledState: true, isToggled: false));
    });

    testWidgets('digitar o numero acha a moto e abre o plano', (t) async {
      final (b, _, _) = await pumpScan(t);
      await t.tap(find.byKey(const Key('scan-mode')));
      await settle(t);
      await t.enterText(find.byKey(const Key('vehicle-code')), 'vlt-001');
      await t.tap(find.byKey(const Key('vehicle-code-submit')));
      await settle(t);
      expect(b.codes, ['vlt-001']);
      expect(find.text('plano VLT-001'), findsOneWidget);
    });

    testWidgets('QR lido mostra "Moto X encontrada" antes do plano', (t) async {
      final (_, cam, _) = await pumpScan(t);
      cam.onCode!('https://volti.app/v/VLT-001');
      await t.pump();
      await t.pump();
      expect(find.text('Moto VLT-001 encontrada'), findsWidgets);
      await settle(t);
      expect(find.text('plano VLT-001'), findsOneWidget);
    });

    testWidgets('vindo do mapa mostra a moto esperada com o Hero', (t) async {
      await pumpScan(t, expected: 'VT-4821');
      expect(find.text('Procurando VT-4821'), findsOneWidget);
      expect(find.byWidgetPredicate((w) => w is Hero && w.tag == vehicleHeroTag('VT-4821')), findsOneWidget);
    });
  });

  group('plano (P1-P7)', () {
    Future<GapBackend> pumpPlan(WidgetTester t, {String coupon = ''}) async {
      tallScreen(t);
      final b = GapBackend();
      await t.pumpWidget(testApp(PlanScreen(vehicle: sampleVehicle()), overrides: [
        backendProvider.overrideWithValue(b),
        sessionProvider.overrideWith(() => FakeSession(session())),
        if (coupon.isNotEmpty) pendingCouponProvider.overrideWith(() => _Coupon(coupon)),
      ]));
      await t.pumpAndSettle();
      return b;
    }

    testWidgets('cabecalho, notas curtas, seguro com icone e /aluguel, CTA do design', (t) async {
      await pumpPlan(t);
      expect(find.text('Escolha seu plano'), findsOneWidget);
      expect(find.text('VLT-001 · Volti One · 80%'), findsOneWidget);
      expect(find.text('/min'), findsOneWidget);
      expect(find.text('/hora'), findsOneWidget);
      expect(find.text('/aluguel'), findsNWidgets(2));
      expect(find.text('Cupom ou crédito'), findsOneWidget);
      expect(find.widgetWithText(VoltiButton, 'Confirmar e destravar'), findsOneWidget);
      expect(find.byWidgetPredicate((w) => w is Hero && w.tag == vehicleHeroTag('VLT-001')), findsOneWidget);
    });

    testWidgets('escolher outro plano recota com ele', (t) async {
      final b = await pumpPlan(t);
      expect(b.quotes.last.$1, PlanCode.minute);
      await t.tap(find.text('Por hora'));
      await t.pumpAndSettle();
      expect(b.quotes.last.$1, PlanCode.hour);
      final selected = t.widget<OptionCard>(find.widgetWithText(OptionCard, 'Por hora'));
      expect(selected.selected, isTrue);
    });

    testWidgets('cupom guardado no mapa ja entra na primeira cotacao e aparece na linha', (t) async {
      final b = await pumpPlan(t, coupon: 'VOLTI10');
      expect(b.quotes.first.$3, 'VOLTI10');
      expect(find.text(money(1200)), findsWidgets, reason: 'valor do desconto na linha "Cupom ou crédito"');
    });

    testWidgets('Cupom ou credito abre o sheet e aplica o codigo', (t) async {
      final b = await pumpPlan(t);
      await t.tap(find.byKey(const Key('plan-coupon')));
      await t.pumpAndSettle();
      await t.enterText(find.byKey(const Key('plan-coupon-field')), 'volti10');
      await t.tap(find.byKey(const Key('plan-coupon-apply')));
      await t.pumpAndSettle();
      expect(b.quotes.last.$3, 'VOLTI10');
    });

    testWidgets('caucao: escolhe Pix', (t) async {
      await pumpPlan(t);
      await t.tap(find.text('Pix'));
      await t.pumpAndSettle();
      expect(t.widget<OptionCard>(find.widgetWithText(OptionCard, 'Pix')).selected, isTrue);
      expect(t.widget<VoltiButton>(find.byKey(const Key('plan-confirm'))).onPressed, isNotNull,
          reason: 'Pix nao exige cartao cadastrado');
    });
  });

  group('faixa sem conexao (E-17)', () {
    testWidgets('aparece quando a rede cai, anuncia e some quando volta', (t) async {
      phone(t);
      final semantics = t.ensureSemantics();
      final src = FakeConnectivity();
      await t.pumpWidget(testApp(const OfflineBanner(child: Scaffold(body: Text('tela'))), overrides: [
        connectivitySourceProvider.overrideWithValue(src),
      ]));
      await t.pump();
      expect(find.text('Sem conexão'), findsNothing);

      src.c.add(false);
      await t.pump();
      await t.pump(const Duration(milliseconds: 400));
      expect(find.text('Sem conexão'), findsOneWidget);
      final sem = t.getSemantics(find.bySemanticsLabel(RegExp('Sem conexão')));
      expect(sem, isSemantics(isLiveRegion: true));
      expect(sem.label, contains('Tentando reconectar'));

      src.c.add(true);
      await t.pump();
      await t.pump(const Duration(milliseconds: 400));
      expect(find.text('Sem conexão'), findsNothing);
      semantics.dispose();
    });

    testWidgets('reduced motion: troca sem animacao', (t) async {
      phone(t);
      final src = FakeConnectivity();
      await t.pumpWidget(testApp(
        const MediaQuery(data: MediaQueryData(disableAnimations: true), child: OfflineBanner(child: SizedBox())),
        overrides: [connectivitySourceProvider.overrideWithValue(src)],
      ));
      await t.pump();
      src.c.add(false);
      await t.pump();
      await t.pump();
      expect(find.text('Sem conexão'), findsOneWidget);
      expect(t.hasRunningAnimations, isFalse);
    });
  });

  group('transicao compartilhada (E-15)', () {
    Widget host(GlobalKey target, {bool reduced = false}) => MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(disableAnimations: reduced),
            child: Scaffold(
              body: Stack(children: [
                Positioned(left: 200, top: 600, child: SizedBox(key: target, width: 132, height: 132)),
              ]),
            ),
          ),
        );

    testWidgets('voo do pin ao cartao: entra, segue o destino e sai ao terminar', (t) async {
      final target = GlobalKey();
      final hide = ValueNotifier(false);
      await t.pumpWidget(host(target));
      SharedFlight.run(t.element(find.byType(Scaffold)), from: const Rect.fromLTWH(50, 100, 56, 64), to: target, hide: hide);
      await t.pump();
      await t.pump(const Duration(milliseconds: 200));
      expect(find.byKey(const Key('shared-flight')), findsOneWidget);
      expect(hide.value, isTrue);
      await t.pump(const Duration(milliseconds: 400));
      expect(find.byKey(const Key('shared-flight')), findsNothing);
      expect(hide.value, isFalse);
    });

    testWidgets('reduced motion: sem voo', (t) async {
      final target = GlobalKey();
      final hide = ValueNotifier(false);
      await t.pumpWidget(host(target, reduced: true));
      final entry = SharedFlight.run(t.element(find.byType(Scaffold)), from: Rect.zero, to: target, hide: hide);
      await t.pump();
      expect(entry, isNull);
      expect(find.byKey(const Key('shared-flight')), findsNothing);
    });

    testWidgets('Hero da moto desligado em reduced motion', (t) async {
      await t.pumpWidget(const MaterialApp(
        home: MediaQuery(data: MediaQueryData(disableAnimations: true), child: VehicleHero(code: 'X', child: SizedBox())),
      ));
      expect(t.widget<HeroMode>(find.byType(HeroMode)).enabled, isFalse);
    });
  });

  test('textos pt-BR das novas pecas existem', () async {
    final l = await AppLocalizations.delegate.load(const Locale('pt'));
    expect(l.offlineTitle, 'Sem conexão');
    expect(l.payAndUnlock, 'Confirmar e destravar');
    expect(l.planTitle, 'Escolha seu plano');
  });
}

class _Coupon extends PendingCouponNotifier {
  _Coupon(this.code);
  final String code;
  @override
  String build() => code;
}
