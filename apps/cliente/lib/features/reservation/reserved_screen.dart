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
import '../../core/widgets.dart';
import '../home/providers.dart';

class ReservedScreen extends ConsumerStatefulWidget {
  const ReservedScreen({super.key});
  @override
  ConsumerState<ReservedScreen> createState() => _ReservedScreenState();
}

class _ReservedScreenState extends ConsumerState<ReservedScreen> {
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  Future<void> _cancel(Reservation r) async {
    final l = context.l;
    try {
      await ref.read(backendProvider).cancelReservation(r.id);
      ref.invalidate(currentReservationProvider);
      if (mounted) context.go('/home');
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
  }

  Future<void> _ring(Reservation r) async {
    final l = context.l;
    try {
      await ref.read(backendProvider).ring(r.vehicleId);
      if (mounted) VoltiToast.show(context, l.ringSent);
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final res = ref.watch(currentReservationProvider);
    final user = ref.watch(userLocationProvider).value;
    return VoltiScaffold(
      title: l.reservedTitle,
      body: AsyncView<Reservation?>(
        value: res,
        onRetry: () => ref.invalidate(currentReservationProvider),
        data: (r) {
          if (r == null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text(l.noReservation, style: VoltiTypography.body, textAlign: TextAlign.center),
                  const SizedBox(height: VoltiSpacing.s16),
                  VoltiButton(label: l.goToMap, onPressed: () => context.go('/home')),
                ]),
              ),
            );
          }
          final remaining = r.expiresAt.difference(DateTime.now().toUtc()).inSeconds;
          final v = r.vehicle;
          final expired = remaining <= 0;
          return ListView(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            children: [
              if (expired)
                NoticeBanner(
                    danger: true, icon: LucideIcons.clock, title: l.reservationExpiredTitle, message: l.reservationExpiredText)
              else
                Semantics(
                  label: l.reservationRemaining(clock(remaining)),
                  child: ReservationBanner(
                    seconds: remaining,
                    label: l.reservationTimeLeft,
                    swipeLabel: l.swipeToCancel,
                    onCancel: () => _cancel(r),
                  ),
                ),
              const SizedBox(height: VoltiSpacing.s16),
              if (v != null) ...[
                Text(v.model, style: VoltiTypography.heading),
                Text(l.vehicleCode(v.code), style: VoltiTypography.caption),
                const SizedBox(height: VoltiSpacing.s10),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  BatteryPill(v.batteryPct, rangeKm: v.estimatedRangeKm.round()),
                  if (v.distanceM != null) RouteInfoPill(minutes: walkingMinutes(v.distanceM!), distance: walkingDistanceLabel(v.distanceM!)),
                ]),
                const SizedBox(height: VoltiSpacing.s16),
                ClipRRect(
                  borderRadius: VoltiRadii.rLg,
                  child: SizedBox(
                    height: 220,
                    child: VoltiMap(
                      center: LatLng(v.lat, v.lng),
                      zoom: 17,
                      interactive: false,
                      layers: [
                        if (user != null)
                          PolylineLayer(polylines: [
                            Polyline(points: [user, LatLng(v.lat, v.lng)], color: VoltiColors.brand, strokeWidth: 4),
                          ]),
                        MarkerLayer(markers: [
                          Marker(
                              point: LatLng(v.lat, v.lng),
                              width: 56,
                              height: 64,
                              child: VehicleMarker(v.status, v.batteryPct, selected: true)),
                        ]),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: VoltiSpacing.s20),
              VoltiButton(
                label: l.scanToRide,
                icon: LucideIcons.scanLine,
                size: VoltiButtonSize.lg,
                fullWidth: true,
                onPressed: expired ? null : () => context.push('/scan'),
              ),
              const SizedBox(height: VoltiSpacing.s10),
              VoltiButton(
                label: l.ringHorn,
                icon: LucideIcons.volume2,
                variant: VoltiButtonVariant.secondary,
                fullWidth: true,
                onPressed: expired ? null : () => _ring(r),
              ),
            ],
          );
        },
      ),
    );
  }
}
