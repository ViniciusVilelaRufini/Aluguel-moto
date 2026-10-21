//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'geo_json_polygon_type.g.dart';

class GeoJsonPolygonType extends EnumClass {
  @BuiltValueEnumConst(wireName: r'Polygon')
  static const GeoJsonPolygonType polygon = _$polygon;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const GeoJsonPolygonType unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<GeoJsonPolygonType> get serializer =>
      _$geoJsonPolygonTypeSerializer;

  const GeoJsonPolygonType._(String name) : super(name);

  static BuiltSet<GeoJsonPolygonType> get values => _$values;
  static GeoJsonPolygonType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class GeoJsonPolygonTypeMixin = Object with _$GeoJsonPolygonTypeMixin;
