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
import '../../core/flash.dart';
import '../../core/geo.dart';
import '../../core/widgets.dart';
import '../home/location_header.dart';
import '../home/providers.dart';
import '../pick/pick_logic.dart';
import '../ride/ride_screen.dart' show mapEnabledProvider;

/// Reserva (design `ReservedScreen`): mapa claro full-bleed com a rota a pe
/// (coral, desenhada) do cliente ate a moto, pilula "min · m" acima do pin,
/// cabecalho no topo e, embaixo, localizar + contagem com deslizar para
/// cancelar + "Escanear QR".
///
/// A rota e a linha reta cliente -> moto: o contrato nao tem servico de rotas
/// por ruas (proposta em docs/decisoes.md). O "Navegar" do cartao abre a rota
/// real no app de mapas.
class ReservedScreen extends ConsumerStatefulWidget {
  const ReservedScreen({super.key});
  @override
  ConsumerState<ReservedScreen> createState() => _ReservedScreenState();
}

class _ReservedScreenState extends ConsumerState<ReservedScreen> {
  final _map = MapController();
  Timer? _tick;
  bool _warnedLastMinute = false;
  bool _canceling = false;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      _maybeWarnLastMinute();
      setState(() {});
    });
  }

  DateTime get _now => ref.read(clockProvider)();

  /// Ultimo minuto: um aviso tatil, uma vez (fora do build).
  void _maybeWarnLastMinute() {
    final r = ref.read(currentReservationProvider).value;
    if (r == null || _warnedLastMinute) return;
    final remaining = _remaining(r);
    if (remaining > 0 && remaining <= 60) {
      _warnedLastMinute = true;
      VoltiHaptics.warning();
    }
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  Future<void> _cancel(Reservation r) async {
    if (_canceling) return;
    final l = context.l;
    _canceling = true;
    try {
      await ref.read(backendProvider).cancelReservation(r.id);
      ref.invalidate(currentReservationProvider);
      // O mapa mostra "Reserva cancelada" (design: toast no mapa).
      ref.read(flashProvider.notifier).show(l.reservationCanceled);
      if (mounted) context.go('/home');
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      _canceling = false;
    }
  }

  /// Segundos restantes (arredondados para cima, como um cronometro), nunca
  /// mais que a duracao da reserva: mesmo com o relogio do aparelho atrasado
  /// (o clockProvider ja corrige pelo `Date` do servidor), nao passa de 15:00.
  int _remaining(Reservation r) {
    final ms = r.expiresAt.difference(_now).inMilliseconds;
    return math.min((ms / 1000).ceil(), r.expiresAt.difference(r.createdAt).inSeconds);
  }

  void _back() => context.canPop() ? context.pop() : context.go('/home');

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final res = ref.watch(currentReservationProvider);
    final r = res.value;
    if (r == null) {
      // Carregando, erro ou sem reserva: tela simples com voltar.
      return VoltiScaffold(
        title: l.reservedTitle,
        body: AsyncView<Reservation?>(
          value: res,
          onRetry: () => ref.invalidate(currentReservationProvider),
          data: (_) => VoltiEmptyState(
            icon: LucideIcons.clock,
            title: l.noReservation,
            message: l.noReservationText,
            actionLabel: l.goToMap,
            actionIcon: LucideIcons.map,
            onAction: () => context.go('/home'),
          ),
        ),
      );
    }

    final user = ref.watch(userLocationProvider).value;
    final total = r.expiresAt.difference(r.createdAt).inSeconds;
    final remaining = _remaining(r);
    final expired = remaining <= 0;
    final v = r.vehicle;
    final bike = v == null ? null : LatLng(v.lat, v.lng);
    final walkM = bike == null ? null : (user == null ? v!.distanceM : haversineMeters(user, bike));
    final center = bike ?? user ?? fallbackCenter;

    // Voltar do sistema: sem tela embaixo (veio por deep link), vai ao mapa.
    return PopScope(
      canPop: Navigator.canPop(context),
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) context.go('/home');
      },
      child: Scaffold(
        body: Stack(
          children: [
            Positioned.fill(
              child: !ref.watch(mapEnabledProvider)
                  ? const ColoredBox(key: Key('reserved-map'), color: VoltiColors.mapLand)
                  : VoltiMap(
                      key: const Key('reserved-map'),
                      controller: _map,
                      center: center,
                      zoom: 17,
                      layers: [
                        if (user != null && bike != null) DrawnPolyline(points: walkingPath(user, bike), color: VoltiColors.coral500),
                        MarkerLayer(
                          markers: [
                            if (bike != null)
                              Marker(
                                point: bike,
                                width: 56,
                                height: 64,
                                child: VehicleMarker(v!.status, v.batteryPct, customerStyle: true, selected: true),
                              ),
                            if (bike != null && walkM != null)
                              Marker(
                                point: bike,
                                width: 180,
                                height: 40,
                                // Flutua acima do pin de 64 px (centro 60 px acima do ponto).
                                alignment: const Alignment(0, -3),
                                child: Center(
                                  child: RouteInfoPill(minutes: walkingMinutes(walkM), distance: walkingDistanceLabel(walkM)),
                                ),
                              ),
                            if (user != null)
                              Marker(
                                point: user,
                                width: 40,
                                height: 40,
                                child: Semantics(label: l.yourLocation, child: const VoltiUserDot(heading: true)),
                              ),
                          ],
                        ),
                      ],
                    ),
            ),
            // Leitores de tela: a rota e a pilula sao desenho; o resumo fica aqui.
            if (walkM != null)
              Semantics(
                key: const Key('reserved-route-semantics'),
                label: l.walkRouteSemantics(walkingMinutes(walkM), walkingDistanceLabel(walkM)),
                child: const SizedBox.shrink(),
              ),
            // Barra do topo do design (`LocationHeader` a 20 px das bordas, logo
            // abaixo da status bar): avatar, "Sua localizacao" e sino.
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 4, VoltiSpacing.screenGutter, 0),
                  child: const LocationHeader(),
                ),
              ),
            ),
            // "Voltar" so para leitor de tela (o design nao tem o botao): no canto
            // superior esquerdo, primeiro na ordem de leitura; sem area de toque
            // (o toque passa para o mapa). O voltar do sistema tambem funciona.
            Positioned(
              top: 0,
              left: 0,
              width: 48,
              height: math.max(MediaQuery.paddingOf(context).top, 24),
              child: Semantics(key: const Key('reserved-back'), button: true, label: l.back, onTap: _back, child: const SizedBox.expand()),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              // Design: painel a 40 px da borda de baixo (ou acima da barra do sistema).
              child: SafeArea(
                top: false,
                minimum: const EdgeInsets.only(bottom: 40),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: VoltiStagger.wrap([
                      Align(
                        alignment: Alignment.centerRight,
                        child: VoltiIconButton(
                          key: const Key('reserved-locate'),
                          icon: LucideIcons.locateFixed,
                          iconColor: VoltiColors.brand,
                          label: l.locateMe,
                          onPressed: () {
                            ref.invalidate(userLocationProvider);
                            if (ref.read(mapEnabledProvider)) _map.move(user ?? center, 17);
                          },
                        ),
                      ),
                      const SizedBox(height: VoltiSpacing.s14),
                      if (expired)
                        NoticeBanner(
                          danger: true,
                          icon: LucideIcons.clock,
                          title: l.reservationExpiredTitle,
                          message: l.reservationExpiredText,
                        )
                      else
                        Semantics(
                          label: l.reservationRemaining(clock(remaining)),
                          child: ReservationBanner(
                            key: const Key('reservation-banner'),
                            seconds: remaining,
                            label: l.reservationTimeLeft,
                            swipeLabel: l.swipeToCancel,
                            totalSeconds: total > 0 ? total : null,
                            onCancel: () => _cancel(r),
                          ),
                        ),
                      const SizedBox(height: VoltiSpacing.s14),
                      VoltiButton(
                        key: const Key('reserved-scan'),
                        label: expired ? l.goToMap : l.scanQr,
                        icon: expired ? LucideIcons.map : LucideIcons.scanQrCode,
                        size: VoltiButtonSize.lg,
                        fullWidth: true,
                        onPressed: expired
                            ? () => context.go('/home')
                            : () => context.push(Uri(path: '/scan', queryParameters: {if (v != null) 'v': v.code}).toString()),
                      ),
                    ]),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
