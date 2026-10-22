import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/code_sheet.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/launcher.dart';
import '../../core/session.dart';
import '../../core/shared_vehicle.dart';
import '../../core/widgets.dart';
import '../pick/pick_logic.dart';
import 'providers.dart';

/// Cartao da moto no mapa (design `VehicleSheet`): resumo da moto, chips
/// "Buzinar e piscar" / "Navegar" / "Reportar problema", linha do cupom e o par
/// "Escanear QR" + "Reservar".
///
/// Buzina: o contrato so aceita `POST /vehicles/{id}/ring` para a moto
/// reservada ou alugada pelo cliente (403 nas outras), entao o chip fica
/// desligado com o motivo ate a reserva ([ringAllowed]).
class VehicleSheet extends ConsumerStatefulWidget {
  const VehicleSheet({
    super.key,
    required this.vehicle,
    required this.onClose,
    required this.onScan,
    required this.onReserve,
    this.ringAllowed = false,
    this.reserveBlocked = false,
    this.busy = false,
    this.mediaKey,
    this.hideMedia,
  });

  final VehicleSummary vehicle;
  final VoidCallback onClose, onScan, onReserve;
  final bool ringAllowed, reserveBlocked, busy;

  /// Chave da midia (destino do voo pin -> cartao).
  final GlobalKey? mediaKey;

  /// `true` enquanto o voo do pin cobre a midia.
  final ValueListenable<bool>? hideMedia;

  @override
  ConsumerState<VehicleSheet> createState() => _VehicleSheetState();
}

class _VehicleSheetState extends ConsumerState<VehicleSheet> {
  bool _ringing = false;

