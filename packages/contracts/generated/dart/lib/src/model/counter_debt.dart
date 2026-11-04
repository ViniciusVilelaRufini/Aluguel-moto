//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/payment_method.dart';
import 'package:volti_api/src/model/payment_status.dart';
import 'package:volti_api/src/model/payment_kind.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'counter_debt.g.dart';

/// CounterDebt
///
/// Properties:
/// * [paymentId]
/// * [rentalId]
/// * [kind]
/// * [status]
/// * [method]
/// * [outstandingCents]
/// * [createdAt]
@BuiltValue()
abstract class CounterDebt implements Built<CounterDebt, CounterDebtBuilder> {
  @BuiltValueField(wireName: r'paymentId')
  String get paymentId;

  @BuiltValueField(wireName: r'rentalId')
  String? get rentalId;

  @BuiltValueField(wireName: r'kind')
  PaymentKind get kind;
  // enum kindEnum {  rental,  deposit,  top_up,  subscription,  fee,  debt_settlement,  };

  @BuiltValueField(wireName: r'status')
  PaymentStatus get status;
  // enum statusEnum {  pending,  authorized,  captured,  canceled,  paid,  refunded,  partially_refunded,  failed,  };

  @BuiltValueField(wireName: r'method')
  PaymentMethod get method;
  // enum methodEnum {  card,  pix,  wallet,  counter_card,  counter_pix,  cash,  };

  @BuiltValueField(wireName: r'outstandingCents')
  int get outstandingCents;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  CounterDebt._();

  factory CounterDebt([void updates(CounterDebtBuilder b)]) = _$CounterDebt;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CounterDebtBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CounterDebt> get serializer => _$CounterDebtSerializer();
}

class _$CounterDebtSerializer implements PrimitiveSerializer<CounterDebt> {
  @override
  final Iterable<Type> types = const [CounterDebt, _$CounterDebt];

  @override
  final String wireName = r'CounterDebt';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CounterDebt object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'paymentId';
    yield serializers.serialize(
      object.paymentId,
      specifiedType: const FullType(String),
    );
    if (object.rentalId != null) {
      yield r'rentalId';
      yield serializers.serialize(
        object.rentalId,
        specifiedType: const FullType(String),
      );
    }
    yield r'kind';
    yield serializers.serialize(
      object.kind,
      specifiedType: const FullType(PaymentKind),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(PaymentStatus),
    );
    yield r'method';
    yield serializers.serialize(
      object.method,
      specifiedType: const FullType(PaymentMethod),
    );
    yield r'outstandingCents';
    yield serializers.serialize(
      object.outstandingCents,
      specifiedType: const FullType(int),
    );
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CounterDebt object, {
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
    required CounterDebtBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'paymentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.paymentId = valueDes;
          break;
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.rentalId = valueDes;
          break;
        case r'kind':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PaymentKind),
          ) as PaymentKind;
          result.kind = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PaymentStatus),
          ) as PaymentStatus;
          result.status = valueDes;
          break;
        case r'method':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PaymentMethod),
          ) as PaymentMethod;
          result.method = valueDes;
          break;
        case r'outstandingCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.outstandingCents = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CounterDebt deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CounterDebtBuilder();
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
