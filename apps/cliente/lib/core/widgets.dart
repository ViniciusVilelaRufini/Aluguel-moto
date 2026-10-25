import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
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
class VoltiMap extends StatefulWidget {
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
    this.embedded = false,
    this.onTileError,
    this.onTileLoaded,
  });

  /// Mapa dentro de um cartao (ex.: trajeto no recibo): a atribuicao nao soma o
  /// recuo da area segura (barra de status), que nao toca o cartao.
  final bool embedded;

  /// Cada tile que falhou (ver [voltiTileLayer]).
  final VoidCallback? onTileError;

  /// Um tile da base apareceu (carregou).
  final VoidCallback? onTileLoaded;
  final LatLng center;
  final double zoom;
  final MapController? controller;
  final List<Widget> layers;
  final bool interactive;
  final bool showAttribution;
  final Alignment attributionAlignment;
  final Color backgroundColor;

  // saturate(.55) brightness(1.06) contrast(.92) aproximado em matriz de cor.
  static const colorFilter = ColorFilter.matrix(<double>[
    0.69, 0.30, 0.04, 0, 8, //
    0.17, 0.82, 0.04, 0, 8, //
    0.17, 0.30, 0.56, 0, 8, //
    0, 0, 0, 1, 0,
  ]);

  /// Novas tentativas automaticas depois de tiles com erro (rede instavel na
  /// abertura): ate 3 seguidas, espacadas; um tile carregado zera a contagem. A
  /// nova tentativa recarrega a camada (o flutter_map 8 nao tem recarga por tile),
  /// mas os tiles ja carregados vem do `ImageCache` (chave = URL): so os que
  /// falharam voltam a rede.
  static const maxRetries = 3;

  @override
  State<VoltiMap> createState() => _VoltiMapState();
}

class _VoltiMapState extends State<VoltiMap> with WidgetsBindingObserver {
  // Um provedor por camada durante a vida do mapa (reconstruir a tela nao troca de
  // provedor). Todos usam o cliente HTTP compartilhado de `map_tiles.dart`, que o
  // descarte do provedor (TileLayer ao sair) nao fecha.
  late final TileProvider _base = newTileProvider();
  late final TileProvider? _reference = kMapReferenceUrl.isEmpty ? null : newTileProvider();
  final _reset = StreamController<void>.broadcast();
  Timer? _retry;
  Timer? _settle;
  int _retries = 0;

  /// Algum tile falhou desde a ultima recarga (ex.: rede caiu com o app em segundo plano).
  bool _failedTiles = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  /// Ao reabrir o app, tiles que falharam (faixa cinza no mapa) sao pedidos de novo,
  /// mesmo depois de esgotadas as tentativas automaticas.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed || !_failedTiles || _reset.isClosed) return;
    _failedTiles = false;
    _retries = 0;
    _reset.add(null);
  }

  void _onError() {
    _failedTiles = true;
    widget.onTileError?.call();
    // Erro depois de uma nova tentativa: o ciclo nao terminou limpo.
    _settle?.cancel();
    // Tiles com erro na tela: recarrega depois de um tempo (nova tentativa).
    if (_retries >= VoltiMap.maxRetries || (_retry?.isActive ?? false)) return;
    _retry = Timer(Duration(milliseconds: 1500 * (_retries + 1)), () {
      _retries++;
      if (mounted && !_reset.isClosed) _reset.add(null);
      // A contagem so zera se o ciclo passar sem nenhum erro (um tile que falha
      // sempre nao reinicia as tentativas a cada recarga).
      _settle?.cancel();
      _settle = Timer(const Duration(seconds: 10), () => _retries = 0);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _retry?.cancel();
    _settle?.cancel();
    _reset.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: widget.controller,
      options: MapOptions(
        initialCenter: widget.center,
        initialZoom: widget.zoom,
        minZoom: 3,
        maxZoom: 19,
        backgroundColor: widget.backgroundColor,
        interactionOptions: InteractionOptions(
          flags: widget.interactive ? InteractiveFlag.all & ~InteractiveFlag.rotate : InteractiveFlag.none,
        ),
      ),
      children: [
        voltiTileLayer(
          context,
          provider: _base,
          onError: _onError,
          reset: _reset.stream,
          tileBuilder: (context, tile, image) {
            if (kMapDebug) debugPrint('VOLTI_DBG tile ${image.coordinates.z}/${image.coordinates.x}/${image.coordinates.y} ready=${image.readyToDisplay} err=${image.loadError}');
            if (image.readyToDisplay && widget.onTileLoaded != null) widget.onTileLoaded!();
            return ColorFiltered(colorFilter: VoltiMap.colorFilter, child: tile);
          },
        ),
        // Rotulos das ruas por cima da base (sem filtro de cor).
        if (_reference != null)
          voltiTileLayer(context, template: kMapReferenceUrl, provider: _reference, onError: _onError, reset: _reset.stream),
        ...widget.layers,
        if (kMapDebug) const _CameraLogger(),
        if (widget.showAttribution)
          SafeArea(
            top: !widget.embedded,
            bottom: !widget.embedded,
            left: !widget.embedded,
            right: !widget.embedded,
            child: Align(
              alignment: widget.attributionAlignment,
              child: const Padding(padding: EdgeInsets.all(6), child: MapAttribution()),
            ),
          ),
      ],
    );
  }
}

