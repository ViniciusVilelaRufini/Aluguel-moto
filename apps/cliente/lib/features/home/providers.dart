import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';

import '../../core/backend.dart';
import '../../core/services.dart';

/// Centro de Sao Paulo quando a localizacao nao esta disponivel.
const fallbackCenter = LatLng(-23.5614, -46.6559);

final userLocationProvider = FutureProvider<LatLng?>((ref) => ref.watch(locationServiceProvider).currentPosition());

final minBatteryFilterProvider = NotifierProvider<MinBatteryFilter, int>(MinBatteryFilter.new);

class MinBatteryFilter extends Notifier<int> {
  @override
  int build() => 0;
  void set(int v) => state = v;
}

final nearbyProvider = FutureProvider.autoDispose<List<VehicleSummary>>((ref) async {
  final loc = await ref.watch(userLocationProvider.future) ?? fallbackCenter;
  final all = await ref.watch(backendProvider).nearby(loc.latitude, loc.longitude);
  final min = ref.watch(minBatteryFilterProvider);
  return all.where((v) => v.batteryPct >= min).toList();
});

final zonesProvider = FutureProvider.autoDispose<List<GeoZone>>((ref) => ref.watch(backendProvider).zones());

final currentReservationProvider = FutureProvider.autoDispose<Reservation?>((ref) => ref.watch(backendProvider).currentReservation());

final currentRentalProvider = FutureProvider.autoDispose<Rental?>((ref) => ref.watch(backendProvider).currentRental());
