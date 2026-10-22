import 'dart:async';

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
import '../../l10n/app_localizations.dart';
import 'ride_data.dart';

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

  /// Ultimo aviso mostrado: mantem o texto enquanto a faixa sai animando.
  ZoneNotice? _lastZone;
  bool _fallOpen = false;
  bool _busy = false;
  bool _markerDropped = false;

  /// Rota percorrida (trajeto salvo + posicoes ao vivo). Nunca vira "km rodados".
  /// Lista mutavel, limitada a [kTrailMaxPoints] (dizimada no lugar).
  final List<LatLng> _trail = [];

  /// Move a camera atras da moto sem recriar o mapa (tiles e camadas ficam).
  final MapController _map = MapController();

  RealtimeService? _realtime;
  StreamSubscription<RealtimeEvent>? _events;
  StreamSubscription<bool>? _connSub;
  Timer? _rtRetry;
  bool _rtDown = false;
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
    _connSub?.cancel();
    _rtRetry?.cancel();
    _tracking?.cancel();
    _realtime?.dispose();
    _map.dispose();
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
      _loadTrail(rental.id);
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

  Future<void> _loadTrail(String rentalId) async {
    try {
      final saved = await ref.read(rentalTrackProvider(rentalId).future);
      if (!mounted || saved.isEmpty) return;
      // Uma passada so, ja dizimada, antes do setState.
      final merged = mergeTrail(saved, _trail);
      setState(() => _trail
        ..clear()
        ..addAll(merged));
    } catch (_) {
      // Sem trajeto salvo: a rota comeca dos eventos ao vivo.
    }
  }

  Future<void> _startRealtime() async {
    _rtRetry?.cancel();
    try {
      _events?.cancel();
      _connSub?.cancel();
      _realtime?.dispose();
      _realtime = ref.read(realtimeFactoryProvider)();
      _events = _realtime!.events.listen(_onEvent);
      _connSub = _realtime!.connected.listen((up) {
        if (mounted) setState(() => _rtDown = !up);
      });
      await _realtime!.connect();
    } catch (_) {
      // Sem tempo real o app segue com o tempo local; avisa e tenta de novo.
      if (!mounted) return;
      setState(() => _rtDown = true);
      _rtRetry = Timer(const Duration(seconds: 5), _startRealtime);
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
          appendTrail(_trail, _vehiclePos!);
        });
        _follow(_vehiclePos!);
      case ZoneNotice():
        // Haptica so quando a zona muda (eventos ENTER repetidos nao vibram de novo).
        final z = _zone;
        if (e.transition == 'ENTER' &&
            (z == null || z.zoneType != e.zoneType || z.speedLimitKmh != e.speedLimitKmh || z.message != e.message)) {
          VoltiHaptics.warning();
        }
        setState(() {
          _zone = e.transition == 'ENTER' ? e : null;
          if (_zone != null) _lastZone = _zone;
          if (e.speedLimitKmh != null && e.transition == 'ENTER') _limit = e.speedLimitKmh!;
        });
      case DeviceEventReceived():
        if (e.type == 'queda') _showWellbeing();
    }
  }

  /// Centraliza na moto. Antes do mapa existir (ou com o mapa desligado) nao faz nada.
  void _follow(LatLng p) {
    if (!ref.read(mapEnabledProvider)) return;
    try {
      _map.move(p, _map.camera.zoom);
    } catch (_) {}
  }

  bool _isDangerZone(ZoneNotice? z) => z != null && (z.zoneType == 'forbidden' || z.zoneType == 'operation');

  String _camel(String s) => s.replaceAllMapped(RegExp(r'_([a-z])'), (m) => m[1]!.toUpperCase());

  static final _zoneTypes = {
    'reduced_speed': ZoneType.reducedSpeed,
    'forbidden': ZoneType.forbidden,
    'operation': ZoneType.operation,
    'return': ZoneType.return_,
  };

  /// Nome da zona onde a moto esta (ex. "Ciclovia Faria Lima") ou o tipo dela.
  String _zoneName(AppLocalizations l, ZoneNotice z) {
    final zones = ref.read(sharedZonesProvider).value ?? const <GeoZone>[];
    final type = _zoneTypes[z.zoneType];
    final p = _vehiclePos;
    if (type != null && p != null) {
      final hit = zoneContaining(p.latitude, p.longitude, zones.where((g) => g.active && g.type == type));
      if (hit != null) return hit.name;
    }
    return switch (z.zoneType) {
      'reduced_speed' => l.zoneReducedSpeed,
      'forbidden' => l.zoneForbidden,
      'operation' => l.zoneOperationEdge,
      _ => l.zoneNotice,
    };
  }

  String _zoneTitle(AppLocalizations l, ZoneNotice z) {
    final name = _zoneName(l, z);
    return z.speedLimitKmh != null ? l.zoneTitle(name, z.speedLimitKmh!) : name;
  }

  /// "R$ 0,79/min" (ou /h, /dia) do plano; pausada, a tarifa da pausa.
  String? _fare(AppLocalizations l, PricingPlan? plan, {required bool paused}) {
    if (plan == null) return null;
    if (paused) return l.farePerMinute(money(plan.pausePerMinuteCents));
    final price = money(plan.unitPriceCents);
    return switch (plan.unit) {
      PlanUnit.minute => l.farePerMinute(price),
      PlanUnit.hour => l.farePerHour(price),
      PlanUnit.day => l.farePerDay(price),
      _ => price,
    };
  }

  Future<void> _showWellbeing() async {
    if (_fallOpen || _rental == null) return;
    _fallOpen = true;
    VoltiHaptics.alert();
    final l = context.l;
    final id = _rental!.id;
    final ok = await VoltiDialog.show<bool>(
      context,
      barrierDismissible: false,
      title: l.wellbeingTitle,
      icon: const _RoundIcon(icon: LucideIcons.activity, bg: VoltiColors.coral50, fg: VoltiColors.coral600),
      // Prazo do contrato (60 s), contando na tela. Sem resposta, o servidor aciona o suporte.
      message: const _FallCountdown(seconds: 60),
      actions: [
        VoltiButton(label: l.imFine, fullWidth: true, onPressed: () => Navigator.of(context).pop(true)),
        VoltiButton(
            label: l.needHelp, variant: VoltiButtonVariant.danger, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
      ],
    );
    _fallOpen = false;
    if (ok == null) {
      if (mounted) VoltiToast.show(context, l.wellbeingTimedOut, tone: VoltiToastTone.danger);
      return;
    }
    try {
      await ref.read(backendProvider).wellbeing(id, ok: ok);
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
    if (ok == false && mounted) _showSos();
  }

  Future<void> _showSos() async {
    final l = context.l;
    VoltiHaptics.alert();
    // Contato de emergencia salvo na Conta: o link vai direto para ele (SMS).
    // Normalmente ja esta carregado; se nao, espera ate 3 s e segue sem ele.
    EmergencyContact? contact;
    try {
      contact = await ref.read(emergencyContactProvider.future).timeout(const Duration(seconds: 3));
    } catch (_) {}
    if (!mounted) return;
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
            await ref.read(urlLauncherProvider)(Uri(scheme: 'tel', path: kSupportPhone));
          },
        ),
        VoltiButton(
          key: const Key('sos-share-contact'),
          label: contact != null ? l.shareWithNamedContact(contact.name) : l.shareWithContact,
          icon: LucideIcons.share2,
          variant: VoltiButtonVariant.secondary,
          fullWidth: true,
          onPressed: () async {
            Navigator.of(context).pop();
            await _shareLocation(contact: contact);
          },
        ),
        if (contact == null)
          Semantics(
            hint: l.noEmergencyContactHint,
            child: VoltiButton(
              key: const Key('sos-add-contact'),
              label: l.addEmergencyContact,
              icon: LucideIcons.userPlus,
              variant: VoltiButtonVariant.ghost,
              fullWidth: true,
              onPressed: () async {
                Navigator.of(context).pop();
                await context.push('/account');
                ref.invalidate(emergencyContactProvider);
              },
            ),
          ),
        VoltiButton(label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop()),
      ],
    );
  }

  /// Gera o link temporario (`/rentals/{id}/location-share`). Com [contact], manda
  /// por SMS direto ao numero dele; sem contato (ou sem app de SMS), abre a folha
  /// de compartilhar do sistema.
  Future<void> _shareLocation({EmergencyContact? contact}) async {
    final l = context.l;
    try {
      final share = await ref.read(backendProvider).shareLocation(_rental!.id);
      final text = l.shareLocationMessageTimed(share.url);
      if (contact != null && await ref.read(urlLauncherProvider)(smsUri(contact.phone, text))) return;
      await ref.read(shareTextProvider)(text);
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
      VoltiHaptics.tap();
      if (mounted) setState(() => _rental = updated);
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Um dialogo so: escolhe o problema (chips) e decide trocar de moto sem nova
  /// taxa ou so reportar.
  Future<void> _report() async {
    final l = context.l;
    final problems = [l.problemTire, l.problemBrake, l.problemBattery, l.problemLights, l.problemOther];
    String? picked;
    final swap = await showDialog<bool>(
      context: context,
      barrierColor: VoltiColors.surfaceScrim,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => VoltiDialog(
          title: l.reportTitle,
          message: Wrap(alignment: WrapAlignment.center, spacing: 8, runSpacing: 4, children: [
            for (final p in problems)
              VoltiChip(
                label: p,
                selected: picked == p,
                onTap: () {
                  VoltiHaptics.selection();
                  setLocal(() => picked = p);
                },
              ),
          ]),
          actions: [
            VoltiButton(
              label: l.swapNoFee,
              icon: LucideIcons.repeat,
              fullWidth: true,
              onPressed: picked == null ? null : () => Navigator.of(ctx).pop(true),
            ),
            VoltiButton(
              label: l.reportOnly,
              variant: VoltiButtonVariant.secondary,
              fullWidth: true,
              onPressed: picked == null ? null : () => Navigator.of(ctx).pop(false),
            ),
            VoltiButton(label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(ctx).pop()),
          ],
        ),
      ),
    );
    final problem = picked;
    if (swap == null || problem == null || !mounted) return;
    try {
      final r = _rental!;
      await ref.read(backendProvider).reportIncident(IncidentCategory.vehicleProblem, problem, rentalId: r.id, vehicleId: r.vehicleId);
      if (!mounted) return;
      if (swap) {
        context.push('/scan?swap=${r.id}');
      } else {
        VoltiToast.show(context, l.reportSentTitle);
      }
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
    final plan = ref.watch(rentalPlanProvider(r.planCode)).value;
    // Carrega o contato de emergencia antes do SOS (o dialogo le o valor pronto).
    ref.watch(emergencyContactProvider);
    // Zonas compartilhadas com a devolucao (nome da zona no aviso).
    ref.watch(sharedZonesProvider);
    final fare = _fare(l, plan, paused: paused);
    final coverageLabel = r.coverage == InsuranceCoverage.full ? l.coverageFullLong : l.coverageBasicLong;
    final caption = [paused ? l.ridePaused : l.rideLive, if (plan != null) plan.name, coverageLabel].join(' · ');
    final center = _vehiclePos ?? _userPos ?? const LatLng(-23.5614, -46.6559);
    final mapOn = ref.watch(mapEnabledProvider);
    // O pin so cai na primeira vez.
    final firstMarkerDrop = !_markerDropped;
    WidgetsBinding.instance.addPostFrameCallback((_) => _markerDropped = true);

    return Scaffold(
      body: Stack(children: [
        Positioned.fill(
          child: mapOn
              ? VoltiMap(
                  // Sem chave por posicao: o mapa nao e recriado a cada evento; a
                  // camera segue a moto pelo controller e so as camadas mudam.
                  controller: _map,
                  center: center,
                  layers: [
                    if (_trail.length >= 2)
                      DrawnPolyline(
                        key: const Key('ride-route'),
                        points: _trail,
                        color: VoltiColors.brand,
                      ),
                    MarkerLayer(key: const Key('ride-markers'), markers: [
                      if (_userPos != null)
                        Marker(point: _userPos!, width: 34, height: 34, child: const VoltiUserDot(heading: true)),
                      if (_vehiclePos != null)
                        Marker(
                            point: _vehiclePos!,
                            width: 56,
                            height: 64,
                            child: VehicleMarker(VehicleStatus.rented, _battery, selected: true, animateIn: firstMarkerDrop)),
                    ]),
                  ],
                )
              : Container(color: VoltiColors.sky100),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            child: Column(children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(12, 10, 14, 10),
                    decoration: BoxDecoration(color: VoltiColors.glassBg, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
                    child: Row(children: [
                      VoltiSpeedGauge(
                        key: const Key('ride-gauge'),
                        speedKmh: _speed,
                        limitKmh: _limit,
                        size: 60,
                        semanticsLabel: l.speedSemantics(_speed.round(), _limit),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                          Text(l.speedUnit(_limit), style: VoltiTypography.caption.copyWith(color: VoltiColors.ink600)),
                          const SizedBox(height: 6),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: BatteryPill(_battery, rangeKm: _range),
                          ),
                        ]),
                      ),
                    ]),
                  ),
                ),
                const SizedBox(width: 10),
                Semantics(
                  hint: l.sosHint,
                  child: VoltiPressable(
                    key: const Key('sos-button'),
                    semanticLabel: 'SOS',
                    scale: VoltiMotion.iconPressScale,
                    onTap: _showSos,
                    child: Container(
                      width: 64,
                      height: 64,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: VoltiColors.danger, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadowCoral),
                      child: MediaQuery.withClampedTextScaling(
                        maxScaleFactor: 1.4,
                        child: const Text('SOS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
                      ),
                    ),
                  ),
                ),
              ]),
              VoltiStatusBanner(
                key: const Key('rt-offline'),
                visible: _rtDown,
                tone: VoltiStatusTone.offline,
                icon: LucideIcons.wifiOff,
                title: l.realtimeOffline,
                message: l.realtimeOfflineText,
              ),
              VoltiStatusBanner(
                key: const Key('zone-banner'),
                visible: _zone != null,
                icon: LucideIcons.gauge,
                tone: _isDangerZone(_lastZone) ? VoltiStatusTone.danger : VoltiStatusTone.warning,
                title: _lastZone != null ? _zoneTitle(l, _lastZone!) : l.zoneNotice,
                message: _lastZone?.message ?? '',
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
            constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .62),
            child: SafeArea(
              top: false,
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 16, VoltiSpacing.screenGutter, 16),
                child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Row(children: [
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(caption, style: VoltiTypography.caption),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: VoltiTicker(clock(_elapsed), key: const Key('ride-clock'), style: VoltiTypography.timer),
                        ),
                      ]),
                    ),
                    _StateBadge(
                      paused: paused,
                      label: paused ? (fare ?? l.pausedBadge) : l.liveBadge,
                      semanticsLabel: paused && fare != null ? l.pausedFareSemantics(fare) : null,
                    ),
                  ]),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: VoltiRadii.rMd),
                    child: Row(children: [
                      _Stat(l.fareLabel, fare ?? '—', key: const Key('ride-fare')),
                      _Stat(l.accumulatedCost, money(_cost), ticker: true),
                      _Stat(l.battery, '$_battery%', ticker: true),
                    ]),
                  ),
                  const SizedBox(height: 12),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    VoltiChip(icon: LucideIcons.circleAlert, label: l.reportProblem, onTap: _report),
                    VoltiChip(icon: LucideIcons.share2, label: l.shareTrip, onTap: _shareLocation),
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(
                      flex: 10,
                      child: VoltiButton(
                        label: paused ? l.unpauseRide : l.pause,
                        icon: paused ? LucideIcons.circlePlay : LucideIcons.pause,
                        variant: VoltiButtonVariant.secondary,
                        size: VoltiButtonSize.lg,
                        fullWidth: true,
                        onPressed: _busy ? null : _togglePause,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      flex: 13,
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
  const _Stat(this.label, this.value, {super.key, this.ticker = false});
  final String label, value;

  /// Valor que muda ao vivo: rola os digitos (`VoltiTicker`).
  final bool ticker;
  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: VoltiTypography.caption),
          if (ticker)
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: VoltiTicker(value, style: VoltiTypography.heading),
            )
          else
            Text(value, style: VoltiTypography.heading),
        ]),
      );
}

