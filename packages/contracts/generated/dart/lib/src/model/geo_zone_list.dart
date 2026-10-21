//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/geo_zone.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'geo_zone_list.g.dart';

/// GeoZoneList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class GeoZoneList implements Built<GeoZoneList, GeoZoneListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<GeoZone> get items;

  GeoZoneList._();

  factory GeoZoneList([void updates(GeoZoneListBuilder b)]) = _$GeoZoneList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(GeoZoneListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<GeoZoneList> get serializer => _$GeoZoneListSerializer();
}

class _$GeoZoneListSerializer implements PrimitiveSerializer<GeoZoneList> {
  @override
  final Iterable<Type> types = const [GeoZoneList, _$GeoZoneList];

  @override
  final String wireName = r'GeoZoneList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    GeoZoneList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(GeoZone)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    GeoZoneList object, {
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
    required GeoZoneListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(GeoZone)]),
          ) as BuiltList<GeoZone>;
          result.items.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  GeoZoneList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = GeoZoneListBuilder();
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
