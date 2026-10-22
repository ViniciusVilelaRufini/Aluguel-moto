import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/account/account_screens.dart';
import 'package:volti_cliente/features/onboarding/onboarding_screen.dart';
import 'package:volti_cliente/features/plan/plan_screen.dart';
import 'package:volti_cliente/features/return_flow/return_screen.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';

class PlanBackend extends FakeBackend {
  int startCalls = 0;
  @override
  Future<List<PricingPlan>> plans() async => [
        PricingPlan((b) => b
          ..id = 'p1'
          ..code = PlanCode.minute
          ..name = 'Por minuto'
          ..unit = PlanUnit.minute
          ..unlockFeeCents = 100
          ..unitPriceCents = 79
          ..pausePerMinuteCents = 20
          ..recurring = false
          ..active = true
          ..createdAt = DateTime.utc(2026)
          ..updatedAt = DateTime.utc(2026)),
      ];
  @override
  Future<List<InsuranceCoverageOption>> coverages() async => [
        InsuranceCoverageOption((b) => b
          ..coverage = InsuranceCoverage.basic
          ..name = 'Básico'
          ..description = 'Cobertura mínima'
          ..premiumCents = 0
          ..mandatory = true
          ..active = true),
        InsuranceCoverageOption((b) => b
          ..coverage = InsuranceCoverage.full
          ..name = 'Completo'
          ..description = 'Cobertura ampla'
          ..premiumCents = 300
          ..mandatory = false
          ..active = true),
      ];
  @override
  Future<Quote> quote(PlanCode plan, InsuranceCoverage coverage, {String? coupon}) async => Quote((b) => b
    ..planCode = plan
    ..coverage = coverage
    ..depositCents = 5000
    ..couponApplied = false
    ..breakdown = PriceBreakdown((p) => p
      ..subtotalCents = 100
      ..discountCents = 0
      ..insuranceCents = coverage == InsuranceCoverage.full ? 300 : 0
      ..feesCents = 0
      ..totalCents = 100).toBuilder());
  @override
  Future<List<PaymentCard>> cards() async => [
        PaymentCard((b) => b
          ..id = 'card1'
          ..brand = 'visa'
          ..last4 = '4242'
          ..expMonth = 12
          ..expYear = 2030
          ..isDefault = true
          ..createdAt = DateTime.utc(2026)),
      ];
  @override
  Future<Wallet> wallet() async => Wallet((b) => b
    ..balanceCents = 0
    ..minutesBalance = 0
    ..updatedAt = DateTime.utc(2026));
  @override
  Future<RentalStartResult> startRental(StartRentalRequest request, {String? idempotencyKey}) async {
    startCalls++;
    throw AppFailure(kind: FailureKind.unknown);
  }
}

Finder coverageCard(String c) => find.byKey(Key('coverage-$c'));
bool isSelected(WidgetTester t, String c) => t.widget<OptionCard>(coverageCard(c)).selected;

