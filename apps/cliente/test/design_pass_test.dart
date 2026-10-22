import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_flutter/volti_flutter.dart';
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

void main() {
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
        containsSemantics(label: 'SOS', hint: 'Ligar para o suporte ou compartilhar sua localização', isButton: true),
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
