import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/widgets.dart';

/// Altura da faixa da alca (alvo de toque em toda a largura da folha).
const homeSheetHandleHeight = 28.0;

/// Pontos de parada de uma folha da home, em fracao da altura disponivel.
///
/// - [collapsed]: como o cartao era antes (altura natural do conteudo "de
///   espiar", com teto);
/// - [half]: meia tela (some quando a recolhida ja passa dela);
/// - [expanded]: quase tela cheia, abaixo da area segura;
/// - [closed]: so nas folhas que fecham ao arrastar alem da recolhida.
@immutable
class HomeSheetStops {
  const HomeSheetStops({required this.collapsed, required this.half, required this.expanded, this.closed});

  final double collapsed;
  final double? half;
  final double expanded;
  final double? closed;

  /// Paradas em ordem crescente (sem a de fechar).
  List<double> get stops => [collapsed, ?half, expanded];

  @override
  bool operator ==(Object other) =>
      other is HomeSheetStops && other.collapsed == collapsed && other.half == half && other.expanded == expanded && other.closed == closed;

  @override
  int get hashCode => Object.hash(collapsed, half, expanded, closed);
}

/// Calcula as paradas para uma tela de altura [height] com a area segura de
/// cima [topInset] e a recolhida de [collapsedPx] px.
HomeSheetStops homeSheetStops({required double height, required double topInset, required double collapsedPx, bool closable = false}) {
  if (height <= 0) return const HomeSheetStops(collapsed: .3, half: null, expanded: 1);
  final expanded = ((height - topInset - VoltiSpacing.s8) / height).clamp(.3, 1.0);
  final collapsed = (collapsedPx / height).clamp(.12, expanded - .1);
  double? half = math.max(.55, collapsed + .12);
  if (half > expanded - .08) half = null;
  return HomeSheetStops(
    collapsed: collapsed,
    half: half,
    expanded: expanded,
    closed: closable ? math.min(.04, collapsed / 2) : null,
  );
}

/// Folha arrastavel da home (cartao do galpao e "Troca de bateria"): fica sobre
/// o mapa, sem modal, com tres paradas (recolhida, meia altura, expandida).
///
/// - A alca (e o [header], fixo logo abaixo) arrastam a folha; o conteudo rola e
///   coopera com o arrasto (`DraggableScrollableSheet`): rola a lista quando
///   expandida, arrasta a folha quando a lista esta no topo.
/// - O [peek] e o que aparece recolhida: a altura natural dele (+ alca, header e
///   [footer]) define a recolhida, ate [maxCollapsedPx].
/// - O [footer] fica fixo no rodape em qualquer altura (ex.: **Escolher moto**).
/// - Com [onClose], arrastar alem da recolhida fecha a folha (como o X).
/// - Alca acessivel: "Expandir"/"Recolher" com acao de toque (leitor de tela
///   expande sem gesto). Reduced motion: as paradas mudam na hora.
/// - Haptica leve ao encaixar numa parada.
class HomeSheet extends StatefulWidget {
  const HomeSheet({
    super.key,
    required this.surfaceKey,
    required this.peek,
    required this.maxCollapsedPx,
    this.handleKey,
    this.scrollKey,
    this.header,
    this.more = const [],
    this.footer,
    this.onClose,
    this.height,
    this.onCollapsedChanged,
  });

  /// Chave da superficie da folha (os testes medem por ela).
  final Key surfaceKey;
  final Key? handleKey;
  final Key? scrollKey;
  final Widget? header;
  final Widget peek;
  final List<Widget> more;
  final Widget? footer;
  final double maxCollapsedPx;
  final VoidCallback? onClose;

  /// Altura atual da folha em px (botoes do mapa e camera acompanham).
  final ValueNotifier<double>? height;

  /// Altura da recolhida em px quando ela muda (o cabecalho da home cede espaco).
  final ValueChanged<double>? onCollapsedChanged;

  @override
  State<HomeSheet> createState() => HomeSheetState();
}

class HomeSheetState extends State<HomeSheet> {
  final _controller = DraggableScrollableController();
  final _headerKey = GlobalKey();
  final _peekKey = GlobalKey();
  final _footerKey = GlobalKey();

  /// Fracao atual (a alca troca "Expandir"/"Recolher" sem reconstruir a folha).
  final _size = ValueNotifier<double>(0);

  double? _naturalPx;
  double _parentHeight = 0;
  HomeSheetStops? _stops;
  List<double> _snaps = const [];
  double? _reportedCollapsed;
  int _lastStop = 0;
  bool _closing = false;

