// Lote B do gap de design: corrida, devolucao e recibo.
import 'dart:typed_data';

import 'package:built_collection/built_collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/geo.dart';
import 'package:volti_cliente/core/launcher.dart';
import 'package:volti_cliente/core/release_env.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/features/return_flow/return_screen.dart';
import 'package:volti_cliente/features/ride/ride_data.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart';
import 'package:volti_cliente/features/summary/summary_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';
import 'zone_fixtures.dart';

PricingPlan minutePlan() => PricingPlan((b) => b
  ..id = 'p1'
  ..code = PlanCode.minute
  ..name = 'Por minuto'
  ..unit = PlanUnit.minute
  ..unlockFeeCents = 300
  ..unitPriceCents = 79
  ..pausePerMinuteCents = 20
  ..recurring = false
  ..active = true
  ..createdAt = DateTime.utc(2026)
  ..updatedAt = DateTime.utc(2026));

class _Opened {
  final uris = <Uri>[];
  final shared = <String>[];
}

class _RideB extends FakeBackend {
  _RideB({this.contact = false});
  final bool contact;
  final incidents = <String>[];
  bool paused = false;
  @override
  Future<Rental?> currentRental() async => sampleRental();
  @override
  Future<Rental> rental(String id) async => sampleRental();
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
  @override
  Future<List<GeoZone>> zones() async => [zoneAround(-23.56, -46.65, name: 'Ciclovia Faria Lima', type: ZoneType.reducedSpeed)];
  @override
  Future<List<PricingPlan>> plans() async => [minutePlan()];
  @override
  Future<Me> me() async => Me((b) => b
    ..id = 'c1'
    ..pool = AuthPool.customer
    ..email = 'a@b.c'
    ..customer = customer().rebuild((c) => c
      ..emergencyContactName = contact ? 'Maria' : null
      ..emergencyContactPhone = contact ? '+5511988887777' : null).toBuilder());
  @override
  Future<LocationShare> shareLocation(String id) async => LocationShare((b) => b
    ..url = 'https://volti.app/s/abc'
    ..expiresAt = DateTime.utc(2030));
  @override
  Future<Rental> pause(String id) async {
    paused = true;
    return sampleRental(status: RentalStatus.paused);
  }

  @override
  Future<Incident> reportIncident(IncidentCategory category, String description, {String? rentalId, String? vehicleId}) async {
    incidents.add(description);
    return Incident((b) => b
      ..id = 'i1'
      ..category = category
      ..description = description
      ..status = IncidentStatus.open
      ..createdAt = DateTime.utc(2026)
      ..updatedAt = DateTime.utc(2026));
  }
}

/// Liga o mapa (o `testApp` desliga) num escopo filho.
Widget _withMap(bool on, Widget child) =>
    on ? ProviderScope(overrides: [mapEnabledProvider.overrideWithValue(true)], child: child) : child;

