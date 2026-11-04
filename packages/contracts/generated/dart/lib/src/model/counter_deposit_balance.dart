//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/deposit_status.dart';
import 'package:volti_api/src/model/deposit_method.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'counter_deposit_balance.g.dart';

/// CounterDepositBalance
///
/// Properties:
/// * [depositId]
/// * [rentalId]
/// * [method]
/// * [status]
/// * [amountCents]
/// * [capturedCents]
/// * [refundedCents]
/// * [availableCents] - `amountCents` − `capturedCents` − `refundedCents`.
@BuiltValue()
abstract class CounterDepositBalance
    implements Built<CounterDepositBalance, CounterDepositBalanceBuilder> {
  @BuiltValueField(wireName: r'depositId')
  String get depositId;

  @BuiltValueField(wireName: r'rentalId')
  String? get rentalId;

  @BuiltValueField(wireName: r'method')
  DepositMethod get method;
  // enum methodEnum {  card,  pix,  counter_card,  counter_pix,  cash,  };

  @BuiltValueField(wireName: r'status')
  DepositStatus get status;
  // enum statusEnum {  awaiting_pix,  held,  failed,  captured,  released,  };

  @BuiltValueField(wireName: r'amountCents')
  int get amountCents;

  @BuiltValueField(wireName: r'capturedCents')
  int get capturedCents;

  @BuiltValueField(wireName: r'refundedCents')
  int get refundedCents;

  /// `amountCents` − `capturedCents` − `refundedCents`.
  @BuiltValueField(wireName: r'availableCents')
  int get availableCents;

  CounterDepositBalance._();

  factory CounterDepositBalance(
      [void updates(CounterDepositBalanceBuilder b)]) = _$CounterDepositBalance;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CounterDepositBalanceBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CounterDepositBalance> get serializer =>
      _$CounterDepositBalanceSerializer();
}

class _$CounterDepositBalanceSerializer
    implements PrimitiveSerializer<CounterDepositBalance> {
  @override
  final Iterable<Type> types = const [
    CounterDepositBalance,
    _$CounterDepositBalance
  ];

  @override
  final String wireName = r'CounterDepositBalance';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CounterDepositBalance object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'depositId';
    yield serializers.serialize(
      object.depositId,
      specifiedType: const FullType(String),
    );
    if (object.rentalId != null) {
      yield r'rentalId';
      yield serializers.serialize(
        object.rentalId,
        specifiedType: const FullType(String),
      );
    }
    yield r'method';
    yield serializers.serialize(
      object.method,
      specifiedType: const FullType(DepositMethod),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(DepositStatus),
    );
    yield r'amountCents';
    yield serializers.serialize(
      object.amountCents,
      specifiedType: const FullType(int),
    );
    yield r'capturedCents';
    yield serializers.serialize(
      object.capturedCents,
      specifiedType: const FullType(int),
    );
    yield r'refundedCents';
    yield serializers.serialize(
      object.refundedCents,
      specifiedType: const FullType(int),
    );
    yield r'availableCents';
    yield serializers.serialize(
      object.availableCents,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CounterDepositBalance object, {
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
    required CounterDepositBalanceBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'depositId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.depositId = valueDes;
          break;
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.rentalId = valueDes;
          break;
        case r'method':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DepositMethod),
          ) as DepositMethod;
          result.method = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DepositStatus),
          ) as DepositStatus;
          result.status = valueDes;
          break;
        case r'amountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.amountCents = valueDes;
          break;
        case r'capturedCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.capturedCents = valueDes;
          break;
        case r'refundedCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.refundedCents = valueDes;
          break;
        case r'availableCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.availableCents = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CounterDepositBalance deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CounterDepositBalanceBuilder();
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
