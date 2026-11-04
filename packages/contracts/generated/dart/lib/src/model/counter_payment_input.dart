//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/counter_payment_method.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'counter_payment_input.g.dart';

/// CounterPaymentInput
///
/// Properties:
/// * [method]
/// * [amountCents] - Valor recebido no balcão, em centavos.
/// * [reference] - NSU da maquininha ou ID do Pix (opcional).
@BuiltValue()
abstract class CounterPaymentInput
    implements Built<CounterPaymentInput, CounterPaymentInputBuilder> {
  @BuiltValueField(wireName: r'method')
  CounterPaymentMethod get method;
  // enum methodEnum {  counter_card,  counter_pix,  cash,  };

  /// Valor recebido no balcão, em centavos.
  @BuiltValueField(wireName: r'amountCents')
  int get amountCents;

  /// NSU da maquininha ou ID do Pix (opcional).
  @BuiltValueField(wireName: r'reference')
  String? get reference;

  CounterPaymentInput._();

  factory CounterPaymentInput([void updates(CounterPaymentInputBuilder b)]) =
      _$CounterPaymentInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CounterPaymentInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CounterPaymentInput> get serializer =>
      _$CounterPaymentInputSerializer();
}

class _$CounterPaymentInputSerializer
    implements PrimitiveSerializer<CounterPaymentInput> {
  @override
  final Iterable<Type> types = const [
    CounterPaymentInput,
    _$CounterPaymentInput
  ];

  @override
  final String wireName = r'CounterPaymentInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CounterPaymentInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'method';
    yield serializers.serialize(
      object.method,
      specifiedType: const FullType(CounterPaymentMethod),
    );
    yield r'amountCents';
    yield serializers.serialize(
      object.amountCents,
      specifiedType: const FullType(int),
    );
    if (object.reference != null) {
      yield r'reference';
      yield serializers.serialize(
        object.reference,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CounterPaymentInput object, {
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
    required CounterPaymentInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'method':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CounterPaymentMethod),
          ) as CounterPaymentMethod;
          result.method = valueDes;
          break;
        case r'amountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.amountCents = valueDes;
          break;
        case r'reference':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.reference = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CounterPaymentInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CounterPaymentInputBuilder();
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
