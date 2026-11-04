//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/counter_payment_input.dart';
import 'package:volti_api/src/model/counter_deposit_input.dart';
import 'package:volti_api/src/model/insurance_coverage.dart';
import 'package:volti_api/src/model/counter_plan_code.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'counter_checkout_request.g.dart';

/// CounterCheckoutRequest
///
/// Properties:
/// * [planCode]
/// * [quantity] - Quantidade do período: diária 1–30, semana 1–4, mês 1–3.
/// * [coverage]
/// * [contractPhotoKeys] - Fotos do contrato assinado: 1 a 4 chaves de `POST /handovers/uploads` com `purpose: contract`. Nenhuma → `422` `contract-photos-required`.
/// * [payment]
/// * [deposit]
@BuiltValue()
abstract class CounterCheckoutRequest
    implements Built<CounterCheckoutRequest, CounterCheckoutRequestBuilder> {
  @BuiltValueField(wireName: r'planCode')
  CounterPlanCode get planCode;
  // enum planCodeEnum {  day,  weekly,  monthly,  };

  /// Quantidade do período: diária 1–30, semana 1–4, mês 1–3.
  @BuiltValueField(wireName: r'quantity')
  int? get quantity;

  @BuiltValueField(wireName: r'coverage')
  InsuranceCoverage get coverage;
  // enum coverageEnum {  basic,  full,  };

  /// Fotos do contrato assinado: 1 a 4 chaves de `POST /handovers/uploads` com `purpose: contract`. Nenhuma → `422` `contract-photos-required`.
  @BuiltValueField(wireName: r'contractPhotoKeys')
  BuiltList<String>? get contractPhotoKeys;

  @BuiltValueField(wireName: r'payment')
  CounterPaymentInput get payment;

  @BuiltValueField(wireName: r'deposit')
  CounterDepositInput? get deposit;

  CounterCheckoutRequest._();

  factory CounterCheckoutRequest(
          [void updates(CounterCheckoutRequestBuilder b)]) =
      _$CounterCheckoutRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CounterCheckoutRequestBuilder b) => b..quantity = 1;

  @BuiltValueSerializer(custom: true)
  static Serializer<CounterCheckoutRequest> get serializer =>
      _$CounterCheckoutRequestSerializer();
}

class _$CounterCheckoutRequestSerializer
    implements PrimitiveSerializer<CounterCheckoutRequest> {
  @override
  final Iterable<Type> types = const [
    CounterCheckoutRequest,
    _$CounterCheckoutRequest
  ];

  @override
  final String wireName = r'CounterCheckoutRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CounterCheckoutRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'planCode';
    yield serializers.serialize(
      object.planCode,
      specifiedType: const FullType(CounterPlanCode),
    );
    if (object.quantity != null) {
      yield r'quantity';
      yield serializers.serialize(
        object.quantity,
        specifiedType: const FullType(int),
      );
    }
    yield r'coverage';
    yield serializers.serialize(
      object.coverage,
      specifiedType: const FullType(InsuranceCoverage),
    );
    if (object.contractPhotoKeys != null) {
      yield r'contractPhotoKeys';
      yield serializers.serialize(
        object.contractPhotoKeys,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
    yield r'payment';
    yield serializers.serialize(
      object.payment,
      specifiedType: const FullType(CounterPaymentInput),
    );
    if (object.deposit != null) {
      yield r'deposit';
      yield serializers.serialize(
        object.deposit,
        specifiedType: const FullType(CounterDepositInput),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CounterCheckoutRequest object, {
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
    required CounterCheckoutRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'planCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CounterPlanCode),
          ) as CounterPlanCode;
          result.planCode = valueDes;
          break;
        case r'quantity':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.quantity = valueDes;
          break;
        case r'coverage':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(InsuranceCoverage),
          ) as InsuranceCoverage;
          result.coverage = valueDes;
          break;
        case r'contractPhotoKeys':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(String)]),
          ) as BuiltList<String>?;
          if (valueDes == null) continue;
          result.contractPhotoKeys.replace(valueDes);
          break;
        case r'payment':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CounterPaymentInput),
          ) as CounterPaymentInput;
          result.payment.replace(valueDes);
          break;
        case r'deposit':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(CounterDepositInput),
          ) as CounterDepositInput?;
          if (valueDes == null) continue;
          result.deposit.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CounterCheckoutRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CounterCheckoutRequestBuilder();
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
