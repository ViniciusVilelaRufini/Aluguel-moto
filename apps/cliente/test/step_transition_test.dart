import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/features/onboarding/step_shell.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';

/// Passos de mentira com a moldura real; [step] muda pelo botao de cada passo.
class _Host extends StatefulWidget {
  const _Host();
  @override
  State<_Host> createState() => _HostState();
}

class _HostState extends State<_Host> {
  int step = 1;
  int? from;

  void go(int s) => setState(() {
        from = step;
        step = s;
      });

  @override
  Widget build(BuildContext context) => OnboardingStepSwitcher(
        step: step,
        framed: const {1, 2, 3},
        progressFrom: from,
        child: OnboardingStepShell(
          step: step,
          title: 'Passo $step',
          subtitle: 'sub',
          onBack: step > 1 ? () => go(step - 1) : null,
          cta: TextButton(onPressed: () => go(step + 1), child: Text('avancar $step')),
          children: const [TextField(key: Key('campo'))],
        ),
      );
}

Widget _app({MediaQueryData media = const MediaQueryData()}) => MediaQuery(data: media, child: testApp(const _Host()));

void main() {
  testWidgets('avancar: conteudo cruza para a esquerda, cabecalho parado e barra enchendo', (t) async {
    tallScreen(t);
    await t.pumpWidget(_app());
    await t.pumpAndSettle();
    final rest = t.getTopLeft(find.text('Passo 1'));
    final back = t.getTopLeft(find.byType(VoltiIconButton));
    await t.tap(find.text('avancar 1'));
    await t.pump();
    await t.pump(const Duration(milliseconds: 60));
    // Os dois passos aparecem durante a troca: o que sai vai para a esquerda e o
    // que entra vem da direita.
    expect(t.getTopLeft(find.text('Passo 1')).dx, lessThan(rest.dx));
    expect(t.getTopLeft(find.text('Passo 2')).dx, greaterThan(rest.dx));
    // So um cabecalho visivel, no mesmo lugar; a barra enche o segmento novo.
    expect(t.getTopLeft(find.byType(VoltiIconButton).hitTestable()), back);
    expect(find.byKey(const Key('progress-step-fill')).hitTestable(), findsWidgets);
    await t.pump(VoltiMotion.durScreen);
    await t.pumpAndSettle();
    expect(find.text('Passo 1'), findsNothing);
    expect(t.getTopLeft(find.text('Passo 2')), rest);
    expect(find.byKey(const Key('progress-step-fill')), findsNothing);
  });

  testWidgets('voltar: o passo anterior entra pela esquerda', (t) async {
    tallScreen(t);
    await t.pumpWidget(_app());
    await t.tap(find.text('avancar 1'));
    await t.pumpAndSettle();
    final rest = t.getTopLeft(find.text('Passo 2'));
    await t.tap(find.byType(VoltiIconButton).hitTestable());
    await t.pump();
    await t.pump(const Duration(milliseconds: 60));
    expect(t.getTopLeft(find.text('Passo 1')).dx, lessThan(rest.dx));
    expect(t.getTopLeft(find.text('Passo 2')).dx, greaterThan(rest.dx));
    await t.pumpAndSettle();
    expect(find.text('Passo 2'), findsNothing);
  });

  testWidgets('o passo que sai nao recebe toques', (t) async {
    tallScreen(t);
    await t.pumpWidget(_app());
    await t.tap(find.text('avancar 1'));
    await t.pump();
    await t.pump(const Duration(milliseconds: 200));
    expect(find.text('avancar 1').hitTestable(), findsNothing);
    await t.pumpAndSettle();
  });

  for (final media in const [MediaQueryData(disableAnimations: true), MediaQueryData(accessibleNavigation: true)]) {
    testWidgets('reduced motion (${media.disableAnimations ? 'animacoes' : 'leitor de tela'}): troca direta, sem deslize', (t) async {
      tallScreen(t);
      await t.pumpWidget(_app(media: media));
      final rest = t.getTopLeft(find.text('Passo 1'));
      await t.tap(find.text('avancar 1'));
      await t.pump();
      expect(find.text('Passo 1'), findsNothing);
      expect(find.text('Passo 2'), findsOneWidget);
      // Mesma arvore, mas ja no estado final: sem deslocamento nem fade.
      expect(t.getTopLeft(find.text('Passo 2')), rest);
      expect(t.widget<Opacity>(find.byKey(const Key('onboarding-step-slide'))).opacity, 1);
      expect(find.byKey(const Key('progress-step-fill')), findsNothing);
    });
  }

  testWidgets('ligar/desligar reduced motion ou TalkBack no meio do cadastro nao perde o que foi digitado', (t) async {
    tallScreen(t);
    await t.pumpWidget(_app());
    await t.pumpAndSettle();
    await t.enterText(find.byKey(const Key('campo')), 'Maria Silva');
    for (final media in const [MediaQueryData(disableAnimations: true), MediaQueryData(accessibleNavigation: true), MediaQueryData()]) {
      await t.pumpWidget(_app(media: media));
      await t.pump();
      expect(find.text('Maria Silva'), findsOneWidget, reason: '$media');
    }
  });
}
