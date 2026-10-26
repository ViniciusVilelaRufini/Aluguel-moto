import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/app_channel.dart';
import '../../core/backend.dart';
import '../../core/clock.dart';
import '../../core/errors.dart';
import '../../core/flash.dart';
import '../../core/launcher.dart';
import '../../core/widgets.dart';
import '../handover/handover_watch.dart';
import '../home/depot_providers.dart';
import '../home/providers.dart';
import '../pickup/depot_hours.dart';
import '../pickup/depot_labels.dart';
import '../plan/pix_sheet.dart';

/// Reserva confirmada (spec 2026-10-22 §3.6): QR do `pickupCode` para o
/// operador ler no galpao, moto, horario ou prazo, endereco com "Como chegar"
/// (o app de mapas so abre quando o cliente toca) e **Cancelar reserva** (gratis).
/// Com a entrega aberta (`handover`) a API recusa o cancelamento: o botao some e
/// o aviso manda usar "Apontar problema", com **Conferir moto** para abrir a
/// entrega. O [HandoverWatcher] abre "Confira sua moto" quando o operador cria a
/// entrega (`handover.pending`).
class DepotReservationScreen extends ConsumerStatefulWidget {
  const DepotReservationScreen({super.key, required this.reservationId});
  final String reservationId;
  @override
  ConsumerState<DepotReservationScreen> createState() => _DepotReservationScreenState();
}

class _DepotReservationScreenState extends ConsumerState<DepotReservationScreen> {
  bool _canceling = false;
  bool _testHandoverBusy = false;

  void _back() {
    final router = GoRouter.maybeOf(context);
    if (router != null && router.canPop()) {
      router.pop();
    } else {
      context.go('/home');
    }
  }

