//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/swap_station.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'swap_station_list.g.dart';

/// SwapStationList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class SwapStationList
    implements Built<SwapStationList, SwapStationListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<SwapStation> get items;

  SwapStationList._();

  factory SwapStationList([void updates(SwapStationListBuilder b)]) =
      _$SwapStationList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SwapStationListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SwapStationList> get serializer =>
      _$SwapStationListSerializer();
}

class _$SwapStationListSerializer
    implements PrimitiveSerializer<SwapStationList> {
  @override
  final Iterable<Type> types = const [SwapStationList, _$SwapStationList];

  @override
  final String wireName = r'SwapStationList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SwapStationList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(SwapStation)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SwapStationList object, {
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
    required SwapStationListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(SwapStation)]),
          ) as BuiltList<SwapStation>;
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
  SwapStationList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SwapStationListBuilder();
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
