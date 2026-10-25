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

VoltiLogoMarkPainter _painter(WidgetTester t) => t
    .widgetList<CustomPaint>(find.byType(CustomPaint))
    .map((c) => c.painter)
    .whereType<VoltiLogoMarkPainter>()
    .single;

Finder get _markPaint => find.byWidgetPredicate(
  (w) => w is CustomPaint && w.painter is VoltiLogoMarkPainter,
);

void main() {
  group('VoltiLogoMark', () {
    testWidgets('pinta a geometria do SVG: 2 rodas e 5 tracos, cor da marca por padrao', (t) async {
      await t.pumpWidget(_wrap(const VoltiLogoMark(size: 180)));
      final p = _painter(t);
      expect(p.color, VoltiColors.brand);
      expect(p.progress, 1);
      expect(t.getSize(_markPaint), const Size(180, 180));
      expect(
        _markPaint,
        paints
          ..circle(x: 40, y: 132, radius: 22, strokeWidth: 12, style: PaintingStyle.stroke, color: VoltiColors.brand)
          ..circle(x: 140, y: 132, radius: 22, strokeWidth: 12, style: PaintingStyle.stroke)
          ..path(strokeWidth: 16, style: PaintingStyle.stroke)
          ..path(strokeWidth: 11)
          ..path(strokeWidth: 11)
          ..path(strokeWidth: 12)
          ..path(strokeWidth: 12),
      );
    });

    testWidgets('caps e joins arredondados; escala o viewBox 180 para o tamanho', (t) async {
      await t.pumpWidget(_wrap(const VoltiLogoMark(size: 90, color: VoltiColors.white)));
      expect(t.getSize(_markPaint), const Size(90, 90));
      expect(
        _markPaint,
        paints
          ..save()
          ..translate(x: 0, y: 0)
          ..scale(x: .5, y: .5)
          ..circle(color: VoltiColors.white),
      );
      final rec = _RecordingCanvas();
      const VoltiLogoMarkPainter(color: VoltiColors.white).paint(rec, const Size(180, 180));
      expect(rec.paints, hasLength(7));
      expect(rec.paints.every((p) => p.strokeCap == StrokeCap.round && p.strokeJoin == StrokeJoin.round), isTrue);
    });

    testWidgets('semantica "Volti" (imagem); semanticLabel null exclui', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(const VoltiLogoMark()));
      expect(find.bySemanticsLabel('Volti'), findsOneWidget);
      await t.pumpWidget(_wrap(const VoltiLogoMark(semanticLabel: null)));
      expect(find.bySemanticsLabel('Volti'), findsNothing);
      h.dispose();
    });

    testWidgets('animado: rodas, depois quadro, depois banco e guidao em ~900 ms', (t) async {
      await t.pumpWidget(_wrap(const VoltiLogoMark.animated(size: 180)));
      expect(_painter(t).progress, 0);
      expect(_markPaint, isNot(paints..arc()));

      await t.pump(const Duration(milliseconds: 200));
      final early = _painter(t).progress;
      expect(early, greaterThan(0));
      // So rodas (arcos) nesse ponto: nenhum traco reto.
      expect(_markPaint, paints..arc()..arc());
      expect(_markPaint, isNot(paints..path()));

      await t.pump(const Duration(milliseconds: 300));
      // Rodas completas; quadro comecou; banco/guidao ainda nao.
      expect(_markPaint, paints..circle()..circle()..path(strokeWidth: 16));
      expect(_markPaint, isNot(paints..path(strokeWidth: 16)..path()..path()..path(strokeWidth: 12)));

      await t.pump(const Duration(milliseconds: 400));
      expect(_painter(t).progress, 1);
      await t.pump(const Duration(milliseconds: 16));
      expect(t.hasRunningAnimations, isFalse);
    });

    testWidgets('animado com atraso: nada desenhado antes do atraso', (t) async {
      await t.pumpWidget(_wrap(const VoltiLogoMark.animated(delay: Duration(milliseconds: 300))));
      await t.pump(const Duration(milliseconds: 250));
      expect(_painter(t).progress, 0);
      await t.pumpAndSettle();
      expect(_painter(t).progress, 1);
    });

    testWidgets('reduced motion: aparece pronto, sem animar', (t) async {
      await t.pumpWidget(_wrap(const VoltiLogoMark.animated(), reduced: true));
      expect(_painter(t).progress, 1);
      expect(t.hasRunningAnimations, isFalse);
    });
  });

  group('VoltiLogo', () {
    testWidgets('simbolo + "volti" em Plus Jakarta Sans 800, tracking -4,5%', (t) async {
      await t.pumpWidget(_wrap(const VoltiLogo(fontSize: 40)));
      final text = t.widget<Text>(find.text('volti'));
      expect(text.style!.fontFamily, VoltiTypography.fontSans);
      expect(text.style!.fontWeight, FontWeight.w800);
      expect(text.style!.letterSpacing, closeTo(-1.8, 1e-9));
      expect(text.style!.color, VoltiColors.ink900);
      expect(_painter(t).color, VoltiColors.brand);
      expect(t.getSize(_markPaint).width, closeTo(40 * 64 / 54, 1e-9));
    });

    testWidgets('variantes: branca e escura', (t) async {
      await t.pumpWidget(_wrap(const VoltiLogo(variant: VoltiLogoVariant.white)));
      expect(_painter(t).color, VoltiColors.white);
      expect(t.widget<Text>(find.text('volti')).style!.color, VoltiColors.white);
      await t.pumpWidget(_wrap(const VoltiLogo(variant: VoltiLogoVariant.dark)));
      expect(_painter(t).color, VoltiColors.ink900);
      expect(t.widget<Text>(find.text('volti')).style!.color, VoltiColors.ink900);
    });

    testWidgets('um no de semantica "Volti" (header opcional), sem ler "volti" de novo', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(const VoltiLogo(header: true)));
      expect(find.bySemanticsLabel('Volti'), findsOneWidget);
      expect(find.bySemanticsLabel('volti'), findsNothing);
      expect(t.getSemantics(find.byType(VoltiLogo)), isSemantics(label: 'Volti', isHeader: true));
      h.dispose();
    });

    testWidgets('animado: desenha o simbolo e o nome entra; termina parado', (t) async {
      await t.pumpWidget(_wrap(const VoltiLogo.animated(variant: VoltiLogoVariant.white)));
      expect(_painter(t).progress, 0);
      await t.pump(const Duration(milliseconds: 450));
      expect(_painter(t).progress, inExclusiveRange(0, 1));
      await t.pumpAndSettle();
      expect(_painter(t).progress, 1);
      expect(find.ancestor(of: find.text('volti'), matching: find.byType(Opacity)), findsNothing);
    });

    testWidgets('animado com reduced motion: pronto no primeiro quadro', (t) async {
      await t.pumpWidget(_wrap(const VoltiLogo.animated(), reduced: true));
      expect(_painter(t).progress, 1);
      expect(find.ancestor(of: find.text('volti'), matching: find.byType(Opacity)), findsNothing);
      expect(t.hasRunningAnimations, isFalse);
    });
  });
}

/// Canvas que so registra os Paints usados (caps/joins).
class _RecordingCanvas extends Fake implements Canvas {
  final paints = <Paint>[];
  @override
  void save() {}
  @override
  void restore() {}
  @override
  void translate(double dx, double dy) {}
  @override
  void scale(double sx, [double? sy]) {}
  @override
  void drawCircle(Offset c, double radius, Paint paint) => paints.add(paint);
  @override
  void drawPath(Path path, Paint paint) => paints.add(paint);
}
