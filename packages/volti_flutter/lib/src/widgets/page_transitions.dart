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
/// `PageRouteBuilder`). Duracao `--dur-screen` (440 ms), curva `--ease-screen`
/// ao abrir e `--ease-screen` invertida ao fechar (a saida tem a mesma
/// sensacao da entrada; a direcao fica travada ate o fim, como `reverseCurve`).
///
/// - A tela coberta reage ao tipo da rota **logo acima dela** (lido da propria
///   `secondaryAnimation`): parallax sob [push], recuo sob [modal], parada sob
///   [fadeThrough].
/// - Gesto voltar preditivo do Android: a tela acompanha o dedo (curva linear
///   durante o gesto; borda direita desliza para a esquerda) e, ao soltar,
///   termina a saida de onde parou.
/// - Reduced motion (`disableAnimations`) ou navegacao acessivel (TalkBack):
///   duracao zero e nenhum deslize, fade ou parallax ([reducedOf]).
/// - A arvore de widgets e a mesma durante e depois da animacao, e tambem com
///   reduced motion ligado/desligado: a pagina (mapa incluso) nunca e remontada.
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

  /// Informativo: progresso (0..1, com a curva) do modal no topo da pilha, ou
  /// zero quando o topo nao e um modal. As telas cobertas nao dependem disto.
  static final ValueNotifier<double> recede = ValueNotifier<double>(0);

  /// Informativo: tipo da tela no topo da pilha, ou `null`.
  static final ValueNotifier<VoltiScreenTransition?> top =
      ValueNotifier<VoltiScreenTransition?>(null);

  // Tipo de cada rota, pela `animation` da rota (a mesma que a rota de baixo
  // recebe como `secondaryAnimation`).
  static final Expando<VoltiScreenTransition> _kinds = Expando<VoltiScreenTransition>('volti-screen-kind');

  /// Tipo da rota logo acima da que recebe [secondaryAnimation], ou `null`
  /// (nenhuma, ou uma rota sem transicao Volti).
  static VoltiScreenTransition? kindAbove(Animation<double> secondaryAnimation) {
    Animation<double>? a = secondaryAnimation;
    for (var i = 0; i < 6 && a != null; i++) {
      final k = _kinds[a];
      if (k != null) return k;
      a = switch (a) {
        final ProxyAnimation p => p.parent,
        final TrainHoppingAnimation h => h.currentTrain,
        _ => null,
      };
    }
    return null;
  }

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
    return _frame(context, VoltiScreenTransition.push, animation, secondaryAnimation, (enter, gesture) {
      return SlideTransition(
        position: _EdgeSlide(enter, gesture, animation),
        child: FadeTransition(
          opacity: enter.drive(
            Tween(begin: pushFadeFrom, end: 1.0)
                .chain(CurveTween(curve: const Interval(0, .6))),
          ),
          child: _EdgeShadow(animation: enter, axis: Axis.horizontal, child: child),
        ),
      );
    });
  }

  /// Modal de baixo para cima; a tela de tras recua.
  static Widget modal(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return _frame(context, VoltiScreenTransition.modal, animation, secondaryAnimation, (enter, _) {
      return SlideTransition(
        position: Tween(begin: const Offset(0, 1), end: Offset.zero).animate(enter),
        child: _EdgeShadow(animation: enter, axis: Axis.vertical, child: child),
      );
    });
  }

  /// Fade-through: o fundo da tela cobre a de tras (primeiros 35%) e a nova
  /// aparece com escala .94 -> 1 (restante). A tela de tras nao se move.
  static Widget fadeThrough(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final fill = Theme.of(context).scaffoldBackgroundColor;
    return _frame(context, VoltiScreenTransition.fadeThrough, animation, secondaryAnimation, (enter, _) {
      return Stack(
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
      );
    });
  }

  /// Pecas comuns. Com [reducedOf], as animacoes viram constantes (estado
  /// final) mas a arvore e a mesma: ligar/desligar o reduced motion nao remonta
  /// a pagina.
  static Widget _frame(
    BuildContext context,
    VoltiScreenTransition kind,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget Function(Animation<double> enter, ValueListenable<bool>? gesture) content,
  ) {
    // A ModalRoute entrega um proxy da animacao do controller; a rota de baixo
    // enxerga o controller. Marca a cadeia toda.
    for (Animation<double>? a = animation; a != null; a = a is ProxyAnimation ? a.parent : null) {
      _kinds[a] = kind;
    }
    final reduced = reducedOf(context);
    final gesture = Navigator.maybeOf(context)?.userGestureInProgressNotifier;
    final enter = reduced ? kAlwaysCompleteAnimation : _ScreenCurve.of(animation, gesture);
    final cover = reduced ? kAlwaysDismissedAnimation : _ScreenCurve.of(secondaryAnimation, gesture);
    return _CoverPublisher(
      kind: kind,
      animation: enter,
      child: _PredictiveBack(
        enabled: !reduced,
        routeAnimation: animation,
        child: _Covered(cover: cover, secondary: secondaryAnimation, child: content(enter, gesture)),
      ),
    );
  }
}