void main() {
  group('geo (lote B)', () {
    test('duracao no formato do design, sem km', () {
      expect(durationLabel(734), '12 min 14 s');
      expect(durationLabel(1500), '25 min');
      expect(durationLabel(42), '42 s');
      expect(durationLabel(3725), '1 h 02 min');
    });

    test('zona que contem o ponto e zona mais proxima', () {
      final a = zoneAround(-23.56, -46.65, id: 'a');
      final b = zoneAround(-23.57, -46.66, id: 'b');
      expect(zoneContaining(-23.56, -46.65, [a, b])?.id, 'a');
      expect(zoneContaining(-23.50, -46.60, [a, b]), isNull);
      expect(nearestZone(const LatLng(-23.571, -46.661), [a, b])?.id, 'b');
      final c = zoneCenter(a);
      expect(c.latitude, closeTo(-23.56, 1e-6));
      expect(c.longitude, closeTo(-46.65, 1e-6));
    });

    test('trilha ignora tremidas menores que 3 m e acrescenta no lugar', () {
      final t = <LatLng>[];
      expect(appendTrail(t, const LatLng(-23.56, -46.65)), isTrue);
      expect(appendTrail(t, const LatLng(-23.56001, -46.65)), isFalse); // ~1 m
      expect(t, hasLength(1));
      expect(appendTrail(t, const LatLng(-23.5602, -46.65)), isTrue); // ~22 m
      expect(t, hasLength(2));
    });

    // ~11 m entre pontos consecutivos.
    LatLng pt(int i) => LatLng(-23.56 + i * 0.0001, -46.65);

    test('10 mil posicoes ficam no teto e preservam as pontas', () {
      final t = <LatLng>[];
      for (var i = 0; i < 10000; i++) {
        appendTrail(t, pt(i));
        expect(t.length, lessThanOrEqualTo(kTrailMaxPoints));
      }
      expect(t.first, pt(0));
      expect(t.last, pt(9999));
      expect(t.length, greaterThan(kTrailMaxPoints ~/ 2), reason: 'dizima pela metade, nao esvazia');
      for (var i = 1; i < t.length; i++) {
        expect(t[i].latitude, greaterThan(t[i - 1].latitude), reason: 'ordem mantida');
      }
    });

    test('junta trajeto salvo e ao vivo numa passada, filtrada e no teto', () {
      final saved = [for (var i = 0; i < 6000; i++) pt(i)];
      final live = [pt(5999), for (var i = 6000; i < 9000; i++) pt(i)]; // 1o repetido some no filtro
      final m = mergeTrail(saved, live);
      expect(m.length, lessThanOrEqualTo(kTrailMaxPoints));
      expect(m.first, pt(0));
      expect(m.last, pt(8999));
      final small = mergeTrail([pt(0), pt(1)], [pt(1), pt(2)]);
      expect(small, [pt(0), pt(1), pt(2)]);
    });

    test('zonas compartilhadas: uma busca so dentro do TTL', () async {
      final b = _CountZones();
      final c = ProviderContainer(overrides: [backendProvider.overrideWithValue(b)]);
      addTearDown(c.dispose);
      await c.read(sharedZonesProvider.future);
      await Future<void>.delayed(Duration.zero);
      await c.read(sharedZonesProvider.future);
      expect(b.calls, 1);
    });
  });

  group('corrida', () {
    late FakeRealtime rt;
    late _RideB backend;
    late _Opened opened;

    Future<void> pumpRide(WidgetTester t, {bool contact = false, bool map = false, List<LatLng> track = const []}) async {
      tallScreen(t);
      rt = FakeRealtime();
      backend = _RideB(contact: contact);
      opened = _Opened();
      await t.pumpWidget(testApp(_withMap(map, const RideScreen()), overrides: [
        backendProvider.overrideWithValue(backend),
        realtimeFactoryProvider.overrideWithValue(() => rt),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        rentalTrackProvider.overrideWith((ref, id) async => track),
        urlLauncherProvider.overrideWithValue((uri) async {
          opened.uris.add(uri);
          return true;
        }),
        shareTextProvider.overrideWithValue((text) async => opened.shared.add(text)),
      ]));
      await t.pump();
      await t.pump(const Duration(milliseconds: 50));
      await t.pump(const Duration(milliseconds: 50));
    }

    testWidgets('rota percorrida desenhada: trajeto salvo + posicoes ao vivo', (t) async {
      await pumpRide(t, map: true, track: const [LatLng(-23.561, -46.651), LatLng(-23.5605, -46.6505)]);
      final route = find.byKey(const Key('ride-route'));
      expect(route, findsOneWidget);
      expect(t.widget<DrawnPolyline>(route).points, hasLength(2));
      expect(t.widget<DrawnPolyline>(route).color, VoltiColors.brand);

      rt.emit(const VehiclePositionEvent(lat: -23.5595, lng: -46.6495, speedKmh: 20, batteryPct: 70, speedLimitKmh: 32));
      await t.pump();
      await t.pump(const Duration(milliseconds: 50));
      expect(t.widget<DrawnPolyline>(find.byKey(const Key('ride-route'))).points, hasLength(3));
      expect(find.byType(PolylineLayer), findsWidgets);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('estatistica Tarifa, legenda com plano e seguro; pausa mostra a tarifa reduzida e Destravar', (t) async {
      await pumpRide(t);
      expect(find.text('Tarifa'), findsOneWidget);
      expect(find.text('R\$ 0,79/min'), findsOneWidget);
      expect(find.text('Custo acumulado'), findsOneWidget);
      expect(find.text('Em corrida · Por minuto · Seguro básico'), findsOneWidget);
      expect(find.textContaining('km rodad'), findsNothing);

      await t.tap(find.widgetWithText(VoltiButton, 'Pausar'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 400));
      expect(backend.paused, isTrue);
      expect(find.text('R\$ 0,20/min'), findsNWidgets(2), reason: 'na estatistica e no selo');
      expect(find.widgetWithText(VoltiButton, 'Destravar'), findsOneWidget);
      expect(find.text('Moto travada · pausa · Por minuto · Seguro básico'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('aviso de zona mostra o nome da zona e o limite', (t) async {
      await pumpRide(t);
      rt.emit(const ZoneNotice(zoneType: 'reduced_speed', transition: 'ENTER', message: 'A moto reduziu a velocidade sozinha.', speedLimitKmh: 20));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(find.text('Ciclovia Faria Lima · limite 20 km/h'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('SOS envia o link direto ao contato de emergencia salvo', (t) async {
      await pumpRide(t, contact: true);
      await t.tap(find.byKey(const Key('sos-button')));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(find.text('Cadastrar contato de emergência'), findsNothing);
      await t.tap(find.text('Enviar localização para Maria'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(opened.uris, hasLength(1));
      final uri = opened.uris.single;
      expect(uri.scheme, 'sms');
      expect(uri.path, '+5511988887777');
      expect(uri.queryParameters['body'], contains('https://volti.app/s/abc'));
      expect(uri.queryParameters['body'], contains('link válido por 1 h'));
      expect(opened.shared, isEmpty);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('SOS sem contato: CTA para cadastrar e envio pela folha de compartilhar', (t) async {
      await pumpRide(t);
      await t.tap(find.byKey(const Key('sos-button')));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(find.text('Cadastrar contato de emergência'), findsOneWidget);
      await t.tap(find.text('Enviar localização a um contato'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(opened.uris, isEmpty);
      expect(opened.shared.single, contains('https://volti.app/s/abc'));
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('SOS: atalhos 192 (SAMU) e 190 (Policia) ligam por tel: e tem rotulo de leitor de tela', (t) async {
      final sem = t.ensureSemantics();
      await pumpRide(t);
      await t.tap(find.byKey(const Key('sos-button')));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(find.text('Ligar 192 (SAMU)'), findsOneWidget);
      expect(find.text('Ligar 190 (Polícia)'), findsOneWidget);
      expect(t.getSemantics(find.byKey(const Key('sos-call-samu'))).label, contains('SAMU, telefone 192'));
      expect(t.getSemantics(find.byKey(const Key('sos-call-police'))).label, contains('Polícia, telefone 190'));

      await t.tap(find.byKey(const Key('sos-call-samu')));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(opened.uris.single.toString(), 'tel:192');

      await t.tap(find.byKey(const Key('sos-button')));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      await t.tap(find.byKey(const Key('sos-call-police')));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(opened.uris.last.toString(), 'tel:190');

      await t.tap(find.byKey(const Key('sos-button')));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      await t.tap(find.byKey(const Key('sos-call-support')));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(opened.uris.last.scheme, 'tel');
      expect(opened.uris.last.path, kSupportPhone);
      sem.dispose();
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('SOS a 200% de texto: sem estouro e atalhos acessiveis', (t) async {
      t.platformDispatcher.textScaleFactorTestValue = 2;
      addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
      await pumpRide(t);
      await t.tap(find.byKey(const Key('sos-button')));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(t.takeException(), isNull);
      expect(find.byKey(const Key('sos-call-samu')), findsOneWidget);
      expect(find.byKey(const Key('sos-call-police')), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('queda: contagem regressiva visivel em negrito', (t) async {
      await pumpRide(t);
      rt.emit(const DeviceEventReceived(type: 'queda'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(find.textContaining('em 60 s,', findRichText: true), findsOneWidget);
      await t.pump(const Duration(seconds: 5));
      expect(find.textContaining('em 55 s,', findRichText: true), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('reportar: um dialogo com chips selecionaveis e "So reportar", sem troca de moto', (t) async {
      await pumpRide(t);
      await t.tap(find.text('Reportar problema'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(find.text('Qual o problema?'), findsOneWidget);
      // Retirada em galpao: sem troca de moto no meio da corrida.
      expect(find.text('Trocar de moto sem nova taxa'), findsNothing);
      await t.tap(find.descendant(of: find.byType(Dialog), matching: find.text('Freio')));
      await t.pump(const Duration(milliseconds: 300));
      expect(t.widget<VoltiChip>(find.widgetWithText(VoltiChip, 'Freio')).selected, isTrue);
      await t.tap(find.text('Só reportar'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(backend.incidents, ['Freio']);
      expect(find.text('Problema reportado'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });
  });

  group('devolucao', () {
    Future<_ReturnB> pumpReturn(WidgetTester t, {required List<GeoZone> zones, bool map = false}) async {
      tallScreen(t);
      final b = _ReturnB(zones);
      await t.pumpWidget(testApp(_withMap(map, const ReturnScreen(rentalId: 'r1')), overrides: [
        backendProvider.overrideWithValue(b),
        photoPickerProvider.overrideWithValue(FakePhotoPicker()),
      ]));
      await t.pump();
      await t.pump(const Duration(milliseconds: 100));
      await t.pump(const Duration(milliseconds: 100));
      return b;
    }

    testWidgets('mapa com as zonas verdes, pin P e header com a zona; encerra sem dialogo extra', (t) async {
      final b = await pumpReturn(t, map: true, zones: [
        zoneAround(-23.56, -46.65),
        zoneAround(-23.57, -46.66, id: 'z2', name: 'Largo da Batata'),
        zoneAround(-23.56, -46.65, id: 'z3', name: 'Zona de operação', type: ZoneType.operation),
      ]);
      final polys = t.widget<PolygonLayer>(find.byKey(const Key('return-zones')));
      expect(polys.polygons, hasLength(2), reason: 'so as zonas de devolucao');
      expect(find.byKey(const Key('return-pin')), findsOneWidget);
      expect(find.text('Ponto de devolução'), findsOneWidget);
      expect(find.text('Pç. Oswaldo Cruz · você está dentro'), findsOneWidget);
      expect(find.text('Passo 1 de 2 · Foto'), findsOneWidget);
      expect(find.text('Fotografe a moto estacionada'), findsOneWidget);
      expect(find.text('Você está num ponto verde. Pode encerrar sem taxa.'), findsOneWidget);

      VoltiButton end() => t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Travar e encerrar'));
      expect(end().onPressed, isNull);
      await t.tap(find.byType(PhotoCapture));
      await t.pump();
      await t.pump(const Duration(milliseconds: 300));
      expect(find.text('Passo 2 de 2 · Travar'), findsOneWidget);
      expect(end().icon, LucideIcons.lock);
      await t.tap(find.widgetWithText(VoltiButton, 'Travar e encerrar'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 100));
      expect(find.byType(Dialog), findsNothing);
      expect(b.ended, 1);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('fora da zona: aviso da taxa, botao bloqueado e caminho pelo suporte', (t) async {
      await pumpReturn(t, zones: [zoneAround(-23.60, -46.70)]);
      await t.tap(find.byType(PhotoCapture));
      await t.pump();
      await t.pump(const Duration(milliseconds: 300));
      expect(find.text('Fora dos pontos verdes'), findsWidgets);
      expect(find.textContaining('só com o suporte, com taxa'), findsOneWidget);
      expect(t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Travar e encerrar')).onPressed, isNull);
      expect(find.widgetWithText(VoltiButton, 'Falar com o suporte'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });
  });

  testWidgets('devolucao: falha nas zonas e "Tentar de novo" busca as zonas de novo', (t) async {
    tallScreen(t);
    final b = _FlakyZones();
    await t.pumpWidget(testApp(const ReturnScreen(rentalId: 'r1'), overrides: [
      backendProvider.overrideWithValue(b),
      photoPickerProvider.overrideWithValue(FakePhotoPicker()),
    ]));
    await t.pump();
    await t.pump(const Duration(milliseconds: 100));
    expect(find.text('Tentar de novo'), findsOneWidget);
    expect(b.calls, 1);
    await t.tap(find.text('Tentar de novo'));
    await t.pump();
    await t.pump(const Duration(milliseconds: 100));
    expect(b.calls, 2);
    expect(find.text('Tentar de novo'), findsNothing);
    expect(find.text('Pç. Oswaldo Cruz · você está dentro'), findsOneWidget);
    await t.pumpWidget(const SizedBox());
  });

  testWidgets('corrida: zonas que falharam sao buscadas de novo no proximo aviso de zona', (t) async {
    tallScreen(t);
    final b = _FlakyZonesRide();
    final rt = FakeRealtime();
    await t.pumpWidget(testApp(const RideScreen(), overrides: [
      backendProvider.overrideWithValue(b),
      realtimeFactoryProvider.overrideWithValue(() => rt),
      locationServiceProvider.overrideWithValue(FakeLocation()),
      rentalTrackProvider.overrideWith((ref, id) async => const []),
    ]));
    await t.pump();
    await t.pump(const Duration(milliseconds: 100));
    expect(b.calls, 1);
    rt.emit(const ZoneNotice(zoneType: 'reduced_speed', transition: 'ENTER', message: 'A moto reduziu a velocidade sozinha.', speedLimitKmh: 20));
    await t.pump();
    await t.pump(const Duration(milliseconds: 500));
    expect(b.calls, 2);
    expect(find.text('Ciclovia Faria Lima · limite 20 km/h'), findsOneWidget);
    await t.pumpWidget(const SizedBox());
  });

  group('acessibilidade', () {
    void phone2x(WidgetTester t) {
      t.view.physicalSize = const Size(412, 915);
      t.view.devicePixelRatio = 1;
      t.platformDispatcher.textScaleFactorTestValue = 2;
      addTearDown(t.view.reset);
      addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
    }

    testWidgets('devolucao a 200% e com reduced motion nao estoura', (t) async {
      phone2x(t);
      await t.pumpWidget(MediaQuery(
        data: const MediaQueryData(disableAnimations: true),
        child: testApp(_withMap(true, const ReturnScreen(rentalId: 'r1')), overrides: [
          backendProvider.overrideWithValue(_ReturnB([zoneAround(-23.60, -46.70)])),
          photoPickerProvider.overrideWithValue(FakePhotoPicker()),
        ]),
      ));
      await t.pump();
      await t.pump(const Duration(milliseconds: 300));
      expect(t.takeException(), isNull);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('recibo a 200% nao estoura', (t) async {
      phone2x(t);
      await t.pumpWidget(testApp(const SummaryScreen(rentalId: 'r1'), overrides: [backendProvider.overrideWithValue(_ReceiptB())]));
      await t.pump();
      await t.pump(const Duration(seconds: 2));
      await t.scrollUntilVisible(find.byKey(const Key('receipt-invoice')), 200, scrollable: find.byType(Scrollable).first);
      await t.pump(const Duration(seconds: 1));
      expect(t.takeException(), isNull);
      await t.pumpWidget(const SizedBox());
    });
  });

  group('recibo', () {
    testWidgets('header do design, duracao por extenso, linha Recibo e nota fiscal abre o PDF', (t) async {
      tallScreen(t);
      final opened = _Opened();
      await t.pumpWidget(testApp(const SummaryScreen(rentalId: 'r1'), overrides: [
        backendProvider.overrideWithValue(_ReceiptB()),
        inAppUrlLauncherProvider.overrideWithValue((uri) async {
          opened.uris.add(uri);
          return true;
        }),
      ]));
      await t.pump();
      await t.pump(const Duration(seconds: 2));
      expect(find.text('Corrida finalizada'), findsOneWidget);
      expect(find.text('Moto travada. Caução liberada.'), findsOneWidget);
      expect(find.text('25 min'), findsOneWidget);
      expect(find.text('Seguro básico'), findsOneWidget);
      expect(find.text('Como foi a moto e a viagem?'), findsOneWidget);
      expect(find.widgetWithText(VoltiButton, 'Concluir'), findsOneWidget);

      final row = find.widgetWithText(ListRow, 'Recibo e nota fiscal');
      expect(row, findsOneWidget);
      expect(find.text('Cartão •••• 4821 · NFS-e 2026-77'), findsOneWidget);
      await t.tap(row);
      await t.pump();
      await t.pump(const Duration(milliseconds: 100));
      expect(opened.uris.single.toString(), 'https://files.volti.app/r1.pdf?fresh=1');
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('PDF que nao abre mostra erro', (t) async {
      tallScreen(t);
      await t.pumpWidget(testApp(const SummaryScreen(rentalId: 'r1'), overrides: [
        backendProvider.overrideWithValue(_ReceiptB()),
        inAppUrlLauncherProvider.overrideWithValue((uri) async => throw Exception('sem app')),
      ]));
      await t.pump();
      await t.pump(const Duration(seconds: 2));
      await t.tap(find.widgetWithText(ListRow, 'Recibo e nota fiscal'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 300));
      expect(find.text('Não foi possível abrir o recibo. Tente de novo.'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });
  });

  test('SMS para o contato leva o texto no corpo', () {
    expect(smsUri('+5511988887777', 'oi').scheme, 'sms');
    expect(smsUri('+5511988887777', 'oi').queryParameters['body'], 'oi');
  });
}

class _ReturnB extends FakeBackend {
  _ReturnB(this._zones);
  final List<GeoZone> _zones;
  int ended = 0;
  @override
  Future<List<GeoZone>> zones() async => _zones;
  @override
  Future<Rental> rental(String id) async => sampleRental();
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
  @override
  Future<PresignedUpload> returnPhotoUpload(String rentalId) async => PresignedUpload((b) => b
    ..objectKey = 'k1'
    ..uploadUrl = 'http://x'
    ..method = PresignedUploadMethodEnum.PUT
    ..headers = MapBuilder<String, String>()
    ..expiresAt = DateTime.utc(2030));
  @override
  Future<void> upload(PresignedUpload target, Uint8List bytes, String contentType) async {}
  @override
  Future<Rental> endRental(String rentalId, String photoKey, {String? idempotencyKey}) async {
    ended++;
    return sampleRental(status: RentalStatus.ending);
  }
}

class _ReceiptB extends FakeBackend {
  int calls = 0;
  @override
  Future<Receipt> receipt(String rentalId) async {
    calls++;
    return Receipt((b) => b
      ..rentalId = 'r1'
      ..number = 'VLT-2026-000123'
      ..issuedAt = DateTime.utc(2026, 10, 21)
      ..vehicleCode = 'VLT-001'
      ..planCode = PlanCode.minute
      ..coverage = InsuranceCoverage.basic
      ..startedAt = DateTime.utc(2026, 10, 21, 10)
      ..endedAt = DateTime.utc(2026, 10, 21, 10, 25)
      ..durationSeconds = 1500
      ..paymentMethod = PaymentMethod.card
      ..cardLast4 = '4821'
      ..invoiceNumber = '2026-77'
      ..pdfUrl = calls == 1 ? 'https://files.volti.app/r1.pdf' : 'https://files.volti.app/r1.pdf?fresh=1'
      ..breakdown = PriceBreakdown((p) => p
        ..lines.add(PriceLine((l) => l
          ..code = 'time'
          ..description = 'Minutos (25 × R\$ 0,79)'
          ..amountCents = 1975))
        ..subtotalCents = 1975
        ..discountCents = 0
        ..insuranceCents = 150
        ..feesCents = 0
        ..totalCents = 2125).toBuilder());
  }
}

class _CountZones extends FakeBackend {
  int calls = 0;
  @override
  Future<List<GeoZone>> zones() async {
    calls++;
    return [zoneAround(-23.56, -46.65)];
  }
}

class _FlakyZones extends _ReturnB {
  _FlakyZones() : super([zoneAround(-23.56, -46.65)]);
  int calls = 0;
  @override
  Future<List<GeoZone>> zones() async {
    calls++;
    if (calls == 1) throw AppFailure(kind: FailureKind.network);
    return super.zones();
  }
}

class _FlakyZonesRide extends _RideB {
  int calls = 0;
  @override
  Future<List<GeoZone>> zones() async {
    calls++;
    if (calls == 1) throw AppFailure(kind: FailureKind.network);
    return super.zones();
  }
}
