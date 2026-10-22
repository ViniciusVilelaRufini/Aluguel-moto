import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/widgets.dart';

/// Total de passos do cadastro no design: codigo, dados, identidade e pagamento.
const onboardingTotalSteps = 4;

/// Deslocamento horizontal do conteudo na troca de passo (eixo X compartilhado).
const onboardingStepShift = 30.0;

/// Moldura dos passos do cadastro (Onboarding.jsx `shell`): voltar (soft 40) +
/// `ProgressSteps` de 4, titulo, subtitulo, conteudo rolavel e CTA embaixo.
///
/// Dentro de um [OnboardingStepSwitcher], o cabecalho fica parado (a barra enche
/// do passo anterior ao atual) e so o conteudo e o CTA deslizam com fade.
class OnboardingStepShell extends StatelessWidget {
  const OnboardingStepShell({
    super.key,
    required this.step,
    required this.title,
    required this.subtitle,
    required this.children,
    required this.cta,
    this.onBack,
  });

  /// Indice base 0 do passo (0 = codigo ... 3 = pagamento).
  final int step;
  final String title, subtitle;
  final List<Widget> children;
  final Widget cta;

  /// `null` desabilita o voltar (ex.: durante um envio); o botao continua visivel.
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final motion = OnboardingStepMotion.maybeOf(context);
    Widget header = Padding(
      padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, 0),
      child: Row(children: [
        VoltiIconButton(
          icon: LucideIcons.arrowLeft,
          variant: VoltiIconButtonVariant.soft,
          label: l.back,
          onPressed: onBack,
        ),
        const SizedBox(width: VoltiSpacing.s14),
        Expanded(
          child: ProgressSteps(
            total: onboardingTotalSteps,
            current: step,
            animateFrom: motion?.progressFrom,
            label: l.stepOf(step + 1, onboardingTotalSteps),
          ),
        ),
      ]),
    );
    Widget body = Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            children: [
              Semantics(header: true, child: Text(title, style: VoltiTypography.title)),
              const SizedBox(height: VoltiSpacing.s6),
              Text(subtitle, style: VoltiTypography.body),
              const SizedBox(height: VoltiSpacing.s20),
              ...children,
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 0, VoltiSpacing.screenGutter, VoltiSpacing.s16),
          child: cta,
        ),
      ],
    );
    if (motion != null) {
      // O passo que sai some sem cabecalho (o do que entra fica no mesmo lugar),
      // nao recebe toques e sai da arvore de acessibilidade. Estrutura estavel:
      // virar "o que sai" nao remonta o conteudo.
      header = Visibility(visible: motion.incoming, maintainState: true, maintainAnimation: true, maintainSize: true, child: header);
      body = _StepCrossSlide(motion: motion, child: body);
    }
    Widget content = Column(children: [header, Expanded(child: body)]);
    if (motion != null) {
      content = ExcludeSemantics(
        excluding: !motion.incoming,
        child: IgnorePointer(ignoring: !motion.incoming, child: content),
      );
    }
    return Scaffold(
      // O fundo vem do switcher para os dois passos aparecerem durante a troca.
      backgroundColor: motion != null ? Colors.transparent : null,
      body: SafeArea(child: content),
    );
  }
}

/// Movimento da troca de passo, fornecido pelo [OnboardingStepSwitcher] a cada
/// passo (o que entra e o que sai).
class OnboardingStepMotion extends InheritedWidget {
  const OnboardingStepMotion({
    super.key,
    required this.animation,
    required this.incoming,
    required this.direction,
    this.progressFrom,
    required super.child,
  });

  /// 0 -> 1 ao entrar; 1 -> 0 ao sair.
  final Animation<double> animation;
  final bool incoming;

  /// 1 = avancar (entra pela direita), -1 = voltar.
  final int direction;

  /// Indice da barra de onde o passo que entra parte (ver [ProgressSteps.animateFrom]).
  final int? progressFrom;

  static OnboardingStepMotion? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<OnboardingStepMotion>();

  @override
  bool updateShouldNotify(OnboardingStepMotion old) =>
      animation != old.animation || incoming != old.incoming || direction != old.direction || progressFrom != old.progressFrom;
}

/// Troca animada dos passos do cadastro (eixo X compartilhado do Material,
/// com os tokens da Volti): o passo que sai desliza 30 px para tras e some nos
/// primeiros 30%; o que entra vem 30 px da frente e aparece no restante, em
/// `--dur-screen` com `--ease-screen`. Passos fora de [framed] (ex.: status da
/// verificacao, tela inteira) trocam com fade. Reduced motion ou leitor de
/// tela: troca direta.
class OnboardingStepSwitcher extends StatefulWidget {
  const OnboardingStepSwitcher({
    super.key,
    required this.step,
    required this.child,
    this.framed = const {},
    this.progressFrom,
  });

  final int step;
  final Widget child;

  /// Passos montados com [OnboardingStepShell] (deslizam so o conteudo).
  final Set<int> framed;

  /// Indice da barra de onde o passo atual parte.
  final int? progressFrom;

  @override
  State<OnboardingStepSwitcher> createState() => _OnboardingStepSwitcherState();
}

class _OnboardingStepSwitcherState extends State<OnboardingStepSwitcher> {
  int _direction = 1;

  @override
  void didUpdateWidget(OnboardingStepSwitcher old) {
    super.didUpdateWidget(old);
    if (old.step != widget.step) _direction = widget.step > old.step ? 1 : -1;
  }

  @override
  Widget build(BuildContext context) {
    final current = ValueKey<int>(widget.step);
    final child = KeyedSubtree(key: current, child: widget.child);
    if (VoltiPageTransitions.reducedOf(context)) return child;
    return ColoredBox(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: AnimatedSwitcher(
        duration: VoltiMotion.durScreen,
        layoutBuilder: (current, previous) => Stack(fit: StackFit.expand, children: [...previous, ?current]),
        // Closure nova a cada build: o AnimatedSwitcher reconstroi a transicao do
        // passo que sai com a direcao e o papel ("sai") atualizados.
        transitionBuilder: (c, animation) {
          final incoming = c.key == current;
          final step = (c.key! as ValueKey<int>).value;
          if (!widget.framed.contains(step)) {
            return FadeTransition(opacity: animation, child: IgnorePointer(ignoring: !incoming, child: c));
          }
          return OnboardingStepMotion(
            animation: animation,
            incoming: incoming,
            direction: _direction,
            progressFrom: incoming ? widget.progressFrom : null,
            child: c,
          );
        },
        child: child,
      ),
    );
  }
}

class _StepCrossSlide extends StatelessWidget {
  const _StepCrossSlide({required this.motion, required this.child});
  final OnboardingStepMotion motion;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: motion.animation,
      child: child,
      builder: (context, c) {
        final t = motion.animation.value.clamp(0.0, 1.0);
        final double dx, opacity;
        if (motion.incoming) {
          dx = motion.direction * onboardingStepShift * (1 - VoltiMotion.easeScreen.transform(t));
          opacity = const Interval(.3, 1).transform(t);
        } else {
          dx = -motion.direction * onboardingStepShift * VoltiMotion.easeScreen.transform(1 - t);
          opacity = const Interval(.7, 1).transform(t);
        }
        return Opacity(
          key: const Key('onboarding-step-slide'),
          opacity: opacity,
          child: Transform.translate(offset: Offset(dx, 0), child: c),
        );
      },
    );
  }
}
