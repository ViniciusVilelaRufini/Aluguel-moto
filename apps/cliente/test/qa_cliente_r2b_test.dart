// Achados visuais e menores da rodada 2 do QA (Task 15, continuacao): cada um a 100% e a 200% de fonte.

import 'dart:async';
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
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/geo.dart';
import 'package:volti_cliente/core/launcher.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/account/emergency_contact_screen.dart';
import 'package:volti_cliente/features/account/privacy_screen.dart';
import 'package:volti_cliente/features/handover/handover_screen.dart';
import 'package:volti_cliente/features/home/home_screen.dart';
import 'package:volti_cliente/features/ride/battery_sheet.dart';
import 'package:volti_cliente/features/station_swap/swap_confirm_sheet.dart';
import 'package:volti_cliente/features/onboarding/onboarding_screen.dart';
import 'package:volti_cliente/features/pickup/pickup_screen.dart';
import 'package:volti_cliente/features/plan/plan_screen.dart';
import 'package:volti_cliente/features/return_flow/return_screen.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart' show RideScreen, mapEnabledProvider;
import 'package:volti_cliente/features/summary/summary_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'handover_test.dart' show HandoverBackend, RtHub;
import 'home_stations_test.dart' show StationsBackend, pumpHome, st;
import 'helpers.dart';
import 'qa_cliente_test.dart' show phone, settle;

class _Receipt extends FakeBackend {
  _Receipt(this.track);
  final List<TrackPoint> track;
  @override
  Future<Receipt> receipt(String rentalId) async => Receipt(
    (b) => b
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
      ..pdfUrl = 'https://files.volti.app/r1.pdf'
      ..track = ListBuilder<TrackPoint>(track)
      ..breakdown = PriceBreakdown(
        (p) => p
          ..lines.add(
            PriceLine(
              (l) => l
                ..code = 'time'
                ..description = 'Minutos'
                ..amountCents = 1975,
            ),
          )
          ..subtotalCents = 1975
          ..discountCents = 0
          ..insuranceCents = 150
          ..feesCents = 0
          ..totalCents = 2125,
      ).toBuilder(),
  );
}

TrackPoint _pt(double lat, double lng) => TrackPoint(
  (b) => b
    ..lat = lat
    ..lng = lng
    ..speedKmh = 0
    ..recordedAt = DateTime.utc(2026, 10, 21, 10),
);

class _Ride extends FakeBackend {
  int depotsCalls = 0;
  @override
  Future<Rental?> currentRental() async => sampleRental();
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle(battery: battery);
  int battery = 100;
  @override
  Future<List<GeoZone>> zones() async => const [];
  @override
  Future<List<PricingPlan>> plans() async => const [];
}

class _Stations extends HandoverBackend {
  _Stations() {
    rentalNow = sampleRental();
  }
  int depotCalls = 0;
  @override
  Future<List<Depot>> depots({double? lat, double? lng}) {
    depotCalls++;
    return super.depots(lat: lat, lng: lng);
  }

  @override
  Future<List<SwapStation>> swapStations({double? lat, double? lng}) async => [
    SwapStation(
      (b) => b
        ..id = 's1'
        ..name = 'Estação Perto'
        ..address = 'R. A, 1'
        ..lat = -23.56
        ..lng = -46.65
        ..availableBatteries = 3
        ..totalSlots = 12
        ..openingHours = '24h'
        ..open24h = true
        ..distanceM = 250,
    ),
    SwapStation(
      (b) => b
        ..id = 's2'
        ..name = 'Estação Vazia'
        ..address = 'R. B, 2'
        ..lat = -23.57
        ..lng = -46.66
        ..availableBatteries = 0
        ..totalSlots = 12
        ..openingHours = '24h'
        ..open24h = true,
    ),
  ];
}

class _Slow extends GalpaoBackend {
  final gate = Completer<List<PricingPlan>>();
  @override
  Future<List<PricingPlan>> plans() => gate.future;
}

