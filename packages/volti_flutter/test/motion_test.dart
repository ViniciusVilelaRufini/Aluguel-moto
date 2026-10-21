import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

Widget _wrap(Widget child, {bool reduced = false}) => MediaQuery(
      data: MediaQueryData(disableAnimations: reduced),
      child: MaterialApp(
        theme: VoltiTheme.light(),
        home: Scaffold(body: Center(child: child)),
      ),
    );

double _opacityOf(WidgetTester t, Finder f) {
  final o = find.ancestor(of: f, matching: find.byType(Opacity));
  if (o.evaluate().isEmpty) return 1;
  return t.widget<Opacity>(o.first).opacity;
}

void main() {
  group('VoltiMotion', () {
    test('tokens do design', () {
      expect(VoltiMotion.durScreen, const Duration(milliseconds: 440));
      expect(VoltiMotion.durSpring, const Duration(milliseconds: 280));
      expect(VoltiMotion.easeScreen, const Cubic(.32, .72, 0, 1));
      expect(VoltiMotion.staggerDelay(0), const Duration(milliseconds: 140));
      expect(VoltiMotion.staggerDelay(1), const Duration(milliseconds: 185));
      expect(VoltiMotion.staggerDelay(8), const Duration(milliseconds: 500));
      expect(VoltiMotion.staggerDelay(9), const Duration(milliseconds: 545));
      expect(VoltiMotion.staggerDelay(30), const Duration(milliseconds: 545));
    });
  });

  group('VoltiStagger', () {
    testWidgets('cascata: itens aparecem em sequencia', (t) async {
      await t.pumpWidget(_wrap(const VoltiStagger(children: [Text('a'), Text('b'), Text('c')])));
      expect(_opacityOf(t, find.text('a')), 0);
      await t.pump(const Duration(milliseconds: 300));
      final a = _opacityOf(t, find.text('a'));
      final c = _opacityOf(t, find.text('c'));
      expect(a, greaterThan(c));
      await t.pump(const Duration(seconds: 2));
      expect(_opacityOf(t, find.text('c')), 1);
    });

    testWidgets('reduced motion: estado final no primeiro frame', (t) async {
      await t.pumpWidget(_wrap(const VoltiStagger(children: [Text('a'), Text('b')]), reduced: true));
      expect(_opacityOf(t, find.text('a')), 1);
      expect(_opacityOf(t, find.text('b')), 1);
      expect(find.byType(Opacity), findsNothing);
    });
  });

  group('VoltiPulse / VehicleMarker', () {
    testWidgets('pin selecionado mostra anel de pulso', (t) async {
      await t.pumpWidget(_wrap(const VehicleMarker(VehicleStatus.free, 80, selected: true)));
      await t.pump(const Duration(milliseconds: 700));
      expect(find.byKey(const Key('volti-pulse-ring')), findsOneWidget);
    });

    testWidgets('pin nao selecionado nao pulsa', (t) async {
      await t.pumpWidget(_wrap(const VehicleMarker(VehicleStatus.free, 80)));
      await t.pump(const Duration(seconds: 1));
      expect(find.byKey(const Key('volti-pulse-ring')), findsNothing);
    });

    testWidgets('reduced motion: sem anel e sem animacao de entrada', (t) async {
      await t.pumpWidget(_wrap(
        const VehicleMarker(VehicleStatus.free, 80, selected: true, delay: Duration(milliseconds: 500)),
        reduced: true,
      ));
      expect(find.byKey(const Key('volti-pulse-ring')), findsNothing);
      expect(_opacityOf(t, find.byKey(const Key('vehicle-marker-body'))), 1);
      expect(t.getSize(find.byKey(const Key('vehicle-marker-body'))).width, 44);
    });

    testWidgets('entrada: comeca invisivel e respeita delay', (t) async {
      await t.pumpWidget(_wrap(const VehicleMarker(VehicleStatus.free, 80, delay: Duration(milliseconds: 400))));
      expect(_opacityOf(t, find.byKey(const Key('vehicle-marker-body'))), 0);
      await t.pump(const Duration(milliseconds: 300));
      expect(_opacityOf(t, find.byKey(const Key('vehicle-marker-body'))), 0);
      await t.pump(const Duration(seconds: 1));
      expect(_opacityOf(t, find.byKey(const Key('vehicle-marker-body'))), 1);
    });

    testWidgets('VoltiUserDot pulsa', (t) async {
      await t.pumpWidget(_wrap(const VoltiUserDot()));
      await t.pump(const Duration(seconds: 1));
      expect(find.byKey(const Key('volti-pulse-ring')), findsOneWidget);
    });
  });

  group('VoltiButton', () {
    testWidgets('toque dispara onPressed e cria ondulacao no ponto', (t) async {
      var taps = 0;
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', fullWidth: true, onPressed: () => taps++)));
      final g = await t.startGesture(t.getCenter(find.text('Ir')));
      await t.pump(const Duration(milliseconds: 100));
      expect(find.byKey(const Key('volti-ripple')), findsOneWidget);
      await g.up();
      await t.pump(const Duration(seconds: 1));
      expect(taps, 1);
      expect(find.byKey(const Key('volti-ripple')), findsNothing);
    });

    testWidgets('desabilitar durante a ondulacao nao quebra', (t) async {
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', onPressed: () {})));
      final g = await t.startGesture(t.getCenter(find.text('Ir')));
      await t.pump(const Duration(milliseconds: 100));
      await t.pumpWidget(_wrap(const VoltiButton(label: 'Ir')));
      await t.pump(const Duration(milliseconds: 100));
      await g.up();
      await t.pump(const Duration(seconds: 1));
      expect(t.takeException(), isNull);
    });

    testWidgets('press escala com mola ate .97', (t) async {
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', onPressed: () {})));
      final g = await t.startGesture(t.getCenter(find.text('Ir')));
      await t.pump(const Duration(milliseconds: 400));
      final s = t.widget<AnimatedScale>(find.byType(AnimatedScale).first);
      expect(s.scale, VoltiMotion.pressScale);
      await g.up();
      await t.pump(const Duration(seconds: 1));
    });

    testWidgets('loading: spinner e inerte', (t) async {
      var taps = 0;
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', loading: true, onPressed: () => taps++)));
      expect(find.byKey(const Key('volti-button-spinner')), findsOneWidget);
      await t.tap(find.text('Ir'));
      await t.pump();
      expect(taps, 0);
    });

    testWidgets('shine desenha o brilho; reduced motion nao', (t) async {
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', shine: true, onPressed: () {})));
      await t.pump(const Duration(seconds: 2));
      expect(find.byKey(const Key('volti-shine')), findsOneWidget);
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', shine: true, onPressed: () {}), reduced: true));
      await t.pump();
      expect(find.byKey(const Key('volti-shine')), findsNothing);
    });

    testWidgets('reduced motion nao quebra onPressed', (t) async {
      var taps = 0;
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', onPressed: () => taps++), reduced: true));
      await t.tap(find.text('Ir'));
      await t.pumpAndSettle();
      expect(taps, 1);
    });
  });

  group('VoltiSuccessCheck / OptionCard', () {
    testWidgets('check faz pop; reduced = sem anel', (t) async {
      await t.pumpWidget(_wrap(const VoltiSuccessCheck()));
      await t.pump(const Duration(milliseconds: 400));
      expect(find.byKey(const Key('volti-success-check')), findsOneWidget);
      await t.pump(const Duration(seconds: 4));
      await t.pumpWidget(_wrap(const VoltiSuccessCheck(), reduced: true));
      expect(find.byKey(const Key('volti-pulse-ring')), findsNothing);
    });

    testWidgets('OptionCard selecionado mostra ponto com pop', (t) async {
      await t.pumpWidget(_wrap(OptionCard(title: 'x', selected: true, onTap: () {})));
      expect(find.byKey(const Key('option-radio-dot')), findsOneWidget);
      await t.pump(const Duration(seconds: 1));
    });
  });

  group('Rota', () {
    test('partial devolve o trecho proporcional', () {
      final pts = [const Offset(0, 0), const Offset(10, 0), const Offset(10, 10)];
      Offset lerp(Offset a, Offset b, double f) => Offset.lerp(a, b, f)!;
      double dist(Offset a, Offset b) => (a - b).distance;
      expect(VoltiRouteDraw.partial(pts, 0, lerp: lerp, dist: dist), [pts.first]);
      expect(VoltiRouteDraw.partial(pts, 1, lerp: lerp, dist: dist), pts);
      expect(VoltiRouteDraw.partial(pts, .75, lerp: lerp, dist: dist).last, const Offset(10, 5));
      expect(VoltiRouteDraw.partial(pts, .25, lerp: lerp, dist: dist).last, const Offset(5, 0));
    });

    testWidgets('VoltiRouteDraw anima o progresso de 0 a 1', (t) async {
      final seen = <double>[];
      await t.pumpWidget(_wrap(VoltiRouteDraw(builder: (_, p) {
        seen.add(p);
        return const SizedBox();
      })));
      await t.pump(const Duration(milliseconds: 900));
      await t.pump(const Duration(seconds: 2));
      expect(seen.first, 0);
      expect(seen.last, 1);
    });

    testWidgets('reduced: rota ja desenhada', (t) async {
      double? p;
      await t.pumpWidget(_wrap(VoltiRouteDraw(builder: (_, v) {
        p = v;
        return const SizedBox();
      }), reduced: true));
      expect(p, 1);
    });
  });

  group('Dialog / Sheet / Toast', () {
    testWidgets('dialogo entra com pop; reduced mostra final', (t) async {
      await t.pumpWidget(_wrap(const VoltiDialog(title: 'Oi')));
      expect(_opacityOf(t, find.text('Oi')), lessThan(1));
      await t.pump(const Duration(seconds: 1));
      expect(_opacityOf(t, find.text('Oi')), 1);
      await t.pumpWidget(_wrap(const VoltiDialog(title: 'Oi2'), reduced: true));
      expect(_opacityOf(t, find.text('Oi2')), 1);
    });

    testWidgets('toast entra com mola', (t) async {
      await t.pumpWidget(_wrap(const VoltiToast(message: 'ok')));
      expect(_opacityOf(t, find.text('ok')), 0);
      await t.pump(const Duration(seconds: 1));
      expect(_opacityOf(t, find.text('ok')), 1);
    });

    testWidgets('conteudo do sheet sobe com atraso', (t) async {
      await t.pumpWidget(_wrap(const VoltiBottomSheet(child: Text('conteudo'))));
      expect(_opacityOf(t, find.text('conteudo')), 0);
      await t.pump(const Duration(milliseconds: 700));
      expect(_opacityOf(t, find.text('conteudo')), 1);
    });
  });

  group('VoltiChip / PassCard', () {
    testWidgets('chip dispara onTap e reflete selected', (t) async {
      var n = 0;
      await t.pumpWidget(_wrap(VoltiChip(label: 'Navegar', selected: true, onTap: () => n++)));
      await t.tap(find.text('Navegar'));
      await t.pump(const Duration(seconds: 1));
      expect(n, 1);
    });

    testWidgets('PassCard renderiza e dispara onTap', (t) async {
      var n = 0;
      await t.pumpWidget(_wrap(PassCard(title: 'Passe', subtitle: 'sub', onTap: () => n++)));
      await t.tap(find.text('Passe'));
      await t.pump(const Duration(seconds: 1));
      expect(n, 1);
      expect(find.text('sub'), findsOneWidget);
    });
  });

  group('VoltiPageTransitions', () {
    Widget app({required bool modal, bool reduced = false}) => MediaQuery(
          data: MediaQueryData(disableAnimations: reduced),
          child: MaterialApp(
            home: Builder(
              builder: (c) => Scaffold(
                body: TextButton(
                  onPressed: () => Navigator.of(c).push(VoltiPageRoute<void>(
                    modal: modal,
                    builder: (_) => const Scaffold(body: Text('segunda')),
                  )),
                  child: const Text('abrir'),
                ),
              ),
            ),
          ),
        );

    testWidgets('push lateral: entra pela direita', (t) async {
      await t.pumpWidget(app(modal: false));
      await t.tap(find.text('abrir'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 100));
      final w = t.view.physicalSize.width / t.view.devicePixelRatio;
      expect(t.getTopLeft(find.text('segunda')).dx, greaterThan(w / 4));
      await t.pumpAndSettle();
      expect(find.text('segunda'), findsOneWidget);
      expect(t.getTopLeft(find.text('segunda')).dx, lessThan(w / 4));
    });

    testWidgets('modal: sobe de baixo e a tela de tras recua', (t) async {
      await t.pumpWidget(app(modal: true));
      await t.tap(find.text('abrir'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 150));
      final h = t.view.physicalSize.height / t.view.devicePixelRatio;
      expect(t.getTopLeft(find.text('segunda')).dy, allOf(greaterThan(0), lessThan(h)));
      await t.pump(const Duration(milliseconds: 100));
      expect(VoltiPageTransitions.recede.value, greaterThan(0));
      await t.pumpAndSettle();
      expect(VoltiPageTransitions.recede.value, 1);
      Navigator.of(t.element(find.text('segunda'))).pop();
      await t.pumpAndSettle();
      expect(VoltiPageTransitions.recede.value, 0);
    });

    testWidgets('reduced motion: sem transicao', (t) async {
      await t.pumpWidget(app(modal: false, reduced: true));
      await t.tap(find.text('abrir'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 1));
      expect(t.getTopLeft(find.text('segunda')).dx, lessThan(300));
    });
  });

  group('Estabilidade e recede', () {
    testWidgets('pins com key estavel nao reiniciam a queda quando a lista muda', (t) async {
      Widget list(List<String> ids) => _wrap(Column(children: [
            for (final id in ids)
              VehicleMarker(VehicleStatus.free, 80, key: ValueKey(id), delay: const Duration(milliseconds: 100)),
          ]));
      await t.pumpWidget(list(['a', 'b']));
      await t.pump(const Duration(seconds: 2));
      await t.pumpWidget(list(['x', 'a', 'b']));
      await t.pump(const Duration(milliseconds: 10));
      final bodies = find.byKey(const Key('vehicle-marker-body'));
      expect(bodies, findsNWidgets(3));
      // a e b seguem visiveis (sem reiniciar); so o novo (x, primeiro) esta em entrada.
      expect(_opacityOf(t, bodies.at(1)), 1);
      expect(_opacityOf(t, bodies.at(2)), 1);
      expect(_opacityOf(t, bodies.at(0)), 0);
      await t.pump(const Duration(seconds: 2));
    });

    testWidgets('animateIn false nao anima', (t) async {
      await t.pumpWidget(_wrap(const VehicleMarker(VehicleStatus.free, 80, animateIn: false, delay: Duration(seconds: 1))));
      expect(_opacityOf(t, find.byKey(const Key('vehicle-marker-body'))), 1);
    });

    testWidgets('shine nao pinta no trecho ocioso do ciclo', (t) async {
      await t.pumpWidget(_wrap(VoltiShine(child: const SizedBox(width: 100, height: 40))));
      await t.pump(const Duration(milliseconds: 100));
      expect(find.byKey(const Key('volti-shine')), findsNothing);
      await t.pump(const Duration(milliseconds: 1900)); // 2 s: em pleno varrido
      expect(find.byKey(const Key('volti-shine')), findsOneWidget);
      await t.pump(const Duration(milliseconds: 2500)); // 4,5 s: ocioso
      expect(find.byKey(const Key('volti-shine')), findsNothing);
    });

    testWidgets('VoltiStagger.wrap(animate: false) devolve os itens', (t) async {
      final items = [const Text('a')];
      expect(identical(VoltiStagger.wrap(items, animate: false), items), isTrue);
    });

    Widget app() => MaterialApp(
          home: Builder(
            builder: (c) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.of(c).push(VoltiPageRoute<void>(
                  modal: true,
                  builder: (_) => const Scaffold(body: Text('modal')),
                )),
                child: const Text('abrir'),
              ),
            ),
          ),
        );

    testWidgets('recede volta a 0 ao fechar o modal com pop', (t) async {
      await t.pumpWidget(app());
      await t.tap(find.text('abrir'));
      await t.pumpAndSettle();
      expect(VoltiPageTransitions.recede.value, 1);
      Navigator.of(t.element(find.text('modal'))).pop();
      await t.pumpAndSettle();
      expect(VoltiPageTransitions.recede.value, 0);
    });

    testWidgets('recede volta a 0 ao fechar com o gesto/botao voltar do sistema', (t) async {
      await t.pumpWidget(app());
      await t.tap(find.text('abrir'));
      await t.pumpAndSettle();
      await t.binding.handlePopRoute();
      await t.pumpAndSettle();
      expect(find.text('modal'), findsNothing);
      expect(VoltiPageTransitions.recede.value, 0);
    });

    testWidgets('modal fechando nao zera o valor de outro modal mais novo', (t) async {
      await t.pumpWidget(app());
      await t.tap(find.text('abrir'));
      await t.pumpAndSettle();
      final nav = Navigator.of(t.element(find.text('modal')));
      nav.push(VoltiPageRoute<void>(modal: true, builder: (_) => const Scaffold(body: Text('modal2'))));
      await t.pumpAndSettle();
      expect(VoltiPageTransitions.recede.value, 1);
      nav.pop();
      await t.pumpAndSettle();
      expect(VoltiPageTransitions.recede.value, 1);
      nav.pop();
      await t.pumpAndSettle();
      expect(VoltiPageTransitions.recede.value, 0);
    });
  });
}
