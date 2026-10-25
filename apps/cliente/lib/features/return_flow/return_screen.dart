import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/launcher.dart';
import '../../core/services.dart';
import '../../core/widgets.dart';
import '../handover/handover_watch.dart';
import '../home/depot_providers.dart' show depotsProvider;
import '../home/providers.dart';
import '../pickup/depot_labels.dart';
import '../ride/battery_sheet.dart' show rentalDepotProvider;
import '../ride/ride_data.dart' show ReturnScreensOpen, returnScreensOpenProvider, rideEventBusProvider, sharedZonesProvider;
import '../ride/ride_screen.dart' show mapEnabledProvider;
import '../station_swap/swap_logic.dart' show isOpenSwap;
import '../station_swap/swap_widgets.dart' show openSwapProgress;

/// Zonas de devolucao e onde a moto esta em relacao a elas.
class ReturnContext {
  const ReturnContext({required this.zones, this.vehicle, this.inside, this.nearest});

  /// Zonas `return` ativas (os pontos verdes do mapa).
  final List<GeoZone> zones;

  /// Posicao da moto; null quando nao deu para ler (o servidor decide no encerramento).
  final LatLng? vehicle;

  /// Zona em que a moto esta, se estiver numa.
  final GeoZone? inside;

  /// Zona onde fica o pin "P": a atual ou a mais proxima.
  final GeoZone? nearest;

  /// null = ainda nao sabemos (sem posicao da moto); true/false = dentro/fora.
  bool? get inZone => vehicle == null ? null : inside != null;
}

final returnContextProvider = FutureProvider.autoDispose.family<ReturnContext, String>((ref, rentalId) async {
  final backend = ref.watch(backendProvider);
  // Mesmas zonas da corrida (cache de 5 min): abrir a devolucao nao busca de novo.
  final zones = (await ref.watch(sharedZonesProvider.future)).where((z) => z.active && z.type == ZoneType.return_).toList();
  LatLng? pos;
  try {
    final rental = await backend.rental(rentalId);
    final v = await backend.vehicleByCode(rental.vehicleCode);
    pos = LatLng(v.lat, v.lng);
  } catch (_) {
    // Sem posicao: mostra as zonas e deixa o servidor validar no encerramento.
  }
  final inside = pos == null ? null : zoneContaining(pos.latitude, pos.longitude, zones);
  return ReturnContext(zones: zones, vehicle: pos, inside: inside, nearest: inside ?? (pos == null ? null : nearestZone(pos, zones)));
});

/// Onde o cliente devolve a moto.
enum ReturnMode { point, depot }

/// Encerrar: mapa dos pontos verdes, so em ponto de devolucao (fora dele o
/// servidor recusa e so o suporte encerra, com taxa), foto obrigatoria, aguarda
/// a confirmacao de "travada". Ou **Devolver no galpao** (spec 2026-10-22 3.9):
/// endereco do galpao e a instrucao de entregar a moto ao operador; quando ele
/// registra a chegada (`handover.updated` de uma entrega `return_depot` deste
/// aluguel, ou o aluguel encerrado), abre o recibo.
class ReturnScreen extends ConsumerStatefulWidget {
  const ReturnScreen({
    super.key,
    required this.rentalId,
    this.pollInterval = const Duration(seconds: 2),
    this.lockTimeout = const Duration(seconds: 90),
    this.depotPollInterval = const Duration(seconds: 10),
  });
  final String rentalId;
  final Duration pollInterval;
  final Duration lockTimeout;

  /// Consulta do aluguel enquanto espera o operador (sem tempo real).
  final Duration depotPollInterval;
  @override
  ConsumerState<ReturnScreen> createState() => _ReturnScreenState();
}

class _ReturnScreenState extends ConsumerState<ReturnScreen> {
  Uint8List? _photo;
  bool _busy = false;
  bool _waitingLock = false;
  bool _lockTimedOut = false;
  String? _endKey; // Idempotency-Key da tentativa de encerramento (mantida nas repeticoes)
  String? _photoKey; // objeto ja enviado desta foto
  String? _error;

  /// Encerramento recusado com `409 swap-open`: oferece "Continuar troca".
  bool _swapOpen = false;

  /// Encerramento recusado com `422 rental-outside-return-zone` (E-03): a posicao da MOTO decide.
  bool _outsideRejected = false;
  Timer? _poll;
  StreamSubscription<RealtimeEvent>? _rideEvents;

