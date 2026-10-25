import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'connectivity.dart';
import 'widgets.dart';

/// Faixa global "Sem conexão" no topo de todas as telas (evolucao E-17).
/// Aparece quando a rede cai e some sozinha quando volta. Fica por cima do
/// conteudo sem bloquear toques e e anunciada como live region.
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(onlineProvider).value ?? true;
    return Stack(
      children: [
        child,
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: _PassThrough(
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
                child: _OfflinePill(visible: !online),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Deixa os toques passarem para a tela de baixo (o botao voltar continua
/// tocavel) sem esconder a faixa dos leitores de tela, como o IgnorePointer faria.
class _PassThrough extends SingleChildRenderObjectWidget {
  const _PassThrough({super.child});
  @override
  RenderObject createRenderObject(BuildContext context) => _RenderPassThrough();
}

class _RenderPassThrough extends RenderProxyBox {
  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) => false;
}

class _OfflinePill extends StatelessWidget {
  const _OfflinePill({required this.visible});
  final bool visible;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final pill = Semantics(
      key: const Key('offline-banner'),
      liveRegion: true,
      container: true,
      label: '${l.offlineTitle}. ${l.offlineText}',
      child: ExcludeSemantics(
        child: Center(
          child: Container(
            margin: const EdgeInsets.only(top: VoltiSpacing.s4),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: context.palette.pill,
              borderRadius: VoltiRadii.rPill,
              boxShadow: VoltiShadows.shadow2,
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(LucideIcons.wifiOff, size: 16, color: Colors.white),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  l.offlineTitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: VoltiTypography.bodyStrong.copyWith(color: Colors.white),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
    // Reduced motion: aparece e some sem deslizar.
    if (VoltiMotion.reduced(context)) return visible ? pill : const SizedBox.shrink();
    final d = VoltiMotion.scaled(context, VoltiMotion.durSlow);
    return AnimatedSwitcher(
      duration: d,
      switchInCurve: VoltiMotion.easeScreen,
      switchOutCurve: VoltiMotion.easeScreen,
      transitionBuilder: (child, a) => FadeTransition(
        opacity: a,
        alwaysIncludeSemantics: true,
        child: SlideTransition(position: Tween(begin: const Offset(0, -.6), end: Offset.zero).animate(a), child: child),
      ),
      child: visible ? pill : const SizedBox.shrink(key: Key('offline-hidden')),
    );
  }
}
