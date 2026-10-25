import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/clock.dart';
import '../../core/launcher.dart';
import '../../core/shared_vehicle.dart';
import '../../core/widgets.dart';
import '../pickup/depot_hours.dart';
import '../pickup/depot_labels.dart';
import 'depot_providers.dart';
import 'providers.dart';

/// Reserva em aberto (ativa ou com a entrega aberta): a home troca o cartao do
/// galpao pelo [HomeReservationCard]. So ha uma reserva por cliente.
bool isPendingReservation(Reservation? r) => r != null && (r.status == ReservationStatus.active || r.status == ReservationStatus.handover);

/// Tempo que falta para `expiresAt`, entre zero e a duracao da reserva
/// (`expiresAt - createdAt`; em "retirar agora" tambem no maximo
/// [windowMinutes], o `pickupNowWindowMinutes` do galpao). Relogio do aparelho
/// atrasado nunca mostra mais tempo que a reserva tem.
Duration reservationRemaining(Reservation r, DateTime now, {int? windowMinutes}) {
  var total = r.expiresAt.toUtc().difference(r.createdAt.toUtc());
  if (r.pickupMode != PickupMode.scheduled && windowMinutes != null) {
    final w = Duration(minutes: windowMinutes);
    if (total <= Duration.zero || w < total) total = w;
  }
  var left = r.expiresAt.toUtc().difference(now.toUtc());
  if (left < Duration.zero) left = Duration.zero;
  if (total > Duration.zero && left > total) left = total;
  return left;
}

/// "1:28:00" com hora, "09:05" sem.
String formatCountdown(Duration d) {
  String two(int n) => n.toString().padLeft(2, '0');
  final h = d.inHours, m = d.inMinutes % 60, s = d.inSeconds % 60;
  return h > 0 ? '$h:${two(m)}:${two(s)}' : '${two(m)}:${two(s)}';
}

/// Cartao "Sua reserva" da home (spec 2026-10-22 §3.1, no lugar da faixa escura
/// "Moto reservada"): foto do modelo (ou icone), nome e codigo, o status
/// ("Retire até 15:28" com a contagem, "Retirada agendada · amanhã às 09:00" ou
/// "Sua moto está sendo entregue"), o galpao com "Como chegar" (so ao tocar) e
/// **Ver QR da reserva** / **Conferir moto**.
///
/// A contagem anda de segundo em segundo so com a tela visivel ([TickerMode]:
/// coberta por outra rota, para) e o app em primeiro plano. Ao zerar recarrega a
/// reserva uma vez (a API devolve `expired`/nada e a home volta ao galpao). O
/// leitor de tela recebe o tempo em minutos, nao a cada segundo.
class HomeReservationCard extends ConsumerStatefulWidget {
  const HomeReservationCard({super.key, required this.reservation});
  final Reservation reservation;

  @override
  ConsumerState<HomeReservationCard> createState() => _HomeReservationCardState();
}

class _HomeReservationCardState extends ConsumerState<HomeReservationCard> with WidgetsBindingObserver {
  Timer? _timer;
  bool _visible = true;
  bool _foreground = true;

