//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/counter_payment_method.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'counter_deposit_input.g.dart';

/// CounterDepositInput
///
/// Properties:
/// * [method]
/// * [amountCents] - Caução recebida no balcão, em centavos (0 = sem caução).
/// * [reference]
@BuiltValue()
abstract class CounterDepositInput
    implements Built<CounterDepositInput, CounterDepositInputBuilder> {
  @BuiltValueField(wireName: r'method')
  CounterPaymentMethod get method;
  // enum methodEnum {  counter_card,  counter_pix,  cash,  };

  /// Caução recebida no balcão, em centavos (0 = sem caução).
  @BuiltValueField(wireName: r'amountCents')
  int get amountCents;

  @BuiltValueField(wireName: r'reference')
  String? get reference;

  CounterDepositInput._();

  factory CounterDepositInput([void updates(CounterDepositInputBuilder b)]) =
      _$CounterDepositInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CounterDepositInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CounterDepositInput> get serializer =>
      _$CounterDepositInputSerializer();
}

class _$CounterDepositInputSerializer
    implements PrimitiveSerializer<CounterDepositInput> {
  @override
  final Iterable<Type> types = const [
    CounterDepositInput,
    _$CounterDepositInput
  ];

  @override
  final String wireName = r'CounterDepositInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CounterDepositInput object, {
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
    CounterDepositInput object, {
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
    required CounterDepositInputBuilder result,
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
  CounterDepositInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CounterDepositInputBuilder();
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