  Future<void> _cancel(Reservation r) async {
    final l = context.l;
    final ok = await VoltiDialog.show<bool>(
      context,
      title: l.cancelReservationTitle,
      icon: const Icon(LucideIcons.calendarX, size: 32, color: VoltiColors.danger),
      message: Text(l.cancelReservationText),
      actions: [
        VoltiButton(
          key: const Key('reservation-cancel-confirm'),
          label: l.cancelReservation,
          variant: VoltiButtonVariant.danger,
          fullWidth: true,
          onPressed: () => Navigator.of(context).pop(true),
        ),
        VoltiButton(label: l.keepReservation, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
      ],
    );
    if (ok != true || !mounted || _canceling) return;
    setState(() => _canceling = true);
    try {
      await ref.read(backendProvider).cancelReservation(r.id);
      ref.read(createdReservationProvider.notifier).set(null);
      ref.invalidate(currentReservationProvider);
      ref.invalidate(depotsProvider);
      ref.read(flashProvider.notifier).show(l.reservationCanceled);
      if (mounted) context.go('/home');
    } catch (e) {
      final f = toFailure(e);
      ref.invalidate(currentReservationProvider);
      if (mounted) {
        VoltiToast.show(
          context,
          f.status == 409 && f.slug == 'reservation-in-handover' ? l.reservationInHandover : f.message(l),
          tone: VoltiToastTone.danger,
        );
      }
    } finally {
      if (mounted) setState(() => _canceling = false);
    }
  }

  /// "Retirar moto (teste)" (so no canal beta): a API simula a equipe do galpao e
  /// a entrega abre direto em "Confira sua moto".
  Future<void> _testHandover(Reservation r) async {
    if (_testHandoverBusy) return;
    setState(() => _testHandoverBusy = true);
    try {
      final h = await ref.read(backendProvider).createTestHandover(r.id);
      if (!mounted) return;
      ref.invalidate(currentReservationProvider);
      // So abre se o HandoverWatcher (evento handover.pending ou nova consulta) ainda nao abriu esta entrega.
      if (ref.read(autoOpenedHandoversProvider.notifier).claim(h.id)) context.push('/handover/${h.id}');
    } catch (e) {
      if (!mounted) return;
      ref.invalidate(currentReservationProvider);
      VoltiToast.show(context, toFailure(e).message(context.l), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _testHandoverBusy = false);
    }
  }

  Future<void> _directions(Depot d) async {
    final ok = await openDirections(ref.read(urlLauncherProvider), d.lat, d.lng);
    if (!ok && mounted) VoltiToast.show(context, context.l.navigateFailed, tone: VoltiToastTone.danger);
  }

  Future<void> _payPix(Deposit d) async {
    await PixDepositSheet.show(context, d);
    ref.invalidate(currentReservationProvider);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final res = ref.watch(currentReservationProvider);
    final created = ref.watch(createdReservationProvider);
    final createdHere = created?.id == widget.reservationId ? created : null;
    var found = res.value?.id == widget.reservationId ? res.value : null;
    // Recem-criada: usa a resposta do POST enquanto o GET carrega (ou falha) e
    // completa o `pickupCode` se o GET vier sem ele.
    if (found == null && createdHere != null && (!res.hasValue || res.hasError || res.isLoading)) found = createdHere;
    if (found != null && (found.pickupCode ?? '').isEmpty && (createdHere?.pickupCode ?? '').isNotEmpty) {
      found = found.rebuild((b) => b.pickupCode = createdHere!.pickupCode);
    }
    if (found == null) {
      return VoltiScaffold(
        title: l.depotReservationTitle,
        body: AsyncView<Reservation?>(
          value: res,
          onRetry: () => ref.invalidate(currentReservationProvider),
          data: (_) => VoltiEmptyState(
            icon: LucideIcons.calendarX,
            title: l.reservationNotFound,
            message: l.reservationNotFoundText,
            actionLabel: l.goHome,
            actionIcon: LucideIcons.house,
            onAction: () => context.go('/home'),
          ),
        ),
      );
    }

    final r = found;
    final scheme = Theme.of(context).colorScheme;
    final depot = r.depotId == null ? null : ref.watch(depotByIdProvider(r.depotId!)).value;
    final offset = tzOffset(depot?.timezone ?? 'America/Sao_Paulo');
    DateTime wall(DateTime utc) => utc.toUtc().add(offset);
    final handover = r.status == ReservationStatus.handover;
    final testHandover = r.status == ReservationStatus.active && ref.watch(appChannelProvider) == AppChannel.beta;
    final deposit = r.deposit;
    final pixPending = r.depositMethod == DepositMethod.pix && deposit?.pix != null && deposit!.status == DepositStatus.awaitingPix;
    final v = r.vehicle;

    final String when;
    String? grace;
    if (r.pickupMode == PickupMode.scheduled && r.pickupAt != null) {
      final at = wall(r.pickupAt!);
      final today = LocalDay.of(wall(ref.watch(clockProvider)()));
      when = l.reservationScheduledAt(dayInSentence(l, LocalDay.of(at), today), hhmm(at));
      grace = l.reservationGrace(hhmm(wall(r.expiresAt)));
    } else {
      when = l.reservationPickupUntil(hhmm(wall(r.expiresAt)));
    }

    final code = r.pickupCode;
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, VoltiSpacing.s8),
              child: Row(children: [
                VoltiIconButton(icon: LucideIcons.arrowLeft, size: 40, label: l.back, onPressed: _back),
                const SizedBox(width: VoltiSpacing.s12),
                Expanded(child: Semantics(header: true, child: Text(l.depotReservationTitle, style: VoltiTypography.heading))),
              ]),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 4, VoltiSpacing.screenGutter, VoltiSpacing.s24),
                children: VoltiStagger.wrap([
                  HandoverWatcher(reservation: r),
                  if (handover) ...[
                    Semantics(
                      liveRegion: true,
                      child: NoticeBanner(key: const Key('reservation-handover'), icon: LucideIcons.packageCheck, message: l.reservationInHandover),
                    ),
                    if (r.handoverId != null) ...[
                      const SizedBox(height: VoltiSpacing.s8),
                      VoltiButton(
                        key: const Key('reservation-see-handover'),
                        label: l.reservationSeeHandover,
                        icon: LucideIcons.clipboardCheck,
                        fullWidth: true,
                        onPressed: () => context.push('/handover/${r.handoverId}'),
                      ),
                    ],
                    const SizedBox(height: VoltiSpacing.s12),
                  ],
                  if (pixPending) ...[
                    NoticeBanner(icon: LucideIcons.qrCode, message: l.reservationPixPending),
                    const SizedBox(height: VoltiSpacing.s8),
                    VoltiButton(label: l.payPixDeposit, icon: LucideIcons.qrCode, fullWidth: true, onPressed: () => _payPix(deposit)),
                    const SizedBox(height: VoltiSpacing.s12),
                  ],
                  // QR sempre em preto sobre branco (leitura pelo operador, tambem no tema escuro).
                  Container(
                    key: const Key('reservation-qr'),
                    padding: const EdgeInsets.all(VoltiSpacing.s16),
                    decoration: BoxDecoration(color: VoltiColors.white, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1), // tema: fixo (cartao do QR)
                    child: Column(children: [
                      if (code == null || code.isEmpty) ...[
                        Semantics(
                          liveRegion: true,
                          child: NoticeBanner(key: const Key('reservation-no-code'), icon: LucideIcons.circleAlert, message: l.reservationNoCode),
                        ),
                        const SizedBox(height: VoltiSpacing.s8),
                        VoltiButton(
                          key: const Key('reservation-code-retry'),
                          label: l.retry,
                          icon: LucideIcons.refreshCw,
                          variant: VoltiButtonVariant.secondary,
                          fullWidth: true,
                          onPressed: () => ref.invalidate(currentReservationProvider),
                        ),
                      ] else
                        Semantics(
                          image: true,
                          label: l.reservationQrLabel,
                          child: ExcludeSemantics(
                            child: QrImageView(
                              data: code,
                              size: 200,
                              padding: EdgeInsets.zero,
                              backgroundColor: VoltiColors.white, // tema: fixo (QR)
                              eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: VoltiColors.ink900),
                              dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: VoltiColors.ink900),
                            ),
                          ),
                        ),
                      const SizedBox(height: VoltiSpacing.s12),
                      Text(l.reservationQrHint, textAlign: TextAlign.center, style: VoltiTypography.bodyStrong.copyWith(color: VoltiColors.ink900)),
                    ]),
                  ),
                  const SizedBox(height: VoltiSpacing.s16),
                  Container(
                    padding: const EdgeInsets.all(VoltiSpacing.s16),
                    decoration: BoxDecoration(color: scheme.surface, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (v != null)
                          Row(children: [
                            VehicleThumb(size: 48, semanticLabel: v.model),
                            const SizedBox(width: VoltiSpacing.s12),
                            Expanded(child: Text(l.vehicleModelCode(v.model, v.code), style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface))),
                          ]),
                        if (v != null) const SizedBox(height: VoltiSpacing.s12),
                        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Icon(LucideIcons.clock, size: 18, color: context.palette.textBrand),
                          const SizedBox(width: VoltiSpacing.s8),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(when, key: const Key('reservation-when'), style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface)),
                              if (grace != null) Text(grace, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
                            ]),
                          ),
                        ]),
                      ],
                    ),
                  ),
                  if (depot != null) ...[
                    const SizedBox(height: VoltiSpacing.s12),
                    Container(
                      padding: const EdgeInsets.all(VoltiSpacing.s16),
                      decoration: BoxDecoration(color: scheme.surface, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Icon(LucideIcons.warehouse, size: 18, color: context.palette.textBrand),
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
                            key: const Key('reservation-directions'),
                            label: l.howToGetThere,
                            icon: LucideIcons.navigation,
                            variant: VoltiButtonVariant.secondary,
                            fullWidth: true,
                            onPressed: () => _directions(depot),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (testHandover) ...[
                    const SizedBox(height: VoltiSpacing.s16),
                    VoltiButton(
                      key: const Key('reservation-test-handover'),
                      label: l.reservationTestHandover,
                      icon: LucideIcons.flaskConical,
                      variant: VoltiButtonVariant.secondary,
                      fullWidth: true,
                      loading: _testHandoverBusy,
                      onPressed: _testHandoverBusy ? null : () => _testHandover(r),
                    ),
                    const SizedBox(height: VoltiSpacing.s4),
                    Text(
                      l.reservationTestHandoverHint,
                      textAlign: TextAlign.center,
                      style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  ],
                  if (!handover) ...[
                    const SizedBox(height: VoltiSpacing.s16),
                    VoltiButton(
                      key: const Key('reservation-cancel'),
                      label: l.cancelReservation,
                      icon: LucideIcons.x,
                      variant: VoltiButtonVariant.ghost,
                      fullWidth: true,
                      loading: _canceling,
                      onPressed: _canceling ? null : () => _cancel(r),
                    ),
                  ],
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