/// `--ease-screen` ao abrir, `--ease-screen` invertida ao fechar (direcao
/// travada ate a animacao terminar, como `CurvedAnimation.reverseCurve`) e
/// linear durante um gesto voltar (a tela segue o dedo). Uma instancia por
/// animacao de rota, para a trava sobreviver aos rebuilds.
class _ScreenCurve extends Animation<double> with AnimationWithParentMixin<double> {
  _ScreenCurve._(this.parent) {
    _direction = parent.isAnimating ? parent.status : null;
    parent.addStatusListener(_onStatus);
  }

  static final Expando<_ScreenCurve> _cache = Expando<_ScreenCurve>('volti-screen-curve');

  static _ScreenCurve of(Animation<double> parent, ValueListenable<bool>? gesture) =>
      (_cache[parent] ??= _ScreenCurve._(parent))..gesture = gesture;

  @override
  final Animation<double> parent;
  ValueListenable<bool>? gesture;
  AnimationStatus? _direction;

  void _onStatus(AnimationStatus s) {
    _direction = switch (s) {
      AnimationStatus.dismissed || AnimationStatus.completed => null,
      _ => _direction ?? s,
    };
  }

  @override
  double get value {
    final v = parent.value.clamp(0.0, 1.0);
    if (gesture?.value ?? false) return v;
    final curve = _direction == AnimationStatus.reverse ? VoltiMotion.easeScreen.flipped : VoltiMotion.easeScreen;
    return curve.transform(v);
  }
}

/// Deslize horizontal do push. Durante um gesto voltar pela borda direita, a
/// tela sai para a esquerda (segue o dedo).
class _EdgeSlide extends Animation<Offset> with AnimationWithParentMixin<double> {
  _EdgeSlide(this.parent, this.gesture, this.routeAnimation);

  @override
  final Animation<double> parent;
  final ValueListenable<bool>? gesture;
  final Animation<double> routeAnimation;

  @override
  Offset get value {
    final fromRight = (gesture?.value ?? false) && _PredictiveBackState.edges[routeAnimation] == SwipeEdge.right;
    return Offset((fromRight ? -1 : 1) * (1 - parent.value), 0);
  }
}

/// Pagina coberta por outra. O efeito depende do tipo da rota logo acima:
/// [VoltiScreenTransition.push] (ou rota sem transicao Volti) desliza 30% e
/// escurece; `modal` recua (escala, escurece, cantos); `fadeThrough` fica parada
/// (o fundo da nova a cobre).
class _Covered extends StatelessWidget {
  const _Covered({required this.cover, required this.secondary, required this.child});
  final Animation<double> cover;
  final Animation<double> secondary;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: cover,
      child: child,
      builder: (context, c) {
        final t = cover.value;
        final kind = VoltiPageTransitions.kindAbove(secondary);
        final receding = t > 0 && kind == VoltiScreenTransition.modal;
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

/// Publica [VoltiPageTransitions.top] e [VoltiPageTransitions.recede]
/// (informativos) a partir da tela mais nova.
class _CoverPublisher extends StatefulWidget {
  const _CoverPublisher({required this.kind, required this.animation, required this.child});
  final VoltiScreenTransition kind;
  final Animation<double> animation;
  final Widget child;

  @override
  State<_CoverPublisher> createState() => _CoverPublisherState();
}

class _CoverPublisherState extends State<_CoverPublisher> {
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
      WidgetsBinding.instance.addPostFrameCallback((_) => _publish());
    }
  }

