import 'dart:math' as math;

import 'package:flutter/widgets.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

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

/// Centro aproximado da zona (media dos vertices do anel externo, sem o ponto de fechamento).
LatLng zoneCenter(GeoZone zone) {
  var ring = zoneRing(zone);
  if (ring.length > 1 && ring.first == ring.last) ring = ring.sublist(0, ring.length - 1);
  if (ring.isEmpty) return const LatLng(0, 0);
  var lat = 0.0, lng = 0.0;
  for (final p in ring) {
    lat += p.latitude;
    lng += p.longitude;
  }
  return LatLng(lat / ring.length, lng / ring.length);
}

/// Primeira zona que contem o ponto.
GeoZone? zoneContaining(double lat, double lng, Iterable<GeoZone> zones) {
  for (final z in zones) {
    if (pointInZone(lat, lng, z)) return z;
  }
  return null;
}

const _distance = Distance();

/// Zona que contem [p] ou, se nenhuma, a de centro mais proximo.
GeoZone? nearestZone(LatLng p, Iterable<GeoZone> zones) {
  final inside = zoneContaining(p.latitude, p.longitude, zones);
  if (inside != null) return inside;
  GeoZone? best;
  var bestD = double.infinity;
  for (final z in zones) {
    final d = _distance.as(LengthUnit.Meter, p, zoneCenter(z));
    if (d < bestD) {
      bestD = d;
      best = z;
    }
  }
  return best;
}

/// Teto de pontos da rota desenhada na corrida (memoria e custo de desenho
/// limitados mesmo em alugueis longos).
const kTrailMaxPoints = 1500;

/// Acrescenta [p] a [trail] (no lugar, sem copiar) se a moto andou pelo menos
/// [minMeters] (evita tremidas do GPS parado). Passando de [maxPoints], dizima
/// a trilha (ver [decimateTrail]). Devolve `true` se a trilha mudou.
bool appendTrail(List<LatLng> trail, LatLng p, {double minMeters = 3, int maxPoints = kTrailMaxPoints}) {
  if (trail.isNotEmpty && _distance.as(LengthUnit.Meter, trail.last, p) < minMeters) return false;
  trail.add(p);
  if (trail.length > maxPoints) decimateTrail(trail, maxPoints);
  return true;
}

/// Reduz [trail] (no lugar) ate [maxPoints] tirando um ponto sim, um nao do
/// meio, sempre mantendo o primeiro e o ultimo. Cada passada corta pela metade,
/// entao o custo por ponto acrescentado e constante (amortizado).
void decimateTrail(List<LatLng> trail, int maxPoints) {
  assert(maxPoints >= 2);
  while (trail.length > maxPoints) {
    final last = trail.last;
    var w = 1;
    for (var r = 2; r < trail.length - 1; r += 2) {
      trail[w++] = trail[r];
    }
    trail.length = w;
    trail.add(last);
  }
}

/// Junta o trajeto salvo e os pontos ao vivo numa passada so (filtro de
/// [minMeters]) e dizima uma vez no fim.
List<LatLng> mergeTrail(Iterable<LatLng> saved, Iterable<LatLng> live, {double minMeters = 3, int maxPoints = kTrailMaxPoints}) {
  final out = <LatLng>[];
  for (final src in [saved, live]) {
    for (final p in src) {
      if (out.isEmpty || _distance.as(LengthUnit.Meter, out.last, p) >= minMeters) out.add(p);
    }
  }
  if (out.length > maxPoints) decimateTrail(out, maxPoints);
  return out;
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

/// "12 min 14 s", "25 min", "42 s", "1 h 02 min" (recibo; CONTENT: numeros BR).
String durationLabel(int seconds) {
  final h = seconds ~/ 3600;
  final m = (seconds % 3600) ~/ 60;
  final s = seconds % 60;
  if (h > 0) return '$h h ${m.toString().padLeft(2, '0')} min';
  if (m > 0) return s > 0 ? '$m min $s s' : '$m min';
  return '$s s';
}

String clock(int seconds) {
  final h = seconds ~/ 3600;
  final m = ((seconds % 3600) ~/ 60).toString().padLeft(2, '0');
  final s = (seconds % 60).toString().padLeft(2, '0');
  return h > 0 ? '$h:$m:$s' : '$m:$s';
}

/// America/Sao_Paulo. O Brasil nao tem horario de verao desde 2019, entao o fuso e UTC-3 fixo
/// e dispensa o banco de fusos (se o horario de verao voltar, trocar por `package:timezone`).
DateTime toSaoPaulo(DateTime d) => d.toUtc().subtract(const Duration(hours: 3));

/// "21/10/2026 14:05" no horario de Sao Paulo, independente do fuso do aparelho.
String formatDateTimeSp(DateTime d) {
  final x = toSaoPaulo(d);
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(x.day)}/${two(x.month)}/${x.year} ${two(x.hour)}:${two(x.minute)}';
}

/// Polyline que se desenha sozinha (1,1 s, apos 300 ms), para camadas do
/// flutter_map. Com reduced motion ja aparece completa. Com [animate] falso
/// (ex.: mapa recriado durante a corrida) aparece completa direto.
class DrawnPolyline extends StatelessWidget {
  const DrawnPolyline({super.key, required this.points, required this.color, this.strokeWidth = 4, this.animate = true});
  final List<LatLng> points;
  final Color color;
  final double strokeWidth;
  final bool animate;

  Polyline _line(List<LatLng> pts) => Polyline(
        points: pts,
        color: color,
        strokeWidth: strokeWidth,
        strokeCap: StrokeCap.round,
        strokeJoin: StrokeJoin.round,
      );

  @override
  Widget build(BuildContext context) {
    if (!animate) return PolylineLayer(polylines: [_line(points)]);
    return VoltiRouteDraw(
      builder: (context, t) => PolylineLayer(polylines: [
        _line(VoltiRouteDraw.partial<LatLng>(
          points,
          t,
          lerp: (a, b, f) => LatLng(a.latitude + (b.latitude - a.latitude) * f, a.longitude + (b.longitude - a.longitude) * f),
          dist: (a, b) => math.sqrt(math.pow(a.latitude - b.latitude, 2) + math.pow(a.longitude - b.longitude, 2)),
        )),
      ]),
    );
  }
}

/// Enquadramento de um trajeto num mapa pequeno (recibo): centro e zoom que
/// cobrem o trajeto. Trajeto degenerado (< [degenerateMeters], moto parada) vira
/// um ponto com zoom de rua e [path] falso (so os pins).
({LatLng center, double zoom, bool path}) trackCamera(List<LatLng> pts, {double degenerateMeters = 20}) {
  assert(pts.isNotEmpty);
  var minLat = pts.first.latitude, maxLat = minLat, minLng = pts.first.longitude, maxLng = minLng;
  for (final p in pts) {
    minLat = math.min(minLat, p.latitude);
    maxLat = math.max(maxLat, p.latitude);
    minLng = math.min(minLng, p.longitude);
    maxLng = math.max(maxLng, p.longitude);
  }
  final center = LatLng((minLat + maxLat) / 2, (minLng + maxLng) / 2);
  final meters = const Distance()(LatLng(minLat, minLng), LatLng(maxLat, maxLng));
  if (meters < degenerateMeters) return (center: center, zoom: 17, path: false);
  final span = math.max(maxLat - minLat, (maxLng - minLng) * math.cos(center.latitudeInRad)).clamp(1e-6, 360.0);
  final zoom = (math.log(360 * 1.4 / span) / math.ln2 - .6).clamp(12.0, 17.0);
  return (center: center, zoom: zoom, path: true);
}
