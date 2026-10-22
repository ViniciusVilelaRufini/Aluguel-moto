import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// Primeira tela com um botao que abre a segunda com [kind]. A primeira conta
/// quantas vezes foi reativada (reparent) para provar que a arvore e estavel.
Widget _app({
  VoltiScreenTransition first = VoltiScreenTransition.push,
  VoltiScreenTransition second = VoltiScreenTransition.push,
  MediaQueryData media = const MediaQueryData(),
}) {
  return MediaQuery(
    data: media,
    child: MaterialApp(
      theme: VoltiTheme.light(),
      onGenerateRoute: (_) => VoltiPageRoute<void>(
        transition: first,
        builder: (c) => Scaffold(
          body: Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const _Probe(),
              TextButton(
                onPressed: () => Navigator.of(c).push(VoltiPageRoute<void>(
                  transition: second,
                  builder: (_) => const Scaffold(body: Center(child: Text('segunda'))),
                )),
                child: const Text('abrir'),
              ),
            ]),
          ),
        ),
      ),
    ),
  );
}

int _activations = 0, _inits = 0;

class _Probe extends StatefulWidget {
  const _Probe();
  @override
  State<_Probe> createState() => _ProbeState();
}

class _ProbeState extends State<_Probe> {
  @override
  void initState() {
    super.initState();
    _inits++;
  }

  @override
  void activate() {
    super.activate();
    _activations++;
  }

  @override
  Widget build(BuildContext context) => const Text('primeira');
}

double _width(WidgetTester t) => t.view.physicalSize.width / t.view.devicePixelRatio;

Future<void> _backGesture(WidgetTester t, String method, [double progress = 0]) async {
  final args = method == 'startBackGesture' || method == 'updateBackGestureProgress'
      ? <String, Object?>{'touchOffset': <double>[5, 300], 'progress': progress, 'swipeEdge': 0}
      : null;
  await t.binding.defaultBinaryMessenger.handlePlatformMessage(
    SystemChannels.backGesture.name,
    SystemChannels.backGesture.codec.encodeMethodCall(MethodCall(method, args)),
    (_) {},
  );
}

