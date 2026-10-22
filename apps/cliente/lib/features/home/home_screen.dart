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
import '../ride/ride_screen.dart' show mapEnabledProvider;
import '../pick/pick_logic.dart';
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

  /// Pins que ja cairam: remontar (pan/culling, lista mudando, GPS chegando)
  /// nao repete a animacao. A sequencia com atraso so vale na primeira carga.
  final _dropped = <String>{};

  @override
  void initState() {
    super.initState();
    // Push: registra o token (no-op sem Firebase).
    Future.microtask(() => ref.read(pushServiceProvider).register(ref.read(backendProvider)));
    WidgetsBinding.instance.addPostFrameCallback((_) => _askLocationOnce());
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
      VoltiHaptics.success();
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
    final filter = ref.watch(homeFilterProvider);
    final session = ref.watch(sessionProvider).value;
    final unread = ref.watch(supportUnreadProvider).value ?? false;
    final promoFirstRide = firstRideFree(session?.customer, promoActive: kFirstRidePromo);
    final vehicles = applyHomeFilter(nearby.value ?? const <VehicleSummary>[], filter, zones);
    final place = nearestPlaceName(loc, zones);
    VehicleSummary? selected;
    for (final v in vehicles) {
      if (v.id == _selectedId) selected = v;
    }
    final center = loc ?? fallbackCenter;
    final firstLoad = _dropped.isEmpty;
    final newIds = [for (final v in vehicles) if (!_dropped.contains(v.id)) v.id];
    if (newIds.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _dropped.addAll(newIds));
    }

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: !ref.watch(mapEnabledProvider)
                ? const ColoredBox(color: VoltiColors.mapLand)
                : VoltiMap(
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
                      key: const ValueKey('user-dot'),
                      point: loc,
                      width: 22,
                      height: 22,
                      child: Semantics(label: l.yourLocation, child: const VoltiUserDot()),
                    ),
                  // Pins caem em sequencia (260 ms + 70 ms por pin, limitado a 12).
                  for (final (i, v) in vehicles.indexed)
                    Marker(
                      key: ValueKey('pin-${v.id}'),
                      point: LatLng(v.lat, v.lng),
                      width: 56,
                      height: 64,
                      child: Semantics(
                        button: true,
                        label: l.vehicleSemantics(v.model, v.batteryPct),
                        child: VehicleMarker(v.status, v.batteryPct,
                            customerStyle: true,
                            animateIn: !_dropped.contains(v.id),
                            delay: firstLoad ? Duration(milliseconds: 260 + (i < 12 ? i : 12) * 70) : Duration.zero,
                            selected: v.id == _selectedId,
                            onTap: () {
                              if (_selectedId != v.id) VoltiHaptics.selection();
                              setState(() => _selectedId = v.id);
                            }),
                      ),
                    ),
                ]),
              ],
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: VoltiSpacing.screenGutter),
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
                      child: Row(children: [
                        _Avatar(
                          initials: initialsOf(session?.customer?.name),
                          label: l.account,
                          onTap: () => context.push('/account'),
                        ),
                        const SizedBox(width: VoltiSpacing.s12),
                        Expanded(child: Center(child: _LocationPill(label: l.yourLocation, place: place ?? l.nearYou))),
                        const SizedBox(width: VoltiSpacing.s12),
                        VoltiIconButton(
                          key: const Key('home-bell'),
                          icon: LucideIcons.bell,
                          dot: unread,
                          label: unread ? l.notificationsUnread : l.notifications,
                          onPressed: () => context.push('/account/support'),
                        ),
                      ]),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
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
                    ]),
                  ),
                  // Promocoes (PassCard) e filtros, em faixas que rolam na horizontal.
                  SingleChildScrollView(
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
                  SingleChildScrollView(
                    key: const Key('home-filters'),
                    scrollDirection: Axis.horizontal,
                    clipBehavior: Clip.none,
                    padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
                    child: Row(
                      children: VoltiStagger.wrap(startIndex: 2, [
                        for (final (f, label, icon) in [
                          (HomeFilter.all, l.filterAll, LucideIcons.bike),
                          (HomeFilter.range10, l.filterRange10, LucideIcons.zap),
                          (HomeFilter.pickupPoints, l.filterPickupPoints, LucideIcons.mapPinned),
                        ])
                          Padding(
                            padding: const EdgeInsets.only(right: VoltiSpacing.s8),
                            child: VoltiChip(
                              label: label,
                              icon: icon,
                              selected: filter == f,
                              elevated: true,
                              onTap: () {
                                if (filter != f) VoltiHaptics.selection();
                                ref.read(homeFilterProvider.notifier).set(f);
                              },
                            ),
                          ),
                      ]),
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
                      VoltiEnter(
                        key: ValueKey('sheet-${selected.id}'),
                        duration: VoltiMotion.durScreen,
                        curve: VoltiMotion.easeScreen,
                        fromOffset: const Offset(0, 120),
                        // Arrastar para baixo fecha, com mola se soltar antes.
                        child: VoltiDragToDismiss(
                          key: const Key('vehicle-sheet-drag'),
                          dismissLabel: l.close,
                          onDismiss: () => setState(() => _selectedId = null),
                          child: _VehicleSheet(
                        vehicle: selected,
                        busy: _busy,
                        // Mesmas regras da lista: KYC, inadimplencia, reserva ou corrida ativa.
                        reserveBlocked: reserveBlock(
                              session: session,
                              selected: true,
                              hasReservation: reservation != null,
                              hasRental: rental != null,
                            ) !=
                            ReserveBlock.none,
                        onReserve: () => _reserve(selected!),
                        onRing: reservation?.vehicleId == selected.id ? () => _ring(selected!) : null,
                        onClose: () => setState(() => _selectedId = null),
                      ),
                        ),
                      )
                    else if (nearby.isLoading)
                      Container(
                        key: const Key('nearby-skeleton'),
                        padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.s16, vertical: VoltiSpacing.s8),
                        decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
                        child: VoltiSkeleton.list(rows: 1, trailing: false, label: l.loading),
                      )
                    else if (vehicles.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(VoltiSpacing.s16),
                        decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
                        child: VoltiEmptyState(
                          compact: true,
                          icon: LucideIcons.bike,
                          title: l.noVehiclesNearby,
                          message: l.noVehiclesNearbyText,
                          actionLabel: l.retry,
                          actionIcon: LucideIcons.refreshCw,
                          onAction: () => ref.invalidate(nearbyProvider),
                        ),
                      ),
                    if (selected == null) ...[
                      const SizedBox(height: VoltiSpacing.s12),
                      VoltiFadeUp(
                        child: Row(children: [
                          Flexible(
                            child: VoltiChip(
                              key: const Key('home-pick'),
                              label: l.chooseBike,
                              icon: LucideIcons.list,
                              elevated: true,
                              onTap: () => context.push('/pick'),
                            ),
                          ),
                          const SizedBox(width: VoltiSpacing.s12),
                          const Spacer(),
                          VoltiIconButton(
                            icon: LucideIcons.locateFixed,
                            iconColor: VoltiColors.brand,
                            label: l.locateMe,
                            onPressed: () {
                              ref.invalidate(userLocationProvider);
                              _map.move(center, 16);
                            },
                          ),
                        ]),
                      ),
                    ],
                    const SizedBox(height: VoltiSpacing.s16),
                    VoltiFadeUp(
                      delay: VoltiMotion.staggerDelay(1),
                      child: VoltiButton(
                        label: l.scanToRide,
                        icon: LucideIcons.scanLine,
                        size: VoltiButtonSize.lg,
                        fullWidth: true,
                        shine: true,
                        onPressed: () => context.push('/scan'),
                      ),
                    ),
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
        TextButton(
          onPressed: onTap,
          style: TextButton.styleFrom(minimumSize: const Size(48, VoltiSpacing.hitMin)),
          child: Text(action, style: const TextStyle(color: VoltiColors.green400, fontWeight: FontWeight.w600)),
        ),
      ]),
    );
  }
}

