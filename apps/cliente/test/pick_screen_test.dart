import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/pick/pick_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';

VehicleSummary vs(String code, String model, {int battery = 90, double range = 20, double lat = -23.5620}) =>
    VehicleSummary((b) => b
      ..id = 'id-$code'
      ..code = code
      ..model = model
      ..status = VehicleStatus.free
      ..lat = lat
      ..lng = -46.6559
      ..batteryPct = battery
      ..estimatedRangeKm = range);

final fleet = [
  vs('VT-0458', 'Volti Flash', battery: 91, range: 20, lat: -23.5622),
  vs('VT-4821', 'Volti Flash', battery: 84, range: 18, lat: -23.5640),
  vs('VT-7190', 'Volti Cargo', battery: 88, range: 19, lat: -23.5655),
  vs('VT-0912', 'Volti Urban', battery: 66, range: 13, lat: -23.5670),
];

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

class PickBackend extends FakeBackend {
  PickBackend({List<VehicleSummary>? vehicles, this.fail = false}) : vehicles = vehicles ?? fleet;
  List<VehicleSummary> vehicles;
  bool fail;
  int nearbyCalls = 0;
  final reserved = <String>[];
  Reservation? reservation;

  @override
  Future<List<VehicleSummary>> nearby(double lat, double lng, {double? minRangeKm}) async {
    nearbyCalls++;
    if (fail) throw AppFailure(kind: FailureKind.network);
    return vehicles;
  }

  @override
  Future<List<PricingPlan>> plans() async => [minutePlan()];
  @override
  Future<Reservation?> currentReservation() async => reservation;
  @override
  Future<Rental?> currentRental() async => null;
  @override
  Future<List<GeoZone>> zones() async => [];
  @override
  Future<Reservation> reserve(String vehicleId) async {
    reserved.add(vehicleId);
    return Reservation((b) => b
      ..id = 'res1'
      ..vehicleId = vehicleId
      ..status = ReservationStatus.active
      ..createdAt = DateTime.utc(2026, 10, 21, 12)
      ..expiresAt = DateTime.utc(2026, 10, 21, 12, 15));
  }
}

class HereLocation extends FakeLocation {
  @override
  Future<bool> hasPermission() async => true;
  @override
  Future<LatLng?> currentPosition({bool requestPermission = false}) async => const LatLng(-23.5614, -46.6559);
}

void phone(WidgetTester t, {double scale = 1}) {
  t.view.physicalSize = const Size(412, 915);
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
}

Future<void> pumpPick(WidgetTester t, PickBackend b, {KycStatus kyc = KycStatus.approved, LocationService? location}) async {
  await t.pumpWidget(testApp(const PickScreen(), overrides: [
    backendProvider.overrideWithValue(b),
    locationServiceProvider.overrideWithValue(location ?? HereLocation()),
    sessionProvider.overrideWith(() => FakeSession(session(kyc: kyc))),
  ]));
  await t.pump();
  await t.pump(const Duration(seconds: 1));
}

Finder ctaText(String s) => find.text(s);

