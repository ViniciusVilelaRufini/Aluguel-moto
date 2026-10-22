// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'customer_coupon_source.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const CustomerCouponSource _$manual = const CustomerCouponSource._('manual');
const CustomerCouponSource _$referral =
    const CustomerCouponSource._('referral');
const CustomerCouponSource _$unknownDefaultOpenApi =
    const CustomerCouponSource._('unknownDefaultOpenApi');

CustomerCouponSource _$valueOf(String name) {
  switch (name) {
    case 'manual':
      return _$manual;
    case 'referral':
      return _$referral;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<CustomerCouponSource> _$values =
    BuiltSet<CustomerCouponSource>(const <CustomerCouponSource>[
  _$manual,
  _$referral,
  _$unknownDefaultOpenApi,
]);

class _$CustomerCouponSourceMeta {
  const _$CustomerCouponSourceMeta();
  CustomerCouponSource get manual => _$manual;
  CustomerCouponSource get referral => _$referral;
  CustomerCouponSource get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  CustomerCouponSource valueOf(String name) => _$valueOf(name);
  BuiltSet<CustomerCouponSource> get values => _$values;
}

abstract class _$CustomerCouponSourceMixin {
  // ignore: non_constant_identifier_names
  _$CustomerCouponSourceMeta get CustomerCouponSource =>
      const _$CustomerCouponSourceMeta();
}

Serializer<CustomerCouponSource> _$customerCouponSourceSerializer =
    _$CustomerCouponSourceSerializer();

class _$CustomerCouponSourceSerializer
    implements PrimitiveSerializer<CustomerCouponSource> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'manual': 'manual',
    'referral': 'referral',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'manual': 'manual',
    'referral': 'referral',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[CustomerCouponSource];
  @override
  final String wireName = 'CustomerCouponSource';

  @override
  Object serialize(Serializers serializers, CustomerCouponSource object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  CustomerCouponSource deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      CustomerCouponSource.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
