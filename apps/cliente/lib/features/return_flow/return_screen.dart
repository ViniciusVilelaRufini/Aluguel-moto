import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/services.dart';
import '../../core/widgets.dart';
import '../home/providers.dart';

/// null = ainda nao sabemos (sem posicao da moto); true/false = dentro/fora de uma zona de devolucao.
final inReturnZoneProvider = FutureProvider.autoDispose.family<bool?, String>((ref, rentalId) async {
  final backend = ref.watch(backendProvider);
  final zones = await backend.zones();
  final rental = await backend.rental(rentalId);
  final v = await backend.vehicleByCode(rental.vehicleCode);
  return zones.where((z) => z.active && z.type == ZoneType.return_).any((z) => pointInZone(v.lat, v.lng, z));
});

/// Encerrar: so em ponto de devolucao, foto obrigatoria, aguarda a confirmacao de "travada".
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
    ref.invalidate(currentRentalProvider);
    if (mounted) context.go('/summary/${widget.rentalId}');
  }

  Future<void> _end() async {
    final l = context.l;
    final confirmed = await VoltiDialog.show<bool>(
      context,
      title: l.endRideTitle,
      message: Text(l.endRideText),
      actions: [
        VoltiButton(label: l.endRide, fullWidth: true, onPressed: () => Navigator.of(context).pop(true)),
        VoltiButton(label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
      ],
    );
    if (confirmed != true || !mounted) return;
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
    final zone = ref.watch(inReturnZoneProvider(widget.rentalId));
    if (_waitingLock && _lockTimedOut) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(LucideIcons.circleAlert, size: 40, color: VoltiColors.danger),
              const SizedBox(height: 16),
              Semantics(liveRegion: true, child: Text(l.lockNotConfirmed, style: VoltiTypography.heading, textAlign: TextAlign.center)),
              const SizedBox(height: 8),
              Text(l.lockNotConfirmedText, style: VoltiTypography.body, textAlign: TextAlign.center),
              const SizedBox(height: 20),
              VoltiButton(label: l.retry, icon: LucideIcons.refreshCw, fullWidth: true, onPressed: _startPolling),
              const SizedBox(height: 8),
              VoltiButton(
                  label: l.contactSupport,
                  variant: VoltiButtonVariant.secondary,
                  fullWidth: true,
                  onPressed: () => context.push('/account/support')),
            ]),
          ),
        ),
      );
    }
    if (_waitingLock) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 20),
              Semantics(liveRegion: true, child: Text(l.waitingLock, style: VoltiTypography.heading, textAlign: TextAlign.center)),
              const SizedBox(height: 8),
              Text(l.waitingLockText, style: VoltiTypography.body, textAlign: TextAlign.center),
            ]),
          ),
        ),
      );
    }
    return VoltiScaffold(
      title: l.returnTitle,
      bottom: VoltiButton(
        label: _busy ? l.sending : l.endRide,
        variant: VoltiButtonVariant.dark,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        onPressed: (_photo != null && !_busy) ? _end : null,
      ),
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          zone.when(
            data: (inZone) => inZone == false
                ? NoticeBanner(danger: true, icon: LucideIcons.mapPinOff, title: l.outsideReturnTitle, message: l.outsideReturnText)
                : NoticeBanner(
                    icon: LucideIcons.circleCheck,
                    title: inZone == true ? l.insideReturnTitle : l.checkReturnTitle,
                    message: inZone == true ? l.insideReturnText : l.checkReturnText),
            loading: () => const LinearProgressIndicator(),
            error: (e, _) => ErrorState(error: e, onRetry: () => ref.invalidate(inReturnZoneProvider(widget.rentalId))),
          ),
          const SizedBox(height: VoltiSpacing.s16),
          Text(l.returnPhotoText, style: VoltiTypography.body),
          const SizedBox(height: VoltiSpacing.s12),
          PhotoCapture(label: l.returnPhoto, hint: l.returnPhotoHint, done: _photo != null, onTap: _take),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: _error!),
            ),
        ],
      ),
    );
  }
}
