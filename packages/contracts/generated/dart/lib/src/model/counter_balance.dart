//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/rental_status.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/counter_debt.dart';
import 'package:volti_api/src/model/counter_deposit_balance.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'counter_balance.g.dart';

/// CounterBalance
///
/// Properties:
/// * [rentalId]
/// * [customerId]
/// * [customerFirstName] - Só o primeiro nome.
/// * [rentalStatus]
/// * [debtTotalCents] - Soma de `outstandingCents` das dívidas em aberto.
/// * [debts]
/// * [deposits] - Cauções de balcão do cliente com saldo disponível.
@BuiltValue()
abstract class CounterBalance
    implements Built<CounterBalance, CounterBalanceBuilder> {
  @BuiltValueField(wireName: r'rentalId')
  String get rentalId;

  @BuiltValueField(wireName: r'customerId')
  String get customerId;

  /// Só o primeiro nome.
  @BuiltValueField(wireName: r'customerFirstName')
  String? get customerFirstName;

  @BuiltValueField(wireName: r'rentalStatus')
  RentalStatus get rentalStatus;
  // enum rentalStatusEnum {  active,  paused,  ending,  ended,  force_ended,  };

  /// Soma de `outstandingCents` das dívidas em aberto.
  @BuiltValueField(wireName: r'debtTotalCents')
  int get debtTotalCents;

  @BuiltValueField(wireName: r'debts')
  BuiltList<CounterDebt> get debts;

  /// Cauções de balcão do cliente com saldo disponível.
  @BuiltValueField(wireName: r'deposits')
  BuiltList<CounterDepositBalance> get deposits;

  CounterBalance._();

  factory CounterBalance([void updates(CounterBalanceBuilder b)]) =
      _$CounterBalance;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CounterBalanceBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CounterBalance> get serializer =>
      _$CounterBalanceSerializer();
}

class _$CounterBalanceSerializer
    implements PrimitiveSerializer<CounterBalance> {
  @override
  final Iterable<Type> types = const [CounterBalance, _$CounterBalance];

  @override
  final String wireName = r'CounterBalance';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CounterBalance object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'rentalId';
    yield serializers.serialize(
      object.rentalId,
      specifiedType: const FullType(String),
    );
    yield r'customerId';
    yield serializers.serialize(
      object.customerId,
      specifiedType: const FullType(String),
    );
    if (object.customerFirstName != null) {
      yield r'customerFirstName';
      yield serializers.serialize(
        object.customerFirstName,
        specifiedType: const FullType(String),
      );
    }
    yield r'rentalStatus';
    yield serializers.serialize(
      object.rentalStatus,
      specifiedType: const FullType(RentalStatus),
    );
    yield r'debtTotalCents';
    yield serializers.serialize(
      object.debtTotalCents,
      specifiedType: const FullType(int),
    );
    yield r'debts';
    yield serializers.serialize(
      object.debts,
      specifiedType: const FullType(BuiltList, [FullType(CounterDebt)]),
    );
    yield r'deposits';
    yield serializers.serialize(
      object.deposits,
      specifiedType:
          const FullType(BuiltList, [FullType(CounterDepositBalance)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CounterBalance object, {
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
    required CounterBalanceBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.rentalId = valueDes;
          break;
        case r'customerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.customerId = valueDes;
          break;
        case r'customerFirstName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.customerFirstName = valueDes;
          break;
        case r'rentalStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RentalStatus),
          ) as RentalStatus;
          result.rentalStatus = valueDes;
          break;
        case r'debtTotalCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.debtTotalCents = valueDes;
          break;
        case r'debts':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(CounterDebt)]),
          ) as BuiltList<CounterDebt>;
          result.debts.replace(valueDes);
          break;
        case r'deposits':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(CounterDepositBalance)]),
          ) as BuiltList<CounterDepositBalance>;
          result.deposits.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CounterBalance deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CounterBalanceBuilder();
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
