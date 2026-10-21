//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/payment.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'payment_page.g.dart';

/// PaymentPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class PaymentPage implements Built<PaymentPage, PaymentPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Payment> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  PaymentPage._();

  factory PaymentPage([void updates(PaymentPageBuilder b)]) = _$PaymentPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PaymentPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PaymentPage> get serializer => _$PaymentPageSerializer();
}

class _$PaymentPageSerializer implements PrimitiveSerializer<PaymentPage> {
  @override
  final Iterable<Type> types = const [PaymentPage, _$PaymentPage];

  @override
  final String wireName = r'PaymentPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PaymentPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Payment)]),
    );
    if (object.nextCursor != null) {
      yield r'nextCursor';
      yield serializers.serialize(
        object.nextCursor,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    PaymentPage object, {
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
    required PaymentPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Payment)]),
          ) as BuiltList<Payment>;
          result.items.replace(valueDes);
          break;
        case r'nextCursor':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.nextCursor = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PaymentPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PaymentPageBuilder();
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