  @override
  void dispose() {
    widget.animation.removeListener(_publish);
    _stack.remove(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _publish());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// Gesto voltar preditivo do Android (`flutter/backgesture`) para rotas com
/// transicao propria: a rota acompanha o progresso do gesto; ao confirmar, a
/// saida continua de onde o dedo parou (sem voltar ao inicio); ao cancelar, a
/// tela volta ao lugar. Se outra rota entrou por cima durante o gesto, soltar
/// nao fecha nada e a pagina arrastada volta ao lugar. O botao voltar (sem
/// toque) segue o pop normal.
class _PredictiveBack extends StatefulWidget {
  const _PredictiveBack({required this.enabled, required this.routeAnimation, required this.child});
  final bool enabled;
  final Animation<double> routeAnimation;
  final Widget child;

  @override
  State<_PredictiveBack> createState() => _PredictiveBackState();
}

class _PredictiveBackState extends State<_PredictiveBack> with WidgetsBindingObserver {
  /// Borda do gesto em curso, por animacao de rota (lida por [_EdgeSlide]).
  static final Expando<SwipeEdge> edges = Expando<SwipeEdge>('volti-swipe-edge');

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
    if (!widget.enabled || r == null || backEvent.isButtonEvent || !r.isCurrent || !r.popGestureEnabled) return false;
    edges[widget.routeAnimation] = backEvent.swipeEdge;
    r.handleStartBackGesture(progress: 1 - backEvent.progress);
    _active = r;
    return true;
  }

  @override
  void handleUpdateBackGestureProgress(PredictiveBackEvent backEvent) =>
      _active?.handleUpdateBackGestureProgress(progress: 1 - backEvent.progress);

  @override
  void handleCancelBackGesture() {
    final r = _active;
    _active = null;
    if (r != null) _restore(r);
  }

  @override
  void handleCommitBackGesture() {
    final r = _active;
    _active = null;
    final nav = r?.navigator;
    if (r == null || nav == null) return;
    if (!r.isCurrent) {
      // Outra rota entrou por cima durante o gesto: nao fecha nada (fecharia a
      // rota errada) e a pagina arrastada volta ao lugar.
      _restore(r);
      return;
    }
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

  /// Volta a rota ao lugar (cancelamento). O `handleCancelBackGesture` do
  /// Flutter so anima a rota atual; uma rota ja coberta tambem precisa voltar
  /// a 1, ou apareceria meio arrastada quando a de cima fechar.
  static void _restore(TransitionRoute<dynamic> r) {
    r.handleCancelBackGesture();
    // ignore: invalid_use_of_protected_member
    final c = r.controller;
    if (c != null && !c.isAnimating && c.value < 1) c.forward();
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

/// `RectTween` dos `Hero` com a curva da tela (`--ease-screen`): o voo do
/// `HeroController` ja aplica `fastOutSlowIn` (ou a invertida ao voltar, o que
/// da `fastOutSlowIn(progresso)` nos dois sentidos); este tween desfaz essa
/// curva e aplica a do design, com a mesma sensacao na ida e na volta.
class VoltiHeroRectTween extends RectTween {
  VoltiHeroRectTween({super.begin, super.end});

  @override
  Rect? lerp(double t) => super.lerp(VoltiMotion.easeScreen.transform(_unFastOutSlowIn(t.clamp(0.0, 1.0))));

  static double _unFastOutSlowIn(double y) {
    if (y <= 0 || y >= 1) return y;
    var lo = 0.0, hi = 1.0;
    for (var i = 0; i < 24; i++) {
      final mid = (lo + hi) / 2;
      if (Curves.fastOutSlowIn.transform(mid) < y) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return (lo + hi) / 2;
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
