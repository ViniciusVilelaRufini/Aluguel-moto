// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'receipt_payment_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const ReceiptPaymentStatus _$paid = const ReceiptPaymentStatus._('paid');
const ReceiptPaymentStatus _$pending = const ReceiptPaymentStatus._('pending');
const ReceiptPaymentStatus _$processing =
    const ReceiptPaymentStatus._('processing');
const ReceiptPaymentStatus _$unknownDefaultOpenApi =
    const ReceiptPaymentStatus._('unknownDefaultOpenApi');

ReceiptPaymentStatus _$valueOf(String name) {
  switch (name) {
    case 'paid':
      return _$paid;
    case 'pending':
      return _$pending;
    case 'processing':
      return _$processing;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<ReceiptPaymentStatus> _$values =
    BuiltSet<ReceiptPaymentStatus>(const <ReceiptPaymentStatus>[
  _$paid,
  _$pending,
  _$processing,
  _$unknownDefaultOpenApi,
]);

class _$ReceiptPaymentStatusMeta {
  const _$ReceiptPaymentStatusMeta();
  ReceiptPaymentStatus get paid => _$paid;
  ReceiptPaymentStatus get pending => _$pending;
  ReceiptPaymentStatus get processing => _$processing;
  ReceiptPaymentStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  ReceiptPaymentStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<ReceiptPaymentStatus> get values => _$values;
}

abstract class _$ReceiptPaymentStatusMixin {
  // ignore: non_constant_identifier_names
  _$ReceiptPaymentStatusMeta get ReceiptPaymentStatus =>
      const _$ReceiptPaymentStatusMeta();
}

Serializer<ReceiptPaymentStatus> _$receiptPaymentStatusSerializer =
    _$ReceiptPaymentStatusSerializer();

class _$ReceiptPaymentStatusSerializer
    implements PrimitiveSerializer<ReceiptPaymentStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'paid': 'paid',
    'pending': 'pending',
    'processing': 'processing',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'paid': 'paid',
    'pending': 'pending',
    'processing': 'processing',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[ReceiptPaymentStatus];
  @override
  final String wireName = 'ReceiptPaymentStatus';

  @override
  Object serialize(Serializers serializers, ReceiptPaymentStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  ReceiptPaymentStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      ReceiptPaymentStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
