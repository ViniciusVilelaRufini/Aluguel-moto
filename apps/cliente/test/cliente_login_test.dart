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
import 'package:volti_cliente/features/onboarding/welcome_hero.dart';
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
  _ZoneBackend(this.list, {super.depots});
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
      // A promocao (oferta real) chega ao leitor de tela pela folha.
      expect(find.bySemanticsLabel('1ª corrida grátis, até 15 min'), findsOneWidget);
      // A moto em destaque e os pins tambem ficam fora.
      expect(find.descendant(of: find.byKey(const Key('welcome-art')), matching: find.byType(Image)), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('volti', caseSensitive: false)), findsNothing);
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
      // Loops infinitos (deriva, motos, flutuacao): sem pumpAndSettle.
      await t.pump(const Duration(seconds: 2));
    });

    testWidgets('com o mapa ligado: mapa real sem interacao, galpao de Pinheiros e atribuicao na folha', (t) async {
      screen(t);
      await _pumpWelcome(t, map: true);
      final map = t.widget<VoltiMap>(find.byKey(const Key('welcome-map')));
      expect(map.interactive, isFalse);
      expect(map.zoom, kHeroZoom);
      expect(map.showAttribution, isFalse);
      expect(find.byKey(const Key('hero-depot')), findsOneWidget);
      final attribution = find.byKey(const Key('map-attribution'));
      expect(find.descendant(of: find.byKey(const Key('welcome-sheet-enter')), matching: attribution), findsOneWidget);
      expect(t.takeException(), isNull);
    });
  });

  group('hero animado', () {
    WelcomeHeroState hero(WidgetTester t) => t.state<WelcomeHeroState>(find.byType(WelcomeHero));

    testWidgets('entrada: chips em cascata, bateria conta ate 92% e a moto sobe e cresce', (t) async {
      screen(t);
      await _pumpWelcome(t, settleAll: false);
      await t.pump(const Duration(milliseconds: 16));
      expect(find.text('92%'), findsNothing, reason: 'a contagem comeca do zero');
      final bike = find.byKey(const Key('hero-bike'));
      final opacity = t.widget<Opacity>(find.ancestor(of: bike, matching: find.byType(Opacity)).first);
      expect(opacity.opacity, lessThan(1));
      final before = t.widget<Transform>(find.byKey(const Key('hero-bike-image')));
      expect(before.transform.getTranslation().y, greaterThan(10), reason: 'comeca abaixo e sobe');
      await t.pump(const Duration(milliseconds: 1200));
      expect(find.text('92%'), findsOneWidget);
      expect(t.widget<Opacity>(find.ancestor(of: bike, matching: find.byType(Opacity)).first).opacity, 1);
      expect(hero(t).debugAnimating, isTrue, reason: 'loops seguem (deriva, motos, flutuacao)');
      // As motos andam.
      final p0 = t.getTopLeft(find.byKey(const Key('hero-pin-0')));
      await t.pump(const Duration(seconds: 1));
      expect(t.getTopLeft(find.byKey(const Key('hero-pin-0'))), isNot(p0));
    });

    testWidgets('reduzir movimento: tudo parado no estado final, sem entrada', (t) async {
      screen(t);
      await _pumpWelcome(t, reduceMotion: true, settleAll: false);
      await t.pump();
      expect(find.text('92%'), findsOneWidget);
      expect(hero(t).debugAnimating, isFalse);
      final p0 = t.getTopLeft(find.byKey(const Key('hero-pin-0')));
      final bike = t.getRect(find.byKey(const Key('hero-bike')));
      await t.pump(const Duration(seconds: 2));
      expect(t.getTopLeft(find.byKey(const Key('hero-pin-0'))), p0);
      expect(t.getRect(find.byKey(const Key('hero-bike'))), bike);
      expect(t.binding.hasScheduledFrame, isFalse);
    });

    testWidgets('app em segundo plano ou rota coberta: controllers param; na volta, retomam', (t) async {
      screen(t);
      final router = await _pumpWelcome(t);
      expect(hero(t).debugAnimating, isTrue);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await t.pump();
      expect(hero(t).debugAnimating, isFalse);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await t.pump();
      expect(hero(t).debugAnimating, isTrue);
      // Outra tela por cima: o Navigator desliga o TickerMode da boas-vindas.
      router.push('/login?via=phone');
      await t.pump();
      await t.pump(const Duration(seconds: 1));
      expect(t.state<WelcomeHeroState>(find.byType(WelcomeHero, skipOffstage: false)).debugAnimating, isFalse);
    });

    testWidgets('tiles falhando: o mapa sai e fica a ilustracao desenhada (nunca cinza)', (t) async {
      screen(t);
      await _pumpWelcome(t, map: true);
      expect(find.byKey(const Key('welcome-map')), findsOneWidget);
      for (var i = 0; i < kHeroTileErrorLimit; i++) {
        hero(t).reportTileError();
      }
      await t.pump();
      await t.pump();
      expect(hero(t).debugTilesFailed, isTrue);
      expect(find.byKey(const Key('welcome-map')), findsNothing);
      expect(find.byKey(const Key('welcome-map-fallback')), findsOneWidget);
      // Os chips e a moto continuam por cima.
      expect(find.byKey(const Key('hero-bike')), findsOneWidget);
      expect(find.text('108 motos perto'), findsOneWidget);
    });

    for (final size in const [Size(360, 740), Size(393, 852), Size(412, 915)]) {
      testWidgets('sem sobreposicao em ${size.width.toInt()}x${size.height.toInt()}', (t) async {
        screen(t, size: size);
        t.view.padding = const FakeViewPadding(top: 24, bottom: 16);
        await _pumpWelcome(t, map: true);
        await t.pump(const Duration(seconds: 1));
        expect(t.takeException(), isNull);
        Rect r(String k) => t.getRect(find.byKey(Key(k)));
        final chips = {for (final k in ['welcome-logo', 'hero-nearby', 'welcome-promo', 'hero-battery', 'hero-time']) k: r(k)};
        final keys = chips.keys.toList();
        for (var i = 0; i < keys.length; i++) {
          for (var j = i + 1; j < keys.length; j++) {
            expect(chips[keys[i]]!.overlaps(chips[keys[j]]!), isFalse, reason: '${keys[i]} x ${keys[j]}');
          }
        }
        final bike = r('hero-bike');
        // Quanto mais alta a tela, maior a moto (ate 70% da largura).
        final minBike = size.height < 800 ? .35 : (size.height < 900 ? .55 : .7);
        expect(bike.width, greaterThanOrEqualTo(size.width * minBike - .5), reason: 'a moto aparece');
        expect(bike.width, lessThanOrEqualTo(size.width * .7 + .5));
        if (size.width >= 412) expect(bike.width, closeTo(size.width * .7, .5));
        for (final k in ['welcome-logo', 'hero-nearby', 'welcome-promo']) {
          // A moto flutua 2,5 px: folga de 3 px.
          expect(bike.inflate(3).overlaps(chips[k]!), isFalse, reason: 'moto x $k');
        }
        // Bateria e tempo podem ser etiquetas sobre a borda da moto: a moto e pintada antes (embaixo).
        final layout = t.widget<CustomMultiChildLayout>(find.descendant(of: find.byType(WelcomeHero), matching: find.byType(CustomMultiChildLayout)));
        expect((layout.children.first as LayoutId).id, HeroSlot.bike);
        final sheetTop = r('welcome-sheet').top;
        expect(bike.bottom, lessThanOrEqualTo(sheetTop));
        expect(r('hero-pins').bottom, lessThanOrEqualTo(sheetTop + .5), reason: 'pins nunca por baixo da folha');
        expect(r('map-attribution').top, greaterThanOrEqualTo(r('hero-pins').bottom - .5), reason: 'atribuicao fora da faixa dos pins');
        for (final e in chips.entries) {
          expect(e.value.bottom, lessThanOrEqualTo(sheetTop), reason: '${e.key} acima da folha');
          expect(e.value.left, greaterThanOrEqualTo(0));
          expect(e.value.right, lessThanOrEqualTo(size.width));
        }
      });
    }

    test('ponto ao longo da rota', () {
      const pts = [Offset(0, 0), Offset(10, 0), Offset(10, 10)];
      expect(pointAlong(pts, 0), Offset.zero);
      expect(pointAlong(pts, .5), const Offset(10, 0));
      expect(pointAlong(pts, .75), const Offset(10, 5));
      expect(pointAlong(pts, 1), const Offset(10, 10));
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
      await t.pumpWidget(const ProviderScope(child: MaterialApp(home: VoltiMap(center: kHeroDepot))));
      await t.pump();
      final layer = t.widget<TileLayer>(find.byType(TileLayer));
      expect(layer.urlTemplate, kMapTileUrl);
      expect(layer.subdomains, kMapTileSubdomains);
      expect(layer.evictErrorTileStrategy, EvictErrorTileStrategy.notVisibleRespectMargin);
      expect(layer.errorTileCallback, isNotNull);
      expect(find.byKey(const Key('map-attribution')), findsOneWidget);
    });

    testWidgets('atribuicao: toque abre os direitos do OSM e o texto escala no maximo 1,3x', (t) async {
      screen(t, scale: 2);
      final opened = <Uri>[];
      await t.pumpWidget(ProviderScope(
        overrides: [
          urlLauncherProvider.overrideWithValue((u) async {
            opened.add(u);
            return true;
          }),
        ],
        child: const MaterialApp(home: Scaffold(body: Center(child: MapAttribution()))),
      ));
      final text = find.text(kMapAttribution);
      expect(MediaQuery.textScalerOf(t.element(text)).scale(10), closeTo(13, .01));
      await t.tap(find.byKey(const Key('map-attribution')));
      await t.pump();
      expect(opened, [kOsmCopyrightUri]);
    });

    testWidgets('mapa dentro de cartao nao soma a area segura na atribuicao', (t) async {
      screen(t);
      t.view.padding = const FakeViewPadding(top: 40, bottom: 30);
      await t.pumpWidget(const ProviderScope(
        child: MaterialApp(home: Scaffold(body: Center(child: SizedBox(height: 200, child: VoltiMap(center: kHeroDepot, embedded: true))))),
      ));
      await t.pump();
      final safe = t.widget<SafeArea>(find.ancestor(of: find.byKey(const Key('map-attribution')), matching: find.byType(SafeArea)).first);
      expect(safe.top || safe.bottom || safe.left || safe.right, isFalse);
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
        backendProvider.overrideWithValue(_ZoneBackend([zone], depots: [depotFixture(distanceM: 450)])),
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

    testWidgets('I2. sem localizacao: "Galpão Volti · bairro", sem dizer que esta perto', (t) async {
      screen(t, size: const Size(412, 915));
      final router = GoRouter(initialLocation: '/home', routes: [GoRoute(path: '/home', builder: (_, _) => const HomeScreen())]);
      addTearDown(router.dispose);
      await t.pumpWidget(testRouterApp(router, overrides: [
        backendProvider.overrideWithValue(GalpaoBackend(depots: [depotFixture(distanceM: 450)])),
        pushServiceProvider.overrideWithValue(NoopPushService()),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => thu10),
      ]));
      await settle(t);
      expect(find.text('Galpão Volti · Pinheiros'), findsOneWidget);
      expect(find.textContaining('Perto'), findsNothing);
    });

    testWidgets('I2. galpao escolhido nao e o mais perto: sem "Perto"', (t) async {
      screen(t, size: const Size(412, 915));
      final router = GoRouter(initialLocation: '/home', routes: [GoRoute(path: '/home', builder: (_, _) => const HomeScreen())]);
      addTearDown(router.dispose);
      await t.pumpWidget(testRouterApp(router, overrides: [
        backendProvider.overrideWithValue(GalpaoBackend(depots: [
          depotFixture(id: 'dep1', distanceM: 400),
          depotFixture(id: 'far', name: 'Galpão Volti — Mooca', district: 'Mooca', distanceM: 9000),
        ])),
        pushServiceProvider.overrideWithValue(NoopPushService()),
        locationServiceProvider.overrideWithValue(_GrantedLocation(const LatLng(-23.566, -46.684))),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => thu10),
      ]));
      await settle(t);
      expect(find.text('Perto do Galpão Volti · Pinheiros'), findsOneWidget);
      final mooca = find.byKey(const Key('depot-option-far'));
      await t.ensureVisible(mooca);
      await t.pump();
      await t.tap(mooca);
      await settle(t);
      expect(find.text('Galpão Volti · Mooca'), findsOneWidget);
      expect(find.textContaining('Perto do'), findsNothing);
    });

    testWidgets('Localizar centra no cliente e nao volta para o galpao', (t) async {
      screen(t, size: const Size(412, 915));
      const user = LatLng(-23.5560, -46.6700);
      final router = GoRouter(initialLocation: '/home', routes: [
        GoRoute(
          path: '/home',
          builder: (_, _) => ProviderScope(overrides: [mapEnabledProvider.overrideWithValue(true)], child: const HomeScreen()),
        ),
      ]);
      addTearDown(router.dispose);
      await t.pumpWidget(testRouterApp(router, overrides: [
        backendProvider.overrideWithValue(GalpaoBackend(depots: [depotFixture(distanceM: 450)])),
        pushServiceProvider.overrideWithValue(NoopPushService()),
        locationServiceProvider.overrideWithValue(_GrantedLocation(user)),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => thu10),
      ]));
      await settle(t);
      await t.tap(find.bySemanticsLabel(RegExp('Localizar|Minha localização|Centralizar')).first);
      await settle(t);
      await settle(t);
      final camera = MapCamera.of(t.element(find.byKey(const ValueKey('user-dot'))));
      final shifted = camera.latLngToScreenOffset(user);
      // O cliente fica no meio da largura (a camera esta nele, nao no galpao).
      expect(shifted.dx, closeTo(412 / 2, 2));
    });

    for (final withBike in [true, false]) {
      testWidgets('teto do aviso de KYC na lista: ${withBike ? '17% com moto escolhida' : '22% sem moto'}', (t) async {
        screen(t, size: const Size(412, 915));
        await pumpApp(
          t,
          GalpaoBackend(vehicles: {'dep1': withBike ? [bike('v1', 'VLT-0011', 'Volti Flash')] : <Vehicle>[]}),
          initial: '/pick',
          kyc: KycStatus.pending,
        );
        final box = t.widget<ConstrainedBox>(
          find.ancestor(of: find.text('Verificação em análise'), matching: find.byWidgetPredicate((w) => w is ConstrainedBox && w.constraints.maxHeight < 900)).first,
        );
        expect(box.constraints.maxHeight, closeTo(915 * (withBike ? .17 : .22), .01));
      });
    }
  });
}
