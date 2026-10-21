//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/fee.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'fee_list.g.dart';

/// FeeList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class FeeList implements Built<FeeList, FeeListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Fee> get items;

  FeeList._();

  factory FeeList([void updates(FeeListBuilder b)]) = _$FeeList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(FeeListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<FeeList> get serializer => _$FeeListSerializer();
}

class _$FeeListSerializer implements PrimitiveSerializer<FeeList> {
  @override
  final Iterable<Type> types = const [FeeList, _$FeeList];

  @override
  final String wireName = r'FeeList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    FeeList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Fee)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    FeeList object, {
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
    required FeeListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Fee)]),
          ) as BuiltList<Fee>;
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
  FeeList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = FeeListBuilder();
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
