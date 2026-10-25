import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/clock.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/launcher.dart';
import '../../core/release_env.dart';
import '../../core/services.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';
import '../../l10n/app_localizations.dart';
import '../handover/handover_watch.dart';
import '../home/depot_providers.dart' show swapStationsProvider;
import '../station_swap/swap_logic.dart';
import '../station_swap/swap_widgets.dart';
import 'battery_sheet.dart';
import 'ride_data.dart';

/// Permite desligar o mapa (tiles de rede) nos testes de widget.
final mapEnabledProvider = Provider<bool>((ref) => true);

/// Aluguel em andamento: tempo, custo, bateria e velocidade ao vivo (WebSocket),
/// avisos de zona, pausa, SOS, "Voce esta bem?", reportar problema e **Trocar
/// bateria** (galpao e estacoes). Chegada no galpao (`handover.updated` de uma
/// entrega `return_depot` deste aluguel) abre o recibo.
class RideScreen extends ConsumerStatefulWidget {
  const RideScreen({super.key});
  @override
  ConsumerState<RideScreen> createState() => _RideScreenState();
}

class _RideScreenState extends ConsumerState<RideScreen> with WidgetsBindingObserver {
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

  /// Troca de bateria na estacao em andamento (`currentStationSwap`): a corrida
  /// oferece "Continuar" para reabrir a tela da troca.
  StationSwap? _openSwap;

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

  /// Socket da corrida emprestado a tela da troca aberta por cima.
  late final RideRealtimeLink _link;

  /// Um toque so em "Trocar bateria"/"Continuar" (sem empilhar duas telas).
  bool _navigating = false;

  @override
  void initState() {
    super.initState();
    _link = ref.read(rideRealtimeLinkProvider)..openCount += 1;
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  /// Volta do segundo plano (ex.: discador do SOS): o timer nao correu, entao
  /// relê o aluguel e recalcula o tempo pelo `startedAt` do servidor.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _rental != null) _resync();
  }

  Future<void> _resync() async {
    try {
      final rental = (await ref.read(backendProvider).currentRentalState()).rental;
      if (!mounted || rental == null) return;
      setState(() {
        _rental = rental;
        _cost = rental.costCents;
        _syncElapsed();
      });
    } catch (_) {
      if (mounted) setState(_syncElapsed);
    }
  }

