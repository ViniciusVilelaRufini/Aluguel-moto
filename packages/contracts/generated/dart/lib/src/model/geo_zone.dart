//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/geo_json_polygon.dart';
import 'package:volti_api/src/model/zone_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'geo_zone.g.dart';

/// GeoZone
///
/// Properties:
/// * [id]
/// * [name]
/// * [type]
/// * [speedLimitKmh] - Só em `reduced_speed` (6 pedestres, 20 ciclovia; sempre entre 6 e 20).
/// * [geometry]
/// * [active]
/// * [createdAt]
/// * [updatedAt]
@BuiltValue()
abstract class GeoZone implements Built<GeoZone, GeoZoneBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'type')
  ZoneType get type;
  // enum typeEnum {  operation,  return,  forbidden,  reduced_speed,  };

  /// Só em `reduced_speed` (6 pedestres, 20 ciclovia; sempre entre 6 e 20).
  @BuiltValueField(wireName: r'speedLimitKmh')
  int? get speedLimitKmh;

  @BuiltValueField(wireName: r'geometry')
  GeoJsonPolygon get geometry;

  @BuiltValueField(wireName: r'active')
  bool get active;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  GeoZone._();

  factory GeoZone([void updates(GeoZoneBuilder b)]) = _$GeoZone;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(GeoZoneBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<GeoZone> get serializer => _$GeoZoneSerializer();
}

class _$GeoZoneSerializer implements PrimitiveSerializer<GeoZone> {
  @override
  final Iterable<Type> types = const [GeoZone, _$GeoZone];

  @override
  final String wireName = r'GeoZone';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    GeoZone object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(ZoneType),
    );
    if (object.speedLimitKmh != null) {
      yield r'speedLimitKmh';
      yield serializers.serialize(
        object.speedLimitKmh,
        specifiedType: const FullType(int),
      );
    }
    yield r'geometry';
    yield serializers.serialize(
      object.geometry,
      specifiedType: const FullType(GeoJsonPolygon),
    );
    yield r'active';
    yield serializers.serialize(
      object.active,
      specifiedType: const FullType(bool),
    );
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'updatedAt';
    yield serializers.serialize(
      object.updatedAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    GeoZone object, {
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
    required GeoZoneBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.name = valueDes;
          break;
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ZoneType),
          ) as ZoneType;
          result.type = valueDes;
          break;
        case r'speedLimitKmh':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.speedLimitKmh = valueDes;
          break;
        case r'geometry':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(GeoJsonPolygon),
          ) as GeoJsonPolygon;
          result.geometry.replace(valueDes);
          break;
        case r'active':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.active = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'updatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.updatedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  GeoZone deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = GeoZoneBuilder();
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
