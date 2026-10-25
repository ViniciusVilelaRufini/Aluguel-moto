//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/swap_station_admin.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'swap_station_admin_list.g.dart';

/// SwapStationAdminList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class SwapStationAdminList
    implements Built<SwapStationAdminList, SwapStationAdminListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<SwapStationAdmin> get items;

  SwapStationAdminList._();

  factory SwapStationAdminList([void updates(SwapStationAdminListBuilder b)]) =
      _$SwapStationAdminList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SwapStationAdminListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SwapStationAdminList> get serializer =>
      _$SwapStationAdminListSerializer();
}

class _$SwapStationAdminListSerializer
    implements PrimitiveSerializer<SwapStationAdminList> {
  @override
  final Iterable<Type> types = const [
    SwapStationAdminList,
    _$SwapStationAdminList
  ];

  @override
  final String wireName = r'SwapStationAdminList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SwapStationAdminList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(SwapStationAdmin)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SwapStationAdminList object, {
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
    required SwapStationAdminListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(SwapStationAdmin)]),
          ) as BuiltList<SwapStationAdmin>;
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
  SwapStationAdminList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SwapStationAdminListBuilder();
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
