// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_kind.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const PaymentKind _$rental = const PaymentKind._('rental');
const PaymentKind _$deposit = const PaymentKind._('deposit');
const PaymentKind _$topUp = const PaymentKind._('topUp');
const PaymentKind _$subscription = const PaymentKind._('subscription');
const PaymentKind _$fee = const PaymentKind._('fee');
const PaymentKind _$unknownDefaultOpenApi =
    const PaymentKind._('unknownDefaultOpenApi');

PaymentKind _$valueOf(String name) {
  switch (name) {
    case 'rental':
      return _$rental;
    case 'deposit':
      return _$deposit;
    case 'topUp':
      return _$topUp;
    case 'subscription':
      return _$subscription;
    case 'fee':
      return _$fee;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<PaymentKind> _$values =
    BuiltSet<PaymentKind>(const <PaymentKind>[
  _$rental,
  _$deposit,
  _$topUp,
  _$subscription,
  _$fee,
  _$unknownDefaultOpenApi,
]);

class _$PaymentKindMeta {
  const _$PaymentKindMeta();
  PaymentKind get rental => _$rental;
  PaymentKind get deposit => _$deposit;
  PaymentKind get topUp => _$topUp;
  PaymentKind get subscription => _$subscription;
  PaymentKind get fee => _$fee;
  PaymentKind get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  PaymentKind valueOf(String name) => _$valueOf(name);
  BuiltSet<PaymentKind> get values => _$values;
}

abstract class _$PaymentKindMixin {
  // ignore: non_constant_identifier_names
  _$PaymentKindMeta get PaymentKind => const _$PaymentKindMeta();
}

Serializer<PaymentKind> _$paymentKindSerializer = _$PaymentKindSerializer();

class _$PaymentKindSerializer implements PrimitiveSerializer<PaymentKind> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'rental': 'rental',
    'deposit': 'deposit',
    'topUp': 'top_up',
    'subscription': 'subscription',
    'fee': 'fee',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'rental': 'rental',
    'deposit': 'deposit',
    'top_up': 'topUp',
    'subscription': 'subscription',
    'fee': 'fee',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[PaymentKind];
  @override
  final String wireName = 'PaymentKind';

  @override
  Object serialize(Serializers serializers, PaymentKind object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  PaymentKind deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      PaymentKind.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
