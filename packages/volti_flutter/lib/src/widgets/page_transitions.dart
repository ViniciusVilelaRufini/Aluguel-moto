import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../tokens/shadows.dart';

/// Tipo de troca de tela do design (`vt-screen-*`, Motion v2).
enum VoltiScreenTransition {
  /// Avancar/voltar no funil: entra pela direita com um leve fade; a tela de
  /// tras recua 30% para a esquerda e escurece (parallax). Voltar e o inverso.
  push,

  /// Tela "modal" (QR da reserva, confira sua moto, recibo): sobe de baixo; a
  /// tela de tras recua (escala .93, escurece, cantos 28).
  modal,

  /// Troca de raiz (boas-vindas/cadastro -> inicio, inicio <-> corrida): a tela
  /// de tras para no lugar e some sob o fundo; a nova aparece com escala .94 -> 1.
  fadeThrough,
}

/// Transicoes de tela do design, no formato de `RouteTransitionsBuilder` (serve
/// para `CustomTransitionPage.transitionsBuilder` do go_router e para
/// `PageRouteBuilder`). Duracao `--dur-screen` (440 ms), curva `--ease-screen`.
///
/// - A tela coberta reage ao tipo da tela de cima (publicado pela propria
///   transicao): parallax sob [push], recuo sob [modal], parada sob [fadeThrough].
/// - Gesto voltar preditivo do Android: a tela acompanha o dedo (curva linear
///   durante o gesto) e, ao soltar, termina a saida de onde parou.
/// - Reduced motion (`disableAnimations`) ou navegacao acessivel (TalkBack):
///   duracao zero e nenhum deslize, fade ou parallax ([reducedOf]).
/// - A arvore de widgets e estavel durante e depois da animacao: a pagina (mapa
///   incluso) nao e reconstruida nem remontada ao comecar/terminar a troca.
abstract final class VoltiPageTransitions {
  static const Duration duration = VoltiMotion.durScreen;

  /// Escala inicial da tela que entra no [fadeThrough].
  static const double fadeThroughScale = .94;

  /// Opacidade inicial da tela que entra no [push] (fade sutil).
  static const double pushFadeFrom = .4;

  /// `true` quando a troca de tela deve ser instantanea: reduced motion ou
  /// navegacao acessivel (leitor de tela ligado).
  static bool reducedOf(BuildContext context) =>
      VoltiMotion.reduced(context) ||
      (MediaQuery.maybeAccessibleNavigationOf(context) ?? false);

  /// Duracao efetiva: zero com [reducedOf].
  static Duration durationOf(BuildContext context) =>
      reducedOf(context) ? Duration.zero : duration;

  /// Progresso (0..1, ja com a curva da tela) do modal no topo da pilha. A
  /// pagina de tras usa para recuar em vez de deslizar. Zero quando o topo nao
  /// e um modal.
  static final ValueNotifier<double> recede = ValueNotifier<double>(0);

  /// Tipo da tela no topo da pilha (a que cobre as demais), ou `null`.
  static final ValueNotifier<VoltiScreenTransition?> top =
      ValueNotifier<VoltiScreenTransition?>(null);

  /// Builder do [kind].
  static RouteTransitionsBuilder builderFor(VoltiScreenTransition kind) =>
      switch (kind) {
        VoltiScreenTransition.push => push,
        VoltiScreenTransition.modal => modal,
        VoltiScreenTransition.fadeThrough => fadeThrough,
      };

  /// Push lateral. Aplique em todas as paginas "normais".
  static Widget push(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (reducedOf(context)) return child;
    final enter = _screenCurve(context, animation);
    return _Frame(
      kind: VoltiScreenTransition.push,
      enter: enter,
      cover: _screenCurve(context, secondaryAnimation),
      child: SlideTransition(
        position: Tween(begin: const Offset(1, 0), end: Offset.zero).animate(enter),
        child: FadeTransition(
          opacity: enter.drive(
            Tween(begin: pushFadeFrom, end: 1.0)
                .chain(CurveTween(curve: const Interval(0, .6))),
          ),
          child: _EdgeShadow(animation: enter, axis: Axis.horizontal, child: child),
        ),
      ),
    );
  }

