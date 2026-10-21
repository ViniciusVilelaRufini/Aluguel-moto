import 'package:flutter/material.dart';

import '../tokens/shadows.dart';

/// Transicoes de tela do design (`vt-screen-*`), no formato de
/// `RouteTransitionsBuilder` (serve para `CustomTransitionPage.transitionsBuilder`
/// do go_router e para `PageRouteBuilder`).
///
/// - [push]: avancar entra pela direita; a tela de tras recua 30% para a
///   esquerda e escurece. Voltar faz o inverso (a animacao e reversivel).
/// - [modal]: sobe de baixo para cima; a tela de tras recua (escala .93,
///   escurece, cantos 28) enquanto o modal esta aberto.
abstract final class VoltiPageTransitions {
  static const Duration duration = VoltiMotion.durScreen;

  /// Duracao efetiva: zero com reduced motion.
  static Duration durationOf(BuildContext context) =>
      VoltiMotion.scaled(context, duration);

  /// Progresso (0..1, ja com a curva da tela) do modal aberto no momento. A
  /// pagina de tras usa para recuar em vez de deslizar.
  @visibleForTesting
  static final ValueNotifier<double> recede = ValueNotifier<double>(0);

  static const _shadow = [BoxShadow(color: Color(0x3815181A), blurRadius: 48)];

  /// Push lateral. Aplique em todas as paginas "normais".
  static Widget push(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (VoltiMotion.reduced(context)) return child;
    final enter = CurvedAnimation(
      parent: animation,
      curve: VoltiMotion.easeScreen,
    );
    final cover = CurvedAnimation(
      parent: secondaryAnimation,
      curve: VoltiMotion.easeScreen,
    );
    return _Covered(
      cover: cover,
      child: SlideTransition(
        position: Tween(
          begin: const Offset(1, 0),
          end: Offset.zero,
        ).animate(enter),
        child: AnimatedBuilder(
          animation: enter,
          child: child,
          builder: (context, c) => DecoratedBox(
            decoration: BoxDecoration(
              boxShadow: enter.value < 1 ? _shadow : null,
            ),
            child: c,
          ),
        ),
      ),
    );
  }

  /// Modal de baixo para cima (scan). A pagina de tras deve usar [push].
  static Widget modal(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (VoltiMotion.reduced(context)) return child;
    final enter = CurvedAnimation(
      parent: animation,
      curve: VoltiMotion.easeScreen,
    );
    final cover = CurvedAnimation(
      parent: secondaryAnimation,
      curve: VoltiMotion.easeScreen,
    );
    return _Covered(
      cover: cover,
      child: _RecedePublisher(
        animation: enter,
        child: SlideTransition(
          position: Tween(
            begin: const Offset(0, 1),
            end: Offset.zero,
          ).animate(enter),
          child: AnimatedBuilder(
            animation: enter,
            child: child,
            builder: (context, c) => DecoratedBox(
              decoration: BoxDecoration(
                boxShadow: enter.value < 1 ? _shadow : null,
              ),
              child: c,
            ),
          ),
        ),
      ),
    );
  }
}

/// Pagina coberta por outra: com um modal por cima recua (escala/escurece/
/// cantos); com push lateral desliza 30% e escurece.
class _Covered extends StatelessWidget {
  const _Covered({required this.cover, required this.child});
  final Animation<double> cover;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([cover, VoltiPageTransitions.recede]),
      child: child,
      builder: (context, c) {
        final t = cover.value;
        if (t <= 0) return c!;
        final r = VoltiPageTransitions.recede.value;
        if (r > 0) {
          return ColoredBox(
            color: Colors.black,
            child: Transform.scale(
              scale: 1 - .07 * t,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(28 * t),
                child: Stack(
                  fit: StackFit.passthrough,
                  children: [
                    c!,
                    Positioned.fill(
                      child: IgnorePointer(
                        child: ColoredBox(
                          color: Colors.black.withValues(alpha: .35 * t),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }
        return FractionalTranslation(
          translation: Offset(-.3 * t, 0),
          child: Stack(
            fit: StackFit.passthrough,
            children: [
              c!,
              Positioned.fill(
                child: IgnorePointer(
                  child: ColoredBox(
                    color: Colors.black.withValues(alpha: .2 * t),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Publica o progresso do modal para a pagina de tras recuar.
class _RecedePublisher extends StatefulWidget {
  const _RecedePublisher({required this.animation, required this.child});
  final Animation<double> animation;
  final Widget child;

  @override
  State<_RecedePublisher> createState() => _RecedePublisherState();
}

class _RecedePublisherState extends State<_RecedePublisher> {
  void _tick() => VoltiPageTransitions.recede.value = widget.animation.value;

  @override
  void initState() {
    super.initState();
    widget.animation.addListener(_tick);
    WidgetsBinding.instance.addPostFrameCallback((_) => _tick());
  }

  @override
  void dispose() {
    widget.animation.removeListener(_tick);
    // Fora do ciclo de build/finalizacao da arvore.
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => VoltiPageTransitions.recede.value = 0,
    );
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// Rota pronta (Navigator puro) com as transicoes do design.
class VoltiPageRoute<T> extends PageRouteBuilder<T> {
  VoltiPageRoute({
    required WidgetBuilder builder,
    bool modal = false,
    super.settings,
  }) : super(
         transitionDuration: VoltiPageTransitions.duration,
         reverseTransitionDuration: VoltiPageTransitions.duration,
         opaque: true,
         pageBuilder: (context, _, _) => builder(context),
         transitionsBuilder: modal
             ? VoltiPageTransitions.modal
             : VoltiPageTransitions.push,
       );
}
