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
import '../../core/services.dart';
import '../../core/widgets.dart';
import '../home/providers.dart';
import '../ride/ride_data.dart' show sharedZonesProvider;
import '../ride/ride_screen.dart' show mapEnabledProvider;

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

/// Encerrar: mapa dos pontos verdes, so em ponto de devolucao (fora dele o
/// servidor recusa e so o suporte encerra, com taxa), foto obrigatoria, aguarda
/// a confirmacao de "travada".
class ReturnScreen extends ConsumerStatefulWidget {
  const ReturnScreen({
    super.key,
    required this.rentalId,
    this.pollInterval = const Duration(seconds: 2),
    this.lockTimeout = const Duration(seconds: 90),
  });
  final String rentalId;
  final Duration pollInterval;
  final Duration lockTimeout;
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
  Timer? _poll;

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
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
    VoltiHaptics.success();
    ref.invalidate(currentRentalProvider);
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
      if (mounted) setState(() => _error = failureText(l, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

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

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: mapOn && rc != null
                ? Semantics(
                    label: l.returnZonesMap(rc.zones.length),
                    child: VoltiMap(
                      center: center,
                      zoom: 16,
                      layers: [
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
                            if (rc.nearest != null)
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
                                child: Text(l.returnPointTitle, style: VoltiTypography.label.copyWith(color: VoltiColors.ink900)),
                              ),
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
                      const SizedBox(height: 14),
                      VoltiButton(
                        label: _busy ? l.confirmingLock : l.lockAndEnd,
                        icon: LucideIcons.lock,
                        variant: VoltiButtonVariant.dark,
                        size: VoltiButtonSize.lg,
                        fullWidth: true,
                        onPressed: canEnd ? () => _end(confirm: inZone == null) : null,
                      ),
                      if (outside) ...[
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