  /// Modal de baixo para cima; a tela de tras recua.
  static Widget modal(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (reducedOf(context)) return child;
    final enter = _screenCurve(context, animation);
    return _Frame(
      kind: VoltiScreenTransition.modal,
      enter: enter,
      cover: _screenCurve(context, secondaryAnimation),
      child: SlideTransition(
        position: Tween(begin: const Offset(0, 1), end: Offset.zero).animate(enter),
        child: _EdgeShadow(animation: enter, axis: Axis.vertical, child: child),
      ),
    );
  }

  /// Fade-through: o fundo da tela cobre a de tras (primeiros 35%) e a nova
  /// aparece com escala .94 -> 1 (restante). A tela de tras nao se move.
  static Widget fadeThrough(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (reducedOf(context)) return child;
    final enter = _screenCurve(context, animation);
    final fill = Theme.of(context).scaffoldBackgroundColor;
    return _Frame(
      kind: VoltiScreenTransition.fadeThrough,
      enter: enter,
      cover: _screenCurve(context, secondaryAnimation),
      child: Stack(
        fit: StackFit.passthrough,
        children: [
          Positioned.fill(
            child: IgnorePointer(
              child: FadeTransition(
                opacity: enter.drive(CurveTween(curve: const Interval(0, .35))),
                child: ColoredBox(color: fill),
              ),
            ),
          ),
          FadeTransition(
            opacity: enter.drive(CurveTween(curve: const Interval(.35, 1))),
            child: ScaleTransition(
              scale: Tween(begin: fadeThroughScale, end: 1.0).animate(enter),
              child: child,
            ),
          ),
        ],
      ),
    );
  }

  /// Curva da tela que fica linear enquanto um gesto voltar esta em curso (a
  /// tela segue o dedo sem "acelerar").
  static Animation<double> _screenCurve(BuildContext context, Animation<double> parent) =>
      _ScreenCurve(parent, Navigator.maybeOf(context)?.userGestureInProgressNotifier);
}

class _ScreenCurve extends Animation<double> with AnimationWithParentMixin<double> {
  _ScreenCurve(this.parent, this.gesture);

  @override
  final Animation<double> parent;
  final ValueListenable<bool>? gesture;

  @override
  double get value {
    final v = parent.value.clamp(0.0, 1.0);
    if (gesture?.value ?? false) return v;
    return VoltiMotion.easeScreen.transform(v);
  }
}

/// Junta as pecas comuns: publica o tipo da tela, liga o voltar preditivo e
/// aplica o efeito de "coberta" quando outra tela entra por cima.
class _Frame extends StatelessWidget {
  const _Frame({required this.kind, required this.enter, required this.cover, required this.child});
  final VoltiScreenTransition kind;
  final Animation<double> enter, cover;
  final Widget child;

  @override
  Widget build(BuildContext context) => _CoverPublisher(
        kind: kind,
        animation: enter,
        child: _PredictiveBack(child: _Covered(cover: cover, child: child)),
      );
}

