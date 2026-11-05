//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/sim_card.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'sim_card_list.g.dart';

/// SimCardList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class SimCardList implements Built<SimCardList, SimCardListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<SimCard> get items;

  SimCardList._();

  factory SimCardList([void updates(SimCardListBuilder b)]) = _$SimCardList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SimCardListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SimCardList> get serializer => _$SimCardListSerializer();
}

class _$SimCardListSerializer implements PrimitiveSerializer<SimCardList> {
  @override
  final Iterable<Type> types = const [SimCardList, _$SimCardList];

  @override
  final String wireName = r'SimCardList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SimCardList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(SimCard)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SimCardList object, {
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
    required SimCardListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(SimCard)]),
          ) as BuiltList<SimCard>;
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
  SimCardList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SimCardListBuilder();
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
