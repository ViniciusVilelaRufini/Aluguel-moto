//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'payment_card_create.g.dart';

/// PaymentCardCreate
///
/// Properties:
/// * [cardToken] - Token do SDK do gateway. Nunca o número do cartão.
/// * [setDefault]
@BuiltValue()
abstract class PaymentCardCreate
    implements Built<PaymentCardCreate, PaymentCardCreateBuilder> {
  /// Token do SDK do gateway. Nunca o número do cartão.
  @BuiltValueField(wireName: r'cardToken')
  String get cardToken;

  @BuiltValueField(wireName: r'setDefault')
  bool? get setDefault;

  PaymentCardCreate._();

  factory PaymentCardCreate([void updates(PaymentCardCreateBuilder b)]) =
      _$PaymentCardCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PaymentCardCreateBuilder b) => b..setDefault = true;

  @BuiltValueSerializer(custom: true)
  static Serializer<PaymentCardCreate> get serializer =>
      _$PaymentCardCreateSerializer();
}

class _$PaymentCardCreateSerializer
    implements PrimitiveSerializer<PaymentCardCreate> {
  @override
  final Iterable<Type> types = const [PaymentCardCreate, _$PaymentCardCreate];

  @override
  final String wireName = r'PaymentCardCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PaymentCardCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'cardToken';
    yield serializers.serialize(
      object.cardToken,
      specifiedType: const FullType(String),
    );
    if (object.setDefault != null) {
      yield r'setDefault';
      yield serializers.serialize(
        object.setDefault,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    PaymentCardCreate object, {
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
    required PaymentCardCreateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'cardToken':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.cardToken = valueDes;
          break;
        case r'setDefault':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.setDefault = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PaymentCardCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PaymentCardCreateBuilder();
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