void main() {
  testWidgets('lista as motos com modelo, codigo, categoria, bateria, distancia a pe e preco', (t) async {
    phone(t);
    await pumpPick(t, PickBackend());
    expect(find.text('Escolha sua moto'), findsOneWidget);
    expect(find.text('4 disponíveis perto de você'), findsOneWidget);
    expect(find.text('VT-0458'), findsOneWidget);
    expect(find.text('Urbana'), findsWidgets);
    expect(find.text('Com baú · entregas'), findsOneWidget);
    expect(find.text('Assento duplo'), findsOneWidget);
    expect(find.text('~20 km'), findsOneWidget);
    // 0,0008 grau de latitude ~ 89 m -> 1 min.
    expect(find.text('89 m · 1 min'), findsOneWidget);
    expect(find.text(r'R$ 0,79/min'), findsNWidgets(4));
    // Sem promocao ativa nao ha selo de 1a gratis.
    expect(find.text('1ª grátis'), findsNothing);
    // Chips derivados dos modelos presentes, na ordem do design.
    for (final m in ['Todas', 'Volti Flash', 'Volti Urban', 'Volti Cargo']) {
      expect(find.widgetWithText(GestureDetector, m), findsWidgets);
    }
    expect(find.text('A moto fica reservada por 15 min, sem custo.'), findsOneWidget);
    // A mais proxima ja vem selecionada.
    expect(find.text('Reservar Volti Flash · VT-0458'), findsOneWidget);
    expect(t.takeException(), isNull);
  });

  testWidgets('sem localizacao nao mostra distancia a pe', (t) async {
    phone(t);
    await pumpPick(t, PickBackend(), location: FakeLocation());
    expect(find.text('VT-0458'), findsOneWidget);
    expect(find.text(r'R$ 0,79/min'), findsNWidgets(4));
    expect(find.textContaining(' m · '), findsNothing);
  });

  testWidgets('filtra por modelo e a selecao acompanha', (t) async {
    phone(t);
    await pumpPick(t, PickBackend());
    final chip = find.text('Volti Cargo').first;
    await t.ensureVisible(chip);
    await t.pumpAndSettle();
    await t.tap(chip);
    await t.pumpAndSettle();
    expect(find.text('1 disponível perto de você'), findsOneWidget);
    expect(find.text('VT-0458'), findsNothing);
    expect(find.text('Reservar Volti Cargo · VT-7190'), findsOneWidget);
    await t.ensureVisible(find.text('Todas'));
    await t.pumpAndSettle();
    await t.tap(find.text('Todas'));
    await t.pumpAndSettle();
    expect(find.text('4 disponíveis perto de você'), findsOneWidget);
  });

  testWidgets('tocar num cartao seleciona e muda o botao', (t) async {
    phone(t);
    final h = t.ensureSemantics();
    await pumpPick(t, PickBackend());
    await t.scrollUntilVisible(find.text('VT-0912'), 200, scrollable: find.descendant(of: find.byKey(const Key('pick-list')), matching: find.byType(Scrollable)));
    await t.pumpAndSettle();
    await t.tap(find.text('VT-0912'));
    await t.pumpAndSettle();
    expect(find.text('Reservar Volti Urban · VT-0912'), findsOneWidget);
    final node = t.getSemantics(find.byKey(const Key('pick-card-id-VT-0912')));
    expect(node, isSemantics(isChecked: true, isInMutuallyExclusiveGroup: true));
    expect(node.label, startsWith('Volti Urban VT-0912, Assento duplo, bateria 66 por cento'));
    h.dispose();
  });

  testWidgets('reservar chama a API e vai para a tela da reserva', (t) async {
    phone(t);
    final b = PickBackend();
    final router = GoRouter(initialLocation: '/pick', routes: [
      GoRoute(path: '/pick', builder: (_, _) => const PickScreen()),
      GoRoute(path: '/reserved', builder: (_, _) => const Scaffold(body: Text('tela-reserva'))),
    ]);
    await t.pumpWidget(testRouterApp(router, overrides: [
      backendProvider.overrideWithValue(b),
      locationServiceProvider.overrideWithValue(HereLocation()),
      sessionProvider.overrideWith(() => FakeSession(session())),
    ]));
    await t.pump();
    await t.pump(const Duration(seconds: 1));
    await t.tap(find.text('Reservar Volti Flash · VT-0458'));
    await t.pumpAndSettle();
    expect(b.reserved, ['id-VT-0458']);
    expect(find.text('tela-reserva'), findsOneWidget);
  });

  testWidgets('KYC em analise: lista aparece, botao desligado com o motivo', (t) async {
    phone(t);
    final b = PickBackend();
    await pumpPick(t, b, kyc: KycStatus.pending);
    expect(find.text('VT-0458'), findsOneWidget);
    expect(find.text('Verificação em análise'), findsOneWidget);
    expect(find.text('Você pode reservar depois da aprovação dos seus documentos.'), findsOneWidget);
    await t.tap(find.text('Reservar Volti Flash · VT-0458'));
    await t.pumpAndSettle();
    expect(b.reserved, isEmpty);
  });

  testWidgets('reserva ativa bloqueia com o motivo', (t) async {
    phone(t);
    final b = PickBackend()
      ..reservation = Reservation((r) => r
        ..id = 'r'
        ..vehicleId = 'x'
        ..status = ReservationStatus.active
        ..createdAt = DateTime.utc(2026)
        ..expiresAt = DateTime.utc(2026));
    await pumpPick(t, b);
    expect(find.text('Você já tem uma reserva ativa.'), findsOneWidget);
  });

  testWidgets('estado vazio com tentar de novo', (t) async {
    phone(t);
    final b = PickBackend(vehicles: []);
    await pumpPick(t, b);
    expect(find.text('Nenhuma moto por perto agora'), findsOneWidget);
    expect(find.text('Selecione uma moto'), findsOneWidget);
    final before = b.nearbyCalls;
    await t.tap(find.text('Tentar de novo'));
    await t.pump();
    await t.pump(const Duration(seconds: 1));
    expect(b.nearbyCalls, before + 1);
  });

  testWidgets('erro com tentar de novo recarrega', (t) async {
    phone(t);
    final b = PickBackend(fail: true);
    await pumpPick(t, b);
    expect(find.text('Tentar de novo'), findsOneWidget);
    b.fail = false;
    await t.tap(find.text('Tentar de novo'));
    await t.pump();
    await t.pump(const Duration(seconds: 1));
    expect(find.text('VT-0458'), findsOneWidget);
  });

  testWidgets('200% de texto sem estouro, com e sem KYC', (t) async {
    phone(t, scale: 2);
    await pumpPick(t, PickBackend(), kyc: KycStatus.pending);
    expect(t.takeException(), isNull);
    await t.pumpWidget(const SizedBox());
    await pumpPick(t, PickBackend());
    expect(t.takeException(), isNull);
  });

  testWidgets('reduced motion: sem animacoes pendentes', (t) async {
    phone(t);
    await t.pumpWidget(MediaQuery(
      data: const MediaQueryData(disableAnimations: true, size: Size(412, 915)),
      child: testApp(const PickScreen(), overrides: [
        backendProvider.overrideWithValue(PickBackend()),
        locationServiceProvider.overrideWithValue(HereLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
      ]),
    ));
    await t.pump();
    await t.pump();
    await t.pump();
    expect(find.text('VT-0458'), findsOneWidget);
    // Cascata ja termina visivel: nenhum item com opacidade parcial.
    for (final o in t.widgetList<Opacity>(find.descendant(of: find.byType(VoltiFadeUp), matching: find.byType(Opacity)))) {
      expect(o.opacity, 1);
    }
  });
}