void main() {
  group('onboarding', () {
    testWidgets('bloqueia sem aceite do consentimento de localizacao', (t) async {
      tallScreen(t);
      final fake = FakeBackend();
      await t.pumpWidget(testApp(const OnboardingScreen(), overrides: [
        backendProvider.overrideWithValue(fake),
        sessionProvider.overrideWith(() => FakeSession(session(location: false, terms: false, kyc: KycStatus.notStarted))),
      ]));
      await t.pumpAndSettle();

      final fields = find.byType(TextField);
      await t.enterText(fields.at(0), 'Ana Lima');
      await t.enterText(fields.at(1), '12345678900');
      await t.enterText(fields.at(2), '14/03/1998');
      await t.pump();

      VoltiButton cta() => t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Continuar'));
      expect(cta().onPressed, isNull, reason: 'sem termos nem localizacao');

      await t.tap(find.byKey(const Key('consent-terms')));
      await t.pump();
      expect(cta().onPressed, isNull, reason: 'termos aceitos, mas sem consentimento de localizacao');

      await t.tap(find.byKey(const Key('consent-location')));
      await t.pump();
      expect(cta().onPressed, isNotNull);
    });
  });

  group('plano', () {
    Future<PlanBackend> pumpPlan(WidgetTester t, {bool location = true}) async {
      tallScreen(t);
      final backend = PlanBackend();
      await t.pumpWidget(testApp(PlanScreen(vehicle: sampleVehicle()), overrides: [
        backendProvider.overrideWithValue(backend),
        sessionProvider.overrideWith(() => FakeSession(session(location: location))),
      ]));
      await t.pumpAndSettle();
      return backend;
    }

    testWidgets('exige seguro: basico pre-selecionado e nao removivel', (t) async {
      await pumpPlan(t);
      expect(isSelected(t, 'basic'), isTrue, reason: 'basico vem pre-selecionado');
      expect(isSelected(t, 'full'), isFalse);
      expect(find.text('Obrigatório'), findsOneWidget);

      await t.tap(coverageCard('basic'));
      await t.pump();
      expect(isSelected(t, 'basic'), isTrue, reason: 'tocar no basico nao o remove');

      await t.tap(coverageCard('full'));
      await t.pumpAndSettle();
      expect(isSelected(t, 'full'), isTrue);
      expect(isSelected(t, 'basic'), isFalse);

      // voltar: sempre existe uma cobertura selecionada
      await t.tap(coverageCard('full'));
      await t.pumpAndSettle();
      expect(isSelected(t, 'basic'), isTrue);
      await t.tap(coverageCard('basic'));
      await t.pumpAndSettle();
      expect(isSelected(t, 'basic'), isTrue);

      final cta = t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Confirmar e destravar'));
      expect(cta.onPressed, isNotNull);
    });

    testWidgets('sem consentimento de localizacao o inicio do aluguel e bloqueado (decisao #8)', (t) async {
      final backend = await pumpPlan(t, location: false);
      await t.tap(find.widgetWithText(VoltiButton, 'Confirmar e destravar'));
      await t.pumpAndSettle();
      expect(find.text('Permitir localização?'), findsOneWidget);
      expect(backend.startCalls, 0);

      await t.tap(find.text('Agora não'));
      await t.pumpAndSettle();
      expect(backend.startCalls, 0, reason: 'recusou o consentimento: nao inicia');

      await t.tap(find.widgetWithText(VoltiButton, 'Confirmar e destravar'));
      await t.pumpAndSettle();
      await t.tap(find.text('Permitir e continuar'));
      await t.pumpAndSettle();
      expect(backend.startCalls, 1, reason: 'depois do consentimento o aluguel e solicitado');
    });
  });

  group('aluguel', () {
    late FakeRealtime rt;
    late _RideBackend backend;

    Future<void> pumpRide(WidgetTester t) async {
      tallScreen(t);
      rt = FakeRealtime();
      backend = _RideBackend();
      await t.pumpWidget(testApp(const RideScreen(), overrides: [
        backendProvider.overrideWithValue(backend),
        realtimeFactoryProvider.overrideWithValue(() => rt),
        locationServiceProvider.overrideWithValue(FakeLocation()),
      ]));
      await t.pump();
      await t.pump(const Duration(milliseconds: 50));
    }

    testWidgets('zone.notice mostra o novo limite de velocidade', (t) async {
      await pumpRide(t);
      expect(find.textContaining('limite 32'), findsOneWidget);

      rt.emit(const ZoneNotice(
        zoneType: 'reduced_speed',
        transition: 'ENTER',
        message: 'Você entrou numa área de pedestres. Velocidade máxima: 6 km/h.',
        speedLimitKmh: 6,
      ));
      await t.pump();
      await t.pump();

      expect(find.text('Velocidade máxima: 6 km/h'), findsOneWidget);
      expect(find.textContaining('limite 6'), findsOneWidget);
      expect(find.textContaining('limite 32'), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('device.event queda abre "Voce esta bem?" e responde ao backend', (t) async {
      await pumpRide(t);
      rt.emit(const DeviceEventReceived(type: 'queda'));
      await t.pump();
      await t.pump(const Duration(seconds: 1)); // ponto ao vivo pisca sem parar: sem pumpAndSettle

      expect(find.text('Você está bem?'), findsOneWidget);
      await t.tap(find.text('Estou bem'));
      await t.pump(const Duration(milliseconds: 300));
      expect(backend.wellbeingOk, isTrue);
      await t.pumpWidget(const SizedBox());
    });
  });

  group('encerrar', () {
    testWidgets('fica desabilitado sem foto e habilita com a foto', (t) async {
      tallScreen(t);
      await t.pumpWidget(testApp(const ReturnScreen(rentalId: 'r1'), overrides: [
        backendProvider.overrideWithValue(_RideBackend()),
        photoPickerProvider.overrideWithValue(FakePhotoPicker()),
      ]));
      await t.pumpAndSettle();

      VoltiButton end() => t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Encerrar corrida'));
      expect(end().onPressed, isNull);

      await t.tap(find.byType(PhotoCapture));
      await t.pumpAndSettle();
      expect(end().onPressed, isNotNull);
    });
  });

  group('rede', () {
    testWidgets('erro de rede mostra "Tentar de novo" e recarrega', (t) async {
      tallScreen(t);
      final backend = _FlakyHistory();
      await t.pumpWidget(testApp(const HistoryScreen(), overrides: [backendProvider.overrideWithValue(backend)]));
      await t.pumpAndSettle();

      expect(find.text('Sem conexão com a internet. Confira sua rede e tente de novo.'), findsOneWidget);
      expect(find.text('Tentar de novo'), findsOneWidget);

      await t.tap(find.text('Tentar de novo'));
      await t.pumpAndSettle();
      expect(find.text('Você ainda não fez nenhuma corrida.'), findsOneWidget);
      expect(backend.calls, 2);
    });
  });
}

class _RideBackend extends FakeBackend {
  bool? wellbeingOk;
  @override
  Future<Rental?> currentRental() async => sampleRental();
  @override
  Future<Rental> rental(String id) async => sampleRental();
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
  @override
  Future<List<GeoZone>> zones() async => [];
  @override
  Future<void> wellbeing(String id, {required bool ok, String? note}) async => wellbeingOk = ok;
}

class _FlakyHistory extends FakeBackend {
  int calls = 0;
  @override
  Future<List<Rental>> rentals() async {
    calls++;
    if (calls == 1) throw AppFailure(kind: FailureKind.network);
    return [];
  }
}
