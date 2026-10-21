import 'package:flutter/material.dart';

import '../tokens/shadows.dart';

/// Area tocavel com feedback de press (escala + brilho), como no design system.
class VoltiPressable extends StatefulWidget {
  const VoltiPressable({
    super.key,
    required this.child,
    this.onTap,
    this.scale = VoltiMotion.pressScale,
    this.semanticLabel,
  });

  final Widget child;
  final VoidCallback? onTap;
  final double scale;
  final String? semanticLabel;

  @override
  State<VoltiPressable> createState() => _VoltiPressableState();
}

class _VoltiPressableState extends State<VoltiPressable> {
  bool _down = false;

  void _set(bool v) {
    if (_down != v && mounted) setState(() => _down = v);
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null;
    return Semantics(
      button: true,
      enabled: enabled,
      label: widget.semanticLabel,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: enabled ? (_) => _set(true) : null,
        onTapUp: enabled ? (_) => _set(false) : null,
        onTapCancel: enabled ? () => _set(false) : null,
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: _down ? widget.scale : 1,
          duration: VoltiMotion.durFast,
          curve: VoltiMotion.easeOut,
          child: widget.child,
        ),
      ),
    );
  }
}
