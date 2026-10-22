// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'customer_coupon_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const CustomerCouponStatus _$available =
    const CustomerCouponStatus._('available');
const CustomerCouponStatus _$used = const CustomerCouponStatus._('used');
const CustomerCouponStatus _$expired = const CustomerCouponStatus._('expired');
const CustomerCouponStatus _$unknownDefaultOpenApi =
    const CustomerCouponStatus._('unknownDefaultOpenApi');

CustomerCouponStatus _$valueOf(String name) {
  switch (name) {
    case 'available':
      return _$available;
    case 'used':
      return _$used;
    case 'expired':
      return _$expired;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<CustomerCouponStatus> _$values =
    BuiltSet<CustomerCouponStatus>(const <CustomerCouponStatus>[
  _$available,
  _$used,
  _$expired,
  _$unknownDefaultOpenApi,
]);

class _$CustomerCouponStatusMeta {
  const _$CustomerCouponStatusMeta();
  CustomerCouponStatus get available => _$available;
  CustomerCouponStatus get used => _$used;
  CustomerCouponStatus get expired => _$expired;
  CustomerCouponStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  CustomerCouponStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<CustomerCouponStatus> get values => _$values;
}

abstract class _$CustomerCouponStatusMixin {
  // ignore: non_constant_identifier_names
  _$CustomerCouponStatusMeta get CustomerCouponStatus =>
      const _$CustomerCouponStatusMeta();
}

Serializer<CustomerCouponStatus> _$customerCouponStatusSerializer =
    _$CustomerCouponStatusSerializer();

class _$CustomerCouponStatusSerializer
    implements PrimitiveSerializer<CustomerCouponStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'available': 'available',
    'used': 'used',
    'expired': 'expired',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'available': 'available',
    'used': 'used',
    'expired': 'expired',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[CustomerCouponStatus];
  @override
  final String wireName = 'CustomerCouponStatus';

  @override
  Object serialize(Serializers serializers, CustomerCouponStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  CustomerCouponStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      CustomerCouponStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
