import 'package:built_collection/built_collection.dart';
import 'package:volti_api/volti_api.dart';

/// Quadrado de ~200 m em volta de (lat, lng).
GeoZone zoneAround(double lat, double lng, {String name = 'Pç. Oswaldo Cruz', ZoneType type = ZoneType.return_, String id = 'z1'}) {
  const d = 0.001;
  return GeoZone((b) => b
    ..id = id
    ..name = name
    ..type = type
    ..active = true
    ..createdAt = DateTime.utc(2026)
    ..updatedAt = DateTime.utc(2026)
    ..geometry.type = GeoJsonPolygonType.polygon
    ..geometry.coordinates = ListBuilder<BuiltList<BuiltList<double>>>([
      BuiltList<BuiltList<double>>([
        BuiltList<double>([lng - d, lat - d]),
        BuiltList<double>([lng + d, lat - d]),
        BuiltList<double>([lng + d, lat + d]),
        BuiltList<double>([lng - d, lat + d]),
        BuiltList<double>([lng - d, lat - d]),
      ]),
    ]));
}
