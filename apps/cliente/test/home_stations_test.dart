// Home: botao "Pontos de troca de bateria" (modo estacoes), marcadores com a
// contagem de baterias e a folha "Troca de bateria".
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/launcher.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart' show mapEnabledProvider;
import 'package:flutter_map/flutter_map.dart';
import 'package:volti_cliente/features/home/home_screen.dart';
import 'package:volti_cliente/features/home/stations/station_logic.dart';
import 'package:volti_cliente/features/home/stations/station_markers.dart';
import 'package:volti_cliente/features/home/stations/stations_sheet.dart';
import 'package:volti_cliente/l10n/app_localizations.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';

SwapStation st(String id, String name, {int available = 6, int? distanceM, bool? open24h, double lat = -23.57, double lng = -46.69}) => SwapStation(
  (b) => b
    ..id = id
    ..name = name
    ..address = 'Av. $name, 100'
    ..lat = lat
    ..lng = lng
    ..availableBatteries = available
    ..totalSlots = 10
    ..openingHours = 'Seg a sáb, 7h às 22h'
    ..open24h = open24h
    ..distanceM = distanceM,
);

class StationsBackend extends GalpaoBackend {
  StationsBackend({super.depots});
  List<SwapStation> stations = [];
  Object? stationsError;
  int stationCalls = 0;

  @override
  Future<List<SwapStation>> swapStations({double? lat, double? lng}) async {
    stationCalls++;
    if (stationsError != null) throw toFailure(stationsError!);
    return stations;
  }
}

class HereLocation extends FakeLocation {
  @override
  Future<bool> hasPermission() async => true;
  @override
  Future<LatLng?> currentPosition({bool requestPermission = false}) async => const LatLng(-23.566, -46.684);
}

final opened = <Uri>[];

void phone(WidgetTester t, {double scale = 1, Size size = const Size(412, 915)}) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
}

Future<void> settle(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 300));
  }
}

Future<void> pumpHome(WidgetTester t, StationsBackend b, {bool reduceMotion = false, bool mapOn = false, ThemeData? theme}) async {
  // Mapa ligado no escopo filho (como em cliente_login_test), so na home.
  final router = GoRouter(
    initialLocation: '/home',
    routes: mapOn
        ? [
            GoRoute(
              path: '/home',
              builder: (_, _) => ProviderScope(overrides: [mapEnabledProvider.overrideWithValue(true)], child: const HomeScreen()),
            ),
          ]
        : appRoutes(),
  );
  addTearDown(router.dispose);
  if (reduceMotion) {
    t.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(t.platformDispatcher.clearAccessibilityFeaturesTestValue);
  }
  await t.pumpWidget(
    testRouterApp(
      router,
      theme: theme,
      overrides: [
        backendProvider.overrideWithValue(b),
        pushServiceProvider.overrideWithValue(NoopPushService()),
        locationServiceProvider.overrideWithValue(HereLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => thu10),
        urlLauncherProvider.overrideWithValue((uri) async {
          opened.add(uri);
          return true;
        }),
      ],
    ),
  );
  await settle(t);
}

final toggle = find.byKey(const Key('home-stations-toggle'));
final sheet = find.byKey(const Key('stations-sheet'));
final depotCard = find.byKey(const Key('depot-card'));

Future<void> tapToggle(WidgetTester t) async {
  await t.tap(toggle);
  await settle(t);
}

StationsBackend mixed() => StationsBackend(depots: [depotFixture().rebuild((d) => d.swapStationId = 'st-dep')])
  ..stations = [
    st('st-far', 'Faria Lima', available: 8, distanceM: 2400),
    st('st-near', 'Largo da Batata', available: 1, distanceM: 300),
    st('st-dep', 'Estação do galpão', available: 4, distanceM: 900, open24h: true),
    st('st-empty', 'Fradique', available: 0, distanceM: 1200),
  ];

double top(WidgetTester t, String key) => t.getTopLeft(find.byKey(Key(key))).dy;