/// Cartao de aviso (zona, rede, etc.) com tom.
class NoticeBanner extends StatelessWidget {
  const NoticeBanner({super.key, required this.message, this.title, this.icon = LucideIcons.gauge, this.danger = false, this.info = false});
  final String message;
  final String? title;
  final IconData icon;
  final bool danger;

  /// Tom informativo (azul) para avisos que nao sao alerta (ex.: privacidade).
  final bool info;

  @override
  Widget build(BuildContext context) {
    final bg = danger ? VoltiColors.dangerSoft : (info ? VoltiColors.infoSoft : VoltiColors.warningSoft);
    // Icone no tom da marca; texto no tom forte (>= 4,5:1 sobre o fundo suave).
    final fg = danger ? VoltiColors.dangerInk : (info ? VoltiColors.infoInk : VoltiColors.warningInk);
    final ink = danger ? VoltiColors.dangerInkStrong : (info ? VoltiColors.infoInk : VoltiColors.warningInkStrong);
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

/// Avisa o tamanho do filho depois do layout (ex.: altura da folha da boas-vindas,
/// do rodape flutuante da lista).
class SizeReporter extends SingleChildRenderObjectWidget {
  const SizeReporter({super.key, required this.onSize, super.child});
  final ValueChanged<Size> onSize;

  @override
  RenderObject createRenderObject(BuildContext context) => RenderSizeReporter(onSize);

  @override
  void updateRenderObject(BuildContext context, RenderSizeReporter renderObject) => renderObject.onSize = onSize;
}

class RenderSizeReporter extends RenderProxyBox {
  RenderSizeReporter(this.onSize);
  ValueChanged<Size> onSize;
  Size? _last;

  @override
  void performLayout() {
    super.performLayout();
    if (size == _last) return;
    _last = size;
    final s = size;
    WidgetsBinding.instance.addPostFrameCallback((_) => onSize(s));
  }
}

/// Diagnostico do mapa no logcat (so debug, `--dart-define=MAP_DEBUG=true`).
const kMapDebug = kDebugMode && bool.fromEnvironment('MAP_DEBUG');

class _CameraLogger extends StatelessWidget {
  const _CameraLogger();
  @override
  Widget build(BuildContext context) {
    final cam = MapCamera.of(context);
    debugPrint('VOLTI_DBG camera size=${cam.nonRotatedSize} center=${cam.center} zoom=${cam.zoom} pixelBounds=${cam.pixelBounds}');
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final box = context.findRenderObject() as RenderBox?;
      if (box != null && box.hasSize) debugPrint('VOLTI_DBG maplayer box=${box.size} at=${box.localToGlobal(Offset.zero)}');
    });
    return const SizedBox.shrink();
  }
}