/// Selo "Ao vivo" (ponto piscando) ou "Pausada", troca com cross-fade.
class _StateBadge extends StatelessWidget {
  const _StateBadge({required this.paused, required this.label, this.semanticsLabel});
  final bool paused;
  final String label;
  final String? semanticsLabel;

  @override
  Widget build(BuildContext context) {
    final bg = paused ? VoltiColors.sun300.withValues(alpha: .35) : VoltiColors.brandSoft;
    final fg = paused ? VoltiColors.ink900 : VoltiColors.successInk;
    return AnimatedSwitcher(
      duration: VoltiMotion.scaled(context, VoltiMotion.durBase),
      child: Container(
        key: ValueKey(paused),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(color: bg, borderRadius: VoltiRadii.rPill),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (paused) Icon(LucideIcons.pause, size: 14, color: fg) else const _LiveDot(),
          const SizedBox(width: 6),
          Text(label, style: VoltiTypography.label.copyWith(color: fg), semanticsLabel: semanticsLabel),
        ]),
      ),
    );
  }
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

/// Ponto "ao vivo" que pisca (`vt-live`, 1,4 s). Reduced motion: fixo.
class _LiveDot extends StatefulWidget {
  const _LiveDot();
  @override
  State<_LiveDot> createState() => _LiveDotState();
}