void main() {
  setUp(opened.clear);

  group('ordem e disponibilidade', () {
    test('galpao primeiro (Depot.swapStationId), depois por distancia', () {
      final b = mixed();
      final pts = orderSwapPoints(b.depotList.first, b.stations);
      expect([for (final p in pts) p.station.id], ['st-dep', 'st-near', 'st-empty', 'st-far']);
      expect(pts.first.depot?.id, 'dep1');
      expect(pts.skip(1).every((p) => p.depot == null), isTrue);
    });

    test('sem localizacao (sem distanceM) mantem a ordem da API', () {
      final pts = orderSwapPoints(null, [st('a', 'A'), st('b', 'B'), st('c', 'C')]);
      expect([for (final p in pts) p.station.id], ['a', 'b', 'c']);
    });

    test('galpao sem estacao propria nao vira ponto', () {
      final pts = orderSwapPoints(depotFixture(), [st('a', 'A', distanceM: 5), st('b', 'B', distanceM: 1)]);
      expect([for (final p in pts) p.station.id], ['b', 'a']);
      expect(pts.every((p) => p.depot == null), isTrue);
    });

    test('estacao do galpao (swapStationId ou ate 30 m) vira selo do galpao', () {
      final dep = depotFixture(); // -23.566, -46.684
      final own = depotFixture(id: 'dep2').rebuild(
        (d) => d
          ..swapStationId = 'st-own'
          ..lat = -23.60
          ..lng = -46.70,
      );
      final r = splitDepotStations(
        [dep, own],
        [
          st('st-own', 'Propria', lat: -23.50, lng: -46.60), // longe, mas e a do galpao
          st('st-near', 'Colada', lat: -23.56615, lng: -46.68415), // ~22 m do dep1
          st('st-40', 'Vizinha', lat: -23.56636, lng: -46.684), // ~40 m: fica solta
          st('st-far', 'Longe'),
        ],
      );
      expect({for (final e in r.byDepot.entries) e.key: e.value.id}, {'dep2': 'st-own', 'dep1': 'st-near'});
      expect([for (final s in r.loose) s.id], ['st-40', 'st-far']);
      expect(splitDepotStations([dep], const []).byDepot, isEmpty);
    });

    test('verde >= 3, ambar 1-2, cinza 0', () {
      expect(stationAvailability(st('a', 'A', available: 3)), StationAvailability.many);
      expect(stationAvailability(st('a', 'A', available: 12)), StationAvailability.many);
      expect(stationAvailability(st('a', 'A', available: 2)), StationAvailability.few);
      expect(stationAvailability(st('a', 'A', available: 1)), StationAvailability.few);
      expect(stationAvailability(st('a', 'A', available: 0)), StationAvailability.none);
    });
  });

  group('marcadores', () {
    Future<void> pumpMarker(WidgetTester t, SwapStation s, {VoidCallback? onTap}) => t.pumpWidget(
      MaterialApp(
        theme: VoltiTheme.light(),
        locale: const Locale('pt', 'BR'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        home: Scaffold(
          body: Center(
            child: StationMarker(station: s, onTap: onTap),
          ),
        ),
      ),
    );

    Color badgeColor(WidgetTester t) => ((t.widget<DecoratedBox>(find.byKey(const Key('station-count-badge'))).decoration) as BoxDecoration).color!;

    testWidgets('contagem e cor por disponibilidade', (t) async {
      await pumpMarker(t, st('a', 'A', available: 8));
      expect(find.text('8'), findsOneWidget);
      expect(badgeColor(t), StationMarker.badgeColors(StationAvailability.many).$1);

      await pumpMarker(t, st('a', 'A', available: 2));
      expect(find.text('2'), findsOneWidget);
      expect(badgeColor(t), StationMarker.badgeColors(StationAvailability.few).$1);

      await pumpMarker(t, st('a', 'A', available: 0));
      expect(find.text('0'), findsOneWidget);
      expect(badgeColor(t), StationMarker.badgeColors(StationAvailability.none).$1);

      final cs = {for (final a in StationAvailability.values) StationMarker.badgeColors(a).$1};
      expect(cs, hasLength(3));
    });

    testWidgets('o marcador anuncia o nome e as baterias, com alvo >= 44 px', (t) async {
      final h = t.ensureSemantics();
      await pumpMarker(t, st('a', 'Faria Lima', available: 1));
      expect(find.bySemanticsLabel('Faria Lima: 1 bateria disponível'), findsOneWidget);
      final size = t.getSize(find.byType(StationMarker));
      expect(size.width, greaterThanOrEqualTo(44));
      expect(size.height, greaterThanOrEqualTo(44));
      h.dispose();
    });

    testWidgets('o leitor de tela ativa o marcador (acao de toque no no)', (t) async {
      final h = t.ensureSemantics();
      var taps = 0;
      await pumpMarker(t, st('a', 'Faria Lima', available: 1), onTap: () => taps++);
      final node = t.getSemantics(find.byType(StationMarker));
      expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      t.semantics.tap(find.semantics.byLabel('Faria Lima: 1 bateria disponível'));
      await t.pump();
      expect(taps, 1);
      h.dispose();
    });

    testWidgets('o numero do selo cresce com o texto do sistema, com teto de 1,3', (t) async {
      t.platformDispatcher.textScaleFactorTestValue = 2;
      addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
      await pumpMarker(t, st('a', 'A', available: 8));
      expect(MediaQuery.textScalerOf(t.element(find.text('8'))).scale(10), closeTo(13, 0.01));
      expect(t.takeException(), isNull);
      t.platformDispatcher.textScaleFactorTestValue = 1.2;
      await t.pump();
      expect(MediaQuery.textScalerOf(t.element(find.text('8'))).scale(10), closeTo(12, 0.01));
    });

    test('stationMarkers: um marcador por estacao, com chave', () {
      final ms = stationMarkers([st('a', 'A'), st('b', 'B')], onTap: (_) {});
      expect([for (final m in ms) m.key], [const ValueKey('station-mode-a'), const ValueKey('station-mode-b')]);
      expect(ms.first.width, greaterThanOrEqualTo(44));
    });
  });

  group('home', () {
    testWidgets('o botao alterna o modo estacoes (e fechar a folha sai dele)', (t) async {
      phone(t);
      final h = t.ensureSemantics();
      final b = mixed();
      await pumpHome(t, b);
      expect(toggle, findsOneWidget);
      expect(t.getSize(toggle).width, greaterThanOrEqualTo(44));
      expect(find.bySemanticsLabel('Pontos de troca de bateria'), findsOneWidget);
      // Acima do "Localizar".
      expect(t.getTopLeft(toggle).dy, lessThan(t.getTopLeft(find.bySemanticsLabel('Minha localização')).dy));
      expect(sheet, findsNothing);
      expect(depotCard, findsOneWidget);

      await tapToggle(t);
      expect(sheet, findsOneWidget);
      expect(find.text('Troca de bateria'), findsOneWidget);
      expect(depotCard, findsNothing);
      expect(t.getSemantics(find.bySemanticsLabel('Pontos de troca de bateria')), isSemantics(hasToggledState: true, isToggled: true));

      await tapToggle(t);
      expect(sheet, findsNothing);
      expect(depotCard, findsOneWidget);

      await tapToggle(t);
      await t.tap(find.byKey(const Key('stations-close')));
      await settle(t);
      expect(sheet, findsNothing);
      expect(depotCard, findsOneWidget);
      h.dispose();
    });

    testWidgets('folha: galpao primeiro, depois por distancia; pilulas e horario', (t) async {
      phone(t);
      await pumpHome(t, mixed());
      await tapToggle(t);
      final keys = ['station-row-st-dep', 'station-row-st-near', 'station-row-st-empty', 'station-row-st-far'];
      for (final k in keys) {
        await t.ensureVisible(find.byKey(Key(k)));
      }
      await t.dragUntilVisible(find.byKey(Key(keys.first)), find.byKey(const Key('stations-list')), const Offset(0, 300));
      await t.pump();
      expect(top(t, keys[0]), lessThan(top(t, keys[1])));
      expect(top(t, keys[1]), lessThan(top(t, keys[2])));
      // Galpao com o titulo do galpao.
      expect(find.descendant(of: find.byKey(Key(keys[0])), matching: find.text('Galpão Volti · Pinheiros')), findsOneWidget);
      expect(find.descendant(of: find.byKey(Key(keys[0])), matching: find.text('Aberto 24h')), findsOneWidget);
      expect(find.descendant(of: find.byKey(Key(keys[0])), matching: find.text('4 baterias disponíveis')), findsOneWidget);
      expect(find.descendant(of: find.byKey(Key(keys[1])), matching: find.text('1 bateria disponível')), findsOneWidget);
      expect(find.descendant(of: find.byKey(Key(keys[1])), matching: find.text('Seg a sáb, 7h às 22h')), findsOneWidget);
      expect(find.descendant(of: find.byKey(Key(keys[1])), matching: find.textContaining('300 m')), findsOneWidget);
      await t.ensureVisible(find.byKey(Key(keys[2])));
      expect(find.descendant(of: find.byKey(Key(keys[2])), matching: find.text('Sem baterias no momento')), findsOneWidget);
      await t.ensureVisible(find.byKey(Key(keys[3])));
      expect(find.descendant(of: find.byKey(Key(keys[3])), matching: find.text('8 baterias disponíveis')), findsOneWidget);
    });

    testWidgets('pilulas: cor do icone por disponibilidade', (t) async {
      phone(t);
      await pumpHome(t, mixed());
      await tapToggle(t);
      Color bolt(String id) => t.widget<Icon>(find.byKey(Key('station-pill-icon-$id'))).color!;
      await t.ensureVisible(find.byKey(const Key('station-pill-icon-st-near')));
      expect(bolt('st-near'), VoltiColors.warningInk);
      await t.ensureVisible(find.byKey(const Key('station-pill-icon-st-dep')));
      expect(bolt('st-dep'), VoltiColors.successInk);
      await t.ensureVisible(find.byKey(const Key('station-pill-icon-st-empty')));
      expect(bolt('st-empty'), VoltiColors.ink500);
    });

    testWidgets('"Como chegar" abre a rota da estacao', (t) async {
      phone(t);
      await pumpHome(t, mixed());
      await tapToggle(t);
      final go = find.byKey(const Key('station-directions-st-near'));
      await t.ensureVisible(go);
      await t.pump();
      // Abrir o modo e a lista nao abre nada: so o toque em "Como chegar".
      expect(opened, isEmpty);
      await t.ensureVisible(find.byKey(const Key('station-focus-st-near')));
      await t.pump();
      await t.tap(find.byKey(const Key('station-focus-st-near')));
      await t.pump();
      expect(opened, isEmpty);
      await t.ensureVisible(go);
      await t.pump();
      await t.tap(go);
      await t.pump();
      expect(opened, hasLength(1));
      expect(opened.first.toString(), contains('-23.57,-46.69'));
    });

    testWidgets('erro de rede: ErrorState com "Tentar de novo"', (t) async {
      phone(t);
      final b = mixed()
        ..stationsError = DioException(
          requestOptions: RequestOptions(path: '/swap-stations'),
          type: DioExceptionType.connectionError,
        );
      await pumpHome(t, b);
      await tapToggle(t);
      expect(find.byKey(const Key('stations-error')), findsOneWidget);
      b.stationsError = null;
      await t.tap(find.descendant(of: find.byKey(const Key('stations-error')), matching: find.text('Tentar de novo')));
      await settle(t);
      expect(find.byKey(const Key('stations-error')), findsNothing);
      expect(find.byKey(const Key('station-row-st-dep')), findsOneWidget);
    });

    testWidgets('sem estacoes: "Nenhum ponto de troca por perto"', (t) async {
      phone(t);
      await pumpHome(t, StationsBackend());
      await tapToggle(t);
      expect(find.text('Nenhum ponto de troca por perto'), findsOneWidget);
    });

    testWidgets('a linha anuncia a disponibilidade e o toque', (t) async {
      phone(t);
      final h = t.ensureSemantics();
      await pumpHome(t, mixed());
      await tapToggle(t);
      final node = t.getSemantics(find.byKey(const Key('station-focus-st-near')));
      expect(node.label, contains('Largo da Batata'));
      expect(node.label, contains('1 bateria disponível'));
      expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      expect(find.bySemanticsLabel('Como chegar a Largo da Batata'), findsOneWidget);
      h.dispose();
    });

    for (final reduce in [false, true]) {
      testWidgets('200% em 360x740 sem overflow (reduced motion: $reduce)', (t) async {
        phone(t, scale: 2, size: const Size(360, 740));
        await pumpHome(t, mixed(), reduceMotion: reduce);
        expect(t.takeException(), isNull);
        await tapToggle(t);
        expect(sheet, findsOneWidget);
        expect(t.takeException(), isNull);
        final go = find.byKey(const Key('station-directions-st-far'));
        await t.ensureVisible(go);
        await t.pump();
        expect(t.takeException(), isNull);
        await tapToggle(t);
        expect(depotCard, findsOneWidget);
        expect(t.takeException(), isNull);
      });
    }

    testWidgets('200% em 360x740: erro e vazio sem overflow', (t) async {
      phone(t, scale: 2, size: const Size(360, 740));
      final b = StationsBackend()
        ..stationsError = DioException(
          requestOptions: RequestOptions(path: '/swap-stations'),
          type: DioExceptionType.connectionError,
        );
      await pumpHome(t, b);
      await tapToggle(t);
      expect(t.takeException(), isNull);
    });
  });

  group('mapa ligado', () {
    StationsBackend onMap() => StationsBackend(depots: [depotFixture().rebuild((d) => d.swapStationId = 'st-dep')])
      ..stations = [
        st('st-dep', 'Estacao do galpao', available: 4, distanceM: 0, lat: -23.566, lng: -46.684),
        st('st-near', 'Largo da Batata', available: 1, distanceM: 250, lat: -23.567, lng: -46.686),
        st('st-far', 'Faria Lima', available: 8, distanceM: 700, lat: -23.5645, lng: -46.6895),
      ];

    testWidgets('modo estacoes: estacao do galpao vira selo no galpao, que segue tocavel; marcadores e linhas centram o mapa', (t) async {
      phone(t);
      final h = t.ensureSemantics();
      await pumpHome(t, onMap(), mapOn: true);
      await settle(t);
      expect(find.byType(FlutterMap), findsOneWidget);
      final pin = find.byKey(const ValueKey('depot-pin-dep1'));
      expect(find.descendant(of: pin, matching: find.byKey(const Key('station-count-badge'))), findsNothing);
      expect(find.byKey(const ValueKey('station-st-dep')), findsOneWidget, reason: 'fora do modo: marcador azul simples');

      await tapToggle(t);
      expect(find.byKey(const ValueKey('station-mode-st-dep')), findsNothing, reason: 'coincide com o galpao');
      expect(find.byKey(const ValueKey('station-st-dep')), findsNothing);
      expect(find.byKey(const ValueKey('station-mode-st-near')), findsOneWidget);
      expect(find.byKey(const ValueKey('station-mode-st-far')), findsOneWidget);
      expect(find.descendant(of: pin, matching: find.text('4')), findsOneWidget);
      final pinNode = t.getSemantics(find.descendant(of: pin, matching: find.byType(GestureDetector)).first);
      expect(pinNode.label, contains('4 baterias disponíveis'));
      expect(pinNode.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);

      final width = t.view.physicalSize.width;
      final near = find.byKey(const ValueKey('station-mode-st-near'));
      expect((t.getCenter(near).dx - width / 2).abs(), greaterThan(20));
      await t.tap(near);
      await settle(t);
      expect(t.getCenter(near).dx, closeTo(width / 2, 2));
      expect(t.getCenter(near).dy, lessThan(t.getRect(sheet).top));

      // Linha da folha tambem centra.
      final far = find.byKey(const ValueKey('station-mode-st-far'));
      expect((t.getCenter(far).dx - width / 2).abs(), greaterThan(20));
      await t.ensureVisible(find.byKey(const Key('station-focus-st-far')));
      await t.pump();
      await t.tap(find.byKey(const Key('station-focus-st-far')));
      await settle(t);
      expect(t.getCenter(far).dx, closeTo(width / 2, 2));

      // O galpao segue tocavel no modo (centra).
      // O ponto azul do cliente (na mesma posicao do galpao) cobre o centro do pin.
      await t.tapAt(t.getCenter(pin) + const Offset(-18, 0));
      await settle(t);
      expect(t.getCenter(pin).dx, closeTo(width / 2, 2));

      // Sair do modo: estacao do galpao volta como marcador simples, sem selo.
      await tapToggle(t);
      expect(find.byKey(const ValueKey('station-st-dep')), findsOneWidget);
      expect(find.byKey(const Key('station-count-badge')), findsNothing);
      expect(opened, isEmpty);
      expect(t.takeException(), isNull);
      h.dispose();
    });
  });

  group('folha isolada', () {
    testWidgets('tocar na linha centra o mapa no ponto', (t) async {
      phone(t);
      final focused = <SwapStation>[];
      final b = mixed();
      await t.pumpWidget(
        ProviderScope(
          retry: (_, _) => null,
          overrides: [
            backendProvider.overrideWithValue(b),
            locationServiceProvider.overrideWithValue(HereLocation()),
            sessionProvider.overrideWith(() => FakeSession(session())),
            clockProvider.overrideWithValue(() => thu10),
          ],
          child: MaterialApp(
            theme: VoltiTheme.light(),
            locale: const Locale('pt', 'BR'),
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            home: Scaffold(
              body: Align(
                alignment: Alignment.bottomCenter,
                child: StationsSheet(onClose: () {}, onFocus: focused.add),
              ),
            ),
          ),
        ),
      );
      await settle(t);
      // Folha recolhida: a segunda linha fica abaixo; rola ate ela.
      await t.ensureVisible(find.byKey(const Key('station-focus-st-near')));
      await settle(t);
      await t.tap(find.byKey(const Key('station-focus-st-near')));
      await t.pump();
      expect(focused.single.id, 'st-near');
    });
  });
}
