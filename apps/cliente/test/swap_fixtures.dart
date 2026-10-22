// Fixtures da troca de bateria na estacao (station_swap_test e o fix round 1).
import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/l10n/app_localizations_pt.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';

final l = AppLocalizationsPt();

const largoId = 'd0000000-0000-4000-8000-000000000001';
const largoQr = 'vst1.d0000000-0000-4000-8000-000000000001.lMyoiWvb5xuRTHIzBFoxEQ';
const largo = LatLng(-23.5667, -46.6936);

SwapStation station({String id = largoId, String name = 'Estação Largo da Batata', int available = 9, bool open24h = true, LatLng at = largo}) => SwapStation(
  (b) => b
    ..id = id
    ..name = name
    ..address = 'R. Teodoro Sampaio, 2000'
    ..lat = at.latitude
    ..lng = at.longitude
    ..availableBatteries = available
    ..totalSlots = 12
    ..openingHours = 'Seg a sáb, 7h às 22h'
    ..open24h = open24h,
);

StationSwap swapFx({
  StationSwapStatus status = StationSwapStatus.openingSlot,
  int? slot,
  int fee = 500,
  StationSwapEndReason? reason,
  DateTime? expiresAt,
  DateTime? updatedAt,
}) => StationSwap(
  (b) => b
    ..id = 'sw1'
    ..stationId = largoId
    ..rentalId = 'r1'
    ..status = status
    ..slotNumber = slot
    ..feeCents = fee
    ..endReason = reason
    ..expiresAt = expiresAt ?? thu10.add(const Duration(minutes: 3))
    ..createdAt = thu10
    ..updatedAt = updatedAt,
);

var scanNow = thu10;

AppFailure apiError(int status, String slug) => AppFailure(kind: FailureKind.api, status: status, slug: slug, detail: 'texto cru da API');

/// ~[meters] ao norte de [p].
LatLng north(LatLng p, double meters) => LatLng(p.latitude + meters / 111320, p.longitude);

class SwapBackend extends GalpaoBackend {
  Rental? rentalNow = sampleRental();
  List<SwapStation> stationList = [station()];
  StationSwap server = swapFx();
  Object? swapCreateError;
  int swapCreates = 0;
  final keys = <String>[];
  final positions = <LatLng>[];
  int gets = 0;
  int swapCancels = 0;
  int vehicleBattery = 80;
  Completer<void>? getGate;
  Completer<void>? createGate;

  @override
  Future<Rental?> currentRental() async => rentalNow;
  @override
  Future<Rental> rental(String id) async => rentalNow!;
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle(battery: vehicleBattery);
  @override
  Future<List<SwapStation>> swapStations({double? lat, double? lng}) async => stationList;
  @override
  Future<StationSwap> createStationSwap({
    required String stationId,
    required String stationCode,
    required String rentalId,
    required double lat,
    required double lng,
    required String idempotencyKey,
  }) async {
    swapCreates++;
    keys.add(idempotencyKey);
    positions.add(LatLng(lat, lng));
    final gate = createGate;
    if (gate != null) await gate.future;
    final e = swapCreateError;
    if (e != null) throw e;
    return server;
  }

  @override
  Future<StationSwap> stationSwap(String stationId, String swapId) async {
    gets++;
    // Resposta "velha": o estado lido agora chega depois do portao.
    final snapshot = server;
    final gate = getGate;
    if (gate != null) {
      getGate = null;
      await gate.future;
    }
    return snapshot;
  }

  @override
  Future<StationSwap> cancelStationSwap(String stationId, String swapId) async {
    swapCancels++;
    server = server.rebuild((b) => b
      ..status = StationSwapStatus.canceled
      ..endReason = StationSwapEndReason.canceledByCustomer);
    return server;
  }
}

class PhoneAt extends FakeLocation {
  PhoneAt(this.at, {this.track = const []});
  final LatLng? at;
  final List<LatLng> track;
  @override
  Future<bool> ensurePermission() async => true;
  @override
  Future<bool> hasPermission() async => true;
  @override
  Future<LatLng?> currentPosition({bool requestPermission = false}) async => at;
  @override
  Stream<LatLng> trackDuringRental({required String notificationTitle, required String notificationText}) => Stream.fromIterable(track);
}

Future<void> settle(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 300));
  }
}

