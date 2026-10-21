// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const PaymentStatus _$pending = const PaymentStatus._('pending');
const PaymentStatus _$authorized = const PaymentStatus._('authorized');
const PaymentStatus _$captured = const PaymentStatus._('captured');
const PaymentStatus _$canceled = const PaymentStatus._('canceled');
const PaymentStatus _$paid = const PaymentStatus._('paid');
const PaymentStatus _$refunded = const PaymentStatus._('refunded');
const PaymentStatus _$partiallyRefunded =
    const PaymentStatus._('partiallyRefunded');
const PaymentStatus _$failed = const PaymentStatus._('failed');
const PaymentStatus _$unknownDefaultOpenApi =
    const PaymentStatus._('unknownDefaultOpenApi');

PaymentStatus _$valueOf(String name) {
  switch (name) {
    case 'pending':
      return _$pending;
    case 'authorized':
      return _$authorized;
    case 'captured':
      return _$captured;
    case 'canceled':
      return _$canceled;
    case 'paid':
      return _$paid;
    case 'refunded':
      return _$refunded;
    case 'partiallyRefunded':
      return _$partiallyRefunded;
    case 'failed':
      return _$failed;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<PaymentStatus> _$values =
    BuiltSet<PaymentStatus>(const <PaymentStatus>[
  _$pending,
  _$authorized,
  _$captured,
  _$canceled,
  _$paid,
  _$refunded,
  _$partiallyRefunded,
  _$failed,
  _$unknownDefaultOpenApi,
]);

class _$PaymentStatusMeta {
  const _$PaymentStatusMeta();
  PaymentStatus get pending => _$pending;
  PaymentStatus get authorized => _$authorized;
  PaymentStatus get captured => _$captured;
  PaymentStatus get canceled => _$canceled;
  PaymentStatus get paid => _$paid;
  PaymentStatus get refunded => _$refunded;
  PaymentStatus get partiallyRefunded => _$partiallyRefunded;
  PaymentStatus get failed => _$failed;
  PaymentStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  PaymentStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<PaymentStatus> get values => _$values;
}

abstract class _$PaymentStatusMixin {
  // ignore: non_constant_identifier_names
  _$PaymentStatusMeta get PaymentStatus => const _$PaymentStatusMeta();
}

Serializer<PaymentStatus> _$paymentStatusSerializer =
    _$PaymentStatusSerializer();

class _$PaymentStatusSerializer implements PrimitiveSerializer<PaymentStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'pending': 'pending',
    'authorized': 'authorized',
    'captured': 'captured',
    'canceled': 'canceled',
    'paid': 'paid',
    'refunded': 'refunded',
    'partiallyRefunded': 'partially_refunded',
    'failed': 'failed',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'pending': 'pending',
    'authorized': 'authorized',
    'captured': 'captured',
    'canceled': 'canceled',
    'paid': 'paid',
    'refunded': 'refunded',
    'partially_refunded': 'partiallyRefunded',
    'failed': 'failed',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[PaymentStatus];
  @override
  final String wireName = 'PaymentStatus';

  @override
  Object serialize(Serializers serializers, PaymentStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  PaymentStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      PaymentStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
