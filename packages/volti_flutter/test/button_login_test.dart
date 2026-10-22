import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

Widget _wrap(Widget child, {double scale = 1}) => MaterialApp(
      theme: VoltiTheme.light(),
      home: MediaQuery(
        data: MediaQueryData(size: const Size(360, 740), textScaler: TextScaler.linear(scale)),
        child: Scaffold(body: Padding(padding: const EdgeInsets.all(20), child: Center(child: child))),
      ),
    );

BoxDecoration _decoration(WidgetTester t) => t
    .widget<Container>(find.descendant(of: find.byType(VoltiButton), matching: find.byType(Container)).first)
    .decoration! as BoxDecoration;

void main() {
  group('VoltiButton variantes da boas-vindas', () {
    testWidgets('neutral: fundo da superficie, contorno cinza e texto escuro', (t) async {
      var taps = 0;
      await t.pumpWidget(_wrap(VoltiButton(label: 'Google', variant: VoltiButtonVariant.neutral, onPressed: () => taps++)));
      final d = _decoration(t);
      expect(d.color, VoltiColors.white);
      expect((d.border! as Border).top.color, VoltiColors.borderStrong);
      expect(t.widget<Text>(find.text('Google')).style!.color, VoltiColors.ink900);
      await t.tap(find.byType(VoltiButton));
      expect(taps, 1);
    });

    testWidgets('soft: fundo cinza claro e texto escuro', (t) async {
      await t.pumpWidget(_wrap(VoltiButton(label: 'E-mail', variant: VoltiButtonVariant.soft, onPressed: () {})));
      expect(_decoration(t).color, VoltiColors.surfaceSunken);
      expect(t.widget<Text>(find.text('E-mail')).style!.color, VoltiColors.textPrimary);
    });
  });

  group('VoltiButton com subtitle', () {
    for (final scale in [1.0, 2.0]) {
      testWidgets('quebra a segunda linha sem cortar (texto ${scale}x)', (t) async {
        await t.pumpWidget(_wrap(
          VoltiButton(
            label: 'Continuar',
            subtitle: 'Volti Urban Cargo · VLT-0011',
            size: VoltiButtonSize.lg,
            fullWidth: true,
            onPressed: () {},
          ),
          scale: scale,
        ));
        expect(t.takeException(), isNull);
        final p = t.renderObject<RenderParagraph>(find.byKey(const Key('volti-button-subtitle')));
        expect(p.didExceedMaxLines, isFalse);
        expect(find.text('Volti Urban Cargo · VLT-0011'), findsOneWidget);
        expect(t.getSize(find.byType(VoltiButton)).height, greaterThanOrEqualTo(56));
      });
    }

    testWidgets('leitor de tela ouve rotulo e segunda linha', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(VoltiButton(label: 'Continuar', subtitle: 'Volti Flash · VLT-0011', onPressed: () {})));
      expect(find.bySemanticsLabel('Continuar: Volti Flash · VLT-0011'), findsOneWidget);
      h.dispose();
    });
  });

  testWidgets('wrap: rotulo longo quebra linha a 200% e o botao cresce', (t) async {
    await t.pumpWidget(_wrap(
      VoltiButton(label: 'Continuar com celular', wrap: true, size: VoltiButtonSize.lg, fullWidth: true, onPressed: () {}),
      scale: 2,
    ));
    expect(t.takeException(), isNull);
    final p = t.renderObject<RenderParagraph>(find.text('Continuar com celular'));
    expect(p.didExceedMaxLines, isFalse);
    expect(t.getSize(find.byType(VoltiButton)).height, greaterThan(56));
  });
}
