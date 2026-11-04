// Moto de bancada (J16 GT06 relay_only): bateria desconhecida, sem velocidade
// ate o primeiro dado e prazo maior nos POSTs que esperam o rastreador.
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

Widget _wrap(Widget child, {ThemeData? theme}) => MaterialApp(
      theme: theme ?? VoltiTheme.light(),
      home: Scaffold(body: Center(child: child)),
    );

class _CaptureAdapter implements HttpClientAdapter {
  final calls = <RequestOptions>[];
  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s, Future<void>? c) async {
    calls.add(o);
    return ResponseBody.fromString('{}', 200, headers: {
      Headers.contentTypeHeader: ['application/json'],
    });
  }

  @override
  void close({bool force = false}) {}
}

class _StubAuth implements AuthRepository {
  @override
  AuthMode get mode => AuthMode.dev;
  @override
  AuthSession? get session => null;
  @override
  Future<String?> accessToken() async => 'tok';
  @override
  Future<void> signOut() async {}
}

void main() {
  group('BatteryPill com bateria desconhecida', () {
    testWidgets('escura: "—", sem autonomia e anel neutro', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(const BatteryPill(null, rangeKm: 0)));
      expect(find.text('—'), findsOneWidget);
      expect(find.textContaining('%'), findsNothing);
      expect(find.textContaining('km'), findsNothing, reason: 'autonomia 0 nao e real');
      final ring = t.widget<Container>(find.byKey(const Key('battery-ring')));
      expect(((ring.decoration! as BoxDecoration).border! as Border).top.color, BatteryPill.unknownColor);
      expect(find.bySemanticsLabel('Bateria desconhecida'), findsOneWidget);
      h.dispose();
    });

    testWidgets('clara: "—" e raio neutro', (t) async {
      await t.pumpWidget(_wrap(const BatteryPill(null, light: true)));
      expect(find.text('—'), findsOneWidget);
      final bolt = t.widget<Icon>(find.byKey(const Key('battery-bolt')));
      expect(bolt.color, BatteryPill.unknownColor);
    });

    testWidgets('rotulo de acessibilidade vem do app (localizado)', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(const BatteryPill(80, semanticsLabel: 'bateria 80 por cento', light: true)));
      expect(find.bySemanticsLabel('bateria 80 por cento'), findsOneWidget);
      expect(find.text('80%'), findsOneWidget);
      h.dispose();
    });
  });

  group('VehicleMarker com bateria desconhecida', () {
    testWidgets('tique neutro e semantica "bateria desconhecida"', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(const VehicleMarker(VehicleStatus.rented, null)));
      final tick = t.widget<Container>(find.byKey(const Key('vehicle-marker-battery')));
      expect((tick.decoration! as BoxDecoration).color, BatteryPill.unknownColor);
      expect(find.bySemanticsLabel('Moto, bateria desconhecida'), findsOneWidget);
      h.dispose();
    });

    testWidgets('rotulo de acessibilidade do app', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(const VehicleMarker(VehicleStatus.rented, 70, semanticLabel: 'Sua moto, bateria 70 por cento')));
      expect(find.bySemanticsLabel('Sua moto, bateria 70 por cento'), findsOneWidget);
      h.dispose();
    });
  });

  group('VoltiSpeedGauge sem dado', () {
    testWidgets('velocidade desconhecida mostra "—" e arco vazio', (t) async {
      await t.pumpWidget(_wrap(const VoltiSpeedGauge(speedKmh: null, limitKmh: null)));
      expect(find.text('—'), findsOneWidget);
    });

    testWidgets('sem limite imposto: o arco usa o teto legal e nunca fica vermelho', (t) async {
      await t.pumpWidget(_wrap(const VoltiSpeedGauge(speedKmh: 25, limitKmh: null)));
      expect(find.text('25'), findsOneWidget);
      expect(VoltiSpeedGauge.colorFor(25, null), VoltiColors.brand);
    });
  });

  group('prazo de resposta por requisicao', () {
    test('extra kReceiveTimeoutExtra troca o receiveTimeout so daquela requisicao', () async {
      final adapter = _CaptureAdapter();
      final api = buildVoltiApi(baseUrl: 'http://x', auth: _StubAuth(), httpClientAdapter: adapter);
      await api.dio.get<dynamic>('/a');
      await api.dio.get<dynamic>('/b', options: Options(extra: {kReceiveTimeoutExtra: const Duration(seconds: 45)}));
      expect(adapter.calls[0].receiveTimeout, const Duration(seconds: 15));
      expect(adapter.calls[1].receiveTimeout, const Duration(seconds: 45));
    });

    test('prazo longo dos POSTs que esperam o rastreador cobre os 35 s do servidor', () {
      expect(kLongReceiveTimeout, greaterThanOrEqualTo(const Duration(seconds: 40)));
    });
  });
}
