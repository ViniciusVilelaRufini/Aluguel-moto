import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/shared_vehicle.dart';
import 'package:volti_cliente/features/pick/pick_screen.dart';
import 'package:volti_cliente/features/plan/plan_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'galpao_flow_test.dart' show phone, pumpApp, settle, tapText;

class _PhotoBackend extends GalpaoBackend {
  @override
  Future<List<VehicleModel>> vehicleModels() async => [
        VehicleModel((b) => b
          ..id = 'm1'
          ..name = 'Volti Flash'
          ..slug = 'flash'
          ..categoryLabel = 'Urbana'
          ..photoUrl = 'https://exemplo.test/flash.png'
          ..pricePerMinuteCents = 79
          ..serviceIntervalKm = 1000
          ..serviceIntervalHours = 100
          ..active = true
          ..sortOrder = 0
          ..createdAt = DateTime.utc(2026)
          ..updatedAt = DateTime.utc(2026)),
      ];
  @override
  Future<List<Vehicle>> depotVehicles(String depotId) async =>
      (await super.depotVehicles(depotId)).map((v) => v.rebuild((b) => b..vehicleModelId = 'm1')).toList();
}

const _push = VoltiScreenTransition.push;
const _modal = VoltiScreenTransition.modal;
const _fade = VoltiScreenTransition.fadeThrough;

/// Caminhos completos das rotas com tela (as so de redirecionamento ficam fora).
List<String> _paths(List<RouteBase> routes, [String parent = '']) => [
      for (final r in routes.whereType<GoRoute>()) ...[
        if (r.pageBuilder != null || r.builder != null)
          r.path.startsWith('/') ? r.path : '$parent/${r.path}',
        ..._paths(r.routes, r.path.startsWith('/') ? r.path : '$parent/${r.path}'),
      ],
    ];

Page<dynamic> _top(WidgetTester t) => t.widget<Navigator>(find.byType(Navigator).first).pages.last;

RouteTransitionsBuilder _builderOf(WidgetTester t) => (_top(t) as CustomTransitionPage<dynamic>).transitionsBuilder;

/// Router so com telas vazias, usando o mesmo [voltiPage] das rotas reais.
GoRouter _stubRouter() => GoRouter(
      initialLocation: '/home',
      routes: [
        for (final p in routeTransitions.keys.where((p) => !p.startsWith('/account/')))
          GoRoute(
            path: p,
            pageBuilder: (c, s) => voltiPage(c, s, Scaffold(body: Center(child: Text('tela ${s.uri.path}')))),
            routes: [
              if (p == '/account')
                for (final sub in routeTransitions.keys.where((k) => k.startsWith('/account/')))
                  GoRoute(
                    path: sub.substring('/account/'.length),
                    pageBuilder: (c, s) => voltiPage(c, s, Scaffold(body: Center(child: Text('tela ${s.uri.path}')))),
                  ),
            ],
          ),
      ],
    );

Widget _stubApp(GoRouter router, {MediaQueryData media = const MediaQueryData()}) =>
    MediaQuery(data: media, child: MaterialApp.router(theme: VoltiTheme.light(), routerConfig: router));