class _LiveDotState extends State<_LiveDot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (VoltiMotion.reduced(context)) {
      _c.stop();
      _c.value = 0;
    } else if (!_c.isAnimating) {
      _c.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(
        key: const Key('live-dot'),
        opacity: Tween(begin: 1.0, end: .25).chain(CurveTween(curve: VoltiMotion.easeInOut)).animate(_c),
        child: Container(
          width: 8,
          height: 8,
          decoration: const BoxDecoration(color: VoltiColors.success, shape: BoxShape.circle),
        ),
      );
}

/// Texto do "Voce esta bem?" com o prazo contando em negrito. Ao zerar, fecha o
/// dialogo sem resposta (o servidor ja aciona o suporte pelo prazo do contrato).
class _FallCountdown extends StatefulWidget {
  const _FallCountdown({required this.seconds});
  final int seconds;
  @override
  State<_FallCountdown> createState() => _FallCountdownState();
}

class _FallCountdownState extends State<_FallCountdown> {
  late int _left = widget.seconds;
  Timer? _t;

  @override
  void initState() {
    super.initState();
    _t = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_left <= 1) {
        _t?.cancel();
        Navigator.of(context).pop();
        return;
      }
      setState(() => _left--);
    });
  }

  @override
  void dispose() {
    _t?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final strong = TextStyle(fontWeight: FontWeight.w700, color: Theme.of(context).colorScheme.onSurface);
    // liveRegion: leitores de tela anunciam o prazo enquanto ele corre.
    return Semantics(
      liveRegion: true,
      child: Text.rich(
      key: const Key('fall-countdown'),
      TextSpan(children: [
        TextSpan(text: l.wellbeingLead),
        TextSpan(text: l.secondsShort(_left), style: strong),
        TextSpan(text: l.wellbeingTail),
      ]),
      textAlign: TextAlign.center,
    ),
    );
  }
}
