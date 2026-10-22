import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/auth_store.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/cognito.dart';
import 'package:volti_cliente/core/cognito_auth.dart';
import 'package:volti_cliente/core/launcher.dart';
import 'package:volti_cliente/core/map_tiles.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/core/widgets.dart';
import 'package:volti_cliente/features/home/home_screen.dart';
import 'package:volti_cliente/features/onboarding/login_screen.dart';
import 'package:volti_cliente/features/plan/pix_sheet.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart' show mapEnabledProvider;
import 'package:volti_flutter/volti_flutter.dart';

import 'cognito_test.dart' show FakeTransport, config;
import 'galpao_fixtures.dart';
import 'galpao_flow_test.dart' show pumpApp, settle;
import 'helpers.dart';
import 'zone_fixtures.dart';

class _Session extends FakeSession {
  _Session() : super(const SessionState.signedOut());
  final providers = <IdentityProvider>[];
  @override
  Future<void> signInWithProvider(IdentityProvider provider) async => providers.add(provider);
}

/// Localizacao concedida, dentro de uma zona de devolucao.
class _GrantedLocation extends FakeLocation {
  _GrantedLocation(this.at);
  final LatLng at;
  @override
  Future<bool> hasPermission() async => true;
  @override
  Future<LatLng?> currentPosition({bool requestPermission = false}) async => at;
}

class _ZoneBackend extends GalpaoBackend {
  _ZoneBackend(this.list);
  final List<GeoZone> list;
  @override
  Future<List<GeoZone>> zones() async => list;
}

void screen(WidgetTester t, {double scale = 1, Size size = const Size(360, 740)}) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
}

final _opened = <Uri>[];

/// Opacidade de entrada em andamento (os botoes tem um Opacity fixo em 1).
final _fading = find.byWidgetPredicate((w) => w is Opacity && w.opacity < 1);

/// Fontes reais do design: a fonte de teste tem glifos quadrados e mede "cabe ou
/// nao" bem diferente do aparelho.
Future<void> _loadFonts() async {
  final raw = await rootBundle.loadString('FontManifest.json');
  for (final fam in (json.decode(raw) as List).cast<Map<String, dynamic>>()) {
    final loader = FontLoader(fam['family'] as String);
    for (final f in fam['fonts'] as List) {
      loader.addFont(rootBundle.load((f as Map)['asset'] as String));
    }
    await loader.load();
  }
}

Future<GoRouter> _pumpWelcome(
  WidgetTester t, {
  bool dev = true,
  bool promo = true,
  bool map = false,
  bool reduceMotion = false,
  LegalLinks links = const LegalLinks(),
  _Session? session,
  bool settleAll = true,
}) async {
  _opened.clear();
  final router = GoRouter(initialLocation: '/welcome', routes: [
    GoRoute(
      path: '/welcome',
      // O testRouterApp desliga o mapa; o escopo filho liga quando o teste pede.
      builder: (_, _) => map
          ? ProviderScope(overrides: [mapEnabledProvider.overrideWithValue(true)], child: const WelcomeScreen())
          : const WelcomeScreen(),
    ),
    GoRoute(path: '/login', builder: (_, s) => Scaffold(body: Text('login:${s.uri.queryParameters['via']}'))),
  ]);
  addTearDown(router.dispose);
  final app = testRouterApp(router, overrides: [
    authRepositoryProvider.overrideWithValue(dev
        ? DevAuthRepository(baseUrl: 'http://x')
        : CognitoCustomerAuthRepository(config: config, client: CognitoIdentityClient(config, FakeTransport()), store: MemoryCognitoTokenStore())),
    sessionProvider.overrideWith(() => session ?? _Session()),
    welcomeFirstRidePromoProvider.overrideWithValue(promo),
    legalLinksProvider.overrideWithValue(links),
    urlLauncherProvider.overrideWithValue((uri) async {
      _opened.add(uri);
      return true;
    }),
  ]);
  Widget w = app;
  if (reduceMotion) w = MediaQuery(data: const MediaQueryData(disableAnimations: true), child: w);
  await t.pumpWidget(w);
  if (settleAll) {
    for (var i = 0; i < 6; i++) {
      await t.pump(const Duration(milliseconds: 300));
    }
  }
  return router;
}

Future<void> tapVisible(WidgetTester t, Finder f) async {
  await t.ensureVisible(f);
  await t.pump();
  await t.tap(f);
  await t.pump();
  await t.pump(const Duration(milliseconds: 300));
}

