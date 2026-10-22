import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

Widget _wrap(Widget child, {bool reduceMotion = false}) => MaterialApp(
      theme: VoltiTheme.light(),
      home: MediaQuery(
        data: MediaQueryData(disableAnimations: reduceMotion),
        child: Scaffold(body: Center(child: SizedBox(width: 320, child: child))),
      ),
    );

void main() {
  group('VoltiSegmentedControl', () {
    testWidgets('mostra as opcoes e troca o valor ao tocar', (t) async {
      var value = 'today';
      await t.pumpWidget(StatefulBuilder(
        builder: (context, setState) => _wrap(VoltiSegmentedControl<String>(
          options: const [
            VoltiSegment(value: 'today', label: 'Hoje'),
            VoltiSegment(value: 'done', label: 'Concluídas'),
          ],
          value: value,
          onChanged: (v) => setState(() => value = v),
        )),
      ));
      expect(find.text('Hoje'), findsOneWidget);
      expect(find.text('Concluídas'), findsOneWidget);

      await t.tap(find.text('Concluídas'));
      await t.pumpAndSettle();
      expect(value, 'done');
    });

    testWidgets('segmento selecionado e anunciado e tem alvo de 44 px', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(_wrap(VoltiSegmentedControl<int>(
        options: const [
          VoltiSegment(value: 1, label: 'Um'),
          VoltiSegment(value: 2, label: 'Dois'),
        ],
        value: 2,
        onChanged: (_) {},
      )));
      expect(t.getSemantics(find.text('Dois')),
          isSemantics(isSelected: true, isButton: true, label: 'Dois'));
      expect(t.getSemantics(find.text('Um')), isSemantics(isSelected: false));
      // Trilho 4 + segmento 36 + 4 = 44 px de altura tocavel.
      expect(t.getSize(find.byType(VoltiSegmentedControl<int>)).height, greaterThanOrEqualTo(44));
      handle.dispose();
    });

    testWidgets('reduced motion: troca sem animacao', (t) async {
      await t.pumpWidget(_wrap(
          VoltiSegmentedControl<int>(
            options: const [
              VoltiSegment(value: 1, label: 'Um'),
              VoltiSegment(value: 2, label: 'Dois'),
            ],
            value: 1,
            onChanged: (_) {},
          ),
          reduceMotion: true));
      final anim = t.widgetList<AnimatedContainer>(find.byType(AnimatedContainer));
      expect(anim, isNotEmpty);
      for (final a in anim) {
        expect(a.duration, Duration.zero);
      }
    });
  });

  group('VoltiBadge', () {
    for (final (tone, bg, fg) in [
      (VoltiBadgeTone.success, VoltiColors.successSoft, VoltiColors.successInk),
      (VoltiBadgeTone.warning, VoltiColors.warningSoft, VoltiColors.warningInk),
      (VoltiBadgeTone.danger, VoltiColors.dangerSoft, VoltiColors.dangerInk),
      (VoltiBadgeTone.info, VoltiColors.infoSoft, VoltiColors.infoInk),
      (VoltiBadgeTone.neutral, VoltiColors.surfaceSunken, VoltiColors.ink700),
      (VoltiBadgeTone.dark, VoltiColors.surfaceInverse, VoltiColors.white),
    ]) {
      testWidgets('tom ${tone.name}', (t) async {
        await t.pumpWidget(_wrap(VoltiBadge('Média', tone: tone, size: VoltiBadgeSize.sm)));
        final box = t.widget<Container>(find.byKey(const Key('volti-badge')));
        expect((box.decoration! as BoxDecoration).color, bg);
        expect(t.widget<Text>(find.text('Média')).style!.color, fg);
        expect(t.getSize(find.byKey(const Key('volti-badge'))).height, 20);
      });
    }
  });
}
