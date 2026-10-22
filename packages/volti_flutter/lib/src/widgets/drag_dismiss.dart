import 'package:flutter/physics.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../tokens/shadows.dart';

/// Cartao flutuante que se arrasta para baixo para fechar (evolucao E-02,
/// cartao da moto no mapa). Arrastar para cima tem resistencia (rubber band);
/// ao soltar, passa de [dismissDistance] ou de 700 px/s para baixo -> desliza
/// para fora e chama [onDismiss]; senao volta com mola. Leitores de tela:
/// acao de semantica "fechar" ([dismissLabel]) equivalente ao gesto.
/// Reduced motion: sem mola, volta/fecha seco.
class VoltiDragToDismiss extends StatefulWidget {
  const VoltiDragToDismiss({
    super.key,
    required this.child,
    required this.onDismiss,
    this.dismissDistance = 96,
    this.dismissLabel = 'Fechar',
  });

  final Widget child;
  final VoidCallback onDismiss;
  final double dismissDistance;
  final String dismissLabel;

  @override
  State<VoltiDragToDismiss> createState() => _VoltiDragToDismissState();
}

class _VoltiDragToDismissState extends State<VoltiDragToDismiss> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController.unbounded(vsync: this)..addListener(() => setState(() {}));
  double _height = 1;

  static const _spring = SpringDescription(mass: 1, stiffness: 520, damping: 34);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  void _update(DragUpdateDetails d) {
    _c.stop();
    final next = _c.value + d.delta.dy;
    // Para cima: resistencia de 1/4.
    _c.value = next < 0 ? _c.value + d.delta.dy * .25 : next;
  }

  void _end(DragEndDetails d) {
    final v = d.velocity.pixelsPerSecond.dy;
    final reduced = VoltiMotion.reduced(context);
    if (_c.value > widget.dismissDistance || v > 700) {
      final target = _height + 48;
      if (reduced) {
        widget.onDismiss();
        return;
      }
      _c
          .animateTo(target, duration: VoltiMotion.durBase, curve: VoltiMotion.easeOut)
          .whenComplete(() {
        if (mounted) widget.onDismiss();
      });
    } else if (reduced) {
      _c.value = 0;
    } else {
      _c.animateWith(SpringSimulation(_spring, _c.value, 0, v));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      onDismiss: widget.onDismiss,
      customSemanticsActions: {CustomSemanticsAction(label: widget.dismissLabel): widget.onDismiss},
      child: GestureDetector(
        onVerticalDragUpdate: _update,
        onVerticalDragEnd: _end,
        child: _MeasureHeight(
          onHeight: (h) => _height = h,
          child: Transform.translate(
            offset: Offset(0, _c.value),
            child: Opacity(
              opacity: (1 - (_c.value.clamp(0, _height) / _height) * .6).clamp(0.0, 1.0),
              child: widget.child,
            ),
          ),
        ),
      ),
    );
  }
}

class _MeasureHeight extends SingleChildRenderObjectWidget {
  const _MeasureHeight({required this.onHeight, super.child});
  final ValueChanged<double> onHeight;
  @override
  RenderObject createRenderObject(BuildContext context) => _RenderMeasure(onHeight);
  @override
  void updateRenderObject(BuildContext context, _RenderMeasure r) => r.onHeight = onHeight;
}

class _RenderMeasure extends RenderProxyBox {
  _RenderMeasure(this.onHeight);
  ValueChanged<double> onHeight;
  @override
  void performLayout() {
    super.performLayout();
    if (size.height > 0) onHeight(size.height);
  }
}
