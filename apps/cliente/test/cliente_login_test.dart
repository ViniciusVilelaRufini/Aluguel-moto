import 'dart:convert';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/app_channel.dart';
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

/// Titulo e texto das tres afirmacoes do hero.
const _statementTexts = [
  'Retire no galpão',
  'Escolha no app, retire no galpão',
  'Planos diário, semanal e mensal',
  'ou por minuto e hora',
  'Seguro incluso',
  'Troca de bateria no galpão e nas estações',
];

/// Rotulo de cada afirmacao no leitor de tela.
const _statementLabels = [
  'Retire no galpão, Escolha no app, retire no galpão',
  'Planos diário, semanal e mensal, ou por minuto e hora',
  'Seguro incluso, Troca de bateria no galpão e nas estações',
];

/// Cartoes de afirmacao (hero-statement-0..2).
final _statementCards = find.byWidgetPredicate((w) => w.key is ValueKey<String> && RegExp(r'^hero-statement-\d$').hasMatch((w.key! as ValueKey<String>).value));

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
  bool map = false,
  bool reduceMotion = false,
  LegalLinks links = const LegalLinks(),
  _Session? session,
  bool settleAll = true,
  AppChannel channel = AppChannel.store,
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
    legalLinksProvider.overrideWithValue(links),
    appChannelProvider.overrideWithValue(channel),
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
  testWidgets('selo "Versao de teste" aparece so no canal beta', (t) async {
    await _pumpWelcome(t, channel: AppChannel.beta);
    expect(find.byKey(const Key('beta-badge')), findsOneWidget);
    expect(find.text('Versão de teste'), findsOneWidget);
    await t.pumpWidget(const SizedBox());
    await _pumpWelcome(t);
    expect(find.byKey(const Key('beta-badge')), findsNothing);
    expect(find.text('Versão de teste'), findsNothing);
    await t.pumpWidget(const SizedBox());
  });

  setUpAll(_loadFonts);
  group('boas-vindas da referencia', () {
    testWidgets('mapa decorativo, selos, titulo, botoes, divisor e termos', (t) async {
      screen(t, size: const Size(402, 874));
      await _pumpWelcome(t);
      expect(find.byKey(const Key('welcome-art')), findsOneWidget);
      expect(find.byKey(const Key('welcome-logo')), findsOneWidget);
      // Chips ilustrativos.
      // So afirmacoes do servico (galpao, planos, seguro, troca de bateria).
      for (final s in _statementTexts) {
        expect(find.text(s), findsOneWidget, reason: s);
      }
      // Nada de promocao nem numeros inventados.
      for (final s in ['1ª corrida grátis', 'até 15 min', '108 motos perto', '92%', '~20 km', '2 min', '120 m']) {
        expect(find.text(s), findsNothing, reason: s);
      }
      for (final b in ['Sem CNH', 'Sem placa', '18+']) {
        expect(find.widgetWithText(SuccessBadge, b), findsOneWidget);
      }
      final title = t.widget<Text>(find.byKey(const Key('welcome-title')));
      expect(title.textSpan!.toPlainText(), 'Pegue uma moto e vá.');
      final accent = (title.textSpan! as TextSpan).children!.last as TextSpan;
      expect(accent.text, 'e vá.');
      expect(accent.style!.color, VoltiColors.textLink);
      expect(find.text('Escolha a moto no app e retire no galpão. Por dia, semana ou mês.'), findsOneWidget);
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
      // Os textos visiveis do hero chegam ao leitor de tela pelos nos nos retangulos reais.
      // Cada afirmacao uma vez (nos estaticos na faixa do carrossel; as copias do
      // marquee nao chegam ao leitor de tela).
      for (final label in _statementLabels) {
        expect(find.bySemanticsLabel(label), findsOneWidget, reason: label);
      }
      final band = t.getRect(find.byKey(const Key('hero-statements')));
      for (var i = 0; i < 3; i++) {
        final r = t.getRect(find.byKey(Key('welcome-statement-semantics-$i')));
        expect(band.contains(r.topLeft) && band.contains(r.bottomRight - const Offset(.01, .01)), isTrue, reason: 'no $i na faixa');
      }
      for (final s in _statementTexts) {
        expect(find.bySemanticsLabel(s), findsNothing, reason: 'texto solto do marquee: $s');
      }
      expect(find.byKey(const Key('welcome-art')).evaluate().single.widget, isA<ExcludeSemantics>());
      // Logo (cabecalho "Volti") e planos: nos de semantica fora da camada decorativa.
      expect(t.getSemantics(find.byKey(const Key('welcome-logo-semantics'))), isSemantics(label: 'Volti', isHeader: true));
      expect(t.getRect(find.byKey(const Key('welcome-logo-semantics'))), t.getRect(find.byKey(const Key('welcome-logo'))));
      // A moto em destaque fica fora.
      expect(find.descendant(of: find.byKey(const Key('welcome-art')), matching: find.byType(Image)), findsOneWidget);
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
      // As tres afirmacoes do servico descem para a folha e escalam com o texto.
      for (var i = 0; i < 3; i++) {
        final card = find.descendant(of: find.byKey(const Key('welcome-sheet')), matching: find.byKey(Key('hero-statement-$i')));
        expect(card, findsOneWidget, reason: 'cartao $i');
        expect((t.widget<Container>(card).decoration! as BoxDecoration).color, VoltiColors.surfaceCard);
      }
      expect(find.byKey(const Key('welcome-sheet-statements')).evaluate().single.widget, isA<Wrap>());
      for (final s in _statementTexts) {
        final p = t.renderObject<RenderParagraph>(find.descendant(of: find.byKey(const Key('welcome-sheet')), matching: find.text(s)));
        expect(p.textScaler.scale(10), closeTo(20, .01), reason: s);
        expect(p.didExceedMaxLines, isFalse, reason: s);
      }
      // No hero so o logo.
      expect(find.descendant(of: find.byType(WelcomeHero), matching: find.text('Retire no galpão')), findsNothing);
      expect(find.byKey(const Key('hero-statements')), findsNothing);
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
      // Quadros a mais, sem tempo passando: a geometria do hero (medida no layout)
      // posiciona o galpao e diz quantas afirmacoes couberam (as outras vao para a
      // folha, que e medida de novo).
      for (var i = 0; i < 4; i++) {
        await t.pump();
      }
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

  group('carrossel das afirmacoes', () {
    WelcomeHeroState hero(WidgetTester t) => t.state<WelcomeHeroState>(find.byType(WelcomeHero));
    RenderHeroStatements band(WidgetTester t) => t.renderObject<RenderHeroStatements>(find.byKey(const Key('hero-statements')));

    testWidgets('tres cartoes brancos iguais (superficie, raio md, sombra 1, icone verde); sem pilula escura', (t) async {
      screen(t, size: const Size(393, 852));
      await _pumpWelcome(t);
      const icons = [LucideIcons.warehouse, LucideIcons.calendarDays, LucideIcons.shieldCheck];
      for (var i = 0; i < 3; i++) {
        final card = find.byKey(Key('hero-statement-$i'));
        expect(find.descendant(of: find.byKey(const Key('hero-statements')), matching: card), findsOneWidget, reason: 'uma copia na arvore');
        final d = t.widget<Container>(card).decoration! as BoxDecoration;
        expect(d.color, VoltiColors.surfaceCard, reason: 'cartao $i branco');
        expect(d.borderRadius, VoltiRadii.rMd);
        expect(d.boxShadow, VoltiShadows.shadow1);
        final tile = find.descendant(of: card, matching: find.byKey(const Key('hero-statement-icon')));
        expect((t.widget<Container>(tile).decoration! as BoxDecoration).color, VoltiColors.brandSoft);
        final icon = t.widget<Icon>(find.descendant(of: tile, matching: find.byType(Icon)));
        expect(icon.icon, icons[i]);
        expect(icon.color, VoltiColors.brandAction);
        for (final txt in t.widgetList<Text>(find.descendant(of: card, matching: find.byType(Text)))) {
          expect(txt.style!.color, isIn([VoltiColors.ink900, VoltiColors.ink500]), reason: 'texto escuro: ${txt.data}');
        }
      }
      // Segunda linha do seguro com a bateria.
      expect(find.descendant(of: find.byKey(const Key('hero-statement-2')), matching: find.byIcon(LucideIcons.batteryCharging)), findsOneWidget);
      // Nenhum fundo escuro na faixa e nada da pilula antiga.
      final dark = find.descendant(
        of: find.byKey(const Key('hero-statements')),
        matching: find.byWidgetPredicate((w) =>
            w is Container &&
            w.decoration is BoxDecoration &&
            const [VoltiColors.ink900, VoltiColors.green900].contains((w.decoration! as BoxDecoration).color)),
      );
      expect(dark, findsNothing);
      for (final k in ['hero-perks', 'hero-pickup', 'welcome-plans']) {
        expect(find.byKey(Key(k)), findsNothing, reason: k);
      }
    });

    testWidgets('faixa: logo em cima a esquerda, carrossel embaixo de ponta a ponta com mascara nas bordas', (t) async {
      screen(t, size: const Size(393, 852));
      await _pumpWelcome(t);
      final logo = t.getRect(find.byKey(const Key('welcome-logo')));
      final b = t.getRect(find.byKey(const Key('hero-statements')));
      expect(logo.left, lessThan(30));
      expect(b.top, greaterThan(logo.bottom));
      expect(b.left, 0);
      expect(b.width, 393);
      expect(find.ancestor(of: find.byKey(const Key('hero-statements')), matching: find.byType(ShaderMask)), findsOneWidget);
      expect(find.ancestor(of: find.byKey(const Key('hero-statements')), matching: find.byType(RepaintBoundary)), findsWidgets);
    });

    testWidgets('marquee anda para a esquerda em velocidade constante e emenda sem fresta', (t) async {
      expect(kHeroMarqueeSpeed, inInclusiveRange(30, 40));
      screen(t, size: const Size(393, 852));
      await _pumpWelcome(t);
      final r = band(t);
      final width = r.size.width;
      final x0 = t.getRect(find.byKey(const Key('hero-statement-0'))).left;
      final o0 = r.debugOffset;
      await t.pump(const Duration(milliseconds: 500));
      final x1 = t.getRect(find.byKey(const Key('hero-statement-0'))).left;
      expect(r.debugOffset - o0, closeTo(kHeroMarqueeSpeed * .5, 1), reason: 'velocidade constante');
      // O primeiro cartao andou para a esquerda (ou deu a volta).
      expect(x1 < x0 || x1 - x0 > r.debugCycle / 2, isTrue, reason: 'para a esquerda: $x0 -> $x1');

      const dt = Duration(milliseconds: 250);
      final shift = kHeroMarqueeSpeed * dt.inMicroseconds / 1e6;
      final steps = (r.debugCycle / shift).ceil() + 8;
      var prev = r.debugPainted;
      var wrapped = false;
      var prevScroll = r.debugScroll;
      for (var s = 0; s < steps; s++) {
        await t.pump(dt);
        final now = r.debugPainted;
        // Sem fresta: cartoes em sequencia, separados so pelo gap, cobrindo a faixa.
        final sorted = [...now]..sort((a, b) => a.rect.left.compareTo(b.rect.left));
        expect(sorted.first.rect.left, lessThanOrEqualTo(kHeroMarqueeGap + .5), reason: 'passo $s: borda esquerda coberta');
        expect(sorted.last.rect.right, greaterThanOrEqualTo(width - kHeroMarqueeGap - .5), reason: 'passo $s: borda direita coberta');
        for (var i = 1; i < sorted.length; i++) {
          expect(sorted[i].rect.left - sorted[i - 1].rect.right, closeTo(kHeroMarqueeGap, .5), reason: 'passo $s: gap $i');
          expect(sorted[i].index, (sorted[i - 1].index + 1) % 3, reason: 'passo $s: ordem');
        }
        // Continuidade: cada cartao visivel ja estava la, um passo mais a direita.
        for (final c in now) {
          if (c.rect.left + shift > width) continue; // acabou de entrar pela direita
          final had = prev.any((p) => p.index == c.index && (p.rect.left - shift - c.rect.left).abs() < .5);
          expect(had, isTrue, reason: 'passo $s: cartao ${c.index} em ${c.rect.left} pulou');
        }
        if (r.debugScroll < prevScroll) wrapped = true;
        prevScroll = r.debugScroll;
        prev = now;
      }
      expect(wrapped, isTrue, reason: 'deu a volta pelo menos uma vez');
    });

    testWidgets('reduzir movimento: cartoes parados; os que nao cabem vao para a folha (cada um uma vez)', (t) async {
      screen(t, size: const Size(393, 852));
      final h = t.ensureSemantics();
      await _pumpWelcome(t, reduceMotion: true, settleAll: false);
      await t.pump();
      await t.pump();
      final r = band(t);
      expect(hero(t).debugMarqueeAnimating, isFalse);
      final before = r.debugPainted.map((c) => c.rect).toList();
      expect(before, isNotEmpty);
      expect(t.getRect(find.byKey(const Key('hero-statement-0'))).left, HeroLayoutDelegate.side);
      // Cartoes inteiros, dentro do gutter.
      for (final c in r.debugPainted) {
        expect(c.rect.left, greaterThanOrEqualTo(HeroLayoutDelegate.side - .01));
        expect(c.rect.right, lessThanOrEqualTo(r.size.width - HeroLayoutDelegate.side + .01));
      }
      await t.pump(const Duration(seconds: 2));
      expect(r.debugPainted.map((c) => c.rect).toList(), before);
      expect(t.binding.hasScheduledFrame, isFalse);
      final shown = r.debugShown;
      expect(shown, inInclusiveRange(1, 3));
      expect(before.length, shown);
      final inSheet = find.descendant(of: find.byKey(const Key('welcome-sheet')), matching: _statementCards);
      expect(inSheet.evaluate().length, 3 - shown);
      for (final label in _statementLabels) {
        expect(find.bySemanticsLabel(label), findsOneWidget, reason: label);
      }
      h.dispose();
    });

    testWidgets('segundo plano: o marquee para e retoma de onde estava', (t) async {
      screen(t, size: const Size(393, 852));
      await _pumpWelcome(t);
      expect(hero(t).debugMarqueeAnimating, isTrue);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await t.pump();
      expect(hero(t).debugMarqueeAnimating, isFalse);
      final o = band(t).debugOffset;
      await t.pump(const Duration(seconds: 3));
      expect(band(t).debugOffset, o);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await t.pump();
      expect(hero(t).debugMarqueeAnimating, isTrue);
      await t.pump(const Duration(milliseconds: 500));
      expect(band(t).debugOffset - o, closeTo(kHeroMarqueeSpeed * .5, 1), reason: 'sem salto na volta');
    });

    testWidgets('com movimento a folha nao repete as afirmacoes', (t) async {
      screen(t, size: const Size(360, 740));
      await _pumpWelcome(t);
      expect(find.byKey(const Key('welcome-sheet-statements')), findsNothing);
      expect(band(t).debugShown, 3);
    });
  });

  group('hero animado', () {
    WelcomeHeroState hero(WidgetTester t) => t.state<WelcomeHeroState>(find.byType(WelcomeHero));

    testWidgets('entrada: chips em cascata e a moto sobe e cresce', (t) async {
      screen(t);
      await _pumpWelcome(t, settleAll: false);
      await t.pump(const Duration(milliseconds: 16));
      // Chips ainda entrando (cascata).
      expect(find.ancestor(of: find.byKey(const Key('hero-statements')), matching: _fading), findsWidgets);
      final bike = find.byKey(const Key('hero-bike'));
      final opacity = t.widget<Opacity>(find.ancestor(of: bike, matching: find.byType(Opacity)).first);
      expect(opacity.opacity, lessThan(1));
      final before = t.widget<Transform>(find.byKey(const Key('hero-bike-image')));
      expect(before.transform.getTranslation().y, greaterThan(10), reason: 'comeca abaixo e sobe');
      await t.pump(const Duration(milliseconds: 1200));
      expect(find.ancestor(of: find.byKey(const Key('hero-statements')), matching: _fading), findsNothing);
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
      for (var i = 0; i < 4; i++) {
        await t.pump();
      }
      expect(find.text('Seguro incluso'), findsWidgets);
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
      // Os chips e a moto continuam por cima; a atribuicao do mapa some.
      expect(find.byKey(const Key('hero-bike')), findsOneWidget);
      expect(find.text('Retire no galpão'), findsOneWidget);
      expect(find.byKey(const Key('map-attribution')), findsNothing);
    });

    test('deriva: escala minima 1,05 cobre a caixa inteira (sem fresta na borda)', () {
      const size = Size(360, 320);
      for (final t in [0.0, .5, 1.0]) {
        final r = MatrixUtils.transformRect(heroDriftMatrix(size, t), Offset.zero & size);
        expect(r.left, lessThanOrEqualTo(0), reason: 't=$t');
        expect(r.top, lessThanOrEqualTo(0), reason: 't=$t');
        expect(r.right, greaterThanOrEqualTo(size.width), reason: 't=$t');
        expect(r.bottom, greaterThanOrEqualTo(size.height), reason: 't=$t');
      }
    });

    testWidgets('pins seguem as ruas durante a deriva (no maximo 2 px da polilinha)', (t) async {
      screen(t);
      await _pumpWelcome(t, map: true);
      final size = t.getSize(find.byType(WelcomeHero));
      for (var step = 0; step < 6; step++) {
        for (var i = 0; i < kHeroRoutes.length; i++) {
          final dot = find.descendant(of: find.byKey(Key('hero-pin-$i')), matching: find.byKey(const Key('hero-pin-dot')));
          final c = t.getCenter(dot);
          final d = distanceToPolyline(c, hero(t).debugRouteOnScreen(i, size));
          expect(d, lessThanOrEqualTo(2), reason: 'pin $i passo $step');
        }
        await t.pump(const Duration(milliseconds: 2300));
      }
    });

    for (final size in const [Size(360, 740), Size(360, 800), Size(393, 852), Size(412, 915)]) {
      for (final dev in [true, false]) {
        testWidgets('sem sobreposicao em ${size.width.toInt()}x${size.height.toInt()} (${dev ? 'debug' : 'release'})', (t) async {
          screen(t, size: size);
          t.view.padding = const FakeViewPadding(top: 24, bottom: 16);
          await _pumpWelcome(t, map: true, dev: dev);
          await t.pump(const Duration(seconds: 1));
          expect(t.takeException(), isNull);
          Rect r(String k) => t.getRect(find.byKey(Key(k)));
          final chips = {
            for (final k in ['welcome-logo', 'hero-statements']) k: r(k),
          };
          final keys = chips.keys.toList();
          for (var i = 0; i < keys.length; i++) {
            for (var j = i + 1; j < keys.length; j++) {
              expect(chips[keys[i]]!.overlaps(chips[keys[j]]!), isFalse, reason: '${keys[i]} x ${keys[j]}');
            }
          }
          final bike = r('hero-bike');
          // Largura atual da moto por tela (fracao da largura; debug = com a nota de dev).
          // Ela encolhe em telas baixas porque nenhum chip pode cobri-la.
          const expected = {
            'Size(360.0, 740.0) true': .292,
            'Size(360.0, 740.0) false': .389,
            'Size(360.0, 800.0) true': .450,
            'Size(360.0, 800.0) false': .450,
            'Size(393.0, 852.0) true': .450,
            'Size(393.0, 852.0) false': .535,
            'Size(412.0, 915.0) true': .574,
            'Size(412.0, 915.0) false': .659,
          };
          expect(bike.width / size.width, closeTo(expected['$size $dev']!, .02), reason: 'largura da moto');
          expect(bike.width, lessThanOrEqualTo(size.width * .7 + .5));
          // Nenhum chip sobre a moto (folga de 3 px: ela flutua 2,5 px).
          for (final e in chips.entries) {
            expect(bike.inflate(3).overlaps(e.value), isFalse, reason: 'moto x ${e.key}');
          }
          final sheetTop = r('welcome-sheet').top;
          expect(bike.bottom, lessThanOrEqualTo(sheetTop));
          expect(r('hero-pins').bottom, lessThanOrEqualTo(sheetTop + .5), reason: 'pins nunca por baixo da folha');
          expect(r('map-attribution').top, greaterThanOrEqualTo(r('hero-pins').bottom - .5), reason: 'atribuicao fora da faixa dos pins');
          for (final e in chips.entries) {
            expect(e.value.bottom, lessThanOrEqualTo(sheetTop), reason: '${e.key} acima da folha');
            expect(e.value.left, greaterThanOrEqualTo(0));
            expect(e.value.right, lessThanOrEqualTo(size.width));
          }
          // Galpao na area livre, inteiro na tela: nem atras dos chips nem da moto.
          final depot = r('hero-depot');
          for (final e in chips.entries) {
            expect(depot.overlaps(e.value), isFalse, reason: 'galpao x ${e.key}');
          }
          expect(depot.left, greaterThanOrEqualTo(16));
          expect(depot.right, lessThanOrEqualTo(size.width - 16));
          expect(depot.overlaps(bike), isFalse, reason: 'galpao x moto');
          // Pins visiveis nunca atras dos chips ou da moto nem a menos de 16 px das bordas.
          final obstacles = [...chips.values, bike];
          var seen = 0;
          for (var step = 0; step < 8; step++) {
            for (var i = 0; i < kHeroRoutes.length; i++) {
              final pin = find.byKey(Key('hero-pin-$i'));
              final o = t.widget<AnimatedOpacity>(find.descendant(of: pin, matching: find.byType(AnimatedOpacity)));
              if (o.opacity == 0) continue;
              seen++;
              final dot = t.getRect(find.descendant(of: pin, matching: find.byKey(const Key('hero-pin-dot'))));
              for (final ob in obstacles) {
                expect(dot.overlaps(ob), isFalse, reason: 'pin $i passo $step');
              }
              expect(dot.left, greaterThanOrEqualTo(16 - 2), reason: 'pin $i borda');
              expect(dot.right, lessThanOrEqualTo(size.width - 16 + 2), reason: 'pin $i borda');
            }
            await t.pump(const Duration(milliseconds: 1700));
          }
          // Em telas baixas a faixa do mapa e pequena e as motos (que saem do anel do
          // galpao) podem ficar todas escondidas; com espaco, alguma aparece andando.
          if (size.height >= 900) expect(seen, greaterThan(0), reason: 'alguma moto aparece andando');
        });
      }
    }

    testWidgets('o mapa cobre o hero inteiro em toda a deriva (360/393/412)', (t) async {
      for (final size in const [Size(360, 740), Size(393, 852), Size(412, 915)]) {
        screen(t, size: size);
        await _pumpWelcome(t, map: true);
        final heroRect = t.getRect(find.byType(WelcomeHero));
        for (var step = 0; step < 5; step++) {
          final m = t.getRect(find.byKey(const Key('welcome-map')));
          expect(m.left, lessThanOrEqualTo(heroRect.left), reason: '$size passo $step');
          expect(m.top, lessThanOrEqualTo(heroRect.top), reason: '$size passo $step');
          expect(m.right, greaterThanOrEqualTo(heroRect.right), reason: '$size passo $step');
          expect(m.bottom, greaterThanOrEqualTo(heroRect.bottom), reason: '$size passo $step');
          await t.pump(const Duration(milliseconds: 2500));
        }
        await t.pumpWidget(const SizedBox());
      }
    });

    testWidgets('tiles carregados cobrem a faixa do hero de ponta a ponta', (t) async {
      final png = await t.runAsync(() async {
        final rec = ui.PictureRecorder();
        Canvas(rec).drawRect(const Rect.fromLTWH(0, 0, 256, 256), Paint()..color = const Color(0xFF9E9E9E));
        final img = await rec.endRecording().toImage(256, 256);
        return (await img.toByteData(format: ui.ImageByteFormat.png))!.buffer.asUint8List();
      });
      debugTileProviderFactory = () => _MemTiles(png!);
      addTearDown(() => debugTileProviderFactory = null);
      screen(t, size: const Size(411, 923));
      await _pumpWelcome(t, map: true);
      for (var i = 0; i < 5; i++) {
        await t.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
        await t.pump(const Duration(milliseconds: 200));
      }
      final tiles = [
        for (final e in find.descendant(of: find.byKey(const Key('welcome-map')), matching: find.byType(RawImage)).evaluate())
          if ((e.widget as RawImage).image != null) t.getRect(find.byWidget(e.widget)),
      ];
      expect(tiles, isNotEmpty);
      final box = t.getRect(find.byType(WelcomeHero));
      for (var x = box.left + 2; x < box.right; x += 40) {
        for (var y = box.top + 2; y < box.bottom; y += 40) {
          expect(tiles.any((r) => r.contains(Offset(x, y))), isTrue, reason: 'sem tile em ($x, $y)');
        }
      }
      expect(hero(t).debugTilesFailed, isFalse);
    });

    testWidgets('Pixel 411x923 (DPR 2,625): os tiles pedidos cobrem todo o retangulo pintado do mapa', (t) async {
      final png = await t.runAsync(() async {
        final rec = ui.PictureRecorder();
        Canvas(rec).drawRect(const Rect.fromLTWH(0, 0, 256, 256), Paint()..color = const Color(0xFF9E9E9E));
        final img = await rec.endRecording().toImage(256, 256);
        return (await img.toByteData(format: ui.ImageByteFormat.png))!.buffer.asUint8List();
      });
      final requested = <String>{};
      debugTileProviderFactory = () => _RecTiles(png!, requested);
      addTearDown(() => debugTileProviderFactory = null);
      t.view.physicalSize = const Size(1080, 2424);
      t.view.devicePixelRatio = 2.625;
      t.view.padding = const FakeViewPadding(top: 63, bottom: 42);
      addTearDown(t.view.reset);
      await _pumpWelcome(t, map: true);
      for (var i = 0; i < 4; i++) {
        await t.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
        await t.pump(const Duration(milliseconds: 300));
      }
      final fm = find.descendant(of: find.byKey(const Key('welcome-map')), matching: find.byType(FlutterMap));
      final box = t.renderObject<RenderBox>(fm);
      final layer = t.element(find.descendant(of: fm, matching: find.byType(TileLayer)).first);
      final cam = MapCamera.of(layer);
      // O viewport da camera e o tamanho pintado do mapa.
      expect(cam.nonRotatedSize, box.size);
      final hero = t.getRect(find.byType(WelcomeHero));
      for (var step = 0; step < 3; step++) {
        for (var x = hero.left + 1; x < hero.right; x += 20) {
          for (var y = hero.top + 1; y < hero.bottom; y += 20) {
            final local = box.globalToLocal(Offset(x, y));
            final ll = cam.screenOffsetToLatLng(local);
            final (tx, ty) = tileXY(ll.latitude, ll.longitude, 15);
            expect(requested, contains('15/$tx/$ty'), reason: 'ponto ($x, $y) sem tile pedido');
          }
        }
        await t.pump(const Duration(seconds: 4));
      }
    });

    test('tiles de rede sem abortar pedidos (tile abortado vira transparente para sempre)', () {
      final p = newTileProvider();
      expect(p, isA<NetworkTileProvider>());
      expect((p as NetworkTileProvider).abortObsoleteRequests, isFalse);
    });

    test('descartar um mapa nao fecha o cliente HTTP dos tiles (pedido compartilhado no cache vira PNG transparente)', () {
      final client = _CloseSpyClient();
      debugTileHttpClient = client;
      addTearDown(() => debugTileHttpClient = null);
      final a = newTileProvider();
      final b = newTileProvider();
      // A home sai (o TileLayer descarta o provedor dela); a boas-vindas continua.
      a.dispose();
      b.dispose();
      expect(client.closed, isFalse);
    });

    testWidgets('camada de tiles com folga (panBuffer e keepBuffer >= 1)', (t) async {
      screen(t);
      await t.pumpWidget(const ProviderScope(child: MaterialApp(home: VoltiMap(center: kHeroDepot))));
      await t.pump();
      for (final l in t.widgetList<TileLayer>(find.byType(TileLayer))) {
        expect(l.panBuffer, greaterThanOrEqualTo(1));
        expect(l.keepBuffer, greaterThanOrEqualTo(1));
      }
    });

    testWidgets('a 130% os textos do hero escalam ate 1,3x (teto) e a 110% vao para a folha', (t) async {
      screen(t, size: const Size(412, 915));
      await _pumpWelcome(t);
      final hero = find.byType(WelcomeHero);
      final p = t.renderObject<RenderParagraph>(find.descendant(of: hero, matching: find.text('Retire no galpão')));
      expect(p.textScaler.scale(10), closeTo(10, .01));
      // O teto de 1,3 vale para o hero (a 100% nao muda nada; acima, a folha recebe os textos).
      expect(MediaQuery.textScalerOf(t.element(find.descendant(of: hero, matching: find.text('Seguro incluso')))).scale(20), closeTo(20, .01));
      t.platformDispatcher.textScaleFactorTestValue = 1.1;
      await t.pump();
      await t.pump();
      expect(find.descendant(of: hero, matching: find.text('Retire no galpão')), findsNothing);
      expect(find.descendant(of: find.byKey(const Key('welcome-sheet')), matching: find.text('Retire no galpão')), findsOneWidget);
    });

    test('anel do galpao e obstaculo para as motos', () {
      final g = HeroGeometry()..update(zone: const Rect.fromLTWH(16, 200, 380, 60), mapTop: 150, rects: const {});
      const depot = Offset(200, 230);
      expect(g.isClear(depot, const Size(412, 450), depot: depot), isFalse);
      expect(g.isClear(const Offset(200 + 30, 230), const Size(412, 450), depot: depot), isFalse);
      expect(g.isClear(const Offset(200 + 70, 230), const Size(412, 450), depot: depot), isTrue);
    });

    test('rotas das motos saem do galpao', () {
      for (final r in kHeroRoutes) {
        expect(r.first, kHeroDepot);
      }
    });

    test('ponto ao longo da rota', () {
      const pts = [Offset(0, 0), Offset(10, 0), Offset(10, 10)];
      expect(pointAlong(pts, 0), Offset.zero);
      expect(pointAlong(pts, .5), const Offset(10, 0));
      expect(pointAlong(pts, .75), const Offset(10, 5));
      expect(pointAlong(pts, 1), const Offset(10, 10));
    });
  });

  group('tiles do mapa', () {
    test('padrao de dev: Esri Light Gray sem chave ({y}/{x}), rotulos e atribuicao', () {
      expect(kMapTileUrl, 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}');
      expect(kMapReferenceUrl, 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}');
      expect(kMapAttribution, 'Esri, HERE, Garmin, © OpenStreetMap contributors');
      expect(kMapUserAgentPackage, 'br.com.volti.volti_cliente');
      expect(kMapTileUrl.contains('cartocdn'), isFalse);
      expect(isDevTileProvider(kMapTileUrl), isTrue, reason: 'bloqueio de lancamento sinalizado');
      expect(isDevTileProvider('https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=x'), isFalse);
      // Ordem do ArcGIS: z/y/x.
      final (x, y) = tileXY(-23.5654, -46.6847, 15);
      expect((x, y), (12134, 18592));
      expect(tileUrl(kMapTileUrl, 15, x, y), endsWith('/tile/15/18592/12134'));
    });

    test('tile de aviso: bytes identicos em lugares diferentes', () {
      final a = Uint8List.fromList([1, 2, 3]), b = Uint8List.fromList([1, 2, 4]);
      expect(tilesLookLikePlaceholder([a, Uint8List.fromList([1, 2, 3])]), isTrue);
      expect(tilesLookLikePlaceholder([a, b]), isFalse);
      expect(tilesLookLikePlaceholder([a]), isFalse);
    });

    test('sonda do provedor: acusa o "API KEY" repetido, erro HTTP e resposta que nao e imagem', () async {
      final placeholder = MockClient((_) async => http.Response.bytes([9, 9, 9, 9], 200, headers: {'content-type': 'image/png'}));
      expect(await probeTileProvider(placeholder), contains('identicos'));
      var n = 0;
      final real = MockClient((_) async => http.Response.bytes([n++, 1, 2], 200, headers: {'content-type': 'image/jpeg'}));
      expect(await probeTileProvider(real), isNull);
      final denied = MockClient((_) async => http.Response('no', 403));
      expect(await probeTileProvider(denied), contains('403'));
      final html = MockClient((_) async => http.Response('<html>', 200, headers: {'content-type': 'text/html'}));
      expect(await probeTileProvider(html), contains('nao e imagem'));
    });

    testWidgets('VoltiMap usa a camada comum com retentativa e atribuicao', (t) async {
      screen(t);
      await t.pumpWidget(const ProviderScope(child: MaterialApp(home: VoltiMap(center: kHeroDepot))));
      await t.pump();
      final layers = t.widgetList<TileLayer>(find.byType(TileLayer)).toList();
      expect(layers.map((l) => l.urlTemplate), [kMapTileUrl, kMapReferenceUrl], reason: 'base + rotulos');
      final layer = layers.first;
      expect(layer.resolvedRetinaMode, RetinaMode.disabled, reason: 'sem {r}: nao pede 4x tiles');
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

class _MemTiles extends TileProvider {
  _MemTiles(this.png);
  final Uint8List png;
  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) => MemoryImage(png);
}

class _RecTiles extends TileProvider {
  _RecTiles(this.png, this.requested);
  final Uint8List png;
  final Set<String> requested;
  @override
  ImageProvider getImage(TileCoordinates c, TileLayer options) {
    requested.add('${c.z}/${c.x}/${c.y}');
    return MemoryImage(png);
  }
}

class _CloseSpyClient extends http.BaseClient {
  bool closed = false;
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) => throw UnimplementedError();
  @override
  void close() => closed = true;
}
