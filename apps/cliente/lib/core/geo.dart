import 'dart:math' as math;

import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';

/// Ponto dentro do poligono (anel externo GeoJSON, [lng, lat]).
bool pointInZone(double lat, double lng, GeoZone zone) {
  final rings = zone.geometry.coordinates;
  if (rings.isEmpty) return false;
  final ring = rings.first;
  var inside = false;
  for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    final xi = ring[i][0], yi = ring[i][1];
    final xj = ring[j][0], yj = ring[j][1];
    final crosses = (yi > lat) != (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

List<LatLng> zoneRing(GeoZone zone) {
  final rings = zone.geometry.coordinates;
  if (rings.isEmpty) return const [];
  return [for (final p in rings.first) LatLng(p[1], p[0])];
}

/// Minutos a pe (~80 m/min). Nunca mostramos km rodados, so a distancia a pe ate a moto.
int walkingMinutes(int meters) => math.max(1, (meters / 80).round());

String walkingDistanceLabel(int meters) =>
    meters >= 1000 ? '${(meters / 1000).toStringAsFixed(1).replaceAll('.', ',')} km' : '$meters m';

/// "R$ 12,90" a partir de centavos.
String money(int cents) {
  final neg = cents < 0;
  final abs = cents.abs();
  final reais = abs ~/ 100;
  final c = (abs % 100).toString().padLeft(2, '0');
  final s = reais.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.');
  return '${neg ? '-' : ''}R\$ $s,$c';
}

String clock(int seconds) {
  final h = seconds ~/ 3600;
  final m = ((seconds % 3600) ~/ 60).toString().padLeft(2, '0');
  final s = (seconds % 60).toString().padLeft(2, '0');
  return h > 0 ? '$h:$m:$s' : '$m:$s';
}
