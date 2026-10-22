import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../l10n/app_localizations.dart';
import 'errors.dart';
import 'map_tiles.dart';

/// Ponto unico de textos localizados.
extension L10nX on BuildContext {
  AppLocalizations get l => AppLocalizations.of(this);
}

/// Estado de erro com "Tentar de novo" (rede instavel e erros da API).
class ErrorState extends StatelessWidget {
  const ErrorState({super.key, required this.error, this.onRetry});
  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final failure = toFailure(error);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        child: Semantics(
          liveRegion: true,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(failure.isNetwork ? LucideIcons.wifiOff : LucideIcons.circleAlert,
                  size: 40, color: Theme.of(context).colorScheme.error),
              const SizedBox(height: VoltiSpacing.s12),
              Text(failure.message(l), textAlign: TextAlign.center, style: VoltiTypography.body),
              if (onRetry != null) ...[
                const SizedBox(height: VoltiSpacing.s16),
                VoltiButton(
                  label: l.retry,
                  variant: VoltiButtonVariant.secondary,
                  icon: LucideIcons.refreshCw,
                  onPressed: onRetry,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class LoadingState extends StatelessWidget {
  const LoadingState({super.key});
  @override
  Widget build(BuildContext context) => Center(
        child: Semantics(
          label: context.l.loading,
          child: const CircularProgressIndicator(),
        ),
      );
}

/// Renderiza `AsyncValue` com carregamento, erro e "Tentar de novo".
class AsyncView<T> extends StatelessWidget {
  const AsyncView({super.key, required this.value, required this.data, required this.onRetry, this.loading});
  final AsyncValue<T> value;
  final Widget Function(T) data;
  final VoidCallback onRetry;

  /// Carregamento no formato do conteudo (ex.: `VoltiSkeleton.list`). Padrao: spinner.
  final WidgetBuilder? loading;

  @override
  Widget build(BuildContext context) => value.when(
        data: data,
        loading: () => loading?.call(context) ?? const LoadingState(),
        error: (e, _) => ErrorState(error: e, onRetry: onRetry),
        skipLoadingOnReload: true,
        skipLoadingOnRefresh: true,
      );
}

/// Scaffold padrao das telas internas: voltar, titulo e corpo com gutter.
class VoltiScaffold extends StatelessWidget {
  const VoltiScaffold({super.key, required this.title, required this.body, this.actions, this.bottom});
  final String title;
  final Widget body;
  final List<Widget>? actions;
  final Widget? bottom;

  @override
  Widget build(BuildContext context) {
    final canPop = Navigator.of(context).canPop();
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leading: canPop
            ? Padding(
                padding: const EdgeInsets.all(6),
                child: VoltiIconButton(
                  icon: LucideIcons.arrowLeft,
                  variant: VoltiIconButtonVariant.soft,
                  label: context.l.back,
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              )
            : null,
        title: Text(title, style: VoltiTypography.heading),
        actions: actions,
      ),
      body: SafeArea(child: body),
      bottomNavigationBar: bottom == null
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                    VoltiSpacing.screenGutter, VoltiSpacing.s8, VoltiSpacing.screenGutter, VoltiSpacing.s16),
                child: bottom,
              ),
            ),
    );
  }
}

/// Texto de secao dentro de listas.
class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(0, VoltiSpacing.s20, 0, VoltiSpacing.s8),
        child: Semantics(header: true, child: Text(text, style: VoltiTypography.bodyStrong)),
      );
}

/// Mapa claro (tiles de [kMapTileUrl] com o filtro suave do design) para Android,
/// iOS e web. A atribuicao fica em [attributionAlignment]; quem desenha a
/// atribuicao fora do mapa (ex.: a home, ao lado do botao de localizar) passa
/// `showAttribution: false`. [backgroundColor] aparece enquanto os tiles nao
/// chegam (transparente deixa ver um fundo desenhado por baixo, sem rede).
class VoltiMap extends StatelessWidget {
  const VoltiMap({
    super.key,
    required this.center,
    this.zoom = 16,
    this.controller,
    this.layers = const [],
    this.interactive = true,
    this.showAttribution = true,
    this.attributionAlignment = Alignment.centerLeft,
    this.backgroundColor = VoltiColors.mapLand,
  });
  final LatLng center;
  final double zoom;
  final MapController? controller;
  final List<Widget> layers;
  final bool interactive;
  final bool showAttribution;
  final Alignment attributionAlignment;
  final Color backgroundColor;

  // saturate(.55) brightness(1.06) contrast(.92) aproximado em matriz de cor.
  static const _filter = ColorFilter.matrix(<double>[
    0.69, 0.30, 0.04, 0, 8, //
    0.17, 0.82, 0.04, 0, 8, //
    0.17, 0.30, 0.56, 0, 8, //
    0, 0, 0, 1, 0,
  ]);

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: controller,
      options: MapOptions(
        initialCenter: center,
        initialZoom: zoom,
        minZoom: 3,
        maxZoom: 19,
        backgroundColor: backgroundColor,
        interactionOptions: InteractionOptions(
          flags: interactive ? InteractiveFlag.all & ~InteractiveFlag.rotate : InteractiveFlag.none,
        ),
      ),
      children: [
        voltiTileLayer(context, tileBuilder: (context, tile, _) => ColorFiltered(colorFilter: _filter, child: tile)),
        ...layers,
        if (showAttribution)
          SafeArea(
            child: Align(
              alignment: attributionAlignment,
              child: const Padding(padding: EdgeInsets.all(6), child: MapAttribution()),
            ),
          ),
      ],
    );
  }
}

/// Cartao de aviso (zona, rede, etc.) com tom.
class NoticeBanner extends StatelessWidget {
  const NoticeBanner({super.key, required this.message, this.title, this.icon = LucideIcons.gauge, this.danger = false});
  final String message;
  final String? title;
  final IconData icon;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final bg = danger ? VoltiColors.dangerSoft : VoltiColors.warningSoft;
    // Icone no tom da marca; texto no tom forte (>= 4,5:1 sobre o fundo suave).
    final fg = danger ? VoltiColors.dangerInk : VoltiColors.warningInk;
    final ink = danger ? VoltiColors.dangerInkStrong : VoltiColors.warningInkStrong;
    return Semantics(
      liveRegion: true,
      container: true,
      child: Container(
        padding: const EdgeInsets.all(VoltiSpacing.s12),
        decoration: BoxDecoration(color: bg, borderRadius: VoltiRadii.rMd, boxShadow: VoltiShadows.shadow1),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: fg),
            const SizedBox(width: VoltiSpacing.s10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (title != null) Text(title!, style: VoltiTypography.bodyStrong.copyWith(color: ink)),
                  Text(message, style: VoltiTypography.caption.copyWith(color: ink)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