class _VehicleSheet extends StatelessWidget {
  const _VehicleSheet({
    required this.vehicle,
    required this.busy,
    required this.reserveBlocked,
    required this.onReserve,
    required this.onRing,
    required this.onClose,
  });
  final VehicleSummary vehicle;
  final bool busy, reserveBlocked;
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
          // Grabber: sinaliza que o cartao arrasta para baixo.
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
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
          Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: VoltiStagger.wrap([
            BatteryPill(vehicle.batteryPct, rangeKm: vehicle.estimatedRangeKm.round()),
            if (dist != null) RouteInfoPill(minutes: walkingMinutes(dist), distance: walkingDistanceLabel(dist)),
          ])),
          const SizedBox(height: VoltiSpacing.s14),
          Row(children: [
            Expanded(
              child: VoltiButton(
                label: l.reserve15,
                variant: VoltiButtonVariant.secondary,
                icon: LucideIcons.clock,
                fullWidth: true,
                onPressed: (busy || reserveBlocked) ? null : onReserve,
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

/// Avatar com as iniciais (design `LocationHeader`): abre a conta.
class _Avatar extends StatelessWidget {
  const _Avatar({required this.initials, required this.label, required this.onTap});
  final String? initials;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return VoltiPressable(
      onTap: onTap,
      scale: VoltiMotion.iconPressScale,
      semanticLabel: label,
      child: Container(
        key: const Key('home-avatar'),
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: VoltiColors.sun300,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2),
          boxShadow: VoltiShadows.shadow1,
        ),
        child: initials == null
            ? const Icon(LucideIcons.user, size: 20, color: VoltiColors.ink900)
            : Text(
                initials!,
                // Cabe no disco de 44 px em qualquer escala de texto (a semantica diz "Conta").
                textScaler: TextScaler.noScaling,
                style: const TextStyle(
                  fontFamily: VoltiTypography.fontSans,
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  height: 1,
                  color: VoltiColors.ink900,
                ),
              ),
      ),
    );
  }
}

/// Pilula central "Sua localizacao · lugar".
class _LocationPill extends StatelessWidget {
  const _LocationPill({required this.label, required this.place});
  final String label, place;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      container: true,
      label: '$label · $place',
      child: ExcludeSemantics(
        child: Container(
          key: const Key('home-location'),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: const BoxDecoration(color: VoltiColors.glassBg, borderRadius: VoltiRadii.rPill, boxShadow: VoltiShadows.shadow1),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(LucideIcons.navigation, size: 12, color: VoltiColors.brand),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant),
                ),
              ),
            ]),
            Text(
              place,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: VoltiTypography.bodyStrong.copyWith(color: VoltiColors.ink900),
            ),
          ]),
        ),
      ),
    );
  }
}
