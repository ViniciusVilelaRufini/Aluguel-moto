import 'package:flutter/material.dart';

import '../tokens/shadows.dart';

/// Texto que "rola" so os caracteres que mudaram (evolucao E-04): cada digito
/// novo sobe de baixo enquanto o antigo sai por cima, 280 ms `--ease-out`.
/// Bom para cronometro (`12:04`) e valores (`R$ 3,15`): o olho percebe a
/// mudanca sem a linha inteira piscar. Usa algarismos tabulares para nao
/// dancar na horizontal. Leitores de tela leem o texto inteiro uma vez.
/// Reduced motion: troca seca.
class VoltiTicker extends StatelessWidget {
  const VoltiTicker(this.text, {super.key, this.style, this.duration = const Duration(milliseconds: 280), this.semanticsLabel});

  final String text;
  final TextStyle? style;
  final Duration duration;

  /// Rotulo para leitores de tela; padrao: [text].
  final String? semanticsLabel;

  @override
  Widget build(BuildContext context) {
    final base = DefaultTextStyle.of(context).style.merge(style).copyWith(
      fontFeatures: const [FontFeature.tabularFigures()],
    );
    final reduced = VoltiMotion.reduced(context);
    final chars = text.characters.toList();
    return Semantics(
      label: semanticsLabel ?? text,
      container: true,
      child: ExcludeSemantics(
        child: RepaintBoundary(
          child: ClipRect(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              for (var i = 0; i < chars.length; i++)
                reduced
                    ? Text(chars[i], style: base)
                    : AnimatedSwitcher(
                        // A chave da posicao conta da direita: em "9:59" -> "10:00"
                        // as unidades continuam no mesmo slot.
                        key: ValueKey('tick-${chars.length - i}'),
                        duration: duration,
                        switchInCurve: VoltiMotion.easeOut,
                        switchOutCurve: VoltiMotion.easeOut,
                        layoutBuilder: (current, previous) => Stack(
                          alignment: Alignment.center,
                          children: [...previous, ?current],
                        ),
                        transitionBuilder: (child, animation) {
                          final entering = child.key == ValueKey(chars[i]);
                          final offset = Tween<Offset>(
                            begin: entering ? const Offset(0, .7) : const Offset(0, -.7),
                            end: Offset.zero,
                          ).animate(animation);
                          return FadeTransition(
                            opacity: animation,
                            child: SlideTransition(position: offset, child: child),
                          );
                        },
                        child: Text(chars[i], key: ValueKey(chars[i]), style: base),
                      ),
            ],
          ),
        ),
        ),
      ),
    );
  }
}

/// Numero que conta de [from] ate [value] (recibo, saldo). [format] recebe o
/// valor intermediario arredondado. Reduced motion: mostra o final.
class VoltiCountUp extends StatelessWidget {
  const VoltiCountUp({
    super.key,
    required this.value,
    required this.format,
    this.from = 0,
    this.style,
    this.duration = const Duration(milliseconds: 900),
    this.delay = Duration.zero,
  });

  final int value;
  final int from;
  final String Function(int) format;
  final TextStyle? style;
  final Duration duration;

  /// Espera antes de contar (ex.: depois do check do recibo).
  final Duration delay;

  @override
  Widget build(BuildContext context) {
    final finalText = format(value);
    if (VoltiMotion.reduced(context)) return Text(finalText, style: style);
    final total = delay + duration;
    final start = total.inMicroseconds == 0 ? 0.0 : delay.inMicroseconds / total.inMicroseconds;
    return Semantics(
      label: finalText,
      container: true,
      child: ExcludeSemantics(
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: 1),
          duration: total,
          builder: (context, t, _) {
            final p = Interval(start, 1, curve: VoltiMotion.easeOut).transform(t);
            final v = (from + (value - from) * p).round();
            return Text(format(v), style: style?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]));
          },
        ),
      ),
    );
  }
}
