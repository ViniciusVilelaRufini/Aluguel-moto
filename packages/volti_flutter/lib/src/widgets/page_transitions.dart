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
  static final ValueNotifier<double> recede = ValueNotifier<double>(0);

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
        child: _EdgeShadow(animation: enter, axis: Axis.horizontal, child: child),
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
      canRecede: false,
      child: _RecedePublisher(
        animation: enter,
        child: SlideTransition(
          position: Tween(
            begin: const Offset(0, 1),
            end: Offset.zero,
          ).animate(enter),
          child: _EdgeShadow(animation: enter, axis: Axis.vertical, child: child),
        ),
      ),
    );
  }
}

/// Pagina coberta por outra: com um modal por cima recua (escala/escurece/
/// cantos); com push lateral desliza 30% e escurece.
class _Covered extends StatelessWidget {
  const _Covered({required this.cover, required this.child, this.canRecede = true});
  final Animation<double> cover;
  final bool canRecede;
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
        if (canRecede && r > 0) {
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
  // Modais abertos, do mais antigo ao mais novo: vale o do topo, e um que fecha
  // nao zera o valor de outro mais novo.
  static final _stack = <_RecedePublisherState>[];

  static void _publish() =>
      VoltiPageTransitions.recede.value = _stack.isEmpty ? 0 : _stack.last.widget.animation.value;

  @override
  void initState() {
    super.initState();
    _stack.add(this);
    widget.animation.addListener(_publish);
    WidgetsBinding.instance.addPostFrameCallback((_) => _publish());
  }

  @override
  void dispose() {
    widget.animation.removeListener(_publish);
    _stack.remove(this);
    // Fora do ciclo de build/finalizacao da arvore.
    WidgetsBinding.instance.addPostFrameCallback((_) => _publish());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// Sombra de borda barata (gradiente de 28 px) enquanto a pagina entra, no
/// lugar de um BoxShadow de blur grande.
class _EdgeShadow extends StatelessWidget {
  const _EdgeShadow({required this.animation, required this.axis, required this.child});
  final Animation<double> animation;
  final Axis axis;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final h = axis == Axis.horizontal;
    return AnimatedBuilder(
      animation: animation,
      child: child,
      builder: (context, c) {
        if (animation.value >= 1) return c!;
        return Stack(clipBehavior: Clip.none, fit: StackFit.passthrough, children: [
          c!,
          Positioned(
            left: h ? -28 : 0,
            right: h ? null : 0,
            top: h ? 0 : -28,
            bottom: h ? 0 : null,
            width: h ? 28 : null,
            height: h ? null : 28,
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: h ? Alignment.centerLeft : Alignment.topCenter,
                    end: h ? Alignment.centerRight : Alignment.bottomCenter,
                    colors: const [Color(0x0015181A), Color(0x3815181A)],
                  ),
                ),
              ),
            ),
          ),
        ]);
      },
    );
  }
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