void main() {
  setUp(() => _activations = _inits = 0);

  group('tokens', () {
    test('duracao e curva da troca de tela batem com design-system/tokens/effects.css', () {
      final css = File('../../design-system/tokens/effects.css').readAsStringSync();
      final dur = RegExp(r'--dur-screen:(\d+)ms').firstMatch(css)!;
      final ease = RegExp(r'--ease-screen:cubic-bezier\(([^)]*)\)').firstMatch(css)!;
      expect(VoltiPageTransitions.duration, Duration(milliseconds: int.parse(dur[1]!)));
      expect(VoltiMotion.durScreen, VoltiPageTransitions.duration);
      final p = ease[1]!.split(',').map((s) => double.parse(s.trim())).toList();
      const e = VoltiMotion.easeScreen;
      expect([e.a, e.b, e.c, e.d], p);
    });

    test('builderFor devolve o builder de cada tipo', () {
      expect(VoltiPageTransitions.builderFor(VoltiScreenTransition.push), VoltiPageTransitions.push);
      expect(VoltiPageTransitions.builderFor(VoltiScreenTransition.modal), VoltiPageTransitions.modal);
      expect(VoltiPageTransitions.builderFor(VoltiScreenTransition.fadeThrough), VoltiPageTransitions.fadeThrough);
    });
  });

  group('push', () {
    testWidgets('entra pela direita com fade sutil; a de tras faz parallax e escurece', (t) async {
      await t.pumpWidget(_app());
      await t.tap(find.text('abrir'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 60));
      final w = _width(t);
      expect(t.getCenter(find.text('segunda')).dx, greaterThan(w / 2 + 20));
      final fade = t.widget<FadeTransition>(find.ancestor(of: find.text('segunda'), matching: find.byType(FadeTransition)).first);
      expect(fade.opacity.value, inInclusiveRange(VoltiPageTransitions.pushFadeFrom, .999));
      // A de tras recua para a esquerda (parallax).
      expect(t.getCenter(find.text('primeira')).dx, lessThan(w / 2 - 1));
      await t.pumpAndSettle();
      expect(t.getCenter(find.text('segunda')).dx, moreOrLessEquals(w / 2));
      expect(VoltiPageTransitions.top.value, VoltiScreenTransition.push);
    });

    testWidgets('voltar desfaz: a de tras volta ao lugar sem ser remontada', (t) async {
      await t.pumpWidget(_app());
      await t.tap(find.text('abrir'));
      await t.pumpAndSettle();
      await t.binding.handlePopRoute();
      await t.pump();
      await t.pump(const Duration(milliseconds: 100));
      expect(find.text('segunda'), findsOneWidget);
      await t.pumpAndSettle();
      expect(find.text('segunda'), findsNothing);
      expect(t.getCenter(find.text('primeira')).dx, moreOrLessEquals(_width(t) / 2));
      expect(_inits, 1);
      expect(_activations, 0, reason: 'a pagina coberta nao deve ser reparentada ao comecar/terminar');
    });
  });

  group('fadeThrough', () {
    testWidgets('a de tras fica parada; a nova aparece com escala e sem deslizar', (t) async {
      await t.pumpWidget(_app(second: VoltiScreenTransition.fadeThrough));
      final before = t.getCenter(find.text('primeira'));
      await t.tap(find.text('abrir'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 120));
      expect(t.getCenter(find.text('primeira')), before);
      final scale = t.widget<ScaleTransition>(find.ancestor(of: find.text('segunda'), matching: find.byType(ScaleTransition)).first);
      expect(scale.scale.value, inInclusiveRange(VoltiPageTransitions.fadeThroughScale, .999));
      expect(find.ancestor(of: find.text('segunda'), matching: find.byType(SlideTransition)), findsNothing);
      await t.pumpAndSettle();
      expect(VoltiPageTransitions.top.value, VoltiScreenTransition.fadeThrough);
      expect(t.getCenter(find.text('segunda')).dx, moreOrLessEquals(_width(t) / 2));
    });
  });

  group('modal', () {
    testWidgets('sobe de baixo e a tela de tras recua (escala)', (t) async {
      await t.pumpWidget(_app(second: VoltiScreenTransition.modal));
      await t.tap(find.text('abrir'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 150));
      final h = t.view.physicalSize.height / t.view.devicePixelRatio;
      expect(t.getTopLeft(find.text('segunda')).dy, greaterThan(h / 2));
      await t.pump(const Duration(milliseconds: 100));
      expect(VoltiPageTransitions.recede.value, greaterThan(0));
      await t.pumpAndSettle();
      expect(VoltiPageTransitions.top.value, VoltiScreenTransition.modal);
      await t.binding.handlePopRoute();
      await t.pumpAndSettle();
      expect(VoltiPageTransitions.recede.value, 0);
    });

    testWidgets('modal sobre modal: o de tras recua em vez de deslizar', (t) async {
      await t.pumpWidget(_app(first: VoltiScreenTransition.modal, second: VoltiScreenTransition.modal));
      final before = t.getCenter(find.text('primeira'));
      await t.tap(find.text('abrir'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 200));
      final mid = t.getCenter(find.text('primeira'));
      // Escala em torno do centro: o centro quase nao anda na horizontal.
      expect((mid.dx - before.dx).abs(), lessThan(4));
      await t.pumpAndSettle();
    });
  });

  group('reduced motion', () {
    for (final media in const [MediaQueryData(disableAnimations: true), MediaQueryData(accessibleNavigation: true)]) {
      final label = media.disableAnimations ? 'disableAnimations' : 'accessibleNavigation';
      for (final kind in VoltiScreenTransition.values) {
        testWidgets('$label + ${kind.name}: sem deslize, fade ou parallax', (t) async {
          await t.pumpWidget(_app(second: kind, media: media));
          final before = t.getCenter(find.text('primeira'));
          await t.tap(find.text('abrir'));
          await t.pump();
          await t.pump(const Duration(milliseconds: 1));
          for (final type in [SlideTransition, FadeTransition, ScaleTransition]) {
            expect(find.ancestor(of: find.text('segunda'), matching: find.byType(type)), findsNothing, reason: '$type');
          }
          expect(t.getCenter(find.text('primeira'), warnIfMissed: false), before);
          await t.pumpAndSettle();
        });
      }
    }

    testWidgets('durationOf: zero com reduced motion ou leitor de tela', (t) async {
      late Duration normal, reduced, a11y;
      await t.pumpWidget(Builder(builder: (c) {
        normal = VoltiPageTransitions.durationOf(c);
        return const SizedBox();
      }));
      await t.pumpWidget(MediaQuery(
        data: const MediaQueryData(disableAnimations: true),
        child: Builder(builder: (c) {
          reduced = VoltiPageTransitions.durationOf(c);
          return const SizedBox();
        }),
      ));
      await t.pumpWidget(MediaQuery(
        data: const MediaQueryData(accessibleNavigation: true),
        child: Builder(builder: (c) {
          a11y = VoltiPageTransitions.durationOf(c);
          return const SizedBox();
        }),
      ));
      expect(normal, VoltiMotion.durScreen);
      expect(reduced, Duration.zero);
      expect(a11y, Duration.zero);
    });
  });

  group('voltar preditivo (Android)', () {
    testWidgets('a tela segue o gesto e, ao confirmar, sai de onde parou', (t) async {
      await t.pumpWidget(_app());
      await t.tap(find.text('abrir'));
      await t.pumpAndSettle();
      final w = _width(t);
      await _backGesture(t, 'startBackGesture');
      await _backGesture(t, 'updateBackGestureProgress', .5);
      await t.pump();
      // Linear durante o gesto: metade do progresso = metade da largura.
      expect(t.getCenter(find.text('segunda')).dx, moreOrLessEquals(w / 2 + w / 2, epsilon: 2));
      await _backGesture(t, 'commitBackGesture');
      await t.pump();
      await t.pump(const Duration(milliseconds: 16));
      // Continua saindo a partir da metade (nao volta ao inicio).
      expect(t.getCenter(find.text('segunda')).dx, greaterThan(w - 2));
      await t.pumpAndSettle();
      expect(find.text('segunda'), findsNothing);
      expect(find.text('primeira'), findsOneWidget);
    });

    testWidgets('cancelar devolve a tela ao lugar', (t) async {
      await t.pumpWidget(_app());
      await t.tap(find.text('abrir'));
      await t.pumpAndSettle();
      await _backGesture(t, 'startBackGesture');
      await _backGesture(t, 'updateBackGestureProgress', .3);
      await t.pump();
      expect(t.getCenter(find.text('segunda')).dx, greaterThan(_width(t) / 2 + 10));
      await _backGesture(t, 'cancelBackGesture');
      await t.pumpAndSettle();
      expect(find.text('segunda'), findsOneWidget);
      expect(t.getCenter(find.text('segunda')).dx, moreOrLessEquals(_width(t) / 2));
    });
  });

  group('bottom sheet', () {
    Future<ModalRoute<dynamic>> open(WidgetTester t, MediaQueryData media) async {
      await t.pumpWidget(MediaQuery(
        data: media,
        child: MaterialApp(
          theme: VoltiTheme.light(),
          home: Builder(
            builder: (c) => Scaffold(
              body: TextButton(
                onPressed: () => VoltiBottomSheet.show<void>(c, builder: (_) => const Text('folha')),
                child: const Text('abrir'),
              ),
            ),
          ),
        ),
      ));
      await t.tap(find.text('abrir'));
      await t.pump();
      return ModalRoute.of(t.element(find.text('folha')))!;
    }

    testWidgets('mesma mola da troca de tela e scrim do design', (t) async {
      final route = await open(t, const MediaQueryData()) as ModalBottomSheetRoute<dynamic>;
      expect(route.transitionDuration, VoltiMotion.durScreen);
      expect(route.reverseTransitionDuration, VoltiMotion.durScreen);
      expect(route.sheetAnimationStyle!.curve, VoltiMotion.easeScreen);
      expect(route.modalBarrierColor, VoltiColors.surfaceScrim);
      await t.pumpAndSettle();
    });

    testWidgets('leitor de tela: instantaneo', (t) async {
      final route = await open(t, const MediaQueryData(accessibleNavigation: true));
      expect(route.transitionDuration, Duration.zero);
      await t.pumpAndSettle();
    });
  });

  group('ProgressSteps', () {
    Widget bar({int? from, bool reduced = false}) => MediaQuery(
          data: MediaQueryData(disableAnimations: reduced),
          child: MaterialApp(
            home: Scaffold(body: ProgressSteps(total: 4, current: 2, animateFrom: from)),
          ),
        );
    Color col(WidgetTester t, int i) =>
        ((t.widget<AnimatedContainer>(find.byKey(Key('progress-step-$i'))).decoration!) as BoxDecoration).color!;

    testWidgets('animateFrom: o segmento novo enche da esquerda para a direita', (t) async {
      await t.pumpWidget(bar(from: 1));
      expect(find.byKey(const Key('progress-step-fill')), findsNothing);
      await t.pump(const Duration(milliseconds: 100));
      expect(find.byKey(const Key('progress-step-fill')), findsOneWidget);
      await t.pumpAndSettle();
      expect(find.byKey(const Key('progress-step-fill')), findsNothing);
      expect(col(t, 2), VoltiColors.brand);
      expect(col(t, 3), isNot(VoltiColors.brand));
    });

    testWidgets('reduced motion: estado final direto', (t) async {
      await t.pumpWidget(bar(from: 1, reduced: true));
      await t.pump(const Duration(milliseconds: 100));
      expect(find.byKey(const Key('progress-step-fill')), findsNothing);
      expect(col(t, 2), VoltiColors.brand);
    });
  });
}
