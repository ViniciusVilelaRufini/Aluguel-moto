import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

Widget _wrap(Widget child, {bool reduced = false, double textScale = 1}) => MediaQuery(
      data: MediaQueryData(disableAnimations: reduced, textScaler: TextScaler.linear(textScale)),
      child: MaterialApp(
        theme: VoltiTheme.light(),
        home: Scaffold(body: Center(child: child)),
      ),
    );

void main() {
  group('VoltiHaptics', () {
    testWidgets('chama a plataforma e respeita enabled', (t) async {
      final calls = <String>[];
      t.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
        if (call.method == 'HapticFeedback.vibrate') calls.add(call.arguments as String);
        return null;
      });
      await VoltiHaptics.selection();
      await VoltiHaptics.alert();
      await VoltiHaptics.success();
      expect(calls, ['HapticFeedbackType.selectionClick', 'HapticFeedbackType.heavyImpact', 'HapticFeedbackType.mediumImpact']);
      VoltiHaptics.enabled = false;
      await VoltiHaptics.warning();
      expect(calls, hasLength(3));
      VoltiHaptics.enabled = true;
      t.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null);
    });
  });

  group('VoltiSkeleton', () {
    testWidgets('anuncia "Carregando" uma vez e anima; reduced fica estatico', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(VoltiSkeleton.list(rows: 3)));
      expect(find.bySemanticsLabel('Carregando'), findsOneWidget);
      expect(find.byType(VoltiSkeletonBox), findsNWidgets(3 * 4));
      expect(t.binding.hasScheduledFrame, isTrue);
      await t.pumpWidget(_wrap(VoltiSkeleton.card(count: 2), reduced: true));
      await t.pump();
      expect(t.binding.hasScheduledFrame, isFalse);
      h.dispose();
    });
  });

  group('VoltiTicker', () {
    testWidgets('rola so o caractere que mudou e le o texto inteiro', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(const VoltiTicker('R\$ 2,50')));
      expect(find.bySemanticsLabel('R\$ 2,50'), findsOneWidget);
      await t.pumpWidget(_wrap(const VoltiTicker('R\$ 2,55')));
      await t.pump(const Duration(milliseconds: 100));
      // Durante a troca: o "0" saindo e o "5" entrando no ultimo slot.
      expect(find.text('0'), findsOneWidget);
      await t.pumpAndSettle();
      expect(find.text('0'), findsNothing);
      expect(find.bySemanticsLabel('R\$ 2,55'), findsOneWidget);
      h.dispose();
    });

    testWidgets('reduced motion troca seco', (t) async {
      await t.pumpWidget(_wrap(const VoltiTicker('12'), reduced: true));
      await t.pumpWidget(_wrap(const VoltiTicker('13'), reduced: true));
      expect(find.text('2'), findsNothing);
      expect(find.byType(AnimatedSwitcher), findsNothing);
    });

    testWidgets('VoltiCountUp conta ate o valor; reduced mostra o final', (t) async {
      String f(int v) => 'R\$ $v';
      await t.pumpWidget(_wrap(VoltiCountUp(value: 100, format: f)));
      expect(find.text('R\$ 0'), findsOneWidget);
      await t.pumpAndSettle();
      expect(find.text('R\$ 100'), findsOneWidget);
      await t.pumpWidget(_wrap(VoltiCountUp(key: const Key('b'), value: 7, format: f), reduced: true));
      expect(find.text('R\$ 7'), findsOneWidget);
    });
  });

  group('VoltiSpeedGauge', () {
    test('cores: verde, sol perto do limite, coral acima', () {
      expect(VoltiSpeedGauge.colorFor(10, 32), VoltiColors.brand);
      expect(VoltiSpeedGauge.colorFor(28, 32), VoltiColors.sun400);
      expect(VoltiSpeedGauge.colorFor(7, 6), VoltiColors.danger);
    });

    testWidgets('semantics e numero central nao estoura a 200%', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(
        const VoltiSpeedGauge(speedKmh: 24.4, limitKmh: 32, semanticsLabel: 'Velocidade 24, limite 32'),
        textScale: 2,
      ));
      await t.pumpAndSettle();
      expect(find.bySemanticsLabel('Velocidade 24, limite 32'), findsOneWidget);
      expect(find.text('24'), findsOneWidget);
      expect(t.takeException(), isNull);
      h.dispose();
    });
  });

  group('VoltiStatusBanner', () {
    testWidgets('entra e sai animando o tamanho; reduced e seco', (t) async {
      Widget b(bool v, {bool reduced = false}) =>
          _wrap(Column(children: [VoltiStatusBanner(visible: v, message: 'Sem conexão', tone: VoltiStatusTone.offline)]), reduced: reduced);
      await t.pumpWidget(b(false));
      expect(find.text('Sem conexão'), findsNothing);
      await t.pumpWidget(b(true));
      await t.pump(const Duration(milliseconds: 100));
      final mid = t.getSize(find.byType(AnimatedSize)).height;
      await t.pumpAndSettle();
      final full = t.getSize(find.byType(AnimatedSize)).height;
      expect(mid, lessThan(full));
      await t.pumpWidget(b(false, reduced: true));
      await t.pump();
      expect(find.text('Sem conexão'), findsNothing);
    });
  });

  group('VoltiEmptyState', () {
    testWidgets('titulo como header, acao e sem estouro a 200%', (t) async {
      var tapped = false;
      await t.pumpWidget(_wrap(
        VoltiEmptyState(
          icon: Icons.history,
          title: 'Nenhuma corrida ainda',
          message: 'Suas corridas aparecem aqui com recibo e trajeto.',
          actionLabel: 'Ir para o mapa',
          onAction: () => tapped = true,
        ),
        textScale: 2,
      ));
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      await t.tap(find.text('Ir para o mapa'));
      expect(tapped, isTrue);
    });
  });

  group('VoltiDragToDismiss', () {
    testWidgets('arrastar pouco volta; arrastar muito fecha', (t) async {
      var closed = 0;
      await t.pumpWidget(_wrap(VoltiDragToDismiss(
        onDismiss: () => closed++,
        child: Container(key: const Key('card'), width: 300, height: 160, color: Colors.white),
      )));
      final start = t.getTopLeft(find.byKey(const Key('card')));
      await t.drag(find.byKey(const Key('card')), const Offset(0, 40));
      await t.pumpAndSettle();
      expect(closed, 0);
      expect(t.getTopLeft(find.byKey(const Key('card'))).dy, moreOrLessEquals(start.dy, epsilon: .5));
      await t.drag(find.byKey(const Key('card')), const Offset(0, 140));
      await t.pumpAndSettle();
      expect(closed, 1);
    });
  });

  group('ReservationBanner', () {
    testWidgets('com totalSeconds mostra a barra proporcional; sem ela nao', (t) async {
      await t.pumpWidget(_wrap(const SizedBox(width: 320, child: ReservationBanner(seconds: 450, totalSeconds: 900)), reduced: true));
      final bar = t.widget<FractionallySizedBox>(find.byKey(const Key('reservation-progress')));
      expect(bar.widthFactor, .5);
      await t.pumpWidget(_wrap(const SizedBox(width: 320, child: ReservationBanner(seconds: 450))));
      expect(find.byKey(const Key('reservation-progress')), findsNothing);
    });
  });

  testWidgets('VoltiButton e lido uma vez so (sem rotulo duplicado)', (t) async {
    final h = t.ensureSemantics();
    await t.pumpWidget(_wrap(VoltiButton(label: 'Entrar', onPressed: () {})));
    expect(t.getSemantics(find.byType(VoltiButton)), isSemantics(label: 'Entrar', isButton: true));
    h.dispose();
  });

  testWidgets('VoltiFadeUp e VoltiEnter preservam o estado do filho ao terminar', (t) async {
    await t.pumpWidget(_wrap(Column(children: [
      VoltiFadeUp(child: VoltiCountUp(key: const Key('a'), value: 100, format: (v) => 'a$v')),
      VoltiEnter(child: VoltiCountUp(key: const Key('b'), value: 100, format: (v) => 'b$v', duration: const Duration(seconds: 2))),
    ])));
    await t.pump(const Duration(milliseconds: 1500));
    await t.pump(const Duration(milliseconds: 600));
    expect(find.text('a100'), findsOneWidget);
    expect(find.text('b100'), findsOneWidget);
  });

  test('tokens de texto forte em banners', () {
    expect(VoltiColors.warningInkStrong, const Color(0xFF9A4A0F));
    expect(VoltiColors.dangerInkStrong, const Color(0xFFB0352B));
  });
}
