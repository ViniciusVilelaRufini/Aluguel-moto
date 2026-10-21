import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/services.dart';
import '../../core/widgets.dart';

const kSupportPhone = String.fromEnvironment('SUPPORT_PHONE', defaultValue: '+551100000000');

/// Permite desligar o mapa (tiles de rede) nos testes de widget.
final mapEnabledProvider = Provider<bool>((ref) => true);

/// Aluguel em andamento: tempo, custo, bateria e velocidade ao vivo (WebSocket),
/// avisos de zona, pausa, SOS, "Voce esta bem?", reportar problema e trocar de moto.
class RideScreen extends ConsumerStatefulWidget {
  const RideScreen({super.key});
  @override
  ConsumerState<RideScreen> createState() => _RideScreenState();
}

class _RideScreenState extends ConsumerState<RideScreen> {
  Rental? _rental;
  Object? _loadError;
  int _elapsed = 0;
  int _cost = 0;
  double _speed = 0;
  int _limit = 32;
  int _battery = 0;
  int? _range;
  LatLng? _vehiclePos;
  LatLng? _userPos;
  ZoneNotice? _zone;
  bool _fallOpen = false;
  bool _busy = false;

  RealtimeService? _realtime;
  StreamSubscription<RealtimeEvent>? _events;
  StreamSubscription<LatLng>? _tracking;
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tick?.cancel();
    _events?.cancel();
    _tracking?.cancel();
    _realtime?.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loadError = null);
    try {
      final backend = ref.read(backendProvider);
      final rental = await backend.currentRental();
      if (rental == null) {
        if (mounted) context.go('/home');
        return;
      }
      Vehicle? vehicle;
      try {
        vehicle = await backend.vehicleByCode(rental.vehicleCode);
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _rental = rental;
        _elapsed = rental.elapsedSeconds;
        _cost = rental.costCents;
        _limit = rental.speedLimitKmh ?? vehicle?.speedLimitKmh ?? 32;
        if (vehicle != null) {
          _battery = vehicle.batteryPct;
          _range = vehicle.estimatedRangeKm.round();
          _vehiclePos = LatLng(vehicle.lat, vehicle.lng);
        }
      });
      _startRealtime();
      _startTracking();
      _tick?.cancel();
      _tick = Timer.periodic(const Duration(seconds: 1), (_) {
        if (_rental?.status == RentalStatus.active && mounted) setState(() => _elapsed++);
      });
    } catch (e) {
      if (mounted) setState(() => _loadError = e);
    }
  }

  Future<void> _startRealtime() async {
    try {
      _realtime?.dispose();
      _realtime = ref.read(realtimeFactoryProvider)();
      _events = _realtime!.events.listen(_onEvent);
      await _realtime!.connect();
    } catch (_) {
      // sem tempo real o app segue com o tempo local e polling na reabertura
    }
  }

  /// Localizacao em segundo plano so enquanto o aluguel esta ativo (e com consentimento, ja exigido no inicio).
  Future<void> _startTracking() async {
    final l = context.l;
    final svc = ref.read(locationServiceProvider);
    if (!await svc.ensurePermission() || !mounted) return;
    _tracking?.cancel();
    _tracking = svc
        .trackDuringRental(notificationTitle: l.trackingNotificationTitle, notificationText: l.trackingNotificationText)
        .listen((p) {
      if (mounted) setState(() => _userPos = p);
    }, onError: (_) {});
  }

  void _onEvent(RealtimeEvent e) {
    if (!mounted) return;
    switch (e) {
      case RentalUpdated():
        setState(() {
          _elapsed = e.elapsedSeconds;
          _cost = e.costCents;
          _rental = _rental?.rebuild((b) => b..status = RentalStatus.values.firstWhere((s) => s.name == _camel(e.status), orElse: () => _rental!.status));
        });
        if (e.status == 'ended' || e.status == 'force_ended') {
          context.go('/summary/${e.rentalId}');
        }
      case VehiclePositionEvent():
        setState(() {
          _speed = e.speedKmh;
          _battery = e.batteryPct;
          _limit = e.speedLimitKmh;
          _vehiclePos = LatLng(e.lat, e.lng);
        });
      case ZoneNotice():
        setState(() {
          _zone = e.transition == 'ENTER' ? e : null;
          if (e.speedLimitKmh != null && e.transition == 'ENTER') _limit = e.speedLimitKmh!;
        });
      case DeviceEventReceived():
        if (e.type == 'queda') _showWellbeing();
    }
  }

  String _camel(String s) => s.replaceAllMapped(RegExp(r'_([a-z])'), (m) => m[1]!.toUpperCase());

  Future<void> _showWellbeing() async {
    if (_fallOpen || _rental == null) return;
    _fallOpen = true;
    final l = context.l;
    final id = _rental!.id;
    final ok = await VoltiDialog.show<bool>(
      context,
      barrierDismissible: false,
      title: l.wellbeingTitle,
      icon: const _RoundIcon(icon: LucideIcons.activity, bg: VoltiColors.coral50, fg: VoltiColors.coral600),
      message: Text(l.wellbeingText),
      actions: [
        VoltiButton(label: l.imFine, fullWidth: true, onPressed: () => Navigator.of(context).pop(true)),
        VoltiButton(
            label: l.needHelp, variant: VoltiButtonVariant.danger, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
      ],
    );
    _fallOpen = false;
    try {
      await ref.read(backendProvider).wellbeing(id, ok: ok ?? true);
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
    if (ok == false && mounted) _showSos();
  }

  Future<void> _showSos() async {
    final l = context.l;
    await VoltiDialog.show<void>(
      context,
      title: l.sosTitle,
      icon: const _RoundIcon(icon: LucideIcons.phoneCall, bg: VoltiColors.danger, fg: Colors.white),
      message: Text(l.sosText),
      actions: [
        VoltiButton(
          label: l.callSupport,
          icon: LucideIcons.phoneCall,
          variant: VoltiButtonVariant.danger,
          fullWidth: true,
          onPressed: () async {
            Navigator.of(context).pop();
            await launchUrl(Uri(scheme: 'tel', path: kSupportPhone));
          },
        ),
        VoltiButton(
          label: l.shareWithContact,
          icon: LucideIcons.share2,
          variant: VoltiButtonVariant.secondary,
          fullWidth: true,
          onPressed: () async {
            Navigator.of(context).pop();
            await _shareLocation();
          },
        ),
        VoltiButton(label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop()),
      ],
    );
  }

  Future<void> _shareLocation() async {
    final l = context.l;
    try {
      final share = await ref.read(backendProvider).shareLocation(_rental!.id);
      await SharePlus.instance.share(ShareParams(text: l.shareLocationMessage(share.url)));
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
  }

  Future<void> _togglePause() async {
    final l = context.l;
    setState(() => _busy = true);
    try {
      final backend = ref.read(backendProvider);
      final r = _rental!;
      final updated = r.status == RentalStatus.paused ? await backend.resume(r.id) : await backend.pause(r.id);
      if (mounted) setState(() => _rental = updated);
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _report() async {
    final l = context.l;
    final problems = {
      l.problemTire: 'tire',
      l.problemBrake: 'brake',
      l.problemBattery: 'battery',
      l.problemLights: 'lights',
      l.problemOther: 'other',
    };
    final picked = await VoltiBottomSheet.show<String>(
      context,
      builder: (ctx) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l.reportTitle, style: VoltiTypography.title),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final e in problems.entries) ActionChip(label: Text(e.key), onPressed: () => Navigator.of(ctx).pop(e.key)),
        ]),
      ]),
    );
    if (picked == null || !mounted) return;
    try {
      final r = _rental!;
      await ref.read(backendProvider).reportIncident(IncidentCategory.vehicleProblem, picked, rentalId: r.id, vehicleId: r.vehicleId);
      if (!mounted) return;
      final swap = await VoltiDialog.show<bool>(
        context,
        title: l.reportSentTitle,
        message: Text(l.reportSentText),
        actions: [
          VoltiButton(label: l.swapVehicle, fullWidth: true, onPressed: () => Navigator.of(context).pop(true)),
          VoltiButton(label: l.notNow, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
        ],
      );
      if (swap == true && mounted) context.push('/scan?swap=${_rental!.id}');
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    if (_loadError != null) {
      return VoltiScaffold(title: l.rideTitle, body: ErrorState(error: _loadError!, onRetry: _load));
    }
    final r = _rental;
    if (r == null) return Scaffold(body: const LoadingState());
    final paused = r.status == RentalStatus.paused;
    final center = _vehiclePos ?? _userPos ?? const LatLng(-23.5614, -46.6559);
    final mapOn = ref.watch(mapEnabledProvider);

    return Scaffold(
      body: Stack(children: [
        Positioned.fill(
          child: mapOn
              ? VoltiMap(
                  key: ValueKey(center.latitude.toStringAsFixed(4) + center.longitude.toStringAsFixed(4)),
                  center: center,
                  layers: [
                    MarkerLayer(markers: [
                      if (_userPos != null)
                        Marker(
                            point: _userPos!,
                            width: 20,
                            height: 20,
                            child: const DecoratedBox(decoration: BoxDecoration(color: VoltiColors.brand, shape: BoxShape.circle))),
                      if (_vehiclePos != null)
                        Marker(
                            point: _vehiclePos!,
                            width: 56,
                            height: 64,
                            child: VehicleMarker(VehicleStatus.rented, _battery, selected: true)),
                    ]),
                  ],
                )
              : Container(color: VoltiColors.sky100),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            child: Column(children: [
              Row(children: [
                Expanded(
                  child: Semantics(
                    label: l.speedSemantics(_speed.round(), _limit),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(color: VoltiColors.glassBg, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
                      child: Row(children: [
                        Text('${_speed.round()}',
                            style: const TextStyle(
                                fontFamily: VoltiTypography.fontSans,
                                fontSize: 34,
                                fontWeight: FontWeight.w800,
                                color: VoltiColors.ink900)),
                        const SizedBox(width: 10),
                        Text(l.speedUnit(_limit), style: VoltiTypography.caption.copyWith(color: VoltiColors.ink600)),
                        const Spacer(),
                        BatteryPill(_battery, rangeKm: _range),
                      ]),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Semantics(
                  button: true,
                  label: 'SOS',
                  child: GestureDetector(
                    onTap: _showSos,
                    child: Container(
                      width: 64,
                      height: 64,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: VoltiColors.danger, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadowCoral),
                      child: const Text('SOS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
                    ),
                  ),
                ),
              ]),
              if (_zone != null)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: NoticeBanner(
                    title: _zone!.speedLimitKmh != null ? l.zoneLimit(_zone!.speedLimitKmh!) : l.zoneNotice,
                    message: _zone!.message,
                    danger: _zone!.zoneType == 'forbidden' || _zone!.zoneType == 'operation',
                  ),
                ),
            ]),
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
            child: SafeArea(
              top: false,
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 16, VoltiSpacing.screenGutter, 16),
                child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Row(children: [
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(paused ? l.ridePaused : l.rideLive, style: VoltiTypography.caption),
                        Text(clock(_elapsed), style: VoltiTypography.timer),
                      ]),
                    ),
                    Chip(label: Text(paused ? l.pausedBadge : l.liveBadge)),
                  ]),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: VoltiRadii.rMd),
                    child: Row(children: [
                      _Stat(l.accumulatedCost, money(_cost)),
                      _Stat(l.battery, '$_battery%'),
                      _Stat(l.coverage, r.coverage == InsuranceCoverage.full ? l.coverageFull : l.coverageBasic),
                    ]),
                  ),
                  const SizedBox(height: 12),
                  Wrap(spacing: 8, children: [
                    ActionChip(avatar: const Icon(LucideIcons.circleAlert, size: 16), label: Text(l.reportProblem), onPressed: _report),
                    ActionChip(avatar: const Icon(LucideIcons.share2, size: 16), label: Text(l.shareTrip), onPressed: _shareLocation),
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(
                      child: VoltiButton(
                        label: paused ? l.resume : l.pause,
                        icon: paused ? LucideIcons.circlePlay : LucideIcons.pause,
                        variant: VoltiButtonVariant.secondary,
                        size: VoltiButtonSize.lg,
                        fullWidth: true,
                        onPressed: _busy ? null : _togglePause,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: VoltiButton(
                        label: l.returnVehicle,
                        variant: VoltiButtonVariant.dark,
                        size: VoltiButtonSize.lg,
                        fullWidth: true,
                        onPressed: () => context.push('/return/${r.id}'),
                      ),
                    ),
                  ]),
                ]),
              ),
            ),
          ),
        ),
      ]),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value);
  final String label, value;
  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: VoltiTypography.caption),
          Text(value, style: VoltiTypography.heading),
        ]),
      );
}

class _RoundIcon extends StatelessWidget {
  const _RoundIcon({required this.icon, required this.bg, required this.fg});
  final IconData icon;
  final Color bg, fg;
  @override
  Widget build(BuildContext context) => Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
        child: Icon(icon, color: fg, size: 26),
      );
}
