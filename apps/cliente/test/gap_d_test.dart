import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show SemanticsNode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/connectivity.dart';
import 'package:volti_cliente/core/launcher.dart';
import 'package:volti_cliente/core/offline_banner.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/core/shared_vehicle.dart';
import 'package:volti_cliente/features/home/providers.dart';
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

  final swaps = <String>[];
  @override
  Future<Rental> swap(String id, String newVehicleId, String reason) async {
    swaps.add('$id:$newVehicleId');
    return sampleRental();
  }

  int starts = 0;
  @override
  Future<RentalStartResult> startRental(StartRentalRequest request, {String? idempotencyKey}) async {
    starts++;
    return RentalStartResult((b) => b
      ..outcome = RentalStartOutcome.started
      ..rental = sampleRental().toBuilder()
      ..deposit = Deposit((d) => d
        ..id = 'd1'
        ..customerId = 'c1'
        ..method = DepositMethod.pix
        ..status = DepositStatus.held
        ..amountCents = 15000
        ..createdAt = DateTime.utc(2026)
        ..updatedAt = DateTime.utc(2026)).toBuilder());
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
  int torch = 0, stops = 0, starts = 0;
  bool running = true;
  @override
  Future<void> stop() async {
    stops++;
    running = false;
  }

  @override
  Future<void> start() async {
    starts++;
    running = true;
  }

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

void main() {
  group('scan (S1-S6)', () {
    Future<(GapBackend, FakeCamera, GoRouter)> pumpScan(WidgetTester t, {String? expected, String? swap}) async {
      phone(t);
      final b = GapBackend();
      final cam = FakeCamera();
      final router = GoRouter(initialLocation: '/start', routes: [
        GoRoute(path: '/start', builder: (_, _) => const Scaffold(body: Text('inicio'))),
        GoRoute(path: '/home', builder: (_, _) => const Scaffold(body: Text('home'))),
        GoRoute(path: '/ride', builder: (_, _) => const Scaffold(body: Text('corrida'))),
        GoRoute(path: '/scan', builder: (_, _) => ScanScreen(expectedCode: expected, swapRentalId: swap)),
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

    testWidgets('troca de moto da corrida: digitar o numero troca e volta a corrida', (t) async {
      final (b, _, _) = await pumpScan(t, swap: 'r1');
      await t.tap(find.byKey(const Key('scan-mode')));
      await settle(t);
      await t.enterText(find.byKey(const Key('vehicle-code')), 'vlt-001');
      await t.tap(find.byKey(const Key('vehicle-code-submit')));
      await settle(t);
      expect(b.codes, ['vlt-001']);
      expect(b.swaps, ['r1:v1']);
      expect(find.text('corrida'), findsOneWidget);
    });

    testWidgets('sem troca o leitor nao aluga: QR lido volta ao inicio', (t) async {
      final (b, cam, _) = await pumpScan(t);
      cam.onCode!('https://volti.app/v/VLT-001');
      await settle(t);
      expect(b.codes, ['VLT-001']);
      expect(b.swaps, isEmpty);
      expect(find.text('home'), findsOneWidget);
    });

    testWidgets('vindo do mapa mostra a moto esperada com o Hero', (t) async {
      await pumpScan(t, expected: 'VT-4821');
      expect(find.text('Procurando VT-4821'), findsOneWidget);
      expect(find.byWidgetPredicate((w) => w is Hero && w.tag == vehicleHeroTag('VT-4821')), findsOneWidget);
    });
  });

  test('cupom pendente e limpo ao sair da conta', () async {
    final container = ProviderContainer(overrides: [
      sessionProvider.overrideWith(() => _SignOutSession(session())),
    ]);
    addTearDown(container.dispose);
    await container.read(sessionProvider.future);
    container.listen(pendingCouponProvider, (_, _) {});
    container.read(pendingCouponProvider.notifier).set('VOLTI10');
    expect(container.read(pendingCouponProvider), 'VOLTI10');
    await container.read(sessionProvider.notifier).signOut();
    await Future<void>.delayed(Duration.zero);
    expect(container.read(pendingCouponProvider), '');
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

  test('"Como chegar": links por plataforma, sempre com o Google Maps web por ultimo', () async {
    final android = directionsUris(-23.5, -46.6, platform: TargetPlatform.android);
    expect(android.first.toString(), 'google.navigation:q=-23.5,-46.6');
    expect(android.last.host, 'www.google.com');
    final ios = directionsUris(-23.5, -46.6, platform: TargetPlatform.iOS);
    expect(ios.first.host, 'maps.apple.com');
    final l = FakeLauncher(accept: false);
    expect(await openDirections(l.open, -23.5, -46.6, platform: TargetPlatform.android), isFalse);
    expect(l.opened, hasLength(2));
  });

  test('textos pt-BR das novas pecas existem', () async {
    final l = await AppLocalizations.delegate.load(const Locale('pt'));
    expect(l.offlineTitle, 'Sem conexão');
    expect(l.payAndUnlock, 'Confirmar e destravar');
    expect(l.planTitle, 'Escolha seu plano');
  });
}

class _SignOutSession extends FakeSession {
  _SignOutSession(super.initial);
  @override
  Future<void> signOut() async => state = const AsyncData(SessionState.signedOut());
}
