// Passada no emulador (2026-11-03) com um aluguel ativo da VLT-0059 no plano
// Diaria: historico, recibo e home. (A carteira e so leitura no balcao: sem pacotes.)
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/account/account_screens.dart';
import 'package:volti_cliente/features/home/home_screen.dart';
import 'package:volti_cliente/features/summary/summary_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';
import 'pick_catalog_test.dart' show loadFonts;

/// 03/11/2026 21:59 em Sao Paulo (UTC-3).
final _started = DateTime.utc(2026, 11, 4, 0, 59);

/// 1 h 28 min depois do inicio.
final _now = _started.add(const Duration(hours: 1, minutes: 28, seconds: 12));

Rental _rental({String id = 'r1', RentalStatus status = RentalStatus.active, DateTime? startedAt}) => sampleRental(status: status).rebuild((b) => b
  ..id = id
  ..vehicleCode = 'VLT-0059'
  ..planCode = PlanCode.day
  ..startedAt = startedAt ?? _started
  ..elapsedSeconds = 5280
  ..costCents = 8900);

class _HistoryBackend extends FakeBackend {
  _HistoryBackend(this.list);
  final List<Rental> list;
  @override
  Future<List<Rental>> rentals() async => list;
}

class _ReceiptBackend extends FakeBackend {
  @override
  Future<Receipt> receipt(String rentalId) async =>
      throw AppFailure(kind: FailureKind.api, status: 409, slug: 'rental-not-active', detail: 'O recibo fica disponível depois do encerramento.');
}

class _RideHomeBackend extends GalpaoBackend {
  @override
  Future<Rental?> currentRental() async => _rental();
}

void _phone(WidgetTester t, {Size size = const Size(412, 915)}) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

/// Historico como segunda tela (com voltar), recibo e corrida como rotas.
GoRouter _historyRouter() => GoRouter(initialLocation: '/start', routes: [
      GoRoute(path: '/start', builder: (c, _) => const Scaffold(body: Text('INICIO'))),
      GoRoute(path: '/history', builder: (c, _) => const HistoryScreen()),
      GoRoute(path: '/ride', builder: (c, _) => const Scaffold(body: Text('CORRIDA'))),
      GoRoute(path: '/summary/:id', builder: (c, s) => SummaryScreen(rentalId: s.pathParameters['id']!)),
      GoRoute(path: '/account/claim/:id', builder: (c, _) => const Scaffold(body: Text('SINISTRO'))),
    ]);