void main() {
  group('mapa de transicoes', () {
    test('toda rota com tela tem transicao explicita (e o mapa nao tem rota morta)', () {
      final paths = _paths(appRoutes()).toSet();
      expect(paths, routeTransitions.keys.toSet());
    });

    test('funil empurra; momentos sobem; trocas de raiz fazem fade-through', () {
      for (final p in ['/pick', '/plan', '/insurance', '/pickup', '/return/:id', '/login', '/account', '/account/history']) {
        expect(transitionFor(p), _push, reason: p);
      }
      for (final p in ['/reservation/:id', '/handover/:id', '/summary/:id']) {
        expect(transitionFor(p), _modal, reason: p);
      }
      for (final p in ['/welcome', '/onboarding', '/home', '/ride']) {
        expect(transitionFor(p), _fade, reason: p);
      }
      expect(transitionFor('/rota-nova'), _push);
    });
  });

  group('cada rota usa a sua transicao', () {
    final cases = <String, VoltiScreenTransition>{
      '/pick': _push,
      '/plan': _push,
      '/insurance': _push,
      '/pickup': _push,
      '/reservation/r1': _modal,
      '/handover/h1': _modal,
      '/ride': _fade,
      '/return/rent1': _push,
      '/summary/rent1': _modal,
      '/welcome': _fade,
      '/onboarding': _fade,
      '/account': _push,
      '/account/wallet': _push,
      '/account/support/c1': _push,
      '/account/claim/rent1': _push,
    };
    for (final e in cases.entries) {
      testWidgets('${e.key} -> ${e.value.name} com --dur-screen', (t) async {
        final router = _stubRouter();
        addTearDown(router.dispose);
        await t.pumpWidget(_stubApp(router));
        router.push(e.key);
        await t.pump();
        expect(_builderOf(t), VoltiPageTransitions.builderFor(e.value));
        final page = _top(t) as CustomTransitionPage<dynamic>;
        expect(page.transitionDuration, VoltiMotion.durScreen);
        expect(page.reverseTransitionDuration, VoltiMotion.durScreen);
        await t.pumpAndSettle();
        expect(find.text('tela ${e.key}'), findsOneWidget);
      });
    }

    testWidgets('inicio -> corrida faz fade-through: o inicio nao desliza', (t) async {
      final router = _stubRouter();
      addTearDown(router.dispose);
      await t.pumpWidget(_stubApp(router));
      final before = t.getCenter(find.text('tela /home'));
      router.push('/ride');
      await t.pump();
      await t.pump(const Duration(milliseconds: 150));
      expect(t.getCenter(find.text('tela /home')), before);
      expect(find.ancestor(of: find.text('tela /ride'), matching: find.byType(SlideTransition)), findsNothing);
      await t.pumpAndSettle();
    });

    for (final media in const [MediaQueryData(disableAnimations: true), MediaQueryData(accessibleNavigation: true)]) {
      testWidgets('reduced motion (${media.disableAnimations ? 'animacoes' : 'leitor de tela'}): duracao zero e sem deslize', (t) async {
        final router = _stubRouter();
        addTearDown(router.dispose);
        await t.pumpWidget(_stubApp(router, media: media));
        for (final loc in ['/pick', '/reservation/r1', '/ride']) {
          router.push(loc);
          await t.pump();
          final page = _top(t) as CustomTransitionPage<dynamic>;
          expect(page.transitionDuration, Duration.zero, reason: loc);
          await t.pump(const Duration(milliseconds: 1));
          for (final s in t.widgetList<SlideTransition>(find.ancestor(of: find.text('tela $loc'), matching: find.byType(SlideTransition)))) {
            expect(s.position.value, Offset.zero, reason: loc);
          }
          expect(t.getTopLeft(find.text('tela $loc')).dx, lessThan(t.view.physicalSize.width / t.view.devicePixelRatio / 2));
        }
      });
    }

    testWidgets('voltar do sistema desfaz a pilha (plano -> lista -> inicio)', (t) async {
      final router = _stubRouter();
      addTearDown(router.dispose);
      await t.pumpWidget(_stubApp(router));
      router.push('/pick');
      await t.pumpAndSettle();
      router.push('/plan');
      await t.pumpAndSettle();
      await t.binding.handlePopRoute();
      await t.pumpAndSettle();
      expect(find.text('tela /pick'), findsOneWidget);
      expect(find.text('tela /plan'), findsNothing);
      await t.binding.handlePopRoute();
      await t.pumpAndSettle();
      expect(find.text('tela /home'), findsOneWidget);
    });
  });

  group('fluxo real do galpao', () {
    testWidgets('inicio -> lista (push) -> plano (push) com voo do Hero da moto; voltar volta a lista', (t) async {
      phone(t);
      final router = await pumpApp(t, GalpaoBackend());
      expect(_builderOf(t), VoltiPageTransitions.fadeThrough);
      await tapText(t, 'Escolher moto');
      expect(find.byType(PickScreen), findsOneWidget);
      expect(_builderOf(t), VoltiPageTransitions.push);

      // Hero: mesma tag no cartao da lista e no cabecalho do plano.
      final tag = vehicleHeroTag('VLT-001');
      bool isTag(Widget w) => w is Hero && w.tag == tag;
      expect(find.byWidgetPredicate(isTag), findsOneWidget);
      int shuttles() => find
          .byType(VehicleThumb)
          .evaluate()
          .where((e) => e.findAncestorWidgetOfExactType<Hero>() == null)
          .length;
      final before = shuttles();
      await t.tap(find.textContaining(RegExp(r'Continuar com .*VLT-001')));
      await t.pump();
      await t.pump(const Duration(milliseconds: 120));
      expect(shuttles(), greaterThan(before), reason: 'a midia da moto voa no overlay durante a troca');
      await settle(t);
      expect(find.byType(PlanScreen), findsOneWidget);
      expect(_builderOf(t), VoltiPageTransitions.push);
      expect(find.byWidgetPredicate(isTag), findsOneWidget);

      await t.binding.handlePopRoute();
      await settle(t);
      expect(router.state.uri.path, '/pick');
      expect(find.byType(PlanScreen), findsNothing);
    });
  });

  testWidgets('E-15: o cabecalho do plano mostra a mesma foto do cartao (voo foto -> foto) com a curva do design', (t) async {
    phone(t);
    await pumpApp(t, _PhotoBackend(), initial: '/pick');
    Iterable<Hero> heroes() => t.widgetList<Hero>(find.byWidgetPredicate((w) => w is Hero && w.tag == vehicleHeroTag('VLT-001')));
    String? urlIn(Hero h) {
      // A foto pode vir embrulhada (fundo branco do catálogo); busca a Image dentro do thumb.
      Image? found;
      void visit(Widget? w) {
        if (w == null || found != null) return;
        if (w is Image) { found = w; return; }
        if (w is VehicleThumb) return visit(w.image);
        if (w is SingleChildRenderObjectWidget) return visit(w.child);
        if (w is ProxyWidget) return visit(w.child);
      }
      visit(h.child);
      var img = found?.image;
      if (img is ResizeImage) img = img.imageProvider;
      return img is NetworkImage ? img.url : null;
    }

    expect(urlIn(heroes().single), 'https://exemplo.test/flash.png');
    await t.tap(find.textContaining(RegExp(r'Continuar com .*VLT-001')));
    await settle(t);
    expect(find.byType(PlanScreen), findsOneWidget);
    final header = heroes().single;
    expect(urlIn(header), 'https://exemplo.test/flash.png');
    expect(header.createRectTween!(Rect.zero, Rect.zero), isA<VoltiHeroRectTween>());
  });
}
