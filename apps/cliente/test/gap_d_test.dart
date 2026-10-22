import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/connectivity.dart';
import 'package:volti_cliente/core/launcher.dart';
import 'package:volti_cliente/core/offline_banner.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/core/shared_vehicle.dart';
import 'package:volti_cliente/features/home/providers.dart';
import 'package:volti_cliente/l10n/app_localizations.dart';

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
  Future<Quote> quote(PlanCode plan, InsuranceCoverage coverage, {String? coupon, String? vehicleId}) async {
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
    testWidgets('Hero da moto desligado em reduced motion', (t) async {
      await t.pumpWidget(const MaterialApp(
        home: MediaQuery(data: MediaQueryData(disableAnimations: true), child: VehicleHero(code: 'X', child: SizedBox())),
      ));
      expect(t.widget<HeroMode>(find.byType(HeroMode)).enabled, isFalse);
    });
  });

  test('"Como chegar": so geo: (Android) e Google Maps web, nunca google.navigation', () async {
    final android = directionsUris(-23.5, -46.6, platform: TargetPlatform.android);
    expect(android.map((u) => u.toString()), [
      'geo:-23.5,-46.6?q=-23.5,-46.6',
      'https://www.google.com/maps/dir/?api=1&destination=-23.5,-46.6',
    ]);
    final ios = directionsUris(-23.5, -46.6, platform: TargetPlatform.iOS);
    expect(ios.map((u) => u.toString()), ['https://www.google.com/maps/dir/?api=1&destination=-23.5,-46.6']);
    for (final u in [...android, ...ios]) {
      expect(u.scheme, isNot('google.navigation'));
    }
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