  Future<void> _ring() async {
    final l = context.l;
    setState(() => _ringing = true);
    try {
      await ref.read(backendProvider).ring(widget.vehicle.id);
      VoltiHaptics.success();
      if (mounted) VoltiToast.show(context, l.ringSent);
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _ringing = false);
    }
  }

  Future<void> _navigate() async {
    final l = context.l;
    final v = widget.vehicle;
    final ok = await openWalkingRoute(ref.read(urlLauncherProvider), v.lat, v.lng);
    if (!ok && mounted) VoltiToast.show(context, l.navigateFailed, tone: VoltiToastTone.danger);
  }

  /// Mesmo fluxo da corrida, sem aluguel: `IncidentCreate` aceita so `vehicleId`.
  Future<void> _report() async {
    final l = context.l;
    final problems = [l.problemTire, l.problemBrake, l.problemBattery, l.problemLights, l.problemOther];
    final picked = await VoltiBottomSheet.show<String>(
      context,
      builder: (ctx) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Semantics(header: true, child: Text(l.reportTitle, style: VoltiTypography.title)),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 4, children: [
          for (final p in problems) VoltiChip(label: p, onTap: () => Navigator.of(ctx).pop(p)),
        ]),
      ]),
    );
    if (picked == null || !mounted) return;
    try {
      await ref.read(backendProvider).reportIncident(IncidentCategory.vehicleProblem, picked, vehicleId: widget.vehicle.id);
      if (mounted) VoltiToast.show(context, l.reportVehicleSentText);
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
  }

  Future<void> _coupon() async {
    final l = context.l;
    final current = ref.read(pendingCouponProvider);
    final result = await VoltiBottomSheet.show<String>(
      context,
      builder: (ctx) => CodeEntrySheet(
        title: l.promoCoupon,
        actionLabel: l.couponSave,
        initial: current,
        removeLabel: current.isEmpty ? null : l.couponRemove,
        fieldKey: const Key('coupon-field'),
      ),
    );
    if (result == null || !mounted) return;
    ref.read(pendingCouponProvider.notifier).set(result);
    if (result.isNotEmpty) VoltiToast.show(context, l.couponSaved);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final v = widget.vehicle;
    final minute = ref.watch(minutePriceProvider).value;
    final session = ref.watch(sessionProvider).value;
    final promo = firstRideFree(session?.customer, promoActive: kFirstRidePromo);
    final coupon = ref.watch(pendingCouponProvider);
    final scheme = Theme.of(context).colorScheme;

    Widget media(Widget child) {
      final hide = widget.hideMedia;
      if (hide == null) return child;
      return ValueListenableBuilder<bool>(
        valueListenable: hide,
        builder: (context, hidden, c) => Opacity(opacity: hidden ? 0 : 1, child: c),
        child: child,
      );
    }

    final hornChip = VoltiChip(
      key: const Key('sheet-horn'),
      icon: LucideIcons.megaphone,
      label: l.hornAndFlash,
      onTap: widget.ringAllowed && !_ringing ? _ring : null,
    );

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: VoltiRadii.rXl,
        boxShadow: VoltiShadows.shadowSheet,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Grabber: sinaliza que o cartao arrasta para baixo.
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(color: scheme.outlineVariant, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          Stack(children: [
            Padding(
              padding: const EdgeInsets.only(right: 36),
              // Midia = elemento compartilhado com o scan e o plano (E-15); sem voo em reduced motion.
              child: media(HeroMode(
                enabled: !VoltiMotion.reduced(context),
                child: VehicleSummaryCard(
                mediaKey: widget.mediaKey,
                heroTag: vehicleHeroTag(v.code),
                category: l.vehicleCategoryDefault,
                name: v.model,
                batteryPct: v.batteryPct,
                rangeKm: v.estimatedRangeKm.round(),
                promo: promo ? l.promoFirstRideBadge : null,
                price: minute == null ? null : l.pricePerMinutePlusFee(money(minute)),
              ))),
            ),
            Positioned(
              top: 0,
              right: 0,
              child: VoltiIconButton(
                icon: LucideIcons.x,
                variant: VoltiIconButtonVariant.soft,
                size: 32,
                label: l.close,
                onPressed: widget.onClose,
              ),
            ),
          ]),
          const SizedBox(height: VoltiSpacing.s12),
          Text(l.vehicleCode(v.code), style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
          const SizedBox(height: VoltiSpacing.s6),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            clipBehavior: Clip.none,
            child: Row(children: [
              if (widget.ringAllowed)
                hornChip
              else
                // Desligado com o motivo: tocar mostra a dica e o leitor de tela le o tooltip.
                Tooltip(
                  key: const Key('sheet-horn-reason'),
                  message: l.hornNeedsReservation,
                  triggerMode: TooltipTriggerMode.tap,
                  child: Opacity(opacity: .45, child: hornChip),
                ),
              const SizedBox(width: VoltiSpacing.s8),
              VoltiChip(key: const Key('sheet-navigate'), icon: LucideIcons.navigation, label: l.navigate, onTap: _navigate),
              const SizedBox(width: VoltiSpacing.s8),
              VoltiChip(key: const Key('sheet-report'), icon: LucideIcons.circleAlert, label: l.reportProblem, onTap: _report),
            ]),
          ),
          const SizedBox(height: VoltiSpacing.s8),
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: scheme.surfaceContainerHighest, borderRadius: VoltiRadii.rLg),
            child: ListRow(
              key: const Key('sheet-coupon'),
              icon: LucideIcons.ticket,
              iconTone: ListRowTone.sun,
              title: l.promoCoupon,
              value: coupon.isEmpty ? null : coupon,
              onTap: _coupon,
            ),
          ),
          const SizedBox(height: VoltiSpacing.s16),
          Row(children: [
            Expanded(
              child: VoltiButton(
                key: const Key('sheet-scan'),
                label: l.scanQr,
                icon: LucideIcons.scanQrCode,
                size: VoltiButtonSize.lg,
                fullWidth: true,
                onPressed: widget.onScan,
              ),
            ),
            const SizedBox(width: VoltiSpacing.s10),
            Expanded(
              child: VoltiButton(
                key: const Key('sheet-reserve'),
                label: l.reserve,
                icon: LucideIcons.bookmark,
                variant: VoltiButtonVariant.secondary,
                size: VoltiButtonSize.lg,
                fullWidth: true,
                loading: widget.busy,
                onPressed: widget.reserveBlocked ? null : widget.onReserve,
              ),
            ),
          ]),
        ],
      ),
    );
  }
}
