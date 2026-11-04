//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/counter_payment_method.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'counter_settle_request.g.dart';

/// Informe exatamente um entre `method` e `fromDepositId` (os dois ou nenhum → `400`).
///
/// Properties:
/// * [amountCents]
/// * [method]
/// * [fromDepositId] - Abater da caução de balcão do mesmo cliente.
/// * [reference]
@BuiltValue()
abstract class CounterSettleRequest
    implements Built<CounterSettleRequest, CounterSettleRequestBuilder> {
  @BuiltValueField(wireName: r'amountCents')
  int get amountCents;

  @BuiltValueField(wireName: r'method')
  CounterPaymentMethod? get method;
  // enum methodEnum {  counter_card,  counter_pix,  cash,  };

  /// Abater da caução de balcão do mesmo cliente.
  @BuiltValueField(wireName: r'fromDepositId')
  String? get fromDepositId;

  @BuiltValueField(wireName: r'reference')
  String? get reference;

  CounterSettleRequest._();

  factory CounterSettleRequest([void updates(CounterSettleRequestBuilder b)]) =
      _$CounterSettleRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CounterSettleRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CounterSettleRequest> get serializer =>
      _$CounterSettleRequestSerializer();
}

class _$CounterSettleRequestSerializer
    implements PrimitiveSerializer<CounterSettleRequest> {
  @override
  final Iterable<Type> types = const [
    CounterSettleRequest,
    _$CounterSettleRequest
  ];

  @override
  final String wireName = r'CounterSettleRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CounterSettleRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'amountCents';
    yield serializers.serialize(
      object.amountCents,
      specifiedType: const FullType(int),
    );
    if (object.method != null) {
      yield r'method';
      yield serializers.serialize(
        object.method,
        specifiedType: const FullType(CounterPaymentMethod),
      );
    }
    if (object.fromDepositId != null) {
      yield r'fromDepositId';
      yield serializers.serialize(
        object.fromDepositId,
        specifiedType: const FullType(String),
      );
    }
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
    CounterSettleRequest object, {
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
    required CounterSettleRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'amountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.amountCents = valueDes;
          break;
        case r'method':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(CounterPaymentMethod),
          ) as CounterPaymentMethod?;
          if (valueDes == null) continue;
          result.method = valueDes;
          break;
        case r'fromDepositId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.fromDepositId = valueDes;
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
  CounterSettleRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CounterSettleRequestBuilder();
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