/// Pagina coberta por outra. O efeito depende do tipo da tela do topo:
/// [VoltiScreenTransition.push] desliza 30% e escurece; `modal` recua (escala,
/// escurece, cantos); `fadeThrough` fica parada (o fundo da nova a cobre).
class _Covered extends StatelessWidget {
  const _Covered({required this.cover, required this.child});
  final Animation<double> cover;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([cover, VoltiPageTransitions.recede, VoltiPageTransitions.top]),
      child: child,
      builder: (context, c) {
        final t = cover.value;
        final kind = VoltiPageTransitions.top.value;
        final receding = t > 0 && kind == VoltiScreenTransition.modal && VoltiPageTransitions.recede.value > 0;
        final sliding = t > 0 && !receding && kind != VoltiScreenTransition.fadeThrough;
        final scrim = receding ? .35 * t : (sliding ? .2 * t : 0.0);
        final radius = receding ? 28 * t : 0.0;
        // Mesma estrutura em repouso e animando: o filho nunca e remontado.
        return ColoredBox(
          color: receding ? Colors.black : Colors.transparent,
          child: FractionalTranslation(
            translation: Offset(sliding ? -.3 * t : 0, 0),
            child: Transform.scale(
              scale: receding ? 1 - .07 * t : 1,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(radius),
                clipBehavior: radius > 0 ? Clip.antiAlias : Clip.none,
                child: DecoratedBox(
                  key: const Key('volti-screen-scrim'),
                  position: DecorationPosition.foreground,
                  decoration: BoxDecoration(
                    color: scrim > 0 ? Colors.black.withValues(alpha: scrim) : null,
                  ),
                  child: c,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Publica o tipo e o progresso da tela do topo da pilha para as de tras.
class _CoverPublisher extends StatefulWidget {
  const _CoverPublisher({required this.kind, required this.animation, required this.child});
  final VoltiScreenTransition kind;
  final Animation<double> animation;
  final Widget child;

  @override
  State<_CoverPublisher> createState() => _CoverPublisherState();
}

class _CoverPublisherState extends State<_CoverPublisher> {
  // Telas abertas, da mais antiga a mais nova: vale a do topo, e uma que fecha
  // nao zera o valor de outra mais nova.
  static final _stack = <_CoverPublisherState>[];

  static void _publish() {
    final top = _stack.isEmpty ? null : _stack.last;
    VoltiPageTransitions.top.value = top?.widget.kind;
    VoltiPageTransitions.recede.value =
        top != null && top.widget.kind == VoltiScreenTransition.modal ? top.widget.animation.value : 0;
  }

  @override
  void initState() {
    super.initState();
    _stack.add(this);
    widget.animation.addListener(_publish);
    WidgetsBinding.instance.addPostFrameCallback((_) => _publish());
  }

  @override
  void didUpdateWidget(_CoverPublisher old) {
    super.didUpdateWidget(old);
    if (old.animation != widget.animation) {
      old.animation.removeListener(_publish);
      widget.animation.addListener(_publish);
    }
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

/// Gesto voltar preditivo do Android (`flutter/backgesture`) para rotas com
/// transicao propria: a rota acompanha o progresso do gesto; ao confirmar, a
/// saida continua de onde o dedo parou (sem voltar ao inicio); ao cancelar, a
/// tela volta ao lugar. O botao voltar (sem toque) segue o pop normal.
class _PredictiveBack extends StatefulWidget {
  const _PredictiveBack({required this.child});
  final Widget child;

  @override
  State<_PredictiveBack> createState() => _PredictiveBackState();
}

class _PredictiveBackState extends State<_PredictiveBack> with WidgetsBindingObserver {
  TransitionRoute<dynamic>? _route;
  TransitionRoute<dynamic>? _active;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final r = ModalRoute.of(context);
    _route = r is TransitionRoute ? r : null;
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  bool handleStartBackGesture(PredictiveBackEvent backEvent) {
    final r = _route;
    if (r == null || backEvent.isButtonEvent || !r.isCurrent || !r.popGestureEnabled) return false;
    r.handleStartBackGesture(progress: 1 - backEvent.progress);
    _active = r;
    return true;
  }

  @override
  void handleUpdateBackGestureProgress(PredictiveBackEvent backEvent) =>
      _active?.handleUpdateBackGestureProgress(progress: 1 - backEvent.progress);

  @override
  void handleCancelBackGesture() {
    _active?.handleCancelBackGesture();
    _active = null;
  }

  @override
  void handleCommitBackGesture() {
    final r = _active;
    _active = null;
    final nav = r?.navigator;
    if (r == null || nav == null) return;
    final anim = r.animation!;
    nav.pop();
    // O gesto segue "em curso" ate a saida terminar: a curva fica linear e a
    // tela continua do ponto em que o dedo soltou.
    if (anim.isAnimating) {
      late final AnimationStatusListener done;
      done = (_) {
        if (anim.isAnimating) return;
        anim.removeStatusListener(done);
        nav.didStopUserGesture();
      };
      anim.addStatusListener(done);
    } else {
      nav.didStopUserGesture();
    }
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
        // O filho fica sempre no primeiro slot: tirar a sombra nao o remonta.
        return Stack(clipBehavior: Clip.none, fit: StackFit.passthrough, children: [
          c!,
          if (animation.value < 1)
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
    VoltiScreenTransition? transition,
    super.settings,
  }) : super(
         transitionDuration: VoltiPageTransitions.duration,
         reverseTransitionDuration: VoltiPageTransitions.duration,
         opaque: true,
         pageBuilder: (context, _, _) => builder(context),
         transitionsBuilder: VoltiPageTransitions.builderFor(
           transition ?? (modal ? VoltiScreenTransition.modal : VoltiScreenTransition.push),
         ),
       );
}
