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

import '../../core/app_channel.dart';
import '../../core/backend.dart';
import '../../core/battery.dart';
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

  /// `null` ate o primeiro dado (sem piscar "0").
  double? _speed;

  /// Limite que a moto informa (`null` = ainda nao sabemos).
  int? _limit;

  /// `false` depois de um `zone.notice` com `advisory`: a moto (rastreador so
  /// rele) nao aplica limite, entao o medidor nao mostra "limite". O cliente nao
  /// recebe o tipo do rastreador antes disso (lacuna em docs/decisoes.md).
  bool _limitEnforced = true;

  /// `null` = desconhecida (`batteryKnown: false`) ou ainda sem dado.
  int? _battery;
  int? _range;

  /// Segundos desde a ultima `vehicle.position` (ou desde abrir a corrida).
  int _sincePosition = 0;

  /// Pausa pedida ha pouco: a trava ainda pode estar esperando a moto parar.
  bool _pausing = false;
  Timer? _pausingTimer;

  /// Status que o proprio cliente pediu (pausar/retomar). Mudanca para outro
  /// status sem ele pedir vem do sistema: mostra a mensagem da linha do tempo.
  RentalStatus? _userTarget;

  /// Aviso do sistema (pausa/encerramento desfeito, trava tardia).
  ({String title, String text})? _notice;
  ({String title, String text})? _lastNotice;
  Timer? _noticeTimer;
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
      final prev = _rental?.status;
      setState(() {
        _rental = rental;
        _cost = rental.costCents;
        _syncElapsed();
      });
      _statusChanged(prev, rental.status);
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
    _pausingTimer?.cancel();
    _noticeTimer?.cancel();
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
        _limit = rental.speedLimitKmh ?? vehicle?.speedLimitKmh;
        if (vehicle != null) {
          _battery = vehicle.knownBatteryPct;
          _range = vehicle.knownRangeKm;
          _vehiclePos = LatLng(vehicle.lat, vehicle.lng);
        }
      });
      _loadTrail(rental.id);
      _startRealtime();
      _startTracking();
      _tick?.cancel();
      _sincePosition = 0;
      _tick = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        final wasStale = _gpsStale;
        _sincePosition++;
        if (_rental?.status == RentalStatus.active) {
          setState(_syncElapsed);
        } else if (wasStale != _gpsStale) {
          setState(() {});
        }
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
        _battery = v.knownBatteryPct;
        _range = v.knownRangeKm;
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
        final prev = _rental?.status;
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
        } else {
          _statusChanged(prev, _rental?.status);
        }
      case VehiclePositionEvent():
        setState(() {
          _sincePosition = 0;
          _speed = e.speedKmh;
          _battery = e.knownBatteryPct;
          if (_battery == null) _range = null;
          _limit = e.speedLimitKmh;
          // Moto parada (< 3 km/h) depois da pausa: a trava segura corta nessa
          // velocidade, entao o "Pausando…" acaba aqui (moto que confirma rapido).
          if (_pausing && _rental?.status == RentalStatus.paused && e.speedKmh < kSafeLockSpeedKmh) _stopPausing();
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
          // Aviso (advisory): a moto nao aplica o limite; o medidor nao muda
          // (sem o vai-e-volta 20 <-> 32 com a proxima posicao).
          if (e.advisory) {
            _limitEnforced = false;
          } else if (e.speedLimitKmh != null && e.transition == 'ENTER') {
            _limit = e.speedLimitKmh!;
          }
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
    if (z.advisory) return z.speedLimitKmh != null ? l.zoneAdvisoryTitle(z.speedLimitKmh!) : l.zoneAdvisoryTitleNoLimit;
    final name = _zoneName(l, z);
    return z.speedLimitKmh != null ? l.zoneTitle(name, z.speedLimitKmh!) : name;
  }

  /// "R$ 0,79/min" (ou /h, /dia); pausada, a tarifa da pausa. O preco vem da
  /// linha de tempo do `breakdown` do aluguel (o preco congelado na largada,
  /// o mesmo da cobranca, inclusive o preco proprio do modelo da moto); sem ele,
  /// o do plano.
  String? _fare(AppLocalizations l, PricingPlan? plan, Rental rental, {required bool paused}) {
    if (plan == null) return null;
    if (paused) return plan.pausePerMinuteCents == 0 ? l.pauseFree : l.farePerMinute(money(plan.pausePerMinuteCents));
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
      icon: _RoundIcon(icon: LucideIcons.activity, bg: context.palette.dangerSoft, fg: context.palette.dangerInk),
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
            final phone = ref.read(supportPhoneProvider);
            final unavailable = isSupportPhoneUnavailable(channel: ref.read(appChannelProvider), phone: phone);
            Navigator.of(context).pop();
            if (unavailable) {
              // Versao de teste (TestFlight): o telefone e o de exemplo, nao disca.
              if (mounted) VoltiToast.show(context, l.callSupportUnavailableBeta, tone: VoltiToastTone.info);
              return;
            }
            await ref.read(urlLauncherProvider)(Uri(scheme: 'tel', path: phone));
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
              wrap: true,
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
    if (_busy) return;
    final l = context.l;
    final r = _rental!;
    final pausing = r.status != RentalStatus.paused;
    setState(() {
      _busy = true;
      _notice = null;
      _userTarget = pausing ? RentalStatus.paused : RentalStatus.active;
    });
    try {
      final backend = ref.read(backendProvider);
      final updated = pausing ? await backend.pause(r.id) : await backend.resume(r.id);
      VoltiHaptics.tap();
      if (mounted) {
        final prev = _rental?.status;
        final pauseUndone = pausing && updated.status != RentalStatus.paused;
        setState(() {
          _rental = updated;
          _syncElapsed();
          if (pausing && updated.status == RentalStatus.paused) _startPausing();
          if (!pausing || pauseUndone) _stopPausing();
        });
        if (pauseUndone) {
          // O `did_not_stop` chegou antes de a resposta da pausa sair: o POST ja
          // devolve `active`. Sem mudanca de status na tela, mas e "pausa desfeita".
          _userTarget = null;
          if (!_returnOpen) _showSystemNotice(RentalStatus.paused, updated.status);
        } else {
          _statusChanged(prev, updated.status);
        }
      }
    } catch (e) {
      _userTarget = null;
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  bool get _gpsStale => _rental?.status == RentalStatus.active && _sincePosition >= kGpsStaleSeconds;

  void _startPausing() {
    _pausing = true;
    _pausingTimer?.cancel();
    _pausingTimer = Timer(kPausePendingWindow, () {
      if (mounted) setState(() => _pausing = false);
    });
  }

  void _stopPausing() {
    _pausing = false;
    _pausingTimer?.cancel();
  }

  /// O status mudou de [prev] para [next]. Se o cliente nao pediu (pausa que a
  /// moto nao conseguiu travar, encerramento desfeito, trava que chegou tarde),
  /// busca a mensagem do sistema na linha do tempo e avisa.
  void _statusChanged(RentalStatus? prev, RentalStatus? next) {
    if (prev == null || next == null || prev == next) return;
    // Parada a moto manda posicao com menos frequencia: a contagem do GPS recomeca.
    if (next == RentalStatus.active) _sincePosition = 0;
    if (next != RentalStatus.paused && _pausing) setState(_stopPausing);
    final surprise = (next == RentalStatus.active || next == RentalStatus.paused) && next != _userTarget;
    _userTarget = null;
    // Devolucao aberta por cima: ela mostra a mensagem (sem aviso nem vibracao em dobro).
    if (surprise && !_returnOpen) _showSystemNotice(prev, next);
  }

  Future<void> _showSystemNotice(RentalStatus prev, RentalStatus next) async {
    final l = context.l;
    final (String title, String fallback) = switch ((prev, next)) {
      (RentalStatus.ending, _) => (l.endRevertedTitle, l.endRevertedText),
      (_, RentalStatus.paused) => (l.lateLockTitle, l.lateLockText),
      _ => (l.pauseRevertedTitle, l.pauseRevertedText),
    };
    String? message;
    final id = _rental?.id;
    if (id != null) {
      try {
        message = lastSystemMessage(await ref.read(backendProvider).rentalEvents(id));
      } catch (_) {
        // sem a linha do tempo: o texto padrao
      }
    }
    if (!mounted) return;
    VoltiHaptics.warning();
    final notice = (title: title, text: message ?? fallback);
    setState(() {
      _notice = notice;
      _lastNotice = notice;
    });
    _noticeTimer?.cancel();
    _noticeTimer = Timer(const Duration(seconds: 20), () {
      if (mounted) setState(() => _notice = null);
    });
  }

  /// Abre a devolucao ([waiting]: direto na espera da trava) e, na volta, rele o aluguel.
  Future<void> _openReturn(String rentalId, {bool waiting = false}) async {
    await context.push(waiting ? '/return/$rentalId?waiting=1' : '/return/$rentalId');
    if (mounted) _resync();
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
      barrierColor: context.palette.scrim,
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
    final ending = r.status == RentalStatus.ending;
    final pending = ending || (paused && _pausing);
    final stale = _gpsStale;
    final speed = stale ? null : _speed;
    final shownLimit = _limitEnforced ? _limit : null;
    final plan = ref.watch(rentalPlanProvider(r.planCode)).value;
    // Carrega o contato de emergencia antes do SOS (o dialogo le o valor pronto).
    ref.watch(emergencyContactProvider);
    // Zonas compartilhadas com a devolucao (nome da zona no aviso).
    ref.watch(sharedZonesProvider);
    final fare = _fare(l, plan, r, paused: paused);
    final coverageLabel = r.coverage == InsuranceCoverage.full ? l.coverageFullLong : l.coverageBasicLong;
    // Fonte grande: o titulo fica so com o estado; plano e seguro viram chips.
    final big = MediaQuery.textScalerOf(context).scale(10) > 13;
    final stateLabel = ending
        ? l.rideEnding
        : paused
            ? (_pausing ? l.ridePausing : l.ridePaused)
            : l.rideLive;
    final caption = big ? stateLabel : [stateLabel, if (plan != null) plan.name, coverageLabel].join(' · ');
    final stateBadge = _StateBadge(
      mode: pending ? _BadgeMode.pending : (paused ? _BadgeMode.paused : _BadgeMode.live),
      label: ending
          ? l.endingBadge
          : pending
              ? l.pausingBadge
              : paused
                  ? (fare ?? l.pausedBadge)
                  : l.liveBadge,
      semanticsLabel: paused && !pending && fare != null ? l.pausedFareSemantics(fare) : null,
    );
    final stats = <Widget>[
      _Stat(l.fareLabel, fare ?? '—', key: const Key('ride-fare'), stacked: big),
      _Stat(l.accumulatedCost, money(_cost), ticker: true, stacked: big),
      _Stat(l.battery, batteryValue(_battery), ticker: true, stacked: big),
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
                            child: VehicleMarker(
                              VehicleStatus.rented,
                              _battery,
                              selected: true,
                              animateIn: firstMarkerDrop,
                              semanticLabel: _battery == null ? l.vehicleMarkerUnknownSemantics : l.vehicleMarkerSemantics(_battery!),
                            )),
                    ]),
                  ],
                )
              : Container(color: context.palette.surfaceMedia),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            child: Column(children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(12, 10, 14, 10),
                    decoration: BoxDecoration(color: context.palette.glassBg, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
                    child: Row(children: [
                      VoltiSpeedGauge(
                        key: const Key('ride-gauge'),
                        speedKmh: speed,
                        limitKmh: shownLimit,
                        size: 60,
                        semanticsLabel: speed == null
                            ? l.speedSemanticsUnknown
                            : shownLimit == null
                                ? l.speedSemanticsNoLimit(speed.round())
                                : l.speedSemantics(speed.round(), shownLimit),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                          Text(shownLimit == null ? l.speedUnitOnly : l.speedUnit(shownLimit), style: VoltiTypography.caption.copyWith(color: context.palette.onGlass)),
                          const SizedBox(height: 6),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: BatteryPill(
                              _battery,
                              rangeKm: _range,
                              light: true,
                              semanticsLabel: batteryPillSemantics(l, _battery, rangeKm: _range),
                            ),
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
                key: const Key('gps-stale'),
                // Sem tempo real a faixa de conexao ja explica a falta de posicoes.
                visible: stale && !_rtDown,
                tone: VoltiStatusTone.warning,
                icon: LucideIcons.satelliteDish,
                title: l.gpsStaleTitle,
                message: l.gpsStaleText,
              ),
              VoltiStatusBanner(
                key: const Key('ride-system-notice'),
                visible: _notice != null,
                tone: VoltiStatusTone.warning,
                icon: LucideIcons.circleAlert,
                title: _lastNotice?.title,
                message: _lastNotice?.text ?? '',
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
                        : Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            for (var i = 0; i < stats.length; i++) ...[
                              if (i > 0) const SizedBox(width: VoltiSpacing.s12),
                              stats[i],
                            ],
                          ]),
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
                  // Encerrando: sem Pausar (a API recusa); so reabrir a espera da trava.
                  child: ending
                      ? VoltiButton(
                          key: const Key('ride-open-ending'),
                          label: l.rideOpenEnding,
                          icon: LucideIcons.lock,
                          variant: VoltiButtonVariant.dark,
                          size: VoltiButtonSize.lg,
                          fullWidth: true,
                          onPressed: () => _openReturn(r.id, waiting: true),
                        )
                      : VoltiButtonPair(
                          first: VoltiButton(
                            key: const Key('ride-pause'),
                            label: paused ? l.unpauseRide : l.pause,
                            icon: paused ? LucideIcons.circlePlay : LucideIcons.pause,
                            variant: VoltiButtonVariant.secondary,
                            size: VoltiButtonSize.lg,
                            fullWidth: true,
                            loading: _busy,
                            onPressed: _togglePause,
                          ),
                          second: VoltiButton(
                            label: l.returnVehicle,
                            variant: VoltiButtonVariant.dark,
                            size: VoltiButtonSize.lg,
                            fullWidth: true,
                            onPressed: () => _openReturn(r.id),
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
    // Em linha, o valor encolhe para caber na coluna (sem encostar no vizinho:
    // "R$ 89,00/dia" e o custo ficavam colados em telas de 360 dp).
    final valueWidget = ticker ? VoltiTicker(value, style: VoltiTypography.heading) : Text(value, style: VoltiTypography.heading, maxLines: 1, softWrap: false);
    final column = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: VoltiTypography.caption, maxLines: 1, overflow: TextOverflow.ellipsis),
          if (stacked && !ticker) valueWidget else FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: valueWidget),
    ]);
    return stacked ? column : Expanded(child: column);
  }
}

enum _BadgeMode { live, paused, pending }

/// Selo "Ao vivo" (ponto piscando), "Pausada" ou neutro enquanto a trava esta
/// pendente ("Pausando…", "Encerrando…"); troca com cross-fade.
class _StateBadge extends StatelessWidget {
  const _StateBadge({required this.mode, required this.label, this.semanticsLabel});
  final _BadgeMode mode;
  final String label;
  final String? semanticsLabel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (bg, fg) = switch (mode) {
      _BadgeMode.paused => (context.palette.sunSoft, context.palette.sunInk),
      _BadgeMode.live => (context.palette.brandSoft, context.palette.successInk),
      _BadgeMode.pending => (scheme.surfaceContainerHighest, scheme.onSurfaceVariant),
    };
    return AnimatedSwitcher(
      duration: VoltiMotion.scaled(context, VoltiMotion.durBase),
      child: Container(
        key: ValueKey(mode),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(color: bg, borderRadius: VoltiRadii.rPill),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          switch (mode) {
            _BadgeMode.paused => Icon(LucideIcons.pause, size: 14, color: fg),
            _BadgeMode.pending => Icon(LucideIcons.hourglass, size: 14, color: fg),
            _BadgeMode.live => const _LiveDot(),
          },
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