void main() {
  setUpAll(_loadFonts);
  group('boas-vindas da referencia', () {
    testWidgets('mapa decorativo, selos, titulo, botoes, divisor e termos', (t) async {
      screen(t, size: const Size(402, 874));
      await _pumpWelcome(t);
      expect(find.byKey(const Key('welcome-art')), findsOneWidget);
      expect(find.byKey(const Key('welcome-logo')), findsOneWidget);
      // Chips ilustrativos.
      for (final s in ['108 motos perto', '92%', '~20 km', '2 min', '120 m']) {
        expect(find.text(s), findsOneWidget, reason: s);
      }
      expect(find.byKey(const Key('welcome-promo')), findsOneWidget);
      expect(find.text('1ª corrida grátis'), findsOneWidget);
      expect(find.text('até 15 min'), findsOneWidget);
      for (final b in ['Sem CNH', 'Sem placa', '18+']) {
        expect(find.widgetWithText(SuccessBadge, b), findsOneWidget);
      }
      final title = t.widget<Text>(find.byKey(const Key('welcome-title')));
      expect(title.textSpan!.toPlainText(), 'Pegue uma moto e vá.');
      final accent = (title.textSpan! as TextSpan).children!.last as TextSpan;
      expect(accent.text, 'e vá.');
      expect(accent.style!.color, VoltiColors.textLink);
      expect(find.text('Por minuto, hora, dia ou semana. Liberada pelo app em segundos.'), findsOneWidget);
      final phone = t.widget<VoltiButton>(find.byKey(const Key('welcome-phone')));
      expect(phone.label, 'Continuar com celular');
      expect(phone.variant, VoltiButtonVariant.primary);
      expect(phone.iconRight, isNotNull);
      expect(find.text('ou entre com'), findsOneWidget);
      expect(find.byKey(const Key('welcome-social-row')), findsOneWidget);
      expect(t.widget<VoltiButton>(find.byKey(const Key('welcome-apple'))).variant, VoltiButtonVariant.dark);
      expect(t.widget<VoltiButton>(find.byKey(const Key('welcome-google'))).variant, VoltiButtonVariant.neutral);
      final email = t.widget<VoltiButton>(find.byKey(const Key('welcome-email')));
      expect(email.variant, VoltiButtonVariant.soft);
      expect(email.label, 'E-mail');
      expect(email.icon, isNotNull);
      final terms = t.widget<Text>(find.byKey(const Key('welcome-terms')));
      expect(terms.textSpan!.toPlainText(), 'Ao continuar, você aceita os termos de uso e a política de privacidade.');
      // Sem a arte azul antiga.
      expect(find.byWidgetPredicate((w) => w is Container && w.decoration is BoxDecoration && (w.decoration! as BoxDecoration).color == VoltiColors.sky100),
          findsNothing);
      // Tudo na tela sem rolar, na altura da referencia.
      final sheetTop = t.getTopLeft(find.byKey(const Key('welcome-sheet'))).dy;
      expect(sheetTop, greaterThan(874 * .4));
      expect(t.getBottomLeft(find.byKey(const Key('welcome-terms'))).dy, lessThanOrEqualTo(874));
      expect(t.takeException(), isNull);
    });

    testWidgets('360x740 a 100%: botoes e termos cabem sem rolar', (t) async {
      screen(t);
      await _pumpWelcome(t);
      expect(t.getBottomLeft(find.byKey(const Key('welcome-terms'))).dy, lessThanOrEqualTo(740));
      expect(find.byKey(const Key('welcome-social-row')), findsOneWidget);
      expect(t.takeException(), isNull);
    });

    testWidgets('promocao desligada: sem o cartao "1ª corrida grátis"', (t) async {
      screen(t);
      await _pumpWelcome(t, promo: false);
      expect(find.byKey(const Key('welcome-promo')), findsNothing);
      expect(find.text('1ª corrida grátis'), findsNothing);
    });

    test('promocao da boas-vindas: ligada por padrao so em debug', () {
      // Os testes rodam em modo debug; release/profile seguem FIRST_RIDE_PROMO (padrao desligado).
      expect(kWelcomeFirstRidePromo, isTrue);
    });

    testWidgets('celular e e-mail navegam para o login certo', (t) async {
      screen(t);
      var router = await _pumpWelcome(t);
      await tapVisible(t, find.byKey(const Key('welcome-phone')));
      expect(router.state.uri.toString(), '/login?via=phone');
      router = await _pumpWelcome(t);
      await tapVisible(t, find.byKey(const Key('welcome-email')));
      expect(router.state.uri.toString(), '/login?via=email');
    });

    testWidgets('dev: Apple e Google so mostram o aviso do Cognito; nota de dev pequena sob os termos', (t) async {
      screen(t);
      final s = _Session();
      await _pumpWelcome(t, session: s);
      final hint = find.byKey(const Key('welcome-dev-hint'));
      expect(hint, findsOneWidget);
      expect(t.getTopLeft(hint).dy, greaterThan(t.getTopLeft(find.byKey(const Key('welcome-terms'))).dy));
      await tapVisible(t, find.byKey(const Key('welcome-apple')));
      expect(find.text('No modo dev, Google e Apple não estão disponíveis. Entre com celular ou e-mail.'), findsOneWidget);
      expect(s.providers, isEmpty);
    });

    testWidgets('cognito: Apple e Google vao ao Hosted UI, sem nota de dev', (t) async {
      screen(t);
      final s = _Session();
      await _pumpWelcome(t, dev: false, session: s);
      expect(find.byKey(const Key('welcome-dev-hint')), findsNothing);
      await tapVisible(t, find.byKey(const Key('welcome-apple')));
      await tapVisible(t, find.byKey(const Key('welcome-google')));
      expect(s.providers, [IdentityProvider.apple, IdentityProvider.google]);
    });

    testWidgets('termos e privacidade abrem os links configurados', (t) async {
      screen(t);
      final links = LegalLinks(terms: Uri.parse('https://exemplo.test/termos'), privacy: Uri.parse('https://exemplo.test/privacidade'));
      await _pumpWelcome(t, links: links);
      await t.ensureVisible(find.byKey(const Key('welcome-terms')));
      await t.pump();
      await t.tapOnText(find.textRange.ofSubstring('termos de uso'));
      await t.pump();
      await t.tapOnText(find.textRange.ofSubstring('política de privacidade'));
      await t.pump();
      expect(_opened, [links.terms, links.privacy]);
    });

    testWidgets('sem link publicado: avisa em vez de abrir', (t) async {
      screen(t);
      await _pumpWelcome(t);
      await t.ensureVisible(find.byKey(const Key('welcome-terms')));
      await t.pump();
      await t.tapOnText(find.textRange.ofSubstring('termos de uso'));
      await t.pump();
      expect(_opened, isEmpty);
      expect(find.text('Este documento ainda não está publicado neste ambiente.'), findsOneWidget);
    });

    testWidgets('semantica: ilustracao fora; botoes e links com acao de toque', (t) async {
      screen(t);
      final h = t.ensureSemantics();
      await _pumpWelcome(t);
      // Os numeros ilustrativos sao desenhados, mas nao chegam ao leitor de tela.
      for (final s in ['108 motos perto', '92%', '~20 km', '2 min', '120 m']) {
        expect(find.text(s), findsOneWidget);
        expect(find.bySemanticsLabel(RegExp(RegExp.escape(s))), findsNothing, reason: s);
      }
      expect(find.byKey(const Key('welcome-art')).evaluate().single.widget, isA<ExcludeSemantics>());
      expect(find.bySemanticsLabel('Volti'), findsOneWidget);
      expect(t.getSemantics(find.byKey(const Key('welcome-phone'))),
          isSemantics(label: 'Continuar com celular', isButton: true, hasTapAction: true));
      expect(t.getSemantics(find.byKey(const Key('welcome-apple'))),
          isSemantics(label: 'Entrar com Apple', isButton: true, hasTapAction: true));
      expect(t.getSemantics(find.byKey(const Key('welcome-google'))),
          isSemantics(label: 'Entrar com Google', isButton: true, hasTapAction: true));
      expect(t.getSemantics(find.byKey(const Key('welcome-email'))),
          isSemantics(label: 'Entrar com e-mail', isButton: true, hasTapAction: true));
      // Os dois links do rodape viram nos com toque.
      final links = find.semantics.byPredicate((n) => n.getSemanticsData().hasAction(SemanticsAction.tap) &&
          (n.label == 'termos de uso' || n.label == 'política de privacidade'));
      expect(links, findsExactly(2));
      h.dispose();
    });

    testWidgets('200% em 360x740: sem estouro, folha rola e botoes empilham', (t) async {
      screen(t, scale: 2);
      final s = _Session();
      await _pumpWelcome(t, dev: false, session: s);
      expect(t.takeException(), isNull);
      expect(find.byKey(const Key('welcome-social-column')), findsOneWidget);
      // Promocao desce para a folha com texto grande.
      expect(find.descendant(of: find.byKey(const Key('welcome-sheet')), matching: find.byKey(const Key('welcome-promo'))), findsOneWidget);
      for (final k in ['welcome-phone', 'welcome-apple', 'welcome-google', 'welcome-email', 'welcome-terms']) {
        await t.ensureVisible(find.byKey(Key(k)));
        await t.pump();
        final r = t.getRect(find.byKey(Key(k)));
        expect(r.bottom, lessThanOrEqualTo(740), reason: k);
        expect(r.top, greaterThanOrEqualTo(0), reason: k);
      }
      await tapVisible(t, find.byKey(const Key('welcome-google')));
      expect(s.providers, [IdentityProvider.google]);
      // Nenhum texto da folha cortado.
      for (final p in t.renderObjectList<RenderParagraph>(find.descendant(of: find.byKey(const Key('welcome-sheet')), matching: find.byType(RichText)))) {
        expect(p.didExceedMaxLines, isFalse, reason: p.text.toPlainText());
      }
      expect(t.takeException(), isNull);
    });

    testWidgets('reduzir movimento: folha e pins ja no lugar no primeiro quadro', (t) async {
      screen(t);
      await _pumpWelcome(t, reduceMotion: true, settleAll: false);
      await t.pump();
      expect(find.descendant(of: find.byType(VoltiEnter), matching: _fading), findsNothing);
      expect(t.binding.hasScheduledFrame, isFalse);
    });

    testWidgets('com movimento: a folha entra animada', (t) async {
      screen(t);
      await _pumpWelcome(t, settleAll: false);
      await t.pump(const Duration(milliseconds: 16));
      expect(find.descendant(of: find.byKey(const Key('welcome-sheet-enter')), matching: _fading), findsWidgets);
      await t.pumpAndSettle();
    });

    testWidgets('com o mapa ligado: VoltiMap sem interacao no centro de SP e atribuicao', (t) async {
      screen(t);
      await _pumpWelcome(t, map: true);
      final map = t.widget<VoltiMap>(find.byKey(const Key('welcome-map')));
      expect(map.interactive, isFalse);
      expect(map.center, kWelcomeMapCenter);
      expect(find.text(kMapAttribution), findsOneWidget);
      expect(t.takeException(), isNull);
    });
  });

  group('tiles do mapa', () {
    test('padrao CARTO Voyager com subdominios e o id real do pacote', () {
      expect(kMapTileUrl, 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');
      expect(kMapTileSubdomains, ['a', 'b', 'c']);
      expect(kMapUserAgentPackage, 'br.com.volti.volti_cliente');
      expect(kMapAttribution, '© OpenStreetMap contributors © CARTO');
      expect(kMapTileUrl.contains('tile.openstreetmap.org'), isFalse);
    });

    testWidgets('VoltiMap usa a camada comum com retentativa e atribuicao', (t) async {
      screen(t);
      await t.pumpWidget(const MaterialApp(home: VoltiMap(center: kWelcomeMapCenter)));
      await t.pump();
      final layer = t.widget<TileLayer>(find.byType(TileLayer));
      expect(layer.urlTemplate, kMapTileUrl);
      expect(layer.subdomains, kMapTileSubdomains);
      expect(layer.evictErrorTileStrategy, EvictErrorTileStrategy.notVisibleRespectMargin);
      expect(layer.errorTileCallback, isNotNull);
      expect(find.byKey(const Key('map-attribution')), findsOneWidget);
    });
  });

  group('correcoes do emulador', () {
    testWidgets('1. explicacao da localizacao fala do galpao, nao de motos por perto', (t) async {
      screen(t, size: const Size(412, 915));
      // Abre a home com a sessao ja carregada (como no app): a explicacao aparece.
      final router = await pumpApp(t, GalpaoBackend(), initial: '/account/help');
      router.go('/home');
      await settle(t);
      expect(find.text('Galpão mais perto'), findsOneWidget);
      expect(find.textContaining('galpão Volti mais perto'), findsOneWidget);
      expect(find.textContaining('Fora do aluguel, não rastreamos você'), findsOneWidget);
      expect(find.text('Motos por perto'), findsNothing);
      expect(find.textContaining('motos mais próximas'), findsNothing);
    });

    testWidgets('2. Pix da caucao confirma a reserva; a moto sai na entrega', (t) async {
      screen(t, size: const Size(412, 915));
      await t.pumpWidget(testApp(
        Scaffold(body: PixDepositSheet(deposit: pixDepositFixture(), pollInterval: const Duration(hours: 1))),
        overrides: [backendProvider.overrideWithValue(GalpaoBackend())],
      ));
      await t.pump();
      expect(find.textContaining('para confirmar a reserva'), findsOneWidget);
      expect(find.textContaining('liberada na entrega'), findsOneWidget);
      expect(find.textContaining('liberar a moto'), findsNothing);
    });

    for (final scale in [1.0, 2.0]) {
      testWidgets('3. botao da lista cabe inteiro com o codigo (texto ${scale}x, 360 px)', (t) async {
        screen(t, scale: scale);
        await pumpApp(
          t,
          GalpaoBackend(vehicles: {
            'dep1': [bike('v1', 'VLT-0011', 'Volti Urban Cargo')],
          }),
          initial: '/pick',
        );
        final btn = find.byKey(const Key('pick-continue'));
        await t.ensureVisible(btn);
        await t.pump();
        final w = t.widget<VoltiButton>(btn);
        expect(w.label, 'Continuar');
        expect(w.subtitle, 'Volti Urban Cargo · VLT-0011');
        final sub = find.descendant(of: btn, matching: find.byKey(const Key('volti-button-subtitle')));
        expect(t.renderObject<RenderParagraph>(sub).didExceedMaxLines, isFalse);
        final label = find.descendant(of: btn, matching: find.text('Continuar'));
        expect(t.renderObject<RenderParagraph>(label).didExceedMaxLines, isFalse);
        expect(t.takeException(), isNull);
      });
    }

    testWidgets('4. pin do galpao aparece no mapa da home, na faixa livre acima do cartao', (t) async {
      screen(t, size: const Size(412, 915));
      final router = GoRouter(initialLocation: '/home', routes: [
        GoRoute(
          path: '/home',
          builder: (_, _) => ProviderScope(overrides: [mapEnabledProvider.overrideWithValue(true)], child: const HomeScreen()),
        ),
      ]);
      addTearDown(router.dispose);
      await t.pumpWidget(testRouterApp(router, overrides: [
          backendProvider.overrideWithValue(GalpaoBackend()),
          pushServiceProvider.overrideWithValue(NoopPushService()),
          locationServiceProvider.overrideWithValue(FakeLocation()),
          sessionProvider.overrideWith(() => FakeSession(session(location: false))),
          clockProvider.overrideWithValue(() => thu10),
        ]));
      await settle(t);
      await settle(t);
      // Mapa ligado no escopo filho.
      expect(find.byType(FlutterMap), findsOneWidget);
      final pin = find.byKey(const ValueKey('depot-pin-dep1'));
      expect(pin, findsOneWidget, reason: 'o MarkerLayer so desenha marcadores dentro da tela');
      final c = t.getCenter(pin);
      final card = t.getRect(find.byKey(const Key('depot-card')));
      final header = t.getRect(find.byKey(const Key('home-header')));
      expect(c.dy, lessThan(card.top));
      expect(c.dy, greaterThan(header.bottom));
      expect(c.dx, closeTo(412 / 2, 2));
      final camera = MapCamera.of(t.element(pin));
      expect(camera.zoom, 15);
      expect(find.text(kMapAttribution), findsOneWidget);
      expect(t.takeException(), isNull);
    });

    testWidgets('6. cabecalho: contexto do galpao, nunca o nome da zona de devolucao', (t) async {
      screen(t, size: const Size(412, 915));
      // Cliente dentro da zona "Devolução — Metrô Fradique Coutinho".
      final zone = zoneAround(-23.5661, -46.6845, name: 'Devolução — Metrô Fradique Coutinho');
      final router = GoRouter(initialLocation: '/home', routes: [GoRoute(path: '/home', builder: (_, _) => const HomeScreen())]);
      addTearDown(router.dispose);
      await t.pumpWidget(testRouterApp(router, overrides: [
        backendProvider.overrideWithValue(_ZoneBackend([zone])),
        pushServiceProvider.overrideWithValue(NoopPushService()),
        locationServiceProvider.overrideWithValue(_GrantedLocation(const LatLng(-23.5661, -46.6845))),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => thu10),
      ]));
      await settle(t);
      expect(find.text('Sua localização'), findsOneWidget);
      expect(find.text('Perto do Galpão Volti · Pinheiros'), findsOneWidget);
      expect(find.textContaining('Fradique'), findsNothing);
    });
  });
}
