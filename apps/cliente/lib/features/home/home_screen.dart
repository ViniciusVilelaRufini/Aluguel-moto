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
import '../../core/services.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';
import 'providers.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _map = MapController();
  String? _selectedId;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    // Push: registra o token (no-op sem Firebase).
    Future.microtask(() => ref.read(pushServiceProvider).register(ref.read(backendProvider)));
  }

  Color _zoneColor(ZoneType t) {
    if (t == ZoneType.return_) return VoltiColors.brand;
    if (t == ZoneType.forbidden) return VoltiColors.danger;
    if (t == ZoneType.reducedSpeed) return VoltiColors.warning;
    return VoltiColors.blue500;
  }

  Future<void> _reserve(VehicleSummary v) async {
    final l = context.l;
    setState(() => _busy = true);
    try {
      await ref.read(backendProvider).reserve(v.id);
      ref.invalidate(currentReservationProvider);
      if (mounted) context.push('/reserved');
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _ring(VehicleSummary v) async {
    final l = context.l;
    try {
      await ref.read(backendProvider).ring(v.id);
      if (mounted) VoltiToast.show(context, l.ringSent);
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final loc = ref.watch(userLocationProvider).value;
    final nearby = ref.watch(nearbyProvider);
    final zones = ref.watch(zonesProvider).value ?? const <GeoZone>[];
    final reservation = ref.watch(currentReservationProvider).value;
    final rental = ref.watch(currentRentalProvider).value;
    final minBattery = ref.watch(minBatteryFilterProvider);
    final session = ref.watch(sessionProvider).value;
    final vehicles = nearby.value ?? const <VehicleSummary>[];
    VehicleSummary? selected;
    for (final v in vehicles) {
      if (v.id == _selectedId) selected = v;
    }
    final center = loc ?? fallbackCenter;

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: VoltiMap(
              controller: _map,
              center: center,
              layers: [
                PolygonLayer(polygons: [
                  for (final z in zones.where((z) => z.active))
                    Polygon(
                      points: zoneRing(z),
                      color: _zoneColor(z.type).withValues(alpha: 0.14),
                      borderColor: _zoneColor(z.type),
                      borderStrokeWidth: 1.5,
                    ),
                ]),
                MarkerLayer(markers: [
                  if (loc != null)
                    Marker(
                      point: loc,
                      width: 22,
                      height: 22,
                      child: Semantics(
                        label: l.yourLocation,
                        child: Container(
                          decoration: BoxDecoration(
                              color: VoltiColors.brand, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 3)),
                        ),
                      ),
                    ),
                  for (final v in vehicles)
                    Marker(
                      point: LatLng(v.lat, v.lng),
                      width: 56,
                      height: 64,
                      child: Semantics(
                        button: true,
                        label: l.vehicleSemantics(v.model, v.batteryPct),
                        child: VehicleMarker(v.status, v.batteryPct,
                            selected: v.id == _selectedId, onTap: () => setState(() => _selectedId = v.id)),
                      ),
                    ),
                ]),
              ],
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
              child: Column(
                children: [
                  Row(children: [
                    VoltiIconButton(
                      icon: LucideIcons.user,
                      label: l.account,
                      onPressed: () => context.push('/account'),
                    ),
                    const SizedBox(width: VoltiSpacing.s10),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                            color: VoltiColors.glassBg, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
                        child: Text(
                          session?.customer?.name == null ? l.nearbyTitle : l.greeting(session!.customer!.name!.split(' ').first),
                          style: VoltiTypography.bodyStrong.copyWith(color: VoltiColors.ink900),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ]),
                  const SizedBox(height: VoltiSpacing.s10),
                  if (rental != null)
                    _ActiveBanner(
                      icon: LucideIcons.bike,
                      text: l.rentalInProgress,
                      action: l.backToRide,
                      onTap: () => context.push('/ride'),
                    )
                  else if (reservation != null)
                    _ActiveBanner(
                      icon: LucideIcons.clock,
                      text: l.reservationActive,
                      action: l.seeReservation,
                      onTap: () => context.push('/reserved'),
                    ),
                  if (session != null && session.kyc != KycStatus.approved)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: GestureDetector(
                        onTap: () => context.push('/account/verification'),
                        child: NoticeBanner(
                          icon: LucideIcons.shieldCheck,
                          title: l.kycPendingTitle,
                          message: l.kycHomeNotice,
                        ),
                      ),
                    ),
                  const SizedBox(height: VoltiSpacing.s8),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: FilterChip(
                      label: Text(l.filterBattery),
                      avatar: const Icon(LucideIcons.batteryFull, size: 16),
                      selected: minBattery >= 50,
                      onSelected: (v) => ref.read(minBatteryFilterProvider.notifier).set(v ? 50 : 0),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (nearby.hasError)
                      Container(
                        decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow2),
                        padding: const EdgeInsets.all(VoltiSpacing.s12),
                        child: ErrorState(error: nearby.error!, onRetry: () => ref.invalidate(nearbyProvider)),
                      )
                    else if (selected != null)
                      _VehicleSheet(
                        vehicle: selected,
                        busy: _busy,
                        hasReservation: reservation != null,
                        onReserve: () => _reserve(selected!),
                        onRing: reservation?.vehicleId == selected.id ? () => _ring(selected!) : null,
                        onClose: () => setState(() => _selectedId = null),
                      )
                    else if (nearby.isLoading)
                      const Center(child: LinearProgressIndicator())
                    else if (vehicles.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(VoltiSpacing.s16),
                        decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
                        child: Text(l.noVehiclesNearby, style: VoltiTypography.body),
                      ),
                    const SizedBox(height: VoltiSpacing.s12),
                    Row(children: [
                      Expanded(
                        child: VoltiButton(
                          label: l.scanToRide,
                          icon: LucideIcons.scanLine,
                          size: VoltiButtonSize.lg,
                          fullWidth: true,
                          onPressed: () => context.push('/scan'),
                        ),
                      ),
                      const SizedBox(width: VoltiSpacing.s10),
                      VoltiIconButton(
                        icon: LucideIcons.locateFixed,
                        label: l.locateMe,
                        size: 56,
                        onPressed: () {
                          ref.invalidate(userLocationProvider);
                          _map.move(center, 16);
                        },
                      ),
                    ]),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActiveBanner extends StatelessWidget {
  const _ActiveBanner({required this.icon, required this.text, required this.action, required this.onTap});
  final IconData icon;
  final String text, action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
      decoration: BoxDecoration(color: VoltiColors.ink900, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow2),
      child: Row(children: [
        Icon(icon, color: Colors.white, size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: VoltiTypography.bodyStrong.copyWith(color: Colors.white))),
        TextButton(onPressed: onTap, child: Text(action, style: const TextStyle(color: VoltiColors.green400))),
      ]),
    );
  }
}

class _VehicleSheet extends StatelessWidget {
  const _VehicleSheet({
    required this.vehicle,
    required this.busy,
    required this.hasReservation,
    required this.onReserve,
    required this.onRing,
    required this.onClose,
  });
  final VehicleSummary vehicle;
  final bool busy, hasReservation;
  final VoidCallback onReserve, onClose;
  final VoidCallback? onRing;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final dist = vehicle.distanceM;
    return Container(
      padding: const EdgeInsets.all(VoltiSpacing.s16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: VoltiRadii.rXl,
        boxShadow: VoltiShadows.shadowSheet,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(vehicle.model, style: VoltiTypography.heading),
                Text(l.vehicleCode(vehicle.code), style: VoltiTypography.caption),
              ]),
            ),
            VoltiIconButton(icon: LucideIcons.x, variant: VoltiIconButtonVariant.ghost, label: l.close, onPressed: onClose),
          ]),
          const SizedBox(height: VoltiSpacing.s10),
          Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
            BatteryPill(vehicle.batteryPct, rangeKm: vehicle.estimatedRangeKm.round()),
            if (dist != null) RouteInfoPill(minutes: walkingMinutes(dist), distance: walkingDistanceLabel(dist)),
          ]),
          const SizedBox(height: VoltiSpacing.s14),
          Row(children: [
            Expanded(
              child: VoltiButton(
                label: l.reserve15,
                variant: VoltiButtonVariant.secondary,
                icon: LucideIcons.clock,
                fullWidth: true,
                onPressed: (busy || hasReservation) ? null : onReserve,
              ),
            ),
            if (onRing != null) ...[
              const SizedBox(width: VoltiSpacing.s10),
              VoltiIconButton(icon: LucideIcons.volume2, label: l.ringHorn, onPressed: onRing),
            ],
          ]),
        ],
      ),
    );
  }
}
