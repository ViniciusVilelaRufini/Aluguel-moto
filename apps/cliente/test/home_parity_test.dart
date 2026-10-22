import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/home/home_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';

VehicleSummary vs(String code, double range) => VehicleSummary((b) => b
  ..id = 'id-$code'
  ..code = code
  ..model = 'Volti Flash'
  ..status = VehicleStatus.free
  ..lat = -23.5620
  ..lng = -46.6559
  ..batteryPct = 50
  ..estimatedRangeKm = range);

class ParityBackend extends FakeBackend {
  ParityBackend(this.vehicles, {this.unread = 0, this.zonesFail = false});
  final List<VehicleSummary> vehicles;
  final int unread;
  bool zonesFail;
  int nearbyCalls = 0;
  @override
  Future<List<VehicleSummary>> nearby(double lat, double lng, {double? minRangeKm}) async {
    nearbyCalls++;
    return vehicles;
  }

  @override
  Future<List<GeoZone>> zones() async {
    if (zonesFail) throw Exception('zones');
    return [];
  }
  @override
  Future<Reservation?> currentReservation() async => null;
  @override
  Future<Rental?> currentRental() async => null;
  @override
  Future<List<SupportConversation>> conversations() async => [
        SupportConversation((b) => b
          ..id = 'c'
          ..customerId = 'c1'
          ..subject = 'Ajuda'
          ..status = ConversationStatus.open
          ..unreadCount = unread
          ..createdAt = DateTime.utc(2026)
          ..lastMessageAt = DateTime.utc(2026)),
      ];
}

void phone(WidgetTester t, {double scale = 1}) {
  t.view.physicalSize = const Size(412, 915);
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
}

Future<void> pump(WidgetTester t, ParityBackend b, {KycStatus kyc = KycStatus.approved, GoRouter? router}) async {
  final overrides = [
    backendProvider.overrideWithValue(b),
    pushServiceProvider.overrideWithValue(NoopPushService()),
    locationServiceProvider.overrideWithValue(FakeLocation()),
    sessionProvider.overrideWith(() => FakeSession(session(kyc: kyc))),
  ];
  await t.pumpWidget(router == null ? testApp(const HomeScreen(), overrides: overrides) : testRouterApp(router, overrides: overrides));
  await t.pump();
  await t.pump(const Duration(seconds: 1));
}

void main() {
  testWidgets('cabecalho, promocoes, filtros e "Escolher moto" como no design', (t) async {
    phone(t);
    await pump(t, ParityBackend([vs('A', 12)]));
    expect(find.text('AL'), findsOneWidget);
    expect(find.text('Sua localização'), findsOneWidget);
    // Sem geocodificacao reversa e fora de um ponto de retirada.
    expect(find.text('Perto de você'), findsOneWidget);
    expect(find.text('Desbloqueie seu passe'), findsOneWidget);
    expect(find.text('Ande mais, pague menos'), findsOneWidget);
    // Promocao de 1a corrida so com a flag ligada e cliente sem alugueis.
    expect(find.text('1ª corrida grátis'), findsNothing);
    for (final f in ['Todas', 'Autonomia 10+ km', 'Pontos de retirada']) {
      expect(find.text(f), findsOneWidget);
    }
    expect(find.text('Escolher moto'), findsOneWidget);
    expect(find.text('Escanear para andar'), findsOneWidget);
    expect(t.widget<VoltiIconButton>(find.byKey(const Key('home-bell'))).dot, isFalse);
    expect(t.takeException(), isNull);
  });

  testWidgets('sino com bolinha quando ha mensagem nao lida do suporte', (t) async {
    phone(t);
    await pump(t, ParityBackend([], unread: 2));
    expect(t.widget<VoltiIconButton>(find.byKey(const Key('home-bell'))).dot, isTrue);
  });

  testWidgets('filtro "Autonomia 10+ km" esconde motos com menos autonomia', (t) async {
    phone(t);
    await pump(t, ParityBackend([vs('A', 6), vs('B', 9)]));
    expect(find.text('Nenhuma moto por perto agora'), findsNothing);
    await t.tap(find.text('Autonomia 10+ km'));
    await t.pump();
    await t.pump(const Duration(seconds: 1));
    expect(find.text('Nenhuma moto por perto agora'), findsOneWidget);
    await t.tap(find.text('Todas'));
    await t.pump();
    await t.pump(const Duration(seconds: 1));
    expect(find.text('Nenhuma moto por perto agora'), findsNothing);
  });

  testWidgets('"Escolher moto" abre a lista', (t) async {
    phone(t);
    final router = GoRouter(initialLocation: '/home', routes: [
      GoRoute(path: '/home', builder: (_, _) => const HomeScreen()),
      GoRoute(path: '/pick', builder: (_, _) => const Scaffold(body: Text('lista'))),
    ]);
    await pump(t, ParityBackend([vs('A', 12)]), router: router);
    await t.tap(find.text('Escolher moto'));
    await t.pumpAndSettle();
    expect(find.text('lista'), findsOneWidget);
  });

  testWidgets('200% de texto sem estouro com aviso de KYC', (t) async {
    phone(t, scale: 2);
    await pump(t, ParityBackend([vs('A', 12)]), kyc: KycStatus.pending);
    expect(t.takeException(), isNull);
  });

  testWidgets('"Pontos de retirada" sem zonas (erro) avisa e tenta de novo', (t) async {
    phone(t);
    final b = ParityBackend([vs('A', 12)], zonesFail: true);
    await pump(t, b);
    await t.ensureVisible(find.text('Pontos de retirada'));
    await t.pump(const Duration(seconds: 1));
    await t.tap(find.text('Pontos de retirada'));
    await t.pump();
    await t.pump(const Duration(seconds: 1));
    expect(find.byKey(const Key('pickup-zones-error')), findsOneWidget);
    expect(find.text('Não conseguimos carregar os pontos de retirada.'), findsOneWidget);
    b.zonesFail = false;
    await t.tap(find.text('Tentar de novo'));
    await t.pump();
    await t.pump(const Duration(seconds: 1));
    expect(find.byKey(const Key('pickup-zones-error')), findsNothing);
  });

  testWidgets('mapa atualiza as motos a cada 20 s sem voltar ao esqueleto', (t) async {
    phone(t);
    final b = ParityBackend([vs('A', 12)]);
    await pump(t, b);
    final c0 = b.nearbyCalls;
    await t.pump(const Duration(seconds: 21));
    expect(find.byKey(const Key('nearby-skeleton')), findsNothing);
    await t.pump();
    expect(b.nearbyCalls, c0 + 1);
  });
}