  HomeSheetStops? get stops => _stops;

  /// Altura atual em px (antes de anexar: a recolhida).
  double get heightPx {
    final s = _stops;
    if (s == null) return 0;
    return (_controller.isAttached ? _controller.size : s.collapsed) * _parentHeight;
  }

  bool get isExpanded {
    final s = _stops;
    return s != null && _size.value >= s.expanded - .01;
  }

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onSize);
  }

  @override
  void dispose() {
    _controller.removeListener(_onSize);
    _controller.dispose();
    _size.dispose();
    super.dispose();
  }

  bool _syncPending = false;

  void _onSize() {
    if (!mounted) return;
    // A folha troca de paradas no build (didUpdateWidget) e o controller avisa
    // na hora: atualiza os ouvintes depois do frame.
    if (SchedulerBinding.instance.schedulerPhase == SchedulerPhase.persistentCallbacks) {
      if (!_syncPending) {
        _syncPending = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _syncPending = false;
          _onSize();
        });
      }
      return;
    }
    if (!_controller.isAttached) return;
    final s = _controller.size;
    _size.value = s;
    widget.height?.value = s * _parentHeight;
    final stops = _stops;
    if (stops == null) return;
    final close = widget.onClose;
    if (close != null && stops.closed != null && !_closing && s <= stops.closed! + .005) {
      _closing = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) close();
      });
      return;
    }
    final points = stops.stops;
    for (var i = 0; i < points.length; i++) {
      if ((s - points[i]).abs() < .004) {
        if (i != _lastStop) {
          _lastStop = i;
          VoltiHaptics.tap();
        }
        break;
      }
    }
  }

  double _measure(GlobalKey k) {
    final box = k.currentContext?.findRenderObject();
    return box is RenderBox && box.hasSize ? box.size.height : 0;
  }

  /// Mede a altura natural da recolhida depois do layout e refaz as paradas
  /// quando ela muda (texto maior, galpao com seletor, lista carregada).
  void _remeasure() {
    if (!mounted) return;
    final bottomPad = widget.footer == null ? MediaQuery.paddingOf(context).bottom + VoltiSpacing.s16 : 0.0;
    final natural = homeSheetHandleHeight + _measure(_headerKey) + _measure(_peekKey) + _measure(_footerKey) + bottomPad;
    if (_naturalPx == null || (natural - _naturalPx!).abs() > .5) setState(() => _naturalPx = natural);
  }

  /// Altura minima do conteudo: alca, cabecalho, rodape e um pouco da lista.
  double _minContentPx() => homeSheetHandleHeight + _measure(_headerKey) + _measure(_footerKey) + VoltiSpacing.s48;

  /// Vai para a parada [to] (animado; reduced motion: na hora).
  void snapTo(double to) {
    if (!_controller.isAttached) return;
    final d = VoltiMotion.scaled(context, VoltiMotion.durSlow);
    if (d == Duration.zero) {
      _controller.jumpTo(to);
    } else {
      _controller.animateTo(to, duration: d, curve: VoltiMotion.easeScreen);
    }
  }

  /// Alca: recolhida/meia -> expandida; expandida -> recolhida.
  void toggle() {
    final s = _stops;
    if (s == null) return;
    snapTo(isExpanded ? s.collapsed : s.expanded);
  }

  double? _dragStart;

  void _dragBy(double dy) {
    final s = _stops;
    if (s == null || !_controller.isAttached || _parentHeight <= 0) return;
    final min = s.closed ?? s.collapsed;
    _controller.jumpTo((_controller.size - dy / _parentHeight).clamp(min, s.expanded));
  }

  void _dragEnd(double velocity) {
    final s = _stops;
    if (s == null || !_controller.isAttached) return;
    final cur = _controller.size;
    final points = [?s.closed, ...s.stops];
    // Direcao do gesto: pelo impulso ou, devagar, por um arrasto de >= 4% da tela.
    final moved = cur - (_dragStart ?? cur);
    _dragStart = null;
    final up = velocity < -250 || (velocity.abs() <= 250 && moved > .04);
    final down = velocity > 250 || (velocity.abs() <= 250 && moved < -.04);
    double target;
    if (up) {
      target = points.firstWhere((p) => p > cur + .01, orElse: () => points.last);
    } else if (down) {
      target = points.lastWhere((p) => p < cur - .01, orElse: () => points.first);
    } else {
      target = points.reduce((a, b) => (a - cur).abs() <= (b - cur).abs() ? a : b);
    }
    snapTo(target);
  }

  HomeSheetStops _computeStops(double height) {
    final media = MediaQuery.of(context);
    final natural = _naturalPx ?? widget.maxCollapsedPx;
    return homeSheetStops(
      height: height,
      topInset: media.padding.top,
      collapsedPx: math.min(natural, widget.maxCollapsedPx),
      closable: widget.onClose != null,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final bottomSafe = MediaQuery.paddingOf(context).bottom;
    WidgetsBinding.instance.addPostFrameCallback((_) => _remeasure());

    return LayoutBuilder(
      builder: (context, box) {
        _parentHeight = box.maxHeight;
        final stops = _computeStops(box.maxHeight);
        if (stops != _stops) {
          _stops = stops;
          final snaps = [if (stops.closed != null) stops.collapsed, ?stops.half];
          if (!_sameList(snaps, _snaps)) _snaps = snaps;
        }
        final collapsedPx = stops.collapsed * box.maxHeight;
        if (_reportedCollapsed == null || (_reportedCollapsed! - collapsedPx).abs() > .5) {
          _reportedCollapsed = collapsedPx;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            widget.onCollapsedChanged?.call(collapsedPx);
            widget.height?.value = heightPx;
          });
        }
        final reduced = VoltiMotion.reduced(context);
        return DraggableScrollableSheet(
          controller: _controller,
          expand: true,
          snap: true,
          snapSizes: _snaps,
          // Reduced motion: encaixa quase na hora (o assert pede > 0).
          snapAnimationDuration: reduced ? const Duration(milliseconds: 1) : VoltiMotion.durSlow,
          initialChildSize: stops.collapsed,
          minChildSize: stops.closed ?? stops.collapsed,
          maxChildSize: stops.expanded,
          builder: (context, scroll) => Container(
            key: widget.surfaceKey,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              color: scheme.surface,
              borderRadius: VoltiRadii.sheetTop,
              boxShadow: VoltiShadows.shadowSheet,
            ),
            // Fechando (abaixo da recolhida) a folha fica mais baixa que a alca e o
            // rodape: o conteudo mantem a altura minima e e cortado, sem estouro.
            child: LayoutBuilder(
              builder: (context, c) => OverflowBox(
                alignment: Alignment.topCenter,
                minHeight: 0,
                maxHeight: math.max(c.maxHeight, _minContentPx()),
                child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Alca e cabecalho fixos: arrastam a folha.
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onVerticalDragStart: (_) => _dragStart = _controller.isAttached ? _controller.size : null,
                  onVerticalDragUpdate: (d) => _dragBy(d.primaryDelta ?? 0),
                  onVerticalDragEnd: (d) => _dragEnd(d.primaryVelocity ?? 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      ValueListenableBuilder<double>(
                        valueListenable: _size,
                        builder: (context, _, _) => Semantics(
                          key: widget.handleKey,
                          button: true,
                          label: isExpanded ? l.sheetCollapse : l.sheetExpand,
                          hint: l.sheetHandleHint,
                          onTap: toggle,
                          excludeSemantics: true,
                          child: GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: toggle,
                            child: SizedBox(
                              height: homeSheetHandleHeight,
                              child: Center(
                                child: Container(
                                  width: 40,
                                  height: 4,
                                  decoration: BoxDecoration(color: scheme.outlineVariant, borderRadius: VoltiRadii.rPill),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      if (widget.header != null)
                        KeyedSubtree(
                          key: _headerKey,
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 0, VoltiSpacing.screenGutter, VoltiSpacing.s12),
                            child: widget.header,
                          ),
                        ),
                    ],
                  ),
                ),
                Expanded(
                  child: CustomScrollView(
                    key: widget.scrollKey,
                    controller: scroll,
                    slivers: [
                      SliverPadding(
                        padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
                        sliver: SliverList.list(
                          children: [
                            KeyedSubtree(key: _peekKey, child: widget.peek),
                            ...widget.more,
                            if (widget.footer == null) SizedBox(height: bottomSafe + VoltiSpacing.s16),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                if (widget.footer != null)
                  KeyedSubtree(
                    key: _footerKey,
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(
                        VoltiSpacing.screenGutter,
                        VoltiSpacing.s12,
                        VoltiSpacing.screenGutter,
                        bottomSafe + VoltiSpacing.s16,
                      ),
                      child: widget.footer,
                    ),
                  ),
              ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

bool _sameList(List<double> a, List<double> b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}