  /// Tempo de corrida = agora (relogio corrigido pelo servidor) - `startedAt` -
  /// segundos em pausa. Nao depende de o timer ter rodado. Em pausa, o servidor manda.
  void _syncElapsed() {
    final r = _rental;
    if (r == null) return;
    if (r.status != RentalStatus.active) {
      _elapsed = r.elapsedSeconds;
      return;
    }
    final now = ref.read(clockProvider)();
    _elapsed = math.max(0, now.difference(r.startedAt.toUtc()).inSeconds - r.pausedSeconds);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _link.openCount -= 1;
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
      final state = await backend.currentRentalState();
      final rental = state.rental;
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
        _openSwap = isOpenSwap(state.stationSwap) ? state.stationSwap : null;
        _syncElapsed();
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
        if (_rental?.status == RentalStatus.active && mounted) setState(_syncElapsed);
      });
    } catch (e) {
      if (mounted) setState(() => _loadError = e);
    }
  }

  /// Bateria e autonomia da moto (depois de uma troca na estacao).
  Future<void> _reloadVehicle() async {
    final r = _rental;
    if (r == null) return;
    try {
      final v = await ref.read(backendProvider).vehicleByCode(r.vehicleCode);
      if (!mounted) return;
      setState(() {
        _battery = v.batteryPct;
        _range = v.estimatedRangeKm.round();
      });
    } catch (_) {}
  }

  /// Relê a troca em andamento (ao voltar da tela da troca).
  Future<void> _refreshSwap() async {
    try {
      final state = await ref.read(backendProvider).currentRentalState();
      if (!mounted) return;
      setState(() => _openSwap = isOpenSwap(state.stationSwap) ? state.stationSwap : null);
    } catch (_) {}
    _reloadVehicle();
  }

  Future<void> _openSwapFlow({String? stationId}) async {
    if (_navigating) return;
    _navigating = true;
    try {
      final swap = _openSwap;
      if (swap != null) {
        await openSwapProgress(context, swap);
      } else {
        await openSwapScan(context, stationId: stationId);
      }
    } finally {
      _navigating = false;
    }
    if (mounted) _refreshSwap();
  }

  void _onStationSwap(StationSwapUpdated e) {
    final status = swapStatusFromWire(e.status);
    final current = _openSwap;
    setState(() {
      if (isTerminalSwap(status)) {
        _openSwap = null;
      } else if (current != null && current.id == e.swapId) {
        _openSwap = applySwapEvent(current, swapId: e.swapId, status: status);
      }
    });
    // Troca nova (aberta em outro aparelho/tela) ou concluida: relê.
    if (current == null && !isTerminalSwap(status)) _refreshSwap();
    if (status == StationSwapStatus.completed) _reloadVehicle();
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
        _link.connected.value = up;
        if (mounted) setState(() => _rtDown = !up);
      });
      await _realtime!.connect();
    } catch (_) {
      // Sem tempo real o app segue com o tempo local; avisa e tenta de novo.
      _link.connected.value = false;
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

  /// Devolucao aberta por cima? Entao e ela que reage ao fim do aluguel (os
  /// eventos chegam a ela por [rideEventBusProvider]). Dialogo ou folha aberta
  /// na corrida nao conta: a corrida fecha e abre o recibo.
  bool get _returnOpen => ref.read(returnScreensOpenProvider).any;

  /// Fim do aluguel: fecha dialogos e folhas abertos sobre a corrida e abre o recibo.
  void _goToSummary(String rentalId) {
    if (!mounted || _returnOpen) return;
    final route = ModalRoute.of(context);
    if (route != null && !route.isCurrent) Navigator.of(context).popUntil((r) => r == route);
    context.go('/summary/$rentalId');
  }

  void _onEvent(RealtimeEvent e) {
    ref.read(rideEventBusProvider).add(e);
    if (!mounted) return;
    switch (e) {
      case RentalUpdated():
        setState(() {
          _cost = e.costCents;
          final status = RentalStatus.values.firstWhere((s) => s.name == _camel(e.status), orElse: () => _rental?.status ?? RentalStatus.active);
          final r = _rental;
          if (r != null) {
            // Mantem startedAt como base: os segundos em pausa saem da diferenca
            // entre o tempo decorrido e o que o servidor contou.
            final now = ref.read(clockProvider)();
            final paused = math.max(0, now.difference(r.startedAt.toUtc()).inSeconds - e.elapsedSeconds);
            _rental = r.rebuild((b) {
              b.status = status;
              if (status == RentalStatus.active) b.pausedSeconds = paused;
            });
          }
          _elapsed = e.elapsedSeconds;
        });
        if (e.status == 'ended' || e.status == 'force_ended') {
          _goToSummary(e.rentalId);
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
        // O nome da zona vem do cache compartilhado; se a busca falhou, tenta de
        // novo agora (enquanto isso, o aviso usa o tipo da zona).
        if (ref.read(sharedZonesProvider).hasError) ref.invalidate(sharedZonesProvider);
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
      case HandoverUpdated():
        _onHandoverUpdated(e.handoverId);
      case HandoverPending():
        break;
      case StationSwapUpdated():
        _onStationSwap(e);
    }
  }

  /// O operador registrou a chegada no galpao: o aluguel acabou, abre o recibo.
  Future<void> _onHandoverUpdated(String handoverId) async {
    final r = _rental;
    if (r == null || _returnOpen) return;
    if (await isDepotReturnOf(ref.read(backendProvider), handoverId, r.id)) _goToSummary(r.id);
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

  /// "R$ 0,79/min" (ou /h, /dia); pausada, a tarifa da pausa. O preco vem da
  /// linha de tempo do `breakdown` do aluguel (o preco congelado na largada,
  /// o mesmo da cobranca, inclusive o preco proprio do modelo da moto); sem ele,
  /// o do plano.
  String? _fare(AppLocalizations l, PricingPlan? plan, Rental rental, {required bool paused}) {
    if (plan == null) return null;
    if (paused) return l.farePerMinute(money(plan.pausePerMinuteCents));
    final timeLine = rental.breakdown?.lines.where((x) => x.code == 'time' && x.unitCents != null).firstOrNull;
    final price = money(timeLine?.unitCents ?? plan.unitPriceCents);
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
          key: const Key('sos-call-support'),
          label: l.callSupport,
          icon: LucideIcons.phoneCall,
          variant: VoltiButtonVariant.secondary,
          fullWidth: true,
          onPressed: () async {
            Navigator.of(context).pop();
            await ref.read(urlLauncherProvider)(Uri(scheme: 'tel', path: kSupportPhone));
          },
        ),
        VoltiButton(
          key: const Key('sos-call-samu'),
          label: l.callSamu,
          semanticLabel: l.callSamuSemantics,
          icon: LucideIcons.siren,
          variant: VoltiButtonVariant.danger,
          fullWidth: true,
          wrap: true,
          onPressed: () async {
            Navigator.of(context).pop();
            await ref.read(urlLauncherProvider)(Uri(scheme: 'tel', path: kSamuPhone));
          },
        ),
        VoltiButton(
          key: const Key('sos-call-police'),
          label: l.callPolice,
          semanticLabel: l.callPoliceSemantics,
          icon: LucideIcons.shield,
          variant: VoltiButtonVariant.danger,
          fullWidth: true,
          wrap: true,
          onPressed: () async {
            Navigator.of(context).pop();
            await ref.read(urlLauncherProvider)(Uri(scheme: 'tel', path: kPolicePhone));
          },
        ),
        VoltiButton(
          key: const Key('sos-share-contact'),
          label: contact != null ? l.shareWithNamedContact(contact.name) : l.shareWithContact,
          icon: LucideIcons.share2,
          variant: VoltiButtonVariant.secondary,
          fullWidth: true,
          wrap: true,
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
      if (mounted) {
        setState(() {
          _rental = updated;
          _syncElapsed();
        });
      }
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Um dialogo so: escolhe o problema (chips) e reporta. Sem troca de moto no
  /// meio da corrida (retirada em galpao, docs/decisoes.md 2026-10-22): o
  /// suporte orienta a volta ao galpao.
  Future<void> _report() async {
    final l = context.l;
    final problems = [l.problemTire, l.problemBrake, l.problemBattery, l.problemLights, l.problemOther];
    String? picked;
    final send = await showDialog<bool>(
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
              label: l.reportOnly,
              fullWidth: true,
              onPressed: picked == null ? null : () => Navigator.of(ctx).pop(true),
            ),
            VoltiButton(label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(ctx).pop()),
          ],
        ),
      ),
    );
    final problem = picked;
    if (send != true || problem == null || !mounted) return;
    try {
      final r = _rental!;
      await ref.read(backendProvider).reportIncident(IncidentCategory.vehicleProblem, problem, rentalId: r.id, vehicleId: r.vehicleId);
      if (mounted) VoltiToast.show(context, l.reportSentTitle);
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
    final fare = _fare(l, plan, r, paused: paused);
    final coverageLabel = r.coverage == InsuranceCoverage.full ? l.coverageFullLong : l.coverageBasicLong;
    // Fonte grande: o titulo fica so com o estado; plano e seguro viram chips.
    final big = MediaQuery.textScalerOf(context).scale(10) > 13;
    final stateLabel = paused ? l.ridePaused : l.rideLive;
    final caption = big ? stateLabel : [stateLabel, if (plan != null) plan.name, coverageLabel].join(' · ');
    final stateBadge = _StateBadge(
      paused: paused,
      label: paused ? (fare ?? l.pausedBadge) : l.liveBadge,
      semanticsLabel: paused && fare != null ? l.pausedFareSemantics(fare) : null,
    );
    final stats = <Widget>[
      _Stat(l.fareLabel, fare ?? '—', key: const Key('ride-fare'), stacked: big),
      _Stat(l.accumulatedCost, money(_cost), ticker: true, stacked: big),
      _Stat(l.battery, '$_battery%', ticker: true, stacked: big),
    ];
    final center = _vehiclePos ?? _userPos ?? const LatLng(-23.5614, -46.6559);
    final mapOn = ref.watch(mapEnabledProvider);
    // Aviso de estacao a ate 50 m: posicao do rastreio da corrida (ja ligado,
    // com consentimento), sem consulta extra de localizacao.
    final consent = ref.watch(sessionProvider.select((s) => s.value?.locationConsent ?? false));
    final nearStation = _openSwap == null && _userPos != null && consent
        ? swapPromptStation(rental: r, locationConsent: consent, phone: _userPos, stations: ref.watch(swapStationsProvider).value ?? const [])
        : null;
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
                            child: BatteryPill(_battery, rangeKm: _range, light: true),
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
              // Pausar/Devolver ficam fixos no rodape da folha; so o resto rola (200%).
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Flexible(
                  child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 16, VoltiSpacing.screenGutter, 0),
                child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  if (_openSwap != null) ...[
                    SwapResumeCard(onResume: _openSwapFlow),
                    const SizedBox(height: 12),
                  ] else if (nearStation != null) ...[
                    SwapNearbyCard(station: nearStation, onSwap: () => _openSwapFlow(stationId: nearStation.id)),
                    const SizedBox(height: 12),
                  ],
                  if (big) ...[
                    Text(caption, style: VoltiTypography.caption),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: VoltiTicker(clock(_elapsed), key: const Key('ride-clock'), style: VoltiTypography.timer),
                    ),
                    const SizedBox(height: 8),
                    Wrap(spacing: 8, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
                      stateBadge,
                      if (plan != null) VoltiChip(label: plan.name),
                      VoltiChip(label: coverageLabel),
                    ]),
                  ] else
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
                      stateBadge,
                    ]),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: VoltiRadii.rMd),
                    child: big
                        ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                            for (var i = 0; i < stats.length; i++) ...[
                              if (i > 0) const SizedBox(height: VoltiSpacing.s12),
                              stats[i],
                            ],
                          ])
                        : Row(children: stats),
                  ),
                  const SizedBox(height: 12),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    VoltiChip(icon: LucideIcons.batteryCharging, label: l.swapBattery, onTap: () async {
                      final scan = await BatterySwapSheet.show(context, r.id);
                      if (scan == true && mounted) _openSwapFlow();
                    }),
                    VoltiChip(icon: LucideIcons.circleAlert, label: l.reportProblem, onTap: _report),
                    VoltiChip(icon: LucideIcons.share2, label: l.shareTrip, onTap: _shareLocation),
                  ]),
                ]),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 12, VoltiSpacing.screenGutter, 16),
                  // Proporcao do design (1 : 1,3); se o rotulo nao cabe inteiro, ajusta ou empilha.
                  child: VoltiButtonPair(
                    first: VoltiButton(
                      label: paused ? l.unpauseRide : l.pause,
                      icon: paused ? LucideIcons.circlePlay : LucideIcons.pause,
                      variant: VoltiButtonVariant.secondary,
                      size: VoltiButtonSize.lg,
                      fullWidth: true,
                      onPressed: _busy ? null : _togglePause,
                    ),
                    second: VoltiButton(
                      label: l.returnVehicle,
                      variant: VoltiButtonVariant.dark,
                      size: VoltiButtonSize.lg,
                      fullWidth: true,
                      onPressed: () => context.push('/return/${r.id}'),
                    ),
                  ),
                ),
              ]),
            ),
          ),
        ),
      ]),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value, {super.key, this.ticker = false, this.stacked = false});
  final String label, value;

  /// Fonte grande: uma metrica por linha (sem `Expanded`), sem quebra no meio da palavra.
  final bool stacked;

  /// Valor que muda ao vivo: rola os digitos (`VoltiTicker`).
  final bool ticker;
  @override
  Widget build(BuildContext context) {
    final column = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: VoltiTypography.caption),
          if (ticker)
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: VoltiTicker(value, style: VoltiTypography.heading),
            )
          else
            Text(value, style: VoltiTypography.heading),
    ]);
    return stacked ? column : Expanded(child: column);
  }
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
