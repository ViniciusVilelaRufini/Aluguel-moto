// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'geo_json_polygon_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const GeoJsonPolygonType _$polygon = const GeoJsonPolygonType._('polygon');
const GeoJsonPolygonType _$unknownDefaultOpenApi =
    const GeoJsonPolygonType._('unknownDefaultOpenApi');

GeoJsonPolygonType _$valueOf(String name) {
  switch (name) {
    case 'polygon':
      return _$polygon;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<GeoJsonPolygonType> _$values =
    BuiltSet<GeoJsonPolygonType>(const <GeoJsonPolygonType>[
  _$polygon,
  _$unknownDefaultOpenApi,
]);

class _$GeoJsonPolygonTypeMeta {
  const _$GeoJsonPolygonTypeMeta();
  GeoJsonPolygonType get polygon => _$polygon;
  GeoJsonPolygonType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  GeoJsonPolygonType valueOf(String name) => _$valueOf(name);
  BuiltSet<GeoJsonPolygonType> get values => _$values;
}

abstract class _$GeoJsonPolygonTypeMixin {
  // ignore: non_constant_identifier_names
  _$GeoJsonPolygonTypeMeta get GeoJsonPolygonType =>
      const _$GeoJsonPolygonTypeMeta();
}

Serializer<GeoJsonPolygonType> _$geoJsonPolygonTypeSerializer =
    _$GeoJsonPolygonTypeSerializer();

class _$GeoJsonPolygonTypeSerializer
    implements PrimitiveSerializer<GeoJsonPolygonType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'polygon': 'Polygon',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'Polygon': 'polygon',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[GeoJsonPolygonType];
  @override
  final String wireName = 'GeoJsonPolygonType';

  @override
  Object serialize(Serializers serializers, GeoJsonPolygonType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  GeoJsonPolygonType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      GeoJsonPolygonType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