void main() {
  test('R2-20 trackCamera: trajeto parado vira so o pin; trajeto real enquadra tudo', () {
    final parked = trackCamera([const LatLng(-23.56, -46.65), const LatLng(-23.56001, -46.65001)]);
    expect(parked.path, isFalse);
    expect(parked.zoom, 17);
    final ride = trackCamera([const LatLng(-23.56, -46.65), const LatLng(-23.55, -46.64)]);
    expect(ride.path, isTrue);
    expect(ride.zoom, inInclusiveRange(12, 17));
    expect(ride.center.latitude, closeTo(-23.555, 1e-6));
  });

  test('R2-11 mascara do celular: nacional com mascara, internacional livre', () {
    final f = PhoneInputFormatter();
    TextEditingValue run(String s) => f.formatEditUpdate(TextEditingValue.empty, TextEditingValue(text: s));
    expect(run('11987654321').text, '(11) 98765-4321');
    expect(run('1198765').text, '(11) 9876-5');
    expect(run('+351912345678').text, '+351912345678');
  });

  test('R2-11 colagem com codigo do pais vira numero nacional, sem cortar digitos', () {
    final f = PhoneInputFormatter();
    String run(String s) => f.formatEditUpdate(TextEditingValue.empty, TextEditingValue(text: s)).text;
    expect(run('5511987654321'), '(11) 98765-4321');
    expect(run('55 (11) 98765-4321'), '(11) 98765-4321');
    expect(run('551187654321'), '(11) 8765-4321');
    expect(run('11987654321'), '(11) 98765-4321');
    // DDD 55 (RS) com 11 digitos continua sendo nacional.
    expect(run('55987654321'), '(55) 98765-4321');
    // Tamanho invalido nao e cortado em silencio: fica como veio e o campo acusa erro.
    final raw = run('119876543219999');
    expect(raw, '119876543219999');
    expect(toE164(raw), isNull);
    // "+55..." colado fica como esta e e aceito.
    expect(toE164(run('+5511987654321')), '+5511987654321');
  });

  for (final scale in [1.0, 2.0]) {
    final pct = (scale * 100).round();

    testWidgets('R2-18 corrida: Pausar e Devolver ficam fixos e visiveis sem rolar a $pct%', (t) async {
      phone(t, scale: scale);
      await t.pumpWidget(
        testApp(
          const RideScreen(),
          overrides: [
            backendProvider.overrideWithValue(_Ride()),
            realtimeFactoryProvider.overrideWithValue(() => FakeRealtime()),
            locationServiceProvider.overrideWithValue(FakeLocation()),
          ],
        ),
      );
      await t.pump();
      await t.pump(const Duration(milliseconds: 100));
      final ret = find.widgetWithText(VoltiButton, 'Devolver moto');
      expect(ret, findsOneWidget);
      final screen = t.view.physicalSize / t.view.devicePixelRatio;
      expect(t.getBottomLeft(ret).dy, lessThanOrEqualTo(screen.height));
      expect(t.getTopLeft(ret).dy, greaterThanOrEqualTo(0));
      // O botao acompanha o texto: nunca menor que a linha do rotulo.
      expect(
        t.getSize(ret).height,
        greaterThanOrEqualTo(t.getSize(find.descendant(of: ret, matching: find.text('Devolver moto'))).height + 8),
      );
      expect(t.takeException(), isNull);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('R2-23 troca com a bateria cheia avisa; com bateria baixa nao a $pct%', (t) async {
      for (final (battery, warned) in [(100, true), (40, false)]) {
        phone(t, scale: scale, size: const Size(412, 1800));
        await t.pumpWidget(
          testApp(
            Scaffold(
              body: SwapConfirmSheet(rental: sampleRental(), stationId: 's1', stationCode: 'st-1'),
            ),
            overrides: [backendProvider.overrideWithValue(_Ride()..battery = battery)],
          ),
        );
        await settle(t);
        expect(find.byKey(const Key('swap-confirm-full')), warned ? findsOneWidget : findsNothing);
        if (warned) expect(find.text('Sua bateria está em 100%. Trocar mesmo assim?'), findsOneWidget);
        await t.pumpWidget(const SizedBox());
      }
    });

    testWidgets('R2-25 trocar bateria: distancia, estacao sem bateria inativa e "Escanear QR" a $pct%', (t) async {
      phone(t, scale: scale, size: const Size(412, 1800));
      bool? result;
      await t.pumpWidget(
        testApp(
          Builder(
            builder: (ctx) => Scaffold(
              body: Center(
                child: VoltiButton(label: 'abrir', onPressed: () async => result = await BatterySwapSheet.show(ctx, 'r1')),
              ),
            ),
          ),
          overrides: [backendProvider.overrideWithValue(_Stations()), locationServiceProvider.overrideWithValue(FakeLocation())],
        ),
      );
      await t.tap(find.text('abrir'));
      await settle(t);
      expect(find.textContaining('250 m'), findsOneWidget);
      final empty = find.byKey(const Key('swap-station-s2'));
      expect(t.widget<ListRow>(find.descendant(of: empty, matching: find.byType(ListRow))).onTap, isNull);
      await t.ensureVisible(find.byKey(const Key('swap-scan-qr')));
      await t.tap(find.byKey(const Key('swap-scan-qr')));
      await settle(t);
      expect(result, isTrue);
    });

    testWidgets('R2-28 home recarrega os galpoes ao voltar do segundo plano a $pct%', (t) async {
      phone(t, scale: scale);
      final b = _Stations()..rentalNow = null;
      await t.pumpWidget(
        testApp(
          const HomeScreen(),
          overrides: [
            backendProvider.overrideWithValue(b),
            pushServiceProvider.overrideWithValue(NoopPushService()),
            locationServiceProvider.overrideWithValue(FakeLocation()),
            sessionProvider.overrideWith(() => FakeSession(session())),
            clockProvider.overrideWithValue(() => thu10),
            realtimeFactoryProvider.overrideWithValue(() => FakeRealtime()),
          ],
        ),
      );
      await settle(t);
      final before = b.depotCalls;
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await settle(t);
      expect(b.depotCalls, greaterThan(before));
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('R2-08 Concluir fixo no rodape e o toast fica acima dele a $pct%', (t) async {
      phone(t, scale: scale);
      await t.pumpWidget(
        testApp(
          const SummaryScreen(rentalId: 'r1'),
          overrides: [
            backendProvider.overrideWithValue(_Receipt(const [])),
            inAppUrlLauncherProvider.overrideWithValue((uri) async => throw Exception('sem app')),
          ],
        ),
      );
      await t.pump();
      await t.pump(const Duration(seconds: 2));
      final finish = find.byKey(const Key('summary-finish'));
      expect(finish, findsOneWidget);
      await t.scrollUntilVisible(find.widgetWithText(ListRow, 'Recibo e nota fiscal'), 200, scrollable: find.byType(Scrollable).first);
      await t.tap(find.widgetWithText(ListRow, 'Recibo e nota fiscal'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      final toast = find.byKey(const Key('volti-toast'));
      expect(toast, findsOneWidget);
      expect(t.getBottomLeft(toast).dy, lessThanOrEqualTo(t.getTopLeft(finish).dy));
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('R2-20 recibo com moto parada mostra o pin e nao a linha a $pct%', (t) async {
      phone(t, scale: scale, size: const Size(412, 1800));
      final still = [for (var i = 0; i < 50; i++) _pt(-23.56, -46.65)];
      await t.pumpWidget(
        testApp(
          ProviderScope(
            overrides: [mapEnabledProvider.overrideWithValue(true)],
            child: const SummaryScreen(rentalId: 'r1'),
          ),
          overrides: [backendProvider.overrideWithValue(_Receipt(still))],
        ),
      );
      await t.pump();
      await t.pump(const Duration(seconds: 2));
      expect(find.byKey(const Key('receipt-map')), findsOneWidget);
      expect(find.byKey(const Key('receipt-end')), findsOneWidget);
      expect(find.byKey(const Key('receipt-start')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('R2-09 privacidade em grupos e exclusao discreta no fim a $pct%', (t) async {
      phone(t, scale: scale, size: const Size(412, 2600));
      await t.pumpWidget(
        testApp(
          const PrivacyScreen(),
          overrides: [backendProvider.overrideWithValue(GalpaoBackend()), sessionProvider.overrideWith(() => FakeSession(session()))],
        ),
      );
      await settle(t);
      expect(find.byType(VoltiListGroup), findsNWidgets(2));
      expect(find.byKey(const Key('privacy-location-switch')), findsOneWidget);
      expect(find.text('Só rastreamos sua posição com um aluguel ativo. Você pode desligar aqui quando quiser.'), findsOneWidget);
      final export = find.byType(VoltiButton);
      final del = find.byKey(const Key('privacy-delete'));
      expect(del, findsOneWidget);
      expect(t.getTopLeft(del).dy - t.getBottomLeft(export).dy, greaterThanOrEqualTo(VoltiSpacing.s32));
      expect(t.takeException(), isNull);
    });

    testWidgets('R2-11 contato salvo: autorizacao marcada e mascara no telefone a $pct%', (t) async {
      phone(t, scale: scale, size: const Size(412, 2000));
      final c = customer().rebuild(
        (b) => b
          ..emergencyContactName = 'Joana'
          ..emergencyContactPhone = '+5511987654321',
      );
      await t.pumpWidget(
        testApp(
          const EmergencyContactScreen(),
          overrides: [
            backendProvider.overrideWithValue(GalpaoBackend()),
            sessionProvider.overrideWith(() => FakeSession(SessionState(signedIn: true, customer: c, consents: session().consents))),
          ],
        ),
      );
      await settle(t);
      expect(t.widget<VoltiCheckbox>(find.byKey(const Key('emergency-consent'))).value, isTrue);
      // Trocar o telefone (outra pessoa) zera o aceite; voltar ao salvo nao o devolve sozinho.
      await t.enterText(find.byKey(const Key('emergency-phone')), '11911112222');
      await t.pump();
      expect(t.widget<VoltiCheckbox>(find.byKey(const Key('emergency-consent'))).value, isFalse);
      expect(find.byIcon(LucideIcons.user), findsOneWidget);
      expect(find.byIcon(LucideIcons.phone), findsOneWidget);
      await t.enterText(find.byKey(const Key('emergency-phone')), '11912345678');
      expect(t.widget<TextField>(find.byKey(const Key('emergency-phone'))).controller!.text, '(11) 91234-5678');
      expect(t.takeException(), isNull);
    });

    testWidgets('R2-17 foto enviada mantem titulo, "Enviada" e "Refazer"; titulo segue a escolha a $pct%', (t) async {
      phone(t, scale: scale, size: const Size(412, 2200));
      DocumentType? type;
      Uint8List? doc;
      await t.pumpWidget(
        testApp(
          DocumentsStep(
            name: 'Ana',
            cpf: '12345678909',
            birth: '01/01/1990',
            initialType: DocumentType.rg,
            initialDoc: Uint8List.fromList([1]),
            initialSelfie: Uint8List.fromList([2]),
            onBack: () {},
            onSubmitted: () {},
            onPhotosChanged: (tp, d, s) {
              type = tp;
              doc = d;
            },
          ),
          overrides: [backendProvider.overrideWithValue(GalpaoBackend()), photoPickerProvider.overrideWithValue(FakePhotoPicker())],
        ),
      );
      await settle(t);
      expect(find.text('Foto do RG'), findsOneWidget);
      expect(find.text('Enviada'), findsNWidgets(2));
      expect(find.text('Refazer'), findsNWidgets(2));
      await t.tap(find.text('Foto do RG'));
      await settle(t);
      expect(doc, isNotNull, reason: 'o fluxo guarda a foto');
      expect(type, DocumentType.rg);
      await t.tap(find.text('CNH'));
      await settle(t);
      expect(find.text('Foto da CNH'), findsOneWidget);
      expect(t.takeException(), isNull);
    });

    testWidgets('R2-13 plano: esqueleto visivel logo no primeiro quadro a $pct%', (t) async {
      phone(t, scale: scale);
      final b = _Slow();
      await t.pumpWidget(testApp(PlanScreen(selection: selection()), overrides: [backendProvider.overrideWithValue(b)]));
      await t.pump();
      expect(find.byType(VoltiSkeleton), findsOneWidget);
      expect(t.takeException(), isNull);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('R2-14 resumo: "Bloqueado agora" e icone de raio em "Retirar agora" a $pct%', (t) async {
      phone(t, scale: scale, size: const Size(412, 2200));
      await t.pumpWidget(
        testApp(
          PickupScreen(selection: selection(p: plan(PlanCode.day, 'Diário', PlanUnit.day, 8900))),
          overrides: [
            backendProvider.overrideWithValue(GalpaoBackend()),
            sessionProvider.overrideWith(() => FakeSession(session())),
            clockProvider.overrideWithValue(() => thu10),
          ],
        ),
      );
      await settle(t);
      expect(find.text('Bloqueado agora (caução)'), findsOneWidget);
      expect(t.widget<VoltiButton>(find.byKey(const Key('pickup-confirm'))).icon, LucideIcons.zap);
      expect(t.takeException(), isNull);
    });

    testWidgets('R2-24 foto da saida abre em tela cheia com zoom a $pct%', (t) async {
      phone(t, scale: scale);
      await t.pumpWidget(
        testApp(
          Builder(
            builder: (ctx) => Scaffold(
              body: Center(
                child: VoltiButton(label: 'abrir', onPressed: () => openHandoverPhoto(ctx, 'http://x/p.jpg', 'Foto 1 de 2')),
              ),
            ),
          ),
        ),
      );
      await t.tap(find.text('abrir'));
      await settle(t);
      expect(find.byKey(const Key('handover-photo-viewer')), findsOneWidget);
      expect(find.byType(InteractiveViewer), findsOneWidget);
      await t.tap(find.byTooltip('Fechar'));
      await settle(t);
      expect(find.byKey(const Key('handover-photo-viewer')), findsNothing);
    });

    testWidgets('R2-16 home parada: galpao e estacoes ficam entre a faixa do passe e o cartao a $pct%', (t) async {
      phone(t, scale: scale);
      final b = StationsBackend(depots: [depotFixture()])
        ..stations = [st('st-a', 'Largo da Batata', lat: -23.567, lng: -46.686), st('st-b', 'Faria Lima', lat: -23.5645, lng: -46.6895)];
      await pumpHome(t, b, mapOn: true);
      await settle(t);
      await settle(t);
      final promos = t.getRect(find.byKey(const Key('home-promos')));
      final card = t.getRect(find.byKey(const Key('depot-card')));
      for (final k in ['depot-pin-dep1', 'station-st-a', 'station-st-b']) {
        final f = find.byKey(ValueKey(k));
        expect(f, findsOneWidget, reason: k);
        final c = t.getCenter(f);
        expect(c.dy, greaterThan(promos.bottom), reason: '$k abaixo da faixa do passe');
        expect(c.dy, lessThan(card.top), reason: '$k acima do cartao');
      }
      expect(t.takeException(), isNull);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('R2-15 devolver no galpao: some a zona verde e aparece o pin do galpao a $pct%', (t) async {
      phone(t, scale: scale);
      final b = HandoverBackend()..rentalNow = sampleRental();
      await t.pumpWidget(
        testApp(
          ProviderScope(
            overrides: [mapEnabledProvider.overrideWithValue(true)],
            child: const ReturnScreen(rentalId: 'r1'),
          ),
          overrides: [
            backendProvider.overrideWithValue(b),
            locationServiceProvider.overrideWithValue(FakeLocation()),
            realtimeFactoryProvider.overrideWithValue(RtHub().create),
          ],
        ),
      );
      await settle(t);
      expect(find.byType(FlutterMap), findsOneWidget);
      expect(find.byKey(const Key('return-depot-pin')), findsNothing);
      await t.tap(find.text('Galpão'));
      await settle(t);
      expect(find.byKey(const Key('return-depot-pin')), findsOneWidget);
      expect(find.byKey(const Key('return-zones')), findsNothing);
      await t.tap(find.text('Ponto verde'));
      await settle(t);
      expect(find.byKey(const Key('return-depot-pin')), findsNothing);
      expect(t.takeException(), isNull);
    });
  }
}
