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
import '../../core/flash.dart';
import '../../core/geo.dart';
import '../../core/launcher.dart';
import '../../core/map_tiles.dart';
import '../../core/push_routing.dart';
import '../../core/services.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';
import '../handover/handover_watch.dart';
import '../pick/pick_logic.dart';
import '../pickup/depot_hours.dart';
import '../pickup/depot_labels.dart';
import '../ride/ride_screen.dart' show mapEnabledProvider;
import '../station_swap/swap_widgets.dart';
import 'depot_providers.dart';
import 'home_reservation_card.dart';
import 'home_sheet.dart';
import 'location_header.dart';
import 'pending_payment_banner.dart';
import 'providers.dart';
import 'stations/station_logic.dart';
import 'stations/station_markers.dart';
import 'stations/stations_sheet.dart';

/// Inicio (retirada em galpao, spec 2026-10-22 §3.1): mapa com o galpao em
/// destaque, os pontos verdes de devolucao e as estacoes de bateria (sem motos na
/// rua). Embaixo, o cartao do galpao "Galpão Volti · bairro · N motos disponíveis"
/// com o horario e **Escolher moto**. Com varios galpoes o cartao vira seletor,
/// mais perto primeiro.
/// Fracao da altura da tela que a camera sobe ao centrar o galpao (fica acima do
/// cartao do galpao, que cobre a metade de baixo). Com a folha arrastavel a
/// camera usa a faixa livre de verdade (entre o cabecalho e a folha).
const homeMapFocusShift = 0.12;

/// Coluna de botoes do mapa (estacoes + localizar: 44 + 8 + 44).
const homeMapButtonsHeight = 44.0 * 2 + VoltiSpacing.s8;

