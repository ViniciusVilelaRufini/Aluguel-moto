//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/geo_json_polygon.dart';
import 'package:volti_api/src/model/zone_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'geo_zone_input.g.dart';

/// GeoZoneInput
///
/// Properties:
/// * [name]
/// * [type]
/// * [speedLimitKmh] - Obrigatório em `reduced_speed` (ausente → 422 `zone-speed-limit-required`; 21 a 32 → 422 `zone-speed-limit-invalid`); ignorado nos demais tipos. Acima de 32 → 400.
/// * [geometry]
/// * [active]
@BuiltValue()
abstract class GeoZoneInput
    implements Built<GeoZoneInput, GeoZoneInputBuilder> {
  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'type')
  ZoneType get type;
  // enum typeEnum {  operation,  return,  forbidden,  reduced_speed,  };

  /// Obrigatório em `reduced_speed` (ausente → 422 `zone-speed-limit-required`; 21 a 32 → 422 `zone-speed-limit-invalid`); ignorado nos demais tipos. Acima de 32 → 400.
  @BuiltValueField(wireName: r'speedLimitKmh')
  int? get speedLimitKmh;

  @BuiltValueField(wireName: r'geometry')
  GeoJsonPolygon get geometry;

  @BuiltValueField(wireName: r'active')
  bool? get active;

  GeoZoneInput._();

  factory GeoZoneInput([void updates(GeoZoneInputBuilder b)]) = _$GeoZoneInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(GeoZoneInputBuilder b) => b..active = true;

  @BuiltValueSerializer(custom: true)
  static Serializer<GeoZoneInput> get serializer => _$GeoZoneInputSerializer();
}

class _$GeoZoneInputSerializer implements PrimitiveSerializer<GeoZoneInput> {
  @override
  final Iterable<Type> types = const [GeoZoneInput, _$GeoZoneInput];

  @override
  final String wireName = r'GeoZoneInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    GeoZoneInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
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
    if (object.active != null) {
      yield r'active';
      yield serializers.serialize(
        object.active,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    GeoZoneInput object, {
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
    required GeoZoneInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
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
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.active = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  GeoZoneInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = GeoZoneInputBuilder();
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
