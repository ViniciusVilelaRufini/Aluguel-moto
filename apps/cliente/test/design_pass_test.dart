import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/account/account_screens.dart';
import 'package:volti_cliente/features/home/home_screen.dart';
import 'package:volti_cliente/features/reservation/reserved_screen.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart';

import 'helpers.dart';

/// Tela de celular (Pixel, 412 x 915 dp) com escala de texto [scale].
void phone(WidgetTester t, {double scale = 1}) {
  t.view.physicalSize = const Size(412, 915);
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
}

class RideBackend extends FakeBackend {
  @override
  Future<Rental?> currentRental() async => sampleRental();
  @override
  Future<Rental> rental(String id) async => sampleRental();
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
  @override
  Future<List<GeoZone>> zones() async => [];
}

class SubsBackend extends FakeBackend {
  int cancels = 0;
  @override
  Future<List<Subscription>> subscriptions() async => [
        Subscription((b) => b
          ..id = 's1'
          ..planCode = SubscriptionPlanCode.weekly
          ..status = SubscriptionStatus.active
          ..priceCents = 9900
          ..currentPeriodStart = DateTime.utc(2026, 10, 20)
          ..currentPeriodEnd = DateTime.utc(2026, 10, 27)
          ..cancelAtPeriodEnd = false
          ..createdAt = DateTime.utc(2026, 10, 20)),
      ];
  @override
  Future<void> cancelSubscription(String id) async => cancels++;
}

class SlowHistory extends FakeBackend {
  final done = Completer<List<Rental>>();
  @override
  Future<List<Rental>> rentals() => done.future;
}

class HomeBackend extends FakeBackend {
  HomeBackend(this.vehicles);
  final Completer<List<VehicleSummary>> vehicles;
  @override
  Future<List<VehicleSummary>> nearby(double lat, double lng, {double? minRangeKm}) => vehicles.future;
  @override
  Future<List<GeoZone>> zones() async => [];
  @override
  Future<Reservation?> currentReservation() async => null;
  @override
  Future<Rental?> currentRental() async => null;
}

Future<void> pumpHome(WidgetTester t, HomeBackend backend, {KycStatus kyc = KycStatus.approved}) async {
  await t.pumpWidget(testApp(const HomeScreen(), overrides: [
    backendProvider.overrideWithValue(backend),
    pushServiceProvider.overrideWithValue(NoopPushService()),
    locationServiceProvider.overrideWithValue(FakeLocation()),
    sessionProvider.overrideWith(() => FakeSession(session(kyc: kyc))),
  ]));
}

