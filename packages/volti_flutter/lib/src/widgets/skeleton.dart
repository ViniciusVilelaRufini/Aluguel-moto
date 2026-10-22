import 'package:flutter/material.dart';

import '../tokens/colors.dart';
import '../tokens/shadows.dart';
import '../tokens/spacing.dart';

/// Esqueleto de carregamento no formato do conteudo (evolucao E-01).
///
/// Envolva blocos [VoltiSkeletonBox] (ou use os atalhos [VoltiSkeleton.list]
/// e [VoltiSkeleton.card]). Uma luz suave cruza todos os blocos em 1,4 s,
/// sincronizada pela mesma animacao. Reduced motion: blocos estaticos.
/// Para leitores de tela o conjunto e um unico "Carregando" ([label]).
class VoltiSkeleton extends StatefulWidget {
  const VoltiSkeleton({super.key, required this.child, this.label = 'Carregando'});

  /// Linhas no formato de `ListRow` (icone 40, titulo e subtitulo).
  factory VoltiSkeleton.list({Key? key, int rows = 5, String label = 'Carregando', bool trailing = true}) =>
      VoltiSkeleton(
        key: key,
        label: label,
        child: Column(
          children: [
            for (var i = 0; i < rows; i++)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(children: [
                  const VoltiSkeletonBox(width: 40, height: 40, radius: VoltiRadii.md),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      // Larguras variadas para nao parecer uma grade.
                      FractionallySizedBox(widthFactor: i.isEven ? .7 : .55, child: const VoltiSkeletonBox(height: 14)),
                      const SizedBox(height: 8),
                      const FractionallySizedBox(widthFactor: .35, child: VoltiSkeletonBox(height: 10)),
                    ]),
                  ),
                  if (trailing) ...[const SizedBox(width: 12), const VoltiSkeletonBox(width: 52, height: 14)],
                ]),
              ),
          ],
        ),
      );

  /// Cartao de [height] px com raio de card (opcoes de plano, saldo).
  factory VoltiSkeleton.card({Key? key, double height = 88, int count = 1, String label = 'Carregando'}) => VoltiSkeleton(
        key: key,
        label: label,
        child: Column(children: [
          for (var i = 0; i < count; i++)
            Padding(
              padding: EdgeInsets.only(bottom: i == count - 1 ? 0 : VoltiSpacing.s10),
              child: VoltiSkeletonBox(height: height, radius: VoltiRadii.lg),
            ),
        ]),
      );

  final Widget child;
  final String label;

  @override
  State<VoltiSkeleton> createState() => _VoltiSkeletonState();
}

class _VoltiSkeletonState extends State<VoltiSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (VoltiMotion.reduced(context)) {
      _c.stop();
      _c.value = 0;
    } else if (!_c.isAnimating) {
      _c.repeat();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: widget.label,
      liveRegion: true,
      container: true,
      child: ExcludeSemantics(
        // Isola o repaint da luz do resto da tela.
        child: RepaintBoundary(
          child: _SkeletonScope(animation: _c, reduced: VoltiMotion.reduced(context), child: widget.child),
        ),
      ),
    );
  }
}

class _SkeletonScope extends InheritedWidget {
  const _SkeletonScope({required this.animation, required this.reduced, required super.child});
  final Animation<double> animation;
  final bool reduced;
  @override
  bool updateShouldNotify(_SkeletonScope old) => animation != old.animation || reduced != old.reduced;
}

/// Bloco cinza do esqueleto. Fora de um [VoltiSkeleton] fica estatico.
class VoltiSkeletonBox extends StatelessWidget {
  const VoltiSkeletonBox({super.key, this.width, this.height = 14, this.radius = VoltiRadii.xs});
  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final base = dark ? VoltiColors.ink800 : VoltiColors.ink100;
    final hi = dark ? VoltiColors.ink700 : VoltiColors.ink50;
    final scope = context.dependOnInheritedWidgetOfExactType<_SkeletonScope>();
    final box = SizedBox(width: width, height: height);
    final r = BorderRadius.circular(radius);
    if (scope == null || scope.reduced) {
      return DecoratedBox(decoration: BoxDecoration(color: base, borderRadius: r), child: box);
    }
    return AnimatedBuilder(
      animation: scope.animation,
      builder: (context, _) {
        // Faixa clara de -1 a 2 (em fracoes da largura) com easeInOut.
        final t = VoltiMotion.easeInOut.transform(scope.animation.value) * 3 - 1;
        return DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: r,
            gradient: LinearGradient(
              begin: Alignment(-1 + t * 2 - .6, 0),
              end: Alignment(-1 + t * 2 + .6, 0),
              colors: [base, hi, base],
              stops: const [0, .5, 1],
            ),
          ),
          child: box,
        );
      },
    );
  }
}