void main() {
  setUpAll(loadFonts);

  group('historico com aluguel em andamento', () {
    Future<GoRouter> pumpHistory(WidgetTester t, List<Rental> list) async {
      _phone(t);
      final router = _historyRouter();
      addTearDown(router.dispose);
      await t.pumpWidget(testRouterApp(router, overrides: [
        backendProvider.overrideWithValue(_HistoryBackend(list)),
        clockProvider.overrideWithValue(() => _now),
      ]));
      router.push('/history');
      await t.pumpAndSettle();
      return router;
    }

    testWidgets('linha compacta: placa no titulo, data e duracao no subtitulo e selo "Em andamento"', (t) async {
      await pumpHistory(t, [
        _rental(),
        _rental(id: 'r0', status: RentalStatus.ended, startedAt: DateTime.utc(2025, 12, 30, 15)).rebuild((b) => b
          ..vehicleCode = 'VLT-0001'
          ..elapsedSeconds = 249
          ..costCents = 1250),
      ]);
      expect(find.text('VLT-0059'), findsOneWidget);
      expect(find.text('03/11 21:59 · 1 h 28 min'), findsOneWidget);
      expect(find.text('Em andamento'), findsOneWidget);
      // Ano anterior: a data leva o ano.
      expect(find.text('VLT-0001'), findsOneWidget);
      expect(find.text('30/12/2025 12:00 · 4 min 9 s'), findsOneWidget);
      expect(find.text('R\$ 12,50'), findsOneWidget);
      expect(find.textContaining('Moto VLT'), findsNothing);
      expect(t.takeException(), isNull);
    });

    for (final status in [RentalStatus.active, RentalStatus.paused, RentalStatus.ending]) {
      testWidgets('acoes de um aluguel ${status.name}: so voltar a corrida, sem recibo nem contestacao', (t) async {
        final router = await pumpHistory(t, [_rental(status: status)]);
        await t.tap(find.text('VLT-0059'));
        await t.pumpAndSettle();
        expect(find.text('Voltar à corrida'), findsOneWidget);
        expect(find.text('Abrir sinistro'), findsNothing);
        expect(find.text('Ver recibo'), findsNothing);
        expect(find.text('Contestar cobrança'), findsNothing);
        await t.tap(find.text('Voltar à corrida'));
        await t.pumpAndSettle();
        expect(router.routerDelegate.currentConfiguration.uri.path, '/ride');
        expect(find.text('CORRIDA'), findsOneWidget);
      });
    }

    testWidgets('aluguel encerrado mantem recibo, contestacao e sinistro', (t) async {
      await pumpHistory(t, [_rental(status: RentalStatus.ended)]);
      await t.tap(find.text('VLT-0059'));
      await t.pumpAndSettle();
      expect(find.text('Ver recibo'), findsOneWidget);
      expect(find.text('Contestar cobrança'), findsOneWidget);
      expect(find.text('Abrir sinistro'), findsOneWidget);
      expect(find.text('Voltar à corrida'), findsNothing);
      expect(find.text('Em andamento'), findsNothing);
    });
  });

  group('recibo', () {
    testWidgets('aberto por cima de outra tela tem o voltar redondo; antes do encerramento e um aviso neutro', (t) async {
      _phone(t);
      final router = _historyRouter();
      addTearDown(router.dispose);
      await t.pumpWidget(testRouterApp(router, overrides: [backendProvider.overrideWithValue(_ReceiptBackend())]));
      router.push('/summary/r1');
      await t.pumpAndSettle();
      expect(find.widgetWithIcon(VoltiIconButton, LucideIcons.arrowLeft), findsOneWidget);
      expect(find.text('O recibo fica disponível quando a corrida terminar.'), findsOneWidget);
      expect(find.text('Tentar de novo'), findsNothing);
      expect(find.byIcon(LucideIcons.circleAlert), findsNothing);
      await t.tap(find.widgetWithIcon(VoltiIconButton, LucideIcons.arrowLeft));
      await t.pumpAndSettle();
      expect(find.text('INICIO'), findsOneWidget);
    });

    testWidgets('aviso neutro leva de volta a corrida', (t) async {
      _phone(t);
      final router = _historyRouter();
      addTearDown(router.dispose);
      await t.pumpWidget(testRouterApp(router, overrides: [backendProvider.overrideWithValue(_ReceiptBackend())]));
      router.push('/summary/r1');
      await t.pumpAndSettle();
      await t.tap(find.text('Voltar à corrida'));
      await t.pumpAndSettle();
      expect(find.text('CORRIDA'), findsOneWidget);
    });

    testWidgets('aberto no fim da corrida (sem tela atras) nao mostra voltar', (t) async {
      _phone(t);
      await t.pumpWidget(testApp(const SummaryScreen(rentalId: 'r1'), overrides: [backendProvider.overrideWithValue(_ReceiptBackend())]));
      await t.pumpAndSettle();
      expect(find.widgetWithIcon(VoltiIconButton, LucideIcons.arrowLeft), findsNothing);
    });
  });

  group('home', () {
    Future<void> pumpHome(WidgetTester t, FakeBackend b, {Size size = const Size(412, 915)}) async {
      _phone(t, size: size);
      await t.pumpWidget(testApp(const HomeScreen(), overrides: [
        backendProvider.overrideWithValue(b),
        pushServiceProvider.overrideWithValue(NoopPushService()),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => _now),
        realtimeFactoryProvider.overrideWithValue(() => FakeRealtime()),
      ]));
      for (var i = 0; i < 6; i++) {
        await t.pump(const Duration(milliseconds: 300));
      }
    }

    testWidgets('pilula sem espaco: nome e bairro em linhas separadas, sem "·" pendurado', (t) async {
      await pumpHome(t, _NarrowDepotBackend(), size: const Size(340, 800));
      final pill = find.byKey(const Key('home-location'));
      expect(find.descendant(of: pill, matching: find.text('Galpão Volti')), findsOneWidget);
      expect(find.descendant(of: pill, matching: find.text('Vila Madalena')), findsOneWidget);
      for (final p in t.renderObjectList<RenderParagraph>(find.descendant(of: pill, matching: find.byType(RichText)))) {
        expect(p.text.toPlainText().trim().endsWith('·'), isFalse);
      }
      expect(t.takeException(), isNull);
    });

    testWidgets('pilula com espaco: uma linha so', (t) async {
      await pumpHome(t, _NarrowDepotBackend(), size: const Size(800, 900));
      expect(find.descendant(of: find.byKey(const Key('home-location')), matching: find.text('Galpão Volti · Vila Madalena')), findsOneWidget);
    });

    testWidgets('cartao da corrida mostra o tempo correndo e o valor parcial', (t) async {
      await pumpHome(t, _RideHomeBackend());
      final card = find.byKey(const Key('home-ride-card'));
      expect(card, findsOneWidget);
      expect(find.descendant(of: card, matching: find.text('VLT-0059')), findsOneWidget);
      expect(find.descendant(of: card, matching: find.text('1:28:12')), findsOneWidget);
      expect(find.descendant(of: card, matching: find.text('R\$ 89,00')), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });
  });
}

class _NarrowDepotBackend extends GalpaoBackend {
  _NarrowDepotBackend() : super(depots: [depotFixture(district: 'Vila Madalena')]);
}