void main() {
  group('mapa', () {
    testWidgets('esqueleto enquanto carrega e estado vazio com tentar de novo, 200% sem estouro', (t) async {
      phone(t, scale: 2);
      final backend = HomeBackend(Completer());
      await pumpHome(t, backend);
      await t.pump(const Duration(milliseconds: 50));
      expect(find.byKey(const Key('nearby-skeleton')), findsOneWidget);
      backend.vehicles.complete([]);
      await t.pump();
      await t.pump(const Duration(seconds: 1));
      expect(find.byKey(const Key('nearby-skeleton')), findsNothing);
      expect(find.text('Nenhuma moto por perto agora'), findsOneWidget);
      expect(find.text('Tentar de novo'), findsOneWidget);
      expect(t.takeException(), isNull);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('aviso de KYC e um botao para leitores de tela', (t) async {
      phone(t);
      final h = t.ensureSemantics();
      final backend = HomeBackend(Completer()..complete([]));
      await pumpHome(t, backend, kyc: KycStatus.pending);
      await t.pump();
      await t.pump(const Duration(seconds: 1));
      expect(
        find.bySemanticsLabel(RegExp('^Verificação em análise')),
        findsOneWidget,
      );
      h.dispose();
      await t.pumpWidget(const SizedBox());
    });
  });

  group('reserva', () {
    testWidgets('sem reserva mostra estado vazio com ir para o mapa', (t) async {
      phone(t);
      await t.pumpWidget(testApp(const ReservedScreen(), overrides: [
        backendProvider.overrideWithValue(HomeBackend(Completer())),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
      ]));
      await t.pump();
      await t.pump(const Duration(seconds: 1));
      expect(find.text('Nenhuma reserva ativa'), findsOneWidget);
      expect(find.text('Ir para o mapa'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });
  });

  group('conta', () {
    testWidgets('cancelar a renovacao pede confirmacao', (t) async {
      phone(t);
      final backend = SubsBackend();
      await t.pumpWidget(testApp(const SubscriptionsScreen(), overrides: [backendProvider.overrideWithValue(backend)]));
      await t.pumpAndSettle();
      await t.tap(find.text('Plano semanal').first);
      await t.pumpAndSettle();
      expect(find.text('Cancelar a renovação?'), findsOneWidget);
      await t.tap(find.text('Manter plano'));
      await t.pumpAndSettle();
      expect(backend.cancels, 0);
      await t.tap(find.text('Plano semanal').first);
      await t.pumpAndSettle();
      await t.tap(find.text('Cancelar renovação'));
      await t.pumpAndSettle();
      expect(backend.cancels, 1);
    });

    testWidgets('historico: esqueleto no carregamento, estado vazio com acao, 200% sem estouro', (t) async {
      phone(t, scale: 2);
      final backend = SlowHistory();
      await t.pumpWidget(testApp(const HistoryScreen(), overrides: [backendProvider.overrideWithValue(backend)]));
      await t.pump();
      expect(find.byType(VoltiSkeleton), findsOneWidget);
      backend.done.complete([]);
      await t.pumpAndSettle();
      expect(find.byType(VoltiSkeleton), findsNothing);
      expect(find.text('Nenhuma corrida ainda'), findsOneWidget);
      expect(find.text('Ir para o mapa'), findsOneWidget);
      expect(t.takeException(), isNull);
    });
  });

  group('corrida (HUD)', () {
    late FakeRealtime rt;

    Future<void> pumpRide(WidgetTester t, {double scale = 1}) async {
      phone(t, scale: scale);
      rt = FakeRealtime();
      await t.pumpWidget(testApp(const RideScreen(), overrides: [
        backendProvider.overrideWithValue(RideBackend()),
        realtimeFactoryProvider.overrideWithValue(() => rt),
        locationServiceProvider.overrideWithValue(FakeLocation()),
      ]));
      await t.pump();
      await t.pump(const Duration(milliseconds: 50));
    }

    testWidgets('medidor le velocidade e limite; SOS tem rotulo e dica', (t) async {
      final h = t.ensureSemantics();
      await pumpRide(t);
      rt.emit(const VehiclePositionEvent(lat: -23.5, lng: -46.6, speedKmh: 30, batteryPct: 70, speedLimitKmh: 32));
      await t.pump();
      await t.pump(const Duration(milliseconds: 400));
      expect(find.bySemanticsLabel('Velocidade 30 quilômetros por hora, limite 32'), findsOneWidget);
      final gauge = t.widget<VoltiSpeedGauge>(find.byKey(const Key('ride-gauge')));
      expect(VoltiSpeedGauge.colorFor(gauge.speedKmh, gauge.limitKmh), VoltiColors.sun400);
      expect(
        t.getSemantics(find.byKey(const Key('sos-button'))),
        isSemantics(label: 'SOS', hint: 'Ligar para o suporte ou compartilhar sua localização', isButton: true),
      );
      h.dispose();
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('faixa de zona entra e sai animando, sem salto', (t) async {
      await pumpRide(t);
      rt.emit(const ZoneNotice(zoneType: 'reduced_speed', transition: 'ENTER', message: 'Área de pedestres.', speedLimitKmh: 6));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(find.text('Velocidade máxima: 6 km/h'), findsOneWidget);
      rt.emit(const ZoneNotice(zoneType: 'reduced_speed', transition: 'EXIT', message: 'Área de pedestres.'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 100));
      // Saindo: o texto continua (ultimo aviso) enquanto a faixa encolhe.
      expect(find.text('Velocidade máxima: 6 km/h'), findsOneWidget);
      await t.pump(const Duration(milliseconds: 500));
      expect(find.text('Velocidade máxima: 6 km/h'), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('sem tempo real mostra a faixa escura', (t) async {
      await pumpRide(t);
      rt.conn.add(false);
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(find.text('Sem conexão em tempo real'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('texto a 200% nao estoura', (t) async {
      await pumpRide(t, scale: 2);
      rt.emit(const ZoneNotice(zoneType: 'forbidden', transition: 'ENTER', message: 'Área proibida para motos.'));
      rt.conn.add(false);
      await t.pump();
      await t.pump(const Duration(milliseconds: 600));
      expect(t.takeException(), isNull);
      await t.pumpWidget(const SizedBox());
    });
  });
}
