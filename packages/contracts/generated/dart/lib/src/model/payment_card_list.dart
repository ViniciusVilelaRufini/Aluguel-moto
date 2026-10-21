//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/payment_card.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'payment_card_list.g.dart';

/// PaymentCardList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class PaymentCardList
    implements Built<PaymentCardList, PaymentCardListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<PaymentCard> get items;

  PaymentCardList._();

  factory PaymentCardList([void updates(PaymentCardListBuilder b)]) =
      _$PaymentCardList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PaymentCardListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PaymentCardList> get serializer =>
      _$PaymentCardListSerializer();
}

class _$PaymentCardListSerializer
    implements PrimitiveSerializer<PaymentCardList> {
  @override
  final Iterable<Type> types = const [PaymentCardList, _$PaymentCardList];

  @override
  final String wireName = r'PaymentCardList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PaymentCardList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(PaymentCard)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PaymentCardList object, {
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
    required PaymentCardListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(PaymentCard)]),
          ) as BuiltList<PaymentCard>;
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
  PaymentCardList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PaymentCardListBuilder();
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