  /// Reserva (id + prazo) que ja pediu recarga ao zerar: uma vez so.
  String? _refreshedFor;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _foreground = (WidgetsBinding.instance.lifecycleState ?? AppLifecycleState.resumed) == AppLifecycleState.resumed;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _visible = TickerMode.valuesOf(context).enabled;
    _sync();
  }

  @override
  void didUpdateWidget(HomeReservationCard old) {
    super.didUpdateWidget(old);
    _sync();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final was = _foreground;
    _foreground = state == AppLifecycleState.resumed;
    if (_foreground && !was && mounted) setState(() {});
    _sync();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  void _sync() {
    final run = widget.reservation.status == ReservationStatus.active && _visible && _foreground;
    if (run && _timer == null) {
      _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
      _checkExpiry();
    } else if (!run) {
      _timer?.cancel();
      _timer = null;
    }
  }

  Duration _remaining() {
    final r = widget.reservation;
    final depot = r.depotId == null ? null : ref.read(depotByIdProvider(r.depotId!)).value;
    return reservationRemaining(r, ref.read(clockProvider)(), windowMinutes: depot?.pickupNowWindowMinutes);
  }

  void _tick() {
    if (!mounted) return;
    setState(() {});
    _checkExpiry();
  }

  /// Zerou: recarrega a reserva (e as motos do galpao, que voltam a ficar livres).
  void _checkExpiry() {
    final r = widget.reservation;
    if (r.status != ReservationStatus.active || _remaining() > Duration.zero) return;
    final key = '${r.id}@${r.expiresAt.toIso8601String()}';
    if (_refreshedFor == key) return;
    _refreshedFor = key;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.invalidate(currentReservationProvider);
      ref.invalidate(depotsProvider);
    });
  }

  Future<void> _directions(Depot d) async {
    final ok = await openDirections(ref.read(urlLauncherProvider), d.lat, d.lng);
    if (!ok && mounted) VoltiToast.show(context, context.l.navigateFailed, tone: VoltiToastTone.danger);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final r = widget.reservation;
    final now = ref.watch(clockProvider)();
    final depot = r.depotId == null ? null : ref.watch(depotByIdProvider(r.depotId!)).value;
    final models = ref.watch(vehicleModelsProvider).value ?? const <String, VehicleModel>{};
    final v = r.vehicle;
    final photoUrl = models[v?.vehicleModelId]?.photoUrl ?? models.values.where((m) => m.name == v?.model).firstOrNull?.photoUrl;
    final offset = tzOffset(depot?.timezone ?? 'America/Sao_Paulo');
    DateTime wall(DateTime utc) => utc.toUtc().add(offset);

    final handover = r.status == ReservationStatus.handover;
    final scheduled = !handover && r.pickupMode == PickupMode.scheduled && r.pickupAt != null;
    final remaining = reservationRemaining(r, now, windowMinutes: depot?.pickupNowWindowMinutes);
    final expired = !handover && remaining == Duration.zero;
    final counting = !handover && !scheduled && !expired;

    final name = v?.model ?? l.reservationActive;
    final vehicle = v == null ? name : '${v.model} ${v.code}';
    final String status, a11y;
    final IconData statusIcon;
    final Color statusBg, statusInk;
    if (handover) {
      status = l.homeReservationHandover;
      a11y = l.homeReservationA11yHandover(vehicle);
      statusIcon = LucideIcons.packageCheck;
      statusBg = context.palette.infoSoft;
      statusInk = context.palette.infoInk;
    } else if (expired) {
      status = l.homeReservationExpired;
      a11y = l.homeReservationA11yExpired(vehicle);
      statusIcon = LucideIcons.circleAlert;
      statusBg = context.palette.dangerSoft;
      statusInk = context.palette.dangerInkStrong;
    } else if (scheduled) {
      final at = wall(r.pickupAt!);
      final day = dayInSentence(l, LocalDay.of(at), LocalDay.of(wall(now)));
      status = l.homeReservationScheduled(day, hhmm(at));
      a11y = l.homeReservationA11yScheduled(vehicle, day, hhmm(at));
      statusIcon = LucideIcons.calendarClock;
      statusBg = context.palette.brandSoft;
      statusInk = context.palette.successInk;
    } else {
      final until = hhmm(wall(r.expiresAt));
      status = l.reservationPickupUntil(until);
      a11y = l.homeReservationA11yNow(vehicle, until);
      statusIcon = LucideIcons.clock;
      statusBg = context.palette.brandSoft;
      statusInk = context.palette.successInk;
    }

    final handoverId = r.handoverId;
    final openHandover = handover && handoverId != null;

    return Semantics(
      container: true,
      label: a11y,
      child: Container(
        key: const Key('home-reservation-card'),
        width: double.infinity,
        padding: const EdgeInsets.all(VoltiSpacing.s16),
        decoration: BoxDecoration(color: scheme.surface, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Informacoes rolam por dentro com texto grande; o botao fica sempre a vista.
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // O rotulo do container ja diz modelo, codigo e status.
                    ExcludeSemantics(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          VehicleThumb(size: 56, image: vehiclePhoto(photoUrl, iconSize: 24)),
                          const SizedBox(width: VoltiSpacing.s12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(l.homeReservationTitle, style: VoltiTypography.overline.copyWith(color: context.palette.textBrand)),
                                const SizedBox(height: 2),
                                Text(name, style: VoltiTypography.heading.copyWith(color: scheme.onSurface)),
                                if (v != null)
                                  Text(
                                    v.code,
                                    style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant, fontFamily: VoltiTypography.fontMono),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: VoltiSpacing.s12),
                    Container(
                      key: const Key('home-reservation-status'),
                      padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.s12, vertical: VoltiSpacing.s10),
                      decoration: BoxDecoration(color: statusBg, borderRadius: VoltiRadii.rMd),
                      child: Wrap(
                        spacing: VoltiSpacing.s8,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        alignment: WrapAlignment.spaceBetween,
                        children: [
                          ExcludeSemantics(
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(statusIcon, size: 18, color: statusInk),
                                const SizedBox(width: VoltiSpacing.s8),
                                Flexible(
                                  child: Text(status, style: VoltiTypography.bodyStrong.copyWith(color: statusInk)),
                                ),
                              ],
                            ),
                          ),
                          if (counting)
                            Semantics(
                              container: true,
                              // Em minutos (arredondado para cima): muda no maximo uma vez por minuto.
                              label: l.homeReservationRemaining((remaining.inSeconds + 59) ~/ 60),
                              child: ExcludeSemantics(
                                child: Text(
                                  formatCountdown(remaining),
                                  key: const Key('home-reservation-countdown'),
                                  style: VoltiTypography.bodyStrong.copyWith(
                                    color: statusInk,
                                    fontFamily: VoltiTypography.fontMono,
                                    fontWeight: VoltiTypography.fwBold,
                                    fontFeatures: const [FontFeature.tabularFigures()],
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (depot != null) ...[
                      const SizedBox(height: VoltiSpacing.s12),
                      // No proprio no: o rotulo do cartao fica so com modelo e status.
                      MergeSemantics(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: EdgeInsets.only(top: 2),
                              child: Icon(LucideIcons.warehouse, size: 18, color: context.palette.textBrand),
                            ),
                            const SizedBox(width: VoltiSpacing.s8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(depotTitle(l, depot), style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface)),
                                  Text(depot.address, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: VoltiSpacing.s8),
                      Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: Semantics(
                          container: true,
                          child: VoltiButton(
                            key: const Key('home-reservation-directions'),
                            label: l.howToGetThere,
                            icon: LucideIcons.navigation,
                            variant: VoltiButtonVariant.secondary,
                            size: VoltiButtonSize.md,
                            onPressed: () => _directions(depot),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: VoltiSpacing.s16),
            // No proprio no (sem isso o botao se fundia ao rotulo do cartao).
            Semantics(
              container: true,
              child: VoltiButton(
                key: const Key('home-reservation-open'),
                label: openHandover ? l.reservationSeeHandover : l.homeReservationShowQr,
                icon: openHandover ? LucideIcons.clipboardCheck : LucideIcons.qrCode,
                size: VoltiButtonSize.lg,
                fullWidth: true,
                onPressed: () => context.push(openHandover ? '/handover/$handoverId' : '/reservation/${r.id}'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
