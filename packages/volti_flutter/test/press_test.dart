import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

Widget _wrap(Widget child, {bool reduced = false, double textScale = 1}) => MediaQuery(
      data: MediaQueryData(disableAnimations: reduced, textScaler: TextScaler.linear(textScale)),
      child: MaterialApp(
        theme: VoltiTheme.light(),
        home: Scaffold(body: Center(child: SizedBox(width: 360, child: Center(child: child)))),
      ),
    );

AnimatedScale _scaleOf(WidgetTester t, Finder of) =>
    t.widget<AnimatedScale>(find.descendant(of: of, matching: find.byType(AnimatedScale)).first);

BoxDecoration _surface(WidgetTester t, String key) {
  final c = t.widget<Container>(
    find.descendant(of: find.byKey(Key(key)), matching: find.byType(Container)).first,
  );
  return c.decoration! as BoxDecoration;
}

void main() {
  final haptics = <VoltiHapticKind>[];
  setUp(() {
    haptics.clear();
    VoltiHaptics.enabled = true;
    VoltiHaptics.debugHandler = (k) async => haptics.add(k);
  });
  tearDown(() {
    VoltiHaptics.debugHandler = null;
    VoltiHaptics.enabled = true;
  });

  group('press', () {
    testWidgets('aperta com ease-out rapido e solta com mola', (t) async {
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', onPressed: () {})));
      final g = await t.startGesture(t.getCenter(find.text('Ir')));
      await t.pump(const Duration(milliseconds: 150));
      var s = _scaleOf(t, find.byType(VoltiButton));
      expect(s.scale, VoltiMotion.pressScale);
      expect(s.curve, VoltiMotion.easeOut);
      expect(s.duration, VoltiMotion.durFast);
      await g.up();
      await t.pump();
      s = _scaleOf(t, find.byType(VoltiButton));
      expect(s.scale, 1);
      expect(s.curve, VoltiMotion.easeSpring);
      expect(s.duration, VoltiMotion.durSpring);
      await t.pumpAndSettle();
    });

    testWidgets('sombra baixa e fundo escurece no press', (t) async {
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', onPressed: () {})));
      final rest = _surface(t, 'volti-button-surface');
      final g = await t.startGesture(t.getCenter(find.text('Ir')));
      await t.pump(const Duration(milliseconds: 150));
      await t.pump(const Duration(milliseconds: 400));
      final down = _surface(t, 'volti-button-surface');
      expect(down.boxShadow!.first.blurRadius, lessThan(rest.boxShadow!.first.blurRadius));
      expect(down.boxShadow!.first.offset.dy, lessThan(rest.boxShadow!.first.offset.dy));
      expect(down.color, VoltiButton.pressedColor(VoltiButtonVariant.primary, VoltiColors.brandAction));
      await g.up();
      await t.pumpAndSettle();
      expect(_surface(t, 'volti-button-surface').boxShadow, rest.boxShadow);
    });

    test('contraste E-12 continua >= 4,5:1 no press', () {
      final primary = VoltiButton.pressedColor(VoltiButtonVariant.primary, VoltiColors.brandAction);
      expect(VoltiColors.contrast(primary, VoltiColors.onBrandAction), greaterThanOrEqualTo(4.5));
      expect(
        VoltiColors.contrast(primary, VoltiColors.onBrandAction),
        greaterThan(VoltiColors.contrast(VoltiColors.brandAction, VoltiColors.onBrandAction)),
      );
      final secondary = VoltiButton.pressedColor(VoltiButtonVariant.secondary, VoltiColors.white);
      expect(VoltiColors.contrast(secondary, VoltiColors.brandAction), greaterThanOrEqualTo(4.5));
      final ghost = Color.alphaBlend(
        VoltiButton.pressedColor(VoltiButtonVariant.ghost, Colors.transparent),
        VoltiColors.white,
      );
      expect(VoltiColors.contrast(ghost, VoltiColors.ink900), greaterThanOrEqualTo(4.5));
    });

    testWidgets('reduced motion: sem escala, so opacidade instantanea', (t) async {
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', onPressed: () {}), reduced: true));
      final g = await t.startGesture(t.getCenter(find.text('Ir')));
      await t.pump(const Duration(milliseconds: 150));
      final s = _scaleOf(t, find.byType(VoltiButton));
      expect(s.scale, 1);
      final o = t.widget<Opacity>(find.byKey(const Key('volti-press-opacity')).first);
      expect(o.opacity, VoltiMotion.pressOpacityReduced);
      await g.up();
      await t.pump();
      expect(t.widget<Opacity>(find.byKey(const Key('volti-press-opacity')).first).opacity, 1);
    });

    testWidgets('icon button: escala .88 e troca de fundo, sem ondulacao (IconButton.jsx)', (t) async {
      await t.pumpWidget(_wrap(VoltiIconButton(icon: Icons.add, label: 'Mais', variant: VoltiIconButtonVariant.brand, onPressed: () {})));
      expect(t.getSize(find.byType(VoltiIconButton)).width, greaterThanOrEqualTo(44));
      final rest = _surface(t, 'volti-icon-button-surface');
      final g = await t.startGesture(t.getCenter(find.byType(VoltiIconButton)));
      await t.pump(const Duration(milliseconds: 150));
      await t.pump(const Duration(milliseconds: 300));
      expect(_scaleOf(t, find.byType(VoltiIconButton)).scale, VoltiMotion.iconPressScale);
      expect(find.byType(VoltiRipple), findsNothing);
      final down = _surface(t, 'volti-icon-button-surface');
      expect(down.color, isNot(rest.color));
      expect(down.boxShadow, rest.boxShadow);
      await g.up();
      await t.pumpAndSettle();

      await t.pumpWidget(_wrap(VoltiIconButton(icon: Icons.add, label: 'Mais', onPressed: () {}), reduced: true));
      final g2 = await t.startGesture(t.getCenter(find.byType(VoltiIconButton)));
      await t.pump(const Duration(milliseconds: 150));
      expect(_scaleOf(t, find.byType(VoltiIconButton)).scale, 1);
      expect(find.byKey(const Key('volti-ripple')), findsNothing);
      await g2.up();
      await t.pumpAndSettle();
    });

    testWidgets('chip tambem nao escala com reduced motion', (t) async {
      await t.pumpWidget(_wrap(VoltiChip(label: 'Todas', onTap: () {}), reduced: true));
      final g = await t.startGesture(t.getCenter(find.text('Todas')));
      await t.pump(const Duration(milliseconds: 150));
      expect(_scaleOf(t, find.byType(VoltiChip)).scale, 1);
      await g.up();
      await t.pump();
    });
  });

  group('loading e sucesso sem mudar a largura', () {
    for (final icon in [null, Icons.lock_open]) {
      testWidgets('loading mantem a largura (icone: $icon)', (t) async {
        await t.pumpWidget(_wrap(VoltiButton(label: 'Confirmar reserva', icon: icon, onPressed: () {})));
        final before = t.getSize(find.byType(VoltiButton));
        await t.pumpWidget(_wrap(VoltiButton(label: 'Confirmar reserva', icon: icon, loading: true, onPressed: () {})));
        await t.pump(const Duration(milliseconds: 100));
        expect(t.getSize(find.byType(VoltiButton)), before);
        expect(find.byKey(const Key('volti-button-spinner')), findsOneWidget);
        await t.pump(const Duration(milliseconds: 300));
        expect(t.widget<AnimatedOpacity>(find.byKey(const Key('volti-button-content'))).opacity, 0);
        expect(t.getSize(find.byType(VoltiButton)), before);
      });
    }

    testWidgets('texto a 200% sem fullWidth: loading mantem a largura', (t) async {
      await t.pumpWidget(_wrap(VoltiButton(label: 'Enviar', icon: Icons.send, onPressed: () {}), textScale: 2));
      final before = t.getSize(find.byType(VoltiButton));
      await t.pumpWidget(_wrap(VoltiButton(label: 'Enviar', icon: Icons.send, loading: true, onPressed: () {}), textScale: 2));
      await t.pump(const Duration(milliseconds: 300));
      expect(t.takeException(), isNull);
      expect(t.getSize(find.byType(VoltiButton)), before);
    });

    testWidgets('anel do sucesso fica recortado na pilula', (t) async {
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', onPressed: () {})));
      Container surface() => t.widget<Container>(
            find.descendant(of: find.byKey(const Key('volti-button-surface')), matching: find.byType(Container)).first,
          );
      expect(surface().clipBehavior, Clip.none);
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', success: true, onPressed: () {})));
      expect(surface().clipBehavior, Clip.antiAlias);
      await t.pumpAndSettle();
    });

    testWidgets('loading nao esmaece mesmo com onPressed null', (t) async {
      await t.pumpWidget(_wrap(const VoltiButton(label: 'Ir', loading: true)));
      expect(t.widget<AnimatedOpacity>(find.byKey(const Key('volti-button-enabled-fade'))).opacity, 1);
    });

    testWidgets('texto a 200%: morph de loading cabe sem overflow', (t) async {
      await t.pumpWidget(_wrap(
        VoltiButton(label: 'Aceitar e destravar', icon: Icons.lock_open, fullWidth: true, size: VoltiButtonSize.lg, onPressed: () {}),
        textScale: 2,
      ));
      final before = t.getSize(find.byType(VoltiButton));
      await t.pumpWidget(_wrap(
        VoltiButton(label: 'Aceitar e destravar', icon: Icons.lock_open, fullWidth: true, size: VoltiButtonSize.lg, loading: true, onPressed: () {}),
        textScale: 2,
      ));
      await t.pump(const Duration(milliseconds: 300));
      expect(t.takeException(), isNull);
      expect(t.getSize(find.byType(VoltiButton)), before);
    });

    testWidgets('sucesso mostra o check do design no lugar do rotulo', (t) async {
      await t.pumpWidget(_wrap(VoltiButton(label: 'Confirmar reserva', onPressed: () {})));
      final before = t.getSize(find.byType(VoltiButton));
      var taps = 0;
      await t.pumpWidget(_wrap(VoltiButton(label: 'Confirmar reserva', success: true, onPressed: () => taps++)));
      await t.pump(const Duration(milliseconds: 100));
      expect(find.byKey(const Key('volti-button-success')), findsOneWidget);
      expect(find.byType(VoltiSuccessCheck), findsOneWidget);
      expect(t.getSize(find.byType(VoltiButton)), before);
      await t.tap(find.byType(VoltiButton));
      expect(taps, 0);
      // Contraste do check no primario: branco com check no tom de acao.
      final check = t.widget<VoltiSuccessCheck>(find.byType(VoltiSuccessCheck));
      expect(VoltiColors.contrast(check.color, check.iconColor), greaterThanOrEqualTo(4.5));
      await t.pumpAndSettle();
    });

    testWidgets('desabilitado -> habilitado faz fade (reduced = instantaneo)', (t) async {
      await t.pumpWidget(_wrap(const VoltiButton(label: 'Ir')));
      var o = t.widget<AnimatedOpacity>(find.byKey(const Key('volti-button-enabled-fade')));
      expect(o.opacity, .4);
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', onPressed: () {})));
      o = t.widget<AnimatedOpacity>(find.byKey(const Key('volti-button-enabled-fade')));
      expect(o.opacity, 1);
      expect(o.duration, VoltiMotion.durBase);
      await t.pump(const Duration(milliseconds: 100));
      final mid = t.widget<FadeTransition>(
        find.descendant(of: find.byKey(const Key('volti-button-enabled-fade')), matching: find.byType(FadeTransition)).first,
      );
      expect(mid.opacity.value, inExclusiveRange(.4, 1));
      await t.pumpAndSettle();

      await t.pumpWidget(_wrap(const VoltiButton(label: 'Ir'), reduced: true));
      expect(t.widget<AnimatedOpacity>(find.byKey(const Key('volti-button-enabled-fade'))).duration, Duration.zero);
    });
  });

  group('semantica', () {
    testWidgets('botao, habilitado e acao de toque se mantem', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(VoltiButton(label: 'Confirmar reserva', onPressed: () {})));
      expect(
        t.getSemantics(find.byType(VoltiButton)),
        matchesSemantics(label: 'Confirmar reserva', isButton: true, hasEnabledState: true, isEnabled: true, hasTapAction: true),
      );
      await t.pumpWidget(_wrap(const VoltiButton(label: 'Confirmar reserva', loading: true)));
      expect(
        t.getSemantics(find.byType(VoltiButton)),
        matchesSemantics(label: 'Confirmar reserva', isButton: true, hasEnabledState: true),
      );
      h.dispose();
    });

    testWidgets('loading e sucesso sao anunciados (valor + live region)', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', loadingSemanticLabel: 'Carregando…', onPressed: () {})));
      expect(t.getSemantics(find.byType(VoltiButton)), isSemantics(label: 'Ir', value: '', isLiveRegion: false));
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', loading: true, loadingSemanticLabel: 'Carregando…', onPressed: () {})));
      expect(
        t.getSemantics(find.byType(VoltiButton)),
        isSemantics(label: 'Ir', value: 'Carregando…', isButton: true, isLiveRegion: true),
      );
      // Textos vindos do app pelo VoltiButtonLabels.
      await t.pumpWidget(_wrap(const VoltiButtonLabels(
        loading: 'Carregando…',
        success: 'Concluído',
        child: VoltiButton(label: 'Ir', success: true),
      )));
      expect(
        t.getSemantics(find.byType(VoltiButton)),
        isSemantics(label: 'Ir', value: 'Concluído', isButton: true, isLiveRegion: true),
      );
      await t.pumpAndSettle();
      h.dispose();
    });

    testWidgets('VoltiCheckbox com rotulo: linha toda tocavel e lida com o texto', (t) async {
      final h = t.ensureSemantics();
      var v = false;
      await t.pumpWidget(_wrap(StatefulBuilder(
        builder: (context, set) => VoltiCheckbox(value: v, label: const Text('Aceito os termos'), onChanged: (n) => set(() => v = n)),
      )));
      expect(
        t.getSemantics(find.byType(VoltiCheckbox)),
        isSemantics(label: 'Aceito os termos', hasCheckedState: true, isChecked: false, hasTapAction: true),
      );
      await t.tap(find.text('Aceito os termos'));
      await t.pump();
      expect(v, isTrue);
      expect(t.getSize(find.byType(VoltiCheckbox)).height, greaterThanOrEqualTo(44));
      await t.pumpAndSettle();
      h.dispose();
    });

    testWidgets('OptionCard continua marcavel/selecionavel', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(OptionCard(title: 'Diário', selected: true, onTap: () {})));
      expect(
        t.getSemantics(find.byType(OptionCard)),
        isSemantics(isChecked: true, hasCheckedState: true, isInMutuallyExclusiveGroup: true, hasEnabledState: true, isEnabled: true),
      );
      expect(
        t.getSemantics(find.byType(VoltiPressable)),
        isSemantics(isButton: true, hasTapAction: true, isEnabled: true),
      );
      await t.pump(const Duration(seconds: 1));
      h.dispose();
    });

    testWidgets('VoltiCheckbox: marcavel, 44 px e haptica de selecao', (t) async {
      final h = t.ensureSemantics();
      var v = false;
      await t.pumpWidget(_wrap(StatefulBuilder(
        builder: (context, set) => VoltiCheckbox(value: v, semanticLabel: 'Aceito', onChanged: (n) => set(() => v = n)),
      )));
      expect(t.getSize(find.byType(VoltiCheckbox)), const Size(44, 44));
      expect(
        t.getSemantics(find.byType(VoltiCheckbox)),
        matchesSemantics(label: 'Aceito', hasCheckedState: true, isChecked: false, hasEnabledState: true, isEnabled: true, hasTapAction: true),
      );
      await t.tap(find.byType(VoltiCheckbox));
      await t.pump(const Duration(milliseconds: 60));
      expect(v, isTrue);
      expect(haptics, [VoltiHapticKind.selection]);
      final mid = t.widget<AnimatedScale>(find.byKey(const Key('volti-checkbox-check')));
      expect(mid.scale, 1);
      await t.pumpAndSettle();
      h.dispose();
    });
  });

  group('selecao', () {
    testWidgets('OptionCard faz tween da borda/fundo e o ponto entra com mola', (t) async {
      Widget card(bool sel) => OptionCard(key: const Key('c'), title: 'Diário', selected: sel, onTap: () {});
      await t.pumpWidget(_wrap(card(false)));
      final from = _surface(t, 'option-card-surface').color;
      await t.pumpWidget(_wrap(card(true)));
      await t.pump(const Duration(milliseconds: 60));
      final mid = _surface(t, 'option-card-surface').color;
      expect(mid, isNot(from));
      expect(mid, isNot(VoltiColors.brandSoft));
      final dot = find.descendant(of: find.byKey(const Key('option-radio-dot')), matching: find.byType(ScaleTransition));
      final s = t.widget<ScaleTransition>(dot.first).scale.value;
      expect(s, inExclusiveRange(0, 1.3));
      expect(s, isNot(1));
      await t.pumpAndSettle();
      expect(_surface(t, 'option-card-surface').color, VoltiColors.brandSoft);
      expect(t.widget<ScaleTransition>(dot.first).scale.value, 1);
    });

    testWidgets('OptionCard com reduced motion troca na hora', (t) async {
      Widget card(bool sel) => OptionCard(title: 'Diário', selected: sel, onTap: () {});
      await t.pumpWidget(_wrap(card(false), reduced: true));
      await t.pumpWidget(_wrap(card(true), reduced: true));
      await t.pump();
      expect(_surface(t, 'option-card-surface').color, VoltiColors.brandSoft);
    });

    testWidgets('VoltiChip faz tween ao selecionar', (t) async {
      Widget chip(bool sel) => VoltiChip(label: 'Todas', selected: sel, onTap: () {});
      await t.pumpWidget(_wrap(chip(false)));
      final from = _surface(t, 'volti-chip-surface').color;
      await t.pumpWidget(_wrap(chip(true)));
      await t.pump(const Duration(milliseconds: 60));
      final mid = _surface(t, 'volti-chip-surface').color;
      expect(mid, isNot(from));
      expect(mid, isNot(VoltiColors.brandSoft));
      await t.pumpAndSettle();
      expect(_surface(t, 'volti-chip-surface').color, VoltiColors.brandSoft);
    });

    testWidgets('VoltiRadio: ponto escala de 0 a 1', (t) async {
      await t.pumpWidget(_wrap(const VoltiRadio(selected: false, dotKey: Key('d'))));
      expect(t.widget<AnimatedScale>(find.byKey(const Key('d'))).scale, 0);
      await t.pumpWidget(_wrap(const VoltiRadio(selected: true, dotKey: Key('d'))));
      final a = t.widget<AnimatedScale>(find.byKey(const Key('d')));
      expect(a.scale, 1);
      expect(a.curve, VoltiMotion.easeSpring);
      await t.pumpAndSettle();
    });
  });

  group('haptica', () {
    testWidgets('CTA de confirmacao toca impacto leve', (t) async {
      var taps = 0;
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', haptic: VoltiHapticKind.tap, onPressed: () => taps++)));
      await t.tap(find.text('Ir'));
      await t.pumpAndSettle();
      expect(taps, 1);
      expect(haptics, [VoltiHapticKind.tap]);
    });

    testWidgets('sem haptic: nada; desabilitado/carregando: nada', (t) async {
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', onPressed: () {})));
      await t.tap(find.text('Ir'));
      await t.pumpWidget(_wrap(const VoltiButton(label: 'Ir', haptic: VoltiHapticKind.tap)));
      await t.tap(find.text('Ir'));
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', haptic: VoltiHapticKind.tap, loading: true, onPressed: () {})));
      await t.tap(find.byType(VoltiButton));
      await t.pump(const Duration(milliseconds: 500));
      expect(haptics, isEmpty);
    });

    testWidgets('respeita a preferencia do usuario', (t) async {
      VoltiHaptics.enabled = false;
      await t.pumpWidget(_wrap(VoltiButton(label: 'Ir', haptic: VoltiHapticKind.tap, onPressed: () {})));
      await t.tap(find.text('Ir'));
      await t.pumpAndSettle();
      expect(haptics, isEmpty);
    });

    testWidgets('so vibra em Android/iOS', (t) async {
      VoltiHaptics.debugHandler = null;
      final calls = <String>[];
      t.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
        if (call.method == 'HapticFeedback.vibrate') calls.add(call.arguments as String);
        return null;
      });
      debugDefaultTargetPlatformOverride = TargetPlatform.windows;
      await VoltiHaptics.tap();
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      await VoltiHaptics.tap();
      debugDefaultTargetPlatformOverride = null;
      t.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null);
      expect(calls, ['HapticFeedbackType.lightImpact']);
    });
  });
}