/// Teto da recolhida da folha "Troca de bateria" (fracao da tela): mostra o
/// titulo e as primeiras linhas; o resto aparece ao arrastar.
const homeStationsCollapsedMax = 0.42;

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> with WidgetsBindingObserver {
  final _map = MapController();

  /// Rodape (botoes do mapa + cartao): o toast sobe acima dele, nao o cobre.
  final _bottomKey = GlobalKey();

  /// Faixa de promocoes (passe) no alto do mapa: o enquadramento a evita.
  final _promosKey = GlobalKey();

  /// A camera ja foi enquadrada com o galpao e as estacoes ao redor.
  bool _framedStations = false;

  /// Cabecalho e avisos (alto da tela): a camera centra abaixo dele.
  final _topKey = GlobalKey();

  /// Folhas arrastaveis (galpao e estacoes) e a altura atual da que esta aberta:
  /// os botoes do mapa sobem junto e a camera considera o que ela cobre.
  final _depotSheetKey = GlobalKey<HomeSheetState>();
  final _stationsSheetKey = GlobalKey<HomeSheetState>();
  final _sheetHeight = ValueNotifier<double>(0);

  /// Altura da recolhida da folha aberta (o cabecalho cede esse espaco).
  double? _collapsedPx;

  /// A home esta com uma folha arrastavel (galpao ou estacoes) no rodape.
  bool _sheetMode = false;

  /// Estacao escolhida (pin tocado ou linha tocada): destaque nos dois.
  String? _selectedStationId;

  double _sheetCoverPx() {
    final st = (_stationsMode ? _stationsSheetKey : _depotSheetKey).currentState;
    final h = st?.heightPx ?? 0;
    return h > 0 ? h : _sheetHeight.value;
  }

  /// Recolhida medida (ou mudou com o texto): o cabecalho cede o espaco e, com a
  /// home parada, a camera enquadra de novo acima da folha.
  void _onCollapsedChanged(double px) {
    if (!mounted) return;
    if (_collapsedPx == null || (_collapsedPx! - px).abs() > .5) setState(() => _collapsedPx = px);
    final d = ref.read(currentDepotProvider).value;
    if (d != null && !_userCentered && !_stationsMode) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _frameIdle(d);
      });
    }
  }

  /// Atualiza "Aberto até 20h" quando o horario vira.
  Timer? _tick;

  /// Galpao em que a camera ja foi centrada (centra de novo quando ele muda).
  String? _focusedDepotId;

  /// O cliente tocou em Localizar: a camera fica nele (a recarga dos galpoes que a
  /// nova posicao provoca nao volta a centrar no galpao).
  bool _userCentered = false;

  /// Modo estacoes: marcadores com as baterias e a folha "Troca de bateria" no
  /// lugar do cartao do galpao.
  bool _stationsMode = false;

  void _setStationsMode(bool on) {
    if (_stationsMode == on) return;
    setState(() {
      _stationsMode = on;
      _selectedStationId = null;
      _collapsedPx = null;
    });
    // Contagem de baterias ao vivo: busca de novo ao abrir.
    if (on) ref.invalidate(swapStationsProvider);
  }

  void _focusStation(SwapStation s) {
    VoltiHaptics.selection();
    setState(() => _selectedStationId = s.id);
    _moveMap(LatLng(s.lat, s.lng));
  }

  Future<void> _depotDirections(Depot d) async {
    final ok = await openDirections(ref.read(urlLauncherProvider), d.lat, d.lng);
    if (!ok && mounted) VoltiToast.showTop(context, context.l.navigateFailed, tone: VoltiToastTone.danger);
  }

  @override
  void initState() {
    super.initState();
    // Push: registra o token (no-op sem Firebase).
    Future.microtask(
      () => ref.read(pushServiceProvider).register(ref.read(backendProvider), onForeground: _onPushForeground, onOpen: _onPushOpen),
    );
    WidgetsBinding.instance.addObserver(this);
    var minutes = 0;
    _tick = Timer.periodic(const Duration(minutes: 1), (_) {
      if (!mounted) return;
      // Horario do galpao pode mudar no servidor: relê de tempos em tempos.
      if (++minutes % 5 == 0) ref.invalidate(depotsProvider);
      setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _showFlash();
      _askLocationOnce();
    });
    // Fora do build: centra no galpao ao abrir e quando ele muda.
    ref.listenManual(currentDepotProvider, (_, next) => _focusDepot(next.value), fireImmediately: true);
    // As estacoes chegam depois do galpao: enquadra de novo uma vez com elas.
    ref.listenManual(swapStationsProvider, (_, next) {
      final d = ref.read(currentDepotProvider).value;
      if (!_framedStations && next.hasValue && d != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _frameIdle(d);
        });
      }
    });
  }

  /// Volta do segundo plano: relê galpoes (horario/abertura) e o aluguel.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed || !mounted) return;
    ref.invalidate(depotsProvider);
    ref.invalidate(currentRentalStateProvider);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tick?.cancel();
    _sheetHeight.dispose();
    super.dispose();
  }

  /// Mensagem push com o app aberto: vira aviso na tela (o sistema nao mostra banner).
  void _onPushForeground(PushPayload m) {
    if (!mounted) return;
    final text = [m.title, m.body].whereType<String>().where((t) => t.isNotEmpty).join(': ');
    if (text.isNotEmpty) VoltiToast.showTop(context, text, tone: VoltiToastTone.info);
  }

  /// Toque na notificacao: abre a tela do evento por cima do inicio.
  void _onPushOpen(String route) {
    if (!mounted || route == '/home') return;
    GoRouter.of(context).push(route);
  }

  /// Toast deixado por outra tela (reserva cancelada, recibo, cadastro). No topo:
  /// embaixo ele ficava no meio do mapa, por cima dos pins.
  void _showFlash() {
    if (!mounted) return;
    final m = ref.read(flashProvider.notifier).take();
    if (m != null) VoltiToast.showTop(context, m.text, tone: m.tone);
  }

  /// Explica para que serve a localizacao e so entao abre o dialogo do sistema.
  Future<void> _askLocationOnce() async {
    if (!mounted) return;
    final session = ref.read(sessionProvider).value;
    if (session == null || !session.onboardingDone || !session.locationConsent) return;
    final svc = ref.read(locationServiceProvider);
    if (await svc.hasPermission() || !mounted) return;
    final l = context.l;
    final ok = await VoltiDialog.show<bool>(
      context,
      title: l.locationRationaleTitle,
      icon: const Icon(LucideIcons.mapPin, size: 32, color: VoltiColors.brand),
      message: Text(l.locationRationaleText),
      actions: [
        VoltiButton(label: l.allowLocation, fullWidth: true, onPressed: () => Navigator.of(context).pop(true)),
        VoltiButton(label: l.notNow, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
      ],
    );
    if (ok == true && await svc.ensurePermission()) ref.invalidate(userLocationProvider);
  }

  /// Deslocamento da camera para o ponto cair na faixa livre do mapa, entre o
  /// cabecalho e o cartao do galpao (acima do meio da tela). Com a folha
  /// arrastavel, o meio da faixa entre o cabecalho e a altura atual da folha.
  Offset _visibleOffset() {
    final h = MediaQuery.sizeOf(context).height;
    final fallback = Offset(0, -h * homeMapFocusShift);
    if (!_sheetMode) return fallback;
    final cover = _sheetCoverPx();
    if (cover <= 0) return fallback;
    final top = _topEdge(h);
    final bottom = h - cover;
    if (bottom - top < 120) return fallback;
    return Offset(0, (top + bottom) / 2 - h / 2);
  }

  /// Borda de baixo do cabecalho/avisos (ou da faixa do passe).
  double _topEdge(double h) {
    for (final k in [_promosKey, _topKey]) {
      final b = k.currentContext?.findRenderObject();
      if (b is RenderBox && b.hasSize && b.attached) return b.localToGlobal(Offset.zero).dy + b.size.height;
    }
    return h * .18;
  }

  void _moveMap(LatLng to) {
    if (!ref.read(mapEnabledProvider)) return;
    try {
      _map.move(to, 15, offset: _visibleOffset());
    } catch (_) {
      // mapa ainda nao montado
    }
  }

  /// Centra o galpao ao abrir e quando ele muda. O `FlutterMap` guarda a camera no
  /// controller, entao recriar o mapa com outro `initialCenter` nao a move: o
  /// galpao ficava fora da tela (so as zonas e a estacao perto do centro de SP).
  void _focusDepot(Depot? d) {
    if (d == null || d.id == _focusedDepotId || _userCentered) return;
    _focusedDepotId = d.id;
    _framedStations = false;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _frameIdle(d);
    });
  }

  /// Home parada: enquadra o galpao e as estacoes proximas na faixa livre entre a
  /// faixa do passe (alto) e o cartao do galpao (baixo), para nenhuma ficar atras
  /// deles. Sem estacoes por perto, so centra o galpao.
  void _frameIdle(Depot d) {
    if (_userCentered || _stationsMode) return;
    final here = LatLng(d.lat, d.lng);
    final stations = ref.read(swapStationsProvider).asData?.value ?? const <SwapStation>[];
    const dist = Distance();
    final pts = [
      here,
      for (final s in stations)
        if (dist(here, LatLng(s.lat, s.lng)) <= 1500) LatLng(s.lat, s.lng),
    ];
    if (pts.length < 2 || !ref.read(mapEnabledProvider)) {
      _moveMap(here);
      return;
    }
    final top = _promosKey.currentContext?.findRenderObject();
    final bottom = _bottomKey.currentContext?.findRenderObject();
    final media = MediaQuery.sizeOf(context);
    var topPad = media.height * .18;
    if (top is RenderBox && top.hasSize) topPad = top.localToGlobal(Offset.zero).dy + top.size.height + VoltiSpacing.s12;
    var bottomPad = media.height * .45;
    if (_sheetMode && _sheetCoverPx() > 0) {
      bottomPad = _sheetCoverPx() + VoltiSpacing.s12;
    } else if (bottom is RenderBox && bottom.hasSize) {
      bottomPad = bottom.size.height + VoltiSpacing.s12;
    }
    try {
      _map.fitCamera(
        CameraFit.coordinates(coordinates: pts, padding: EdgeInsets.fromLTRB(48, topPad, 48, bottomPad), maxZoom: 16, minZoom: 12),
      );
      _framedStations = true;
    } catch (_) {
      _moveMap(here);
    }
  }

  /// Localizar: pede a posicao de novo e centra no cliente (nao no galpao).
  Future<void> _locateMe(LatLng fallback) async {
    _userCentered = true;
    LatLng? p;
    try {
      p = await ref.refresh(userLocationProvider.future);
    } catch (_) {}
    if (mounted) _moveMap(p ?? fallback);
  }

  /// Leitor do QR (troca nova) ou a tela da troca em andamento; na volta,
  /// rele o aluguel.
  Future<void> _openSwapFlow(StationSwap? open, {String? stationId}) async {
    if (_swapNavigating) return;
    _swapNavigating = true;
    try {
      if (open != null) {
        await openSwapProgress(context, open);
      } else {
        await openSwapScan(context, stationId: stationId);
      }
    } finally {
      _swapNavigating = false;
    }
    // Rele o aluguel (troca encerrada, bateria nova) so depois do frame:
    // invalidar no meio da volta reconstruia providers durante o build.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.invalidate(currentRentalStateProvider);
    });
  }

  /// Um toque so nas entradas da troca (sem empilhar duas telas).
  bool _swapNavigating = false;

  void _selectDepot(Depot d) {
    VoltiHaptics.selection();
    ref.read(selectedDepotIdProvider.notifier).select(d.id);
    _moveMap(LatLng(d.lat, d.lng));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final loc = ref.watch(userLocationProvider).value;
    final zones = ref.watch(zonesProvider).value ?? const <GeoZone>[];
    final stations = ref.watch(swapStationsProvider).value ?? const <SwapStation>[];
    final depots = ref.watch(depotsProvider);
    final current = ref.watch(currentDepotProvider).value;
    // Modo estacoes: a estacao que coincide com um galpao vira selo no marcador dele.
    final split = splitDepotStations(depots.value ?? const <Depot>[], _stationsMode ? stations : const <SwapStation>[]);
    final reservation = ref.watch(currentReservationProvider).value;
    final rental = ref.watch(currentRentalProvider).value;
    // Reserva em aberto: o cartao "Sua reserva" ocupa o lugar do cartao do galpao
    // (sem "Escolher moto" nem seletor: so uma reserva por vez) e o passe some.
    final pending = rental == null && isPendingReservation(reservation) ? reservation : null;
    final session = ref.watch(sessionProvider).value;
    // Troca de bateria na estacao: retomar a que esta em andamento ou, a ate
    // 50 m de uma estacao com aluguel em andamento, oferecer a troca.
    final openSwap = rental != null ? ref.watch(homeOpenSwapProvider) : null;
    final nearStation = rental != null && openSwap == null ? ref.watch(homeNearbySwapStationProvider) : null;
    final now = ref.watch(clockProvider)();
    // Flash que chega com o mapa ja aberto (ex.: voltou por pop).
    ref.listen(flashProvider, (_, next) {
      if (next != null) WidgetsBinding.instance.addPostFrameCallback((_) => _showFlash());
    });
    final promoFirstRide = firstRideFree(session?.customer, promoActive: kFirstRidePromo);
    final center = current != null ? LatLng(current.lat, current.lng) : (loc ?? fallbackCenter);
    final surface = Theme.of(context).colorScheme.surface;
    // Folha arrastavel com os galpoes carregados (cartao do galpao) ou no modo
    // estacoes; corrida, reserva e galpoes carregando/erro ficam no cartao fixo.
    final sheetMode = _stationsMode || (rental == null && pending == null && depots.hasValue && current != null);
    _sheetMode = sheetMode;
    final size = MediaQuery.sizeOf(context);
    final pad = MediaQuery.paddingOf(context);
    // Mesmo teto do cartao fixo: o rodape (botoes + cartao) fica com ate 3/5 da coluna.
    const gutter = VoltiSpacing.screenGutter;
    final column = size.height - pad.top - pad.bottom - 2 * gutter - VoltiSpacing.s8;
    final maxCollapsed = math.max(160.0, column * 3 / 5 - homeMapButtonsHeight - VoltiSpacing.s12 + pad.bottom + gutter);
    final collapsed = _collapsedPx ?? (_stationsMode ? math.min(maxCollapsed, size.height * homeStationsCollapsedMax) : maxCollapsed);
    final reserve = math.max(0.0, collapsed + VoltiSpacing.s12 + homeMapButtonsHeight - pad.bottom - gutter);
    final mapButtons = Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (ref.watch(mapEnabledProvider)) const Flexible(child: MapAttribution()),
        const Spacer(),
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Semantics(
              toggled: _stationsMode,
              child: VoltiIconButton(
                key: const Key('home-stations-toggle'),
                icon: LucideIcons.batteryCharging,
                variant: _stationsMode ? VoltiIconButtonVariant.brand : VoltiIconButtonVariant.surface,
                iconColor: _stationsMode ? null : VoltiColors.brand,
                label: l.stationsToggle,
                haptic: VoltiHapticKind.selection,
                onPressed: () => _setStationsMode(!_stationsMode),
              ),
            ),
            const SizedBox(height: VoltiSpacing.s8),
            VoltiIconButton(
              icon: LucideIcons.locateFixed,
              iconColor: VoltiColors.brand,
              label: l.locateMe,
              onPressed: () => _locateMe(loc ?? center),
            ),
          ],
        ),
      ],
    );

    return PopScope(
      // Voltar fecha o modo estacoes antes de sair da home.
      canPop: !_stationsMode,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _setStationsMode(false);
      },
      child: Scaffold(
        body: Stack(
          children: [
            Positioned.fill(
              child: !ref.watch(mapEnabledProvider)
                  ? ColoredBox(color: context.palette.mapLand)
                  : VoltiMap(
                      key: const Key('home-map'),
                      controller: _map,
                      // Atribuicao ao lado do botao de localizar (o cartao cobre o rodape do mapa).
                      showAttribution: false,
                      center: center,
                      zoom: 15,
                      layers: [
                        // Pontos verdes de devolucao.
                        PolygonLayer(
                          polygons: [
                            for (final z in pickupZones(zones))
                              Polygon(
                                points: zoneRing(z),
                                color: VoltiColors.brand.withValues(alpha: 0.14),
                                borderColor: VoltiColors.brand,
                                borderStrokeWidth: 1.5,
                              ),
                          ],
                        ),
                        MarkerLayer(
                          markers: [
                            for (final s in _stationsMode ? const <SwapStation>[] : stations)
                              Marker(
                                key: ValueKey('station-${s.id}'),
                                point: LatLng(s.lat, s.lng),
                                width: 36,
                                height: 36,
                                child: Semantics(
                                  label: l.swapStationSemantics(s.name),
                                  child: const _MapBadge(icon: LucideIcons.batteryCharging, color: VoltiColors.blue600, size: 32),
                                ),
                              ),
                            for (final d in depots.value ?? const <Depot>[])
                              Marker(
                                key: ValueKey('depot-pin-${d.id}'),
                                alignment: Alignment.center,
                                point: LatLng(d.lat, d.lng),
                                width: 56,
                                height: 56,
                                child: Semantics(
                                  button: true,
                                  label: split.byDepot[d.id] == null
                                      ? l.depotPinSemantics(depotTitle(l, d))
                                      : '${l.depotPinSemantics(depotTitle(l, d))}. ${l.stationAvailability(split.byDepot[d.id]!.availableBatteries)}',
                                  // Alvo de toque do marcador inteiro (56 px >= 44 px), nao so do disco.
                                  child: GestureDetector(
                                    behavior: HitTestBehavior.opaque,
                                    onTap: () => _selectDepot(d),
                                    child: StationBadgeOverlay(
                                      station: split.byDepot[d.id],
                                      child: _MapBadge(
                                        icon: LucideIcons.warehouse,
                                        color: VoltiColors.brandAction,
                                        size: d.id == current?.id ? 52 : 40,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            // Modo estacoes: por cima do galpao, com a contagem de baterias.
                            if (_stationsMode) ...stationMarkers(split.loose, onTap: _focusStation, selectedId: _selectedStationId),
                            if (loc != null)
                              Marker(
                                key: const ValueKey('user-dot'),
                                point: loc,
                                width: 22,
                                height: 22,
                                child: Semantics(label: l.yourLocation, child: const VoltiUserDot()),
                              ),
                          ],
                        ),
                      ],
                    ),
            ),
            // Cabecalho e avisos em cima, cartao do galpao embaixo; o meio fica livre para o mapa.
            // Com texto grande cada regiao tem um teto e rola por dentro, sem se sobrepor.
            // Com a folha arrastavel, o rodape so reserva a altura da recolhida (+ botoes):
            // a folha e os botoes ficam numa camada por cima (expandida, cobre o cabecalho).
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(top: VoltiSpacing.screenGutter, bottom: VoltiSpacing.screenGutter),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                      flex: 2,
                      fit: FlexFit.loose,
                      child: KeyedSubtree(
                        key: _topKey,
                        child: SingleChildScrollView(
                        key: const Key('home-top'),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
                              child: VoltiEnter(
                                key: const Key('home-header'),
                                duration: VoltiMotion.staggerItem,
                                delay: const Duration(milliseconds: 80),
                                fromOffset: const Offset(0, -12),
                                curve: VoltiMotion.easeOut,
                                child: const LocationHeader(),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  const SizedBox(height: VoltiSpacing.s10),
                                  if (rental != null) ...[
                                    if (openSwap != null) ...[
                                      SwapResumeCard(onResume: () => _openSwapFlow(openSwap)),
                                    ] else if (nearStation != null) ...[
                                      SwapNearbyCard(
                                        station: nearStation,
                                        onSwap: () => _openSwapFlow(null, stationId: nearStation.id),
                                      ),
                                    ],
                                  ] else if (reservation != null)
                                    // Entrega no galpao: abre "Confira sua moto" (evento ou app aberto depois).
                                    HandoverWatcher(reservation: reservation),
                                  if (session != null && session.kyc != KycStatus.approved)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: VoltiPressable(
                                        semanticLabel: '${l.kycPendingTitle}. ${l.kycHomeNotice}',
                                        onTap: () => context.push('/account/verification'),
                                        child: NoticeBanner(
                                          icon: LucideIcons.shieldCheck,
                                          title: l.kycPendingTitle,
                                          message: l.kycHomeNotice,
                                        ),
                                      ),
                                    ),
                                  // R2-01: divida em aberto (fechamento sem cartao) com "Pagar agora".
                                  if (rental == null) const PendingPaymentBanner(),
                                ],
                              ),
                            ),
                            // Promocoes (PassCard) numa faixa que rola na horizontal. Somem com
                            // reserva em aberto e no modo estacoes (cobriam um marcador).
                            if (pending == null && rental == null && !_stationsMode)
                              KeyedSubtree(
                                key: _promosKey,
                                child: SingleChildScrollView(
                                  key: const Key('home-promos'),
                                  scrollDirection: Axis.horizontal,
                                  clipBehavior: Clip.none,
                                  padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 4, VoltiSpacing.screenGutter, 4),
                                  child: Row(
                                    children: VoltiStagger.wrap([
                                      PassCard(
                                        title: l.promoPassTitle,
                                        subtitle: l.promoPassText,
                                        icon: LucideIcons.ticket,
                                        tone: PassCardTone.sun,
                                        onTap: () => context.push('/account/subscriptions'),
                                      ),
                                      if (promoFirstRide) ...[
                                        const SizedBox(width: VoltiSpacing.s10),
                                        PassCard(
                                          title: l.promoFirstRideTitle,
                                          subtitle: l.promoFirstRideText,
                                          icon: LucideIcons.gift,
                                          tone: PassCardTone.coral,
                                        ),
                                      ],
                                    ]),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      ),
                    ),
                    const SizedBox(height: VoltiSpacing.s8),
                    if (sheetMode)
                      SizedBox(key: const Key('home-sheet-reserve'), height: reserve)
                    else
                      Flexible(
                        flex: 3,
                        fit: FlexFit.loose,
                        child: Column(
                          key: _bottomKey,
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
                              child: mapButtons,
                            ),
                            const SizedBox(height: VoltiSpacing.s12),
                            Flexible(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
                                // Galpao <-> "Sua reserva": desliza e funde com os tokens de tela;
                                // reduced motion troca na hora.
                                child: AnimatedSwitcher(
                                  key: const Key('home-bottom-switcher'),
                                  duration: VoltiMotion.scaled(context, VoltiMotion.durScreen),
                                  switchInCurve: VoltiMotion.easeScreen,
                                  switchOutCurve: VoltiMotion.easeScreen.flipped,
                                  layoutBuilder: (current, previous) =>
                                      Stack(alignment: Alignment.bottomCenter, children: [...previous, ?current]),
                                  transitionBuilder: (child, anim) => FadeTransition(
                                    opacity: anim,
                                    child: SlideTransition(
                                      position: Tween(begin: const Offset(0, .12), end: Offset.zero).animate(anim),
                                      child: child,
                                    ),
                                  ),
                                  child: rental != null
                                      ? _ActiveRideCard(
                                          key: const Key('home-ride-card'),
                                          rental: rental,
                                          onTap: () => context.push('/ride'),
                                        )
                                      : pending != null
                                      ? HomeReservationCard(key: ValueKey('home-reservation-${pending.id}'), reservation: pending)
                                      // Galpoes carregando, com erro ou nenhum: cartao fixo (sem arrastar).
                                      : VoltiEnter(
                                          key: const Key('depot-card-enter'),
                                          duration: VoltiMotion.durScreen,
                                          curve: VoltiMotion.easeScreen,
                                          fromOffset: const Offset(0, 80),
                                          child: Container(
                                            key: const Key('depot-card'),
                                            width: double.infinity,
                                            padding: const EdgeInsets.all(VoltiSpacing.s16),
                                            decoration: BoxDecoration(
                                              color: surface,
                                              borderRadius: VoltiRadii.rLg,
                                              boxShadow: VoltiShadows.shadow2,
                                            ),
                                            child: switch (depots) {
                                              AsyncValue(:final error?, hasValue: false) => ErrorState(
                                                error: error,
                                                onRetry: () => ref.invalidate(depotsProvider),
                                              ),
                                              AsyncValue(hasValue: false) => VoltiSkeleton.list(
                                                key: const Key('depot-skeleton'),
                                                rows: 2,
                                                trailing: false,
                                                label: l.loading,
                                              ),
                                              // Rola por dentro com texto grande (a coluna de botoes do mapa ocupa espaco).
                                              _ => SingleChildScrollView(
                                                child: VoltiEmptyState(
                                                  compact: true,
                                                  icon: LucideIcons.warehouse,
                                                  title: l.depotsEmpty,
                                                  message: l.depotsEmptyText,
                                                  actionLabel: l.retry,
                                                  actionIcon: LucideIcons.refreshCw,
                                                  onAction: () => ref.invalidate(depotsProvider),
                                                ),
                                              ),
                                            },
                                          ),
                                        ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
            if (sheetMode) ...[
              // Folha arrastavel (galpao ou estacoes) por cima de tudo, do rodape ao alto.
              Positioned.fill(
                child: _stationsMode
                    ? VoltiEnter(
                        key: const Key('stations-sheet-enter'),
                        duration: VoltiMotion.durScreen,
                        curve: VoltiMotion.easeScreen,
                        fromOffset: const Offset(0, 80),
                        child: StationsSheet(
                          sheetKey: _stationsSheetKey,
                          maxCollapsedPx: math.min(maxCollapsed, size.height * homeStationsCollapsedMax),
                          height: _sheetHeight,
                          onCollapsedChanged: _onCollapsedChanged,
                          selectedId: _selectedStationId,
                          onClose: () => _setStationsMode(false),
                          onFocus: _focusStation,
                          // "Trocar aqui" so na estacao a ate 50 m, com aluguel em andamento.
                          extraActions: (context, p) => [
                            if (nearStation != null && p.station.id == nearStation.id)
                              VoltiButton(
                                key: Key('station-swap-here-${p.station.id}'),
                                label: l.swapHere,
                                semanticLabel: l.swapHereSemantics(p.station.name),
                                icon: LucideIcons.qrCode,
                                size: VoltiButtonSize.sm,
                                wrap: true,
                                onPressed: () => _openSwapFlow(null, stationId: p.station.id),
                              ),
                          ],
                        ),
                      )
                    : VoltiEnter(
                        key: const Key('depot-card-enter'),
                        duration: VoltiMotion.durScreen,
                        curve: VoltiMotion.easeScreen,
                        fromOffset: const Offset(0, 80),
                        child: HomeSheet(
                          key: _depotSheetKey,
                          surfaceKey: const Key('depot-card'),
                          handleKey: const Key('depot-sheet-handle'),
                          scrollKey: const Key('depot-sheet-scroll'),
                          maxCollapsedPx: maxCollapsed,
                          height: _sheetHeight,
                          onCollapsedChanged: _onCollapsedChanged,
                          peek: _DepotPeek(depots: depots.value!, current: current!, now: now, onSelect: _selectDepot),
                          more: [
                            _DepotDetails(depot: current, now: now, onDirections: () => _depotDirections(current)),
                          ],
                          // Sempre a vista, em qualquer altura da folha.
                          footer: VoltiButton(
                            key: const Key('home-pick'),
                            label: l.chooseBike,
                            icon: LucideIcons.list,
                            size: VoltiButtonSize.lg,
                            fullWidth: true,
                            shine: true,
                            onPressed: () => context.push('/pick'),
                          ),
                        ),
                      ),
              ),
              // Botoes do mapa sobem com a folha; somem (sem alvo nem leitor de tela)
              // quando ela passa da meia altura e o mapa fica coberto.
              ValueListenableBuilder<double>(
                valueListenable: _sheetHeight,
                builder: (context, sheetH, child) {
                  final y = sheetH > 0 ? sheetH : collapsed;
                  final fadeStart = size.height * .62, fadeEnd = size.height * .74;
                  final opacity = 1 - ((y - fadeStart) / (fadeEnd - fadeStart)).clamp(0.0, 1.0);
                  final hidden = opacity < .5;
                  return Positioned(
                    key: const Key('home-map-buttons'),
                    left: VoltiSpacing.screenGutter,
                    right: VoltiSpacing.screenGutter,
                    bottom: y + VoltiSpacing.s12,
                    child: IgnorePointer(
                      ignoring: hidden,
                      child: ExcludeSemantics(excluding: hidden, child: Opacity(opacity: opacity, child: child)),
                    ),
                  );
                },
                child: mapButtons,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Topo da folha do galpao (o que aparece recolhida): seletor (com mais de um),
/// titulo com as motos, horario de hoje e endereco.
class _DepotPeek extends StatelessWidget {
  const _DepotPeek({required this.depots, required this.current, required this.now, required this.onSelect});
  final List<Depot> depots;
  final Depot current;
  final DateTime now;
  final ValueChanged<Depot> onSelect;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final open = depotOpenLabel(l, current, now);
    final isOpen = DepotHours.of(current).isOpenAt(now);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (depots.length > 1) ...[
          Semantics(
            label: l.depotPicker,
            container: true,
            child: SingleChildScrollView(
              key: const Key('depot-picker'),
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final d in depots) ...[
                    KeyedSubtree(
                      key: Key('depot-option-${d.id}'),
                      child: VoltiChip(
                        label: d.distanceM == null
                            ? depotTitle(l, d)
                            : '${depotTitle(l, d)} · ${walkingDistanceLabel(d.distanceM!)}',
                        icon: LucideIcons.warehouse,
                        selected: d.id == current.id,
                        onTap: () {
                          if (d.id != current.id) onSelect(d);
                        },
                      ),
                    ),
                    const SizedBox(width: VoltiSpacing.s8),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: VoltiSpacing.s12),
        ],
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: context.palette.brandSoft, borderRadius: VoltiRadii.rMd),
              child: Icon(LucideIcons.warehouse, color: context.palette.textBrand, size: 22),
            ),
            const SizedBox(width: VoltiSpacing.s12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Semantics(
                    header: true,
                    liveRegion: true,
                    child: Text(
                      depotHeadline(l, current),
                      key: const Key('depot-headline'),
                      style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface),
                    ),
                  ),
                  if (open != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(shape: BoxShape.circle, color: isOpen ? VoltiColors.brand : VoltiColors.danger),
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            open,
                            key: const Key('depot-open'),
                            style: VoltiTypography.caption.copyWith(
                              color: isOpen ? context.palette.successInk : context.palette.dangerInkStrong,
                              fontWeight: VoltiTypography.fwSemibold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 4),
                  Text(current.address, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// "7h", "7h30" a partir de "07:00"/"07:30" do contrato.
String depotHoursClock(String v) {
  final parts = v.split(':');
  final h = int.tryParse(parts.first) ?? 0;
  final m = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
  return m == 0 ? '${h}h' : '${h}h${m.toString().padLeft(2, '0')}';
}

/// Resto da folha do galpao (aparece ao arrastar para cima): horarios da semana
/// (`openingHours`, hoje em destaque) e o endereco completo com **Como chegar**.
/// Motos por modelo nao entram: a home so tem `availableVehicleCount` (ja no titulo).
class _DepotDetails extends StatelessWidget {
  const _DepotDetails({required this.depot, required this.now, required this.onDirections});
  final Depot depot;
  final DateTime now;
  final VoidCallback onDirections;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final hours = DepotHours.of(depot);
    final today = LocalDay.of(hours.toLocal(now)).weekday;
    final section = VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant, fontWeight: VoltiTypography.fwSemibold);
    final rows = <Widget>[];
    // Semana comecando na segunda (0 = domingo no contrato).
    for (final wd in const [1, 2, 3, 4, 5, 6, 0]) {
      final h = hours.hoursFor(wd);
      final isToday = wd == today;
      final day = l.weekdayLong('$wd');
      final value = h == null ? l.depotClosed : l.depotHoursRange(depotHoursClock(h.opensAt), depotHoursClock(h.closesAt));
      final style = (isToday ? VoltiTypography.bodyStrong : VoltiTypography.body).copyWith(
        color: h == null ? scheme.onSurfaceVariant : scheme.onSurface,
      );
      rows.add(
        Semantics(
          key: Key('depot-hours-$wd'),
          selected: isToday,
          label: l.depotHoursRowSemantics(isToday ? '$day, ${l.depotHoursTodayTag}' : day, value),
          excludeSemantics: true,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      text: day,
                      children: [
                        if (isToday)
                          TextSpan(
                            text: ' · ${l.depotHoursTodayTag}',
                            style: VoltiTypography.caption.copyWith(color: context.palette.textBrand),
                          ),
                      ],
                    ),
                    style: style,
                  ),
                ),
                const SizedBox(width: VoltiSpacing.s8),
                Text(value, style: style, textAlign: TextAlign.end),
              ],
            ),
          ),
        ),
      );
    }
    return Column(
      key: const Key('depot-details'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: VoltiSpacing.s20),
        Semantics(header: true, child: Text(l.depotHoursTitle, style: section)),
        const SizedBox(height: VoltiSpacing.s8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.s12, vertical: VoltiSpacing.s4),
          decoration: BoxDecoration(color: context.palette.surfaceSunken, borderRadius: VoltiRadii.rMd),
          child: Column(children: rows),
        ),
        const SizedBox(height: VoltiSpacing.s20),
        Semantics(header: true, child: Text(l.depotAddressTitle, style: section)),
        const SizedBox(height: VoltiSpacing.s8),
        Semantics(
          container: true,
          child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Icon(LucideIcons.mapPin, size: 18, color: scheme.onSurfaceVariant),
            ),
            const SizedBox(width: VoltiSpacing.s8),
            Expanded(
              child: Text(
                depot.address,
                key: const Key('depot-address-full'),
                style: VoltiTypography.body.copyWith(color: scheme.onSurface),
              ),
            ),
          ],
          ),
        ),
        const SizedBox(height: VoltiSpacing.s12),
        Align(
          alignment: Alignment.centerLeft,
          // No proprio no do leitor de tela (sem engolir o endereco).
          child: Semantics(
            container: true,
            child: VoltiButton(
            key: const Key('depot-directions'),
            label: l.howToGetThere,
            semanticLabel: l.depotDirectionsSemantics(depotTitle(l, depot)),
            icon: LucideIcons.navigation,
            variant: VoltiButtonVariant.secondary,
            size: VoltiButtonSize.md,
            wrap: true,
            onPressed: onDirections,
            ),
          ),
        ),
        const SizedBox(height: VoltiSpacing.s8),
      ],
    );
  }
}

/// Marcador redondo do mapa (galpao, estacao): disco com icone, borda branca e sombra.
class _MapBadge extends StatelessWidget {
  const _MapBadge({required this.icon, required this.color, required this.size});
  final IconData icon;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedContainer(
        duration: VoltiMotion.scaled(context, VoltiMotion.durSpring),
        curve: VoltiMotion.easeSpring,
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: VoltiColors.white, width: 3),
          boxShadow: VoltiShadows.shadow2,
        ),
        child: Icon(icon, color: VoltiColors.white, size: size * .46),
      ),
    );
  }
}

/// Corrida em andamento: ocupa o lugar do cartao do galpao (sem "Escolher moto").
class _ActiveRideCard extends StatelessWidget {
  const _ActiveRideCard({super.key, required this.rental, required this.onTap});
  final Rental rental;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(VoltiSpacing.s16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: VoltiRadii.rLg,
        boxShadow: VoltiShadows.shadow2,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text(l.rentalInProgress, style: VoltiTypography.title)),
          const SizedBox(height: VoltiSpacing.s4),
          Text(rental.vehicleCode, style: VoltiTypography.caption),
          const SizedBox(height: VoltiSpacing.s12),
          VoltiButton(
            key: const Key('home-back-to-ride'),
            label: l.backToRide,
            icon: LucideIcons.motorbike,
            fullWidth: true,
            onPressed: onTap,
          ),
        ],
      ),
    );
  }
}