  /// Avisa a corrida embaixo que a devolucao cuida do fim do aluguel.
  late final ReturnScreensOpen _openFlag;
  bool _finished = false;
  ReturnMode _mode = ReturnMode.point;
  final _map = MapController();

  /// Segmento "Galpao": a camera vai ao galpao; "Ponto verde": volta a moto.
  void _moveMapTo(LatLng to) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !ref.read(mapEnabledProvider)) return;
      try {
        _map.move(to, 16);
      } catch (_) {
        // mapa ainda nao montado
      }
    });
  }

  @override
  void initState() {
    super.initState();
    // Eventos da corrida aberta embaixo (mesmo socket): enquanto esta tela esta
    // aberta, e ela que reage ao fim do aluguel.
    _rideEvents = ref.read(rideEventBusProvider).stream.listen(_onRideEvent);
    _openFlag = ref.read(returnScreensOpenProvider)..count += 1;
  }

  @override
  void dispose() {
    _poll?.cancel();
    _rideEvents?.cancel();
    _openFlag.count -= 1;
    _map.dispose();
    super.dispose();
  }

  void _onRideEvent(RealtimeEvent e) {
    if (!mounted) return;
    switch (e) {
      case RentalUpdated(:final rentalId, :final status) when rentalId == widget.rentalId && (status == 'ended' || status == 'force_ended'):
        _finish();
      case HandoverUpdated(:final handoverId):
        _onHandoverUpdated(handoverId);
      default:
        break;
    }
  }

  /// Chegada no galpao (`return_depot` deste aluguel): o operador encerrou.
  Future<void> _onHandoverUpdated(String handoverId) async {
    if (await isDepotReturnOf(ref.read(backendProvider), handoverId, widget.rentalId)) _finish();
  }

  Future<void> _take() async {
    final bytes = await ref.read(photoPickerProvider).take();
    if (bytes != null && mounted) {
      setState(() {
        _photo = bytes;
        _endKey = null;
        _photoKey = null;
      });
    }
  }

  void _finish() {
    if (_finished || !mounted) return;
    _finished = true;
    _poll?.cancel();
    VoltiHaptics.success();
    ref.invalidate(currentRentalStateProvider);
    if (mounted) context.go('/summary/${widget.rentalId}');
  }

  /// [confirm]: so quando nao sabemos se a moto esta num ponto verde. Dentro
  /// da zona encerra direto (o design nao tem dialogo extra).
  Future<void> _end({bool confirm = false}) async {
    final l = context.l;
    if (confirm) {
      final confirmed = await VoltiDialog.show<bool>(
        context,
        title: l.endRideTitle,
        message: Text(l.endRideText),
        actions: [
          VoltiButton(label: l.lockAndEnd, fullWidth: true, onPressed: () => Navigator.of(context).pop(true)),
          VoltiButton(
            label: l.cancel,
            variant: VoltiButtonVariant.ghost,
            fullWidth: true,
            onPressed: () => Navigator.of(context).pop(false),
          ),
        ],
      );
      if (confirmed != true || !mounted) return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _swapOpen = false;
      _outsideRejected = false;
    });
    try {
      final backend = ref.read(backendProvider);
      if (_photoKey == null) {
        final target = await backend.returnPhotoUpload(widget.rentalId);
        await backend.upload(target, _photo!, 'image/jpeg');
        _photoKey = target.objectKey;
      }
      _endKey ??= newIdempotencyKey();
      final rental = await backend.endRental(widget.rentalId, _photoKey!, idempotencyKey: _endKey);
      if (rental.status == RentalStatus.ended || rental.status == RentalStatus.forceEnded) {
        _finish();
      } else {
        // 202 ending: aguarda "parada e travada"
        _startPolling();
      }
    } catch (e) {
      final f = toFailure(e);
      if (mounted) {
        setState(() {
          _swapOpen = f.slug == 'swap-open';
          _outsideRejected = f.slug == 'rental-outside-return-zone';
          _error = _swapOpen
              ? l.swapErrorOpen
              : _outsideRejected
              ? l.returnOutsideRejected
              : failureText(l, e);
        });
        // A posicao que o app tinha estava velha: le a da moto de novo.
        if (_outsideRejected) ref.invalidate(returnContextProvider(widget.rentalId));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Abre a troca na estacao em andamento (o aluguel so encerra depois dela).
  Future<void> _continueSwap() async {
    if (_navigating) return;
    _navigating = true;
    try {
      final swap = (await ref.read(backendProvider).currentRentalState()).stationSwap;
      if (!mounted) return;
      if (isOpenSwap(swap)) {
        await openSwapProgress(context, swap!);
      }
      if (mounted) {
        setState(() {
          _swapOpen = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = failureText(context.l, e));
    } finally {
      _navigating = false;
    }
  }

  /// Um toque so em "Continuar troca" (sem empilhar duas telas da troca).
  bool _navigating = false;

  void _startPolling() {
    _poll?.cancel();
    final maxTicks = (widget.lockTimeout.inMilliseconds / widget.pollInterval.inMilliseconds).ceil();
    var ticks = 0;
    setState(() {
      _waitingLock = true;
      _lockTimedOut = false;
    });
    _poll = Timer.periodic(widget.pollInterval, (_) async {
      try {
        final r = await ref.read(backendProvider).rental(widget.rentalId);
        if (r.status == RentalStatus.ended || r.status == RentalStatus.forceEnded) {
          _poll?.cancel();
          _finish();
          return;
        }
      } catch (_) {
        // rede instavel: segue tentando ate o prazo
      }
      if (++ticks >= maxTicks) {
        _poll?.cancel();
        if (mounted) setState(() => _lockTimedOut = true);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final ctx = ref.watch(returnContextProvider(widget.rentalId));
    if (_waitingLock && _lockTimedOut) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                VoltiEnter.pop(
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: const BoxDecoration(color: VoltiColors.dangerSoft, shape: BoxShape.circle),
                    child: const Icon(LucideIcons.lockOpen, size: 32, color: VoltiColors.dangerInk),
                  ),
                ),
                const SizedBox(height: 16),
                Semantics(
                  liveRegion: true,
                  child: Text(l.lockNotConfirmed, style: VoltiTypography.heading, textAlign: TextAlign.center),
                ),
                const SizedBox(height: 8),
                Text(l.lockNotConfirmedText, style: VoltiTypography.body, textAlign: TextAlign.center),
                const SizedBox(height: 20),
                VoltiButton(label: l.retry, icon: LucideIcons.refreshCw, fullWidth: true, onPressed: _startPolling),
                const SizedBox(height: 8),
                VoltiButton(
                  label: l.contactSupport,
                  variant: VoltiButtonVariant.secondary,
                  fullWidth: true,
                  onPressed: () => context.push('/account/support'),
                ),
              ],
            ),
          ),
        ),
      );
    }
    if (_waitingLock) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Cadeado com pulso (VoltiPulse): o momento de maior espera do fluxo.
                Semantics(
                  label: l.waitingLock,
                  child: VoltiPulse(
                    key: const Key('lock-pulse'),
                    size: 72,
                    maxScale: 1.9,
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: const BoxDecoration(color: VoltiColors.brandSoft, shape: BoxShape.circle),
                      child: const Icon(LucideIcons.lock, size: 32, color: VoltiColors.successInk),
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                Semantics(
                  liveRegion: true,
                  child: Text(l.waitingLock, style: VoltiTypography.heading, textAlign: TextAlign.center),
                ),
                const SizedBox(height: 8),
                Text(l.waitingLockText, style: VoltiTypography.body, textAlign: TextAlign.center),
              ],
            ),
          ),
        ),
      );
    }
    final rc = ctx.value;
    final inZone = rc?.inZone;
    final outside = inZone == false;
    final mapOn = ref.watch(mapEnabledProvider);
    final center = rc?.vehicle ?? (rc?.nearest != null ? zoneCenter(rc!.nearest!) : const LatLng(-23.5614, -46.6559));
    final canEnd = _photo != null && !_busy && ctx.hasValue && !outside;
    final atDepot = _mode == ReturnMode.depot;
    final depot = atDepot ? ref.watch(rentalDepotProvider(widget.rentalId)).value : null;
    // O galpao pode chegar depois de o cliente tocar no segmento: centra quando chegar.
    ref.listen(rentalDepotProvider(widget.rentalId), (_, next) {
      final d = next.value;
      if (_mode == ReturnMode.depot && d != null) _moveMapTo(LatLng(d.lat, d.lng));
    });

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: mapOn && rc != null
                ? Semantics(
                    label: l.returnZonesMap(rc.zones.length),
                    child: VoltiMap(
                      controller: _map,
                      center: center,
                      zoom: 16,
                      layers: [
                        if (!atDepot)
                        PolygonLayer(
                          key: const Key('return-zones'),
                          polygons: [
                            for (final z in rc.zones)
                              Polygon(
                                points: zoneRing(z),
                                color: VoltiColors.brand.withValues(alpha: .18),
                                borderColor: VoltiColors.brand,
                                borderStrokeWidth: 2,
                              ),
                          ],
                        ),
                        MarkerLayer(
                          markers: [
                            if (atDepot && depot != null)
                              Marker(
                                key: const Key('return-depot-pin'),
                                point: LatLng(depot.lat, depot.lng),
                                width: 48,
                                height: 48,
                                child: Container(
                                  decoration: const BoxDecoration(color: VoltiColors.brandAction, shape: BoxShape.circle, boxShadow: VoltiShadows.shadow2),
                                  child: const Icon(LucideIcons.warehouse, color: VoltiColors.white, size: 24),
                                ),
                              ),
                            if (!atDepot && rc.nearest != null)
                              Marker(
                                point: zoneCenter(rc.nearest!),
                                width: 40,
                                height: 40,
                                child: _ParkingPin(label: l.returnPinLabel),
                              ),
                            if (rc.vehicle != null)
                              Marker(point: rc.vehicle!, width: 34, height: 34, child: const VoltiUserDot(heading: true)),
                          ],
                        ),
                      ],
                    ),
                  )
                : Container(color: VoltiColors.sky100),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
                child: Row(
                  children: [
                    VoltiIconButton(icon: LucideIcons.arrowLeft, label: l.back, onPressed: () => Navigator.of(context).maybePop()),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: VoltiColors.glassBg,
                          borderRadius: VoltiRadii.rLg,
                          boxShadow: VoltiShadows.shadow1,
                        ),
                        child: Semantics(
                          liveRegion: true,
                          container: true,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Semantics(
                                header: true,
                                child: Text(atDepot ? l.returnDepotTitle : l.returnPointTitle, style: VoltiTypography.label.copyWith(color: VoltiColors.ink900)),
                              ),
                              if (atDepot)
                                Text(depot != null ? depotTitle(l, depot) : l.loading, style: VoltiTypography.caption.copyWith(color: VoltiColors.ink600))
                              else
                                Text(switch (inZone) {
                                  true => l.returnInsideZone(rc!.inside!.name),
                                  false => l.returnOutsideShort,
                                  null => ctx.isLoading ? l.returnCheckingShort : l.checkReturnText,
                                }, style: VoltiTypography.caption.copyWith(color: outside ? VoltiColors.dangerInk : VoltiColors.ink600)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: VoltiRadii.sheetTop,
                boxShadow: VoltiShadows.shadowSheet,
              ),
              constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .7),
              child: SafeArea(
                top: false,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 16, VoltiSpacing.screenGutter, 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Semantics(
                        label: l.returnModeLabel,
                        container: true,
                        child: VoltiSegmentedControl<ReturnMode>(
                          key: const Key('return-mode'),
                          options: [
                            VoltiSegment(value: ReturnMode.point, label: l.returnModePoint),
                            VoltiSegment(value: ReturnMode.depot, label: l.returnModeDepot),
                          ],
                          value: _mode,
                          onChanged: _busy
                              ? null
                              : (m) {
                                  setState(() => _mode = m);
                                  final d = ref.read(rentalDepotProvider(widget.rentalId)).value;
                                  if (m == ReturnMode.depot && d != null) {
                                    _moveMapTo(LatLng(d.lat, d.lng));
                                  } else if (m == ReturnMode.point) {
                                    _moveMapTo(center);
                                  }
                                },
                        ),
                      ),
                      const SizedBox(height: 14),
                      if (atDepot)
                        _DepotReturnPanel(rentalId: widget.rentalId, pollInterval: widget.depotPollInterval, onEnded: _finish)
                      else ...[
                        ProgressSteps(
                          total: 2,
                          current: _photo == null ? 0 : 1,
                          label: _photo == null ? l.returnStepPhoto : l.returnStepLock,
                        ),
                        const SizedBox(height: 14),
                        Semantics(header: true, child: Text(_photo == null ? l.returnPhotoTitle : l.returnLockTitle, style: VoltiTypography.heading)),
                        const SizedBox(height: 12),
                        PhotoCapture(label: l.takePhoto, hint: l.returnPhotoHintDesign, height: 130, done: _photo != null, onTap: _take),
                        const SizedBox(height: 12),
                        if (ctx.hasError)
                          ErrorState(
                            error: ctx.error!,
                            // As zonas sao compartilhadas com a corrida (que pode estar
                            // aberta embaixo, segurando o erro): busca de novo as duas.
                            onRetry: () {
                              ref.invalidate(sharedZonesProvider);
                              ref.invalidate(returnContextProvider(widget.rentalId));
                            },
                          )
                        else if (outside)
                          NoticeBanner(
                            danger: true,
                            icon: LucideIcons.mapPinOff,
                            title: l.returnOutsideShort,
                            message: l.returnOutsideBlocked,
                          )
                        else
                          // Dentro do ponto verde: confirma; sem saber ainda, mostra a regra.
                          _RuleNote(text: inZone == true ? l.returnInsideRule : l.returnZoneRule),
                        if (_error != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 12),
                            child: NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: _error!),
                          ),
                        if (_outsideRejected) ...[
                          const SizedBox(height: VoltiSpacing.s8),
                          VoltiButton(
                            key: const Key('return-go-depot'),
                            label: l.returnGoDepot,
                            icon: LucideIcons.warehouse,
                            variant: VoltiButtonVariant.secondary,
                            fullWidth: true,
                            onPressed: () {
                              setState(() {
                                _mode = ReturnMode.depot;
                                _outsideRejected = false;
                                _error = null;
                              });
                              final d = ref.read(rentalDepotProvider(widget.rentalId)).value;
                              if (d != null) _moveMapTo(LatLng(d.lat, d.lng));
                            },
                          ),
                          const SizedBox(height: VoltiSpacing.s8),
                          VoltiButton(
                            key: const Key('return-outside-support'),
                            label: l.contactSupport,
                            icon: LucideIcons.messageCircle,
                            variant: VoltiButtonVariant.ghost,
                            fullWidth: true,
                            onPressed: () => context.push('/account/support'),
                          ),
                        ],
                        if (_swapOpen)
                          Padding(
                            padding: const EdgeInsets.only(top: VoltiSpacing.s8),
                            child: VoltiButton(
                              key: const Key('return-continue-swap'),
                              label: l.returnSwapOpenAction,
                              icon: LucideIcons.batteryCharging,
                              variant: VoltiButtonVariant.secondary,
                              fullWidth: true,
                              onPressed: _continueSwap,
                            ),
                          ),
                        const SizedBox(height: 14),
                        VoltiButton(
                          label: _busy ? l.confirmingLock : l.lockAndEnd,
                          icon: LucideIcons.lock,
                          size: VoltiButtonSize.lg,
                          fullWidth: true,
                          onPressed: canEnd ? () => _end(confirm: inZone == null) : null,
                        ),
                        if (outside && !_outsideRejected) ...[
                          const SizedBox(height: 8),
                          VoltiButton(
                            label: l.contactSupport,
                            icon: LucideIcons.messageCircle,
                            variant: VoltiButtonVariant.secondary,
                            fullWidth: true,
                            onPressed: () => context.push('/account/support'),
                          ),
                        ],
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Devolucao no galpao: endereco com "Como chegar", a instrucao de entregar a
/// moto ao operador e a espera pela chegada registrada. O operador cria a
/// entrega `return_depot`; os eventos (`handover.updated`, `rental.updated`)
/// chegam a [ReturnScreen]; aqui fica so a consulta periodica do aluguel, que
/// chama [onEnded] quando ele ja encerrou. Sai do painel = timer parado.
class _DepotReturnPanel extends ConsumerStatefulWidget {
  const _DepotReturnPanel({required this.rentalId, required this.pollInterval, required this.onEnded});
  final String rentalId;
  final Duration pollInterval;
  final VoidCallback onEnded;
  @override
  ConsumerState<_DepotReturnPanel> createState() => _DepotReturnPanelState();
}

class _DepotReturnPanelState extends ConsumerState<_DepotReturnPanel> {
  Timer? _timer;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(widget.pollInterval, (_) => _checkRental());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _end() {
    if (_done || !mounted) return;
    _done = true;
    _timer?.cancel();
    widget.onEnded();
  }

  Future<void> _checkRental() async {
    try {
      final r = await ref.read(backendProvider).rental(widget.rentalId);
      if (r.status == RentalStatus.ended || r.status == RentalStatus.forceEnded) _end();
    } catch (_) {
      // rede instavel: tenta na proxima
    }
  }

  Future<void> _directions(Depot d) async {
    final ok = await openDirections(ref.read(urlLauncherProvider), d.lat, d.lng);
    if (!ok && mounted) VoltiToast.show(context, context.l.navigateFailed, tone: VoltiToastTone.danger);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final depotAsync = ref.watch(rentalDepotProvider(widget.rentalId));
    final depot = depotAsync.value;
    return Column(
      key: const Key('return-depot'),
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(header: true, child: Text(l.returnDepotTitle, style: VoltiTypography.heading)),
        const SizedBox(height: 12),
        if (depot != null)
          Container(
            padding: const EdgeInsets.all(VoltiSpacing.s16),
            decoration: BoxDecoration(color: scheme.surfaceContainerHighest, borderRadius: VoltiRadii.rLg),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(LucideIcons.warehouse, size: 18, color: VoltiColors.brandAction),
                const SizedBox(width: VoltiSpacing.s8),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(depotTitle(l, depot), style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface)),
                    Text(depot.address, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
                  ]),
                ),
              ]),
              const SizedBox(height: VoltiSpacing.s12),
              VoltiButton(
                key: const Key('return-depot-directions'),
                label: l.howToGetThere,
                icon: LucideIcons.navigation,
                variant: VoltiButtonVariant.secondary,
                fullWidth: true,
                onPressed: () => _directions(depot),
              ),
            ]),
          )
        else if (depotAsync.isLoading)
          VoltiSkeleton.list(rows: 1, trailing: false, label: l.loading)
        else
          Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: l.returnDepotMissing),
            const SizedBox(height: VoltiSpacing.s8),
            VoltiButton(
              key: const Key('return-depot-retry'),
              label: l.retry,
              icon: LucideIcons.refreshCw,
              variant: VoltiButtonVariant.secondary,
              fullWidth: true,
              onPressed: () {
                ref.invalidate(depotsProvider);
                ref.invalidate(rentalDepotProvider(widget.rentalId));
              },
            ),
          ]),
        const SizedBox(height: 12),
        _RuleNote(text: l.returnDepotText),
        const SizedBox(height: 12),
        Semantics(
          liveRegion: true,
          child: Row(children: [
            // Reduced motion: icone fixo no lugar do spinner.
            if (VoltiMotion.reduced(context))
              const Icon(LucideIcons.hourglass, key: Key('return-depot-waiting-icon'), size: 18, color: VoltiColors.brandAction)
            else
              const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: VoltiColors.brandAction)),
            const SizedBox(width: VoltiSpacing.s10),
            Expanded(child: Text(l.returnDepotWaiting, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant))),
          ]),
        ),
      ],
    );
  }
}

/// Pin "P" verde do ponto de devolucao mais proximo.
class _ParkingPin extends StatelessWidget {
  const _ParkingPin({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Semantics(
    key: const Key('return-pin'),
    label: label,
    child: Container(
      width: 34,
      height: 34,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: VoltiColors.brand,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2.5),
        boxShadow: VoltiShadows.shadowBrand,
      ),
      child: const Icon(LucideIcons.squareParking, size: 18, color: Colors.white),
    ),
  );
}

/// Aviso verde do design ("Fora dos pontos verdes nao e possivel encerrar sem taxa.").
class _RuleNote extends StatelessWidget {
  const _RuleNote({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    child: Container(
      padding: const EdgeInsets.all(VoltiSpacing.s12),
      decoration: BoxDecoration(color: VoltiColors.brandSoft, borderRadius: VoltiRadii.rMd),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(LucideIcons.mapPin, size: 20, color: VoltiColors.successInk),
          const SizedBox(width: VoltiSpacing.s10),
          Expanded(
            child: Text(text, style: VoltiTypography.caption.copyWith(color: VoltiColors.successInk)),
          ),
        ],
      ),
    ),
  );
}
