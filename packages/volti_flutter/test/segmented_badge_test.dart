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

    testWidgets('leitor de tela ativa o segmento (SemanticsAction.tap)', (t) async {
      final handle = t.ensureSemantics();
      var value = 1;
      await t.pumpWidget(StatefulBuilder(
        builder: (context, setState) => _wrap(VoltiSegmentedControl<int>(
          options: const [
            VoltiSegment(value: 1, label: 'Um'),
            VoltiSegment(value: 2, label: 'Dois'),
          ],
          value: value,
          onChanged: (v) => setState(() => value = v),
        )),
      ));
      final node = t.getSemantics(find.text('Dois'));
      expect(node, isSemantics(hasTapAction: true, isSelected: false));
      t.semantics.tap(find.semantics.byLabel('Dois'));
      await t.pumpAndSettle();
      expect(value, 2);
      expect(t.getSemantics(find.text('Dois')), isSemantics(isSelected: true));
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
      // Texto dos tons com AA (>= 4,5:1): verde e ink forte de aviso/perigo.
      (VoltiBadgeTone.success, VoltiColors.successSoft, VoltiPalette.light.successInk),
      (VoltiBadgeTone.warning, VoltiColors.warningSoft, VoltiColors.warningInkStrong),
      (VoltiBadgeTone.danger, VoltiColors.dangerSoft, VoltiColors.dangerInkStrong),
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

    testWidgets('no tema escuro usa a paleta escura', (t) async {
      await t.pumpWidget(MaterialApp(
        theme: VoltiTheme.dark(),
        home: const Scaffold(body: VoltiBadge('Ok', tone: VoltiBadgeTone.success)),
      ));
      final box = t.widget<Container>(find.byKey(const Key('volti-badge')));
      expect((box.decoration! as BoxDecoration).color, VoltiPalette.dark.successSoft);
      expect(t.widget<Text>(find.text('Ok')).style!.color, VoltiPalette.dark.successInk);
    });

    for (final size in VoltiBadgeSize.values) {
      testWidgets('a 200% de fonte a altura cresce com o texto, sem corte (${size.name})', (t) async {
        await t.pumpWidget(MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(2)),
          child: _wrap(VoltiBadge('Verificada 18+', size: size)),
        ));
        final pill = t.getSize(find.byKey(const Key('volti-badge'))), text = t.getSize(find.text('Verificada 18+'));
        expect(pill.height, greaterThanOrEqualTo(text.height));
        expect(pill.width, greaterThanOrEqualTo(text.width));
        expect(t.takeException(), isNull);
      });
    }
  });

  testWidgets('OptionCard: selo "Obrigatório" a 200% cresce com o texto', (t) async {
    await t.pumpWidget(MediaQuery(
      data: const MediaQueryData(textScaler: TextScaler.linear(2)),
      child: _wrap(const OptionCard(title: 'Seguro básico', badge: 'Obrigatório', price: 'Incluso')),
    ));
    final text = find.text('Obrigatório');
    final pill = find.ancestor(of: text, matching: find.byType(Container)).first;
    expect(t.getSize(pill).height, greaterThanOrEqualTo(t.getSize(text).height));
    expect(t.takeException(), isNull);
  });
}
