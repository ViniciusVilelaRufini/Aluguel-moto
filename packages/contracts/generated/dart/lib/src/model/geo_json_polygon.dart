//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/geo_json_polygon_type.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'geo_json_polygon.g.dart';

/// GeoJSON Polygon (RFC 7946), WGS84, `[lng, lat]`. Primeiro anel = contorno; demais = buracos. Cada anel fechado (primeiro ponto = último), mínimo 4 posições.
///
/// Properties:
/// * [type]
/// * [coordinates]
@BuiltValue()
abstract class GeoJsonPolygon
    implements Built<GeoJsonPolygon, GeoJsonPolygonBuilder> {
  @BuiltValueField(wireName: r'type')
  GeoJsonPolygonType get type;
  // enum typeEnum {  Polygon,  };

  @BuiltValueField(wireName: r'coordinates')
  BuiltList<BuiltList<BuiltList<double>>> get coordinates;

  GeoJsonPolygon._();

  factory GeoJsonPolygon([void updates(GeoJsonPolygonBuilder b)]) =
      _$GeoJsonPolygon;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(GeoJsonPolygonBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<GeoJsonPolygon> get serializer =>
      _$GeoJsonPolygonSerializer();
}

class _$GeoJsonPolygonSerializer
    implements PrimitiveSerializer<GeoJsonPolygon> {
  @override
  final Iterable<Type> types = const [GeoJsonPolygon, _$GeoJsonPolygon];

  @override
  final String wireName = r'GeoJsonPolygon';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    GeoJsonPolygon object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(GeoJsonPolygonType),
    );
    yield r'coordinates';
    yield serializers.serialize(
      object.coordinates,
      specifiedType: const FullType(BuiltList, [
        FullType(BuiltList, [
          FullType(BuiltList, [FullType(double)])
        ])
      ]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    GeoJsonPolygon object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object,
            specifiedType: specifiedType)
        .toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required GeoJsonPolygonBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(GeoJsonPolygonType),
          ) as GeoJsonPolygonType;
          result.type = valueDes;
          break;
        case r'coordinates':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [
              FullType(BuiltList, [
                FullType(BuiltList, [FullType(double)])
              ])
            ]),
          ) as BuiltList<BuiltList<BuiltList<double>>>;
          result.coordinates.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  GeoJsonPolygon deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = GeoJsonPolygonBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}
