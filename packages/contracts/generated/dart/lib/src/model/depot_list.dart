//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/depot.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'depot_list.g.dart';

/// DepotList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class DepotList implements Built<DepotList, DepotListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Depot> get items;

  DepotList._();

  factory DepotList([void updates(DepotListBuilder b)]) = _$DepotList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DepotListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DepotList> get serializer => _$DepotListSerializer();
}

class _$DepotListSerializer implements PrimitiveSerializer<DepotList> {
  @override
  final Iterable<Type> types = const [DepotList, _$DepotList];

  @override
  final String wireName = r'DepotList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DepotList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Depot)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    DepotList object, {
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
    required DepotListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Depot)]),
          ) as BuiltList<Depot>;
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
  DepotList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DepotListBuilder();
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
