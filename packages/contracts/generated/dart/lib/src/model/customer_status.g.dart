// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'customer_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const CustomerStatus _$active = const CustomerStatus._('active');
const CustomerStatus _$blocked = const CustomerStatus._('blocked');
const CustomerStatus _$deleted = const CustomerStatus._('deleted');
const CustomerStatus _$unknownDefaultOpenApi =
    const CustomerStatus._('unknownDefaultOpenApi');

CustomerStatus _$valueOf(String name) {
  switch (name) {
    case 'active':
      return _$active;
    case 'blocked':
      return _$blocked;
    case 'deleted':
      return _$deleted;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<CustomerStatus> _$values =
    BuiltSet<CustomerStatus>(const <CustomerStatus>[
  _$active,
  _$blocked,
  _$deleted,
  _$unknownDefaultOpenApi,
]);

class _$CustomerStatusMeta {
  const _$CustomerStatusMeta();
  CustomerStatus get active => _$active;
  CustomerStatus get blocked => _$blocked;
  CustomerStatus get deleted => _$deleted;
  CustomerStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  CustomerStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<CustomerStatus> get values => _$values;
}

abstract class _$CustomerStatusMixin {
  // ignore: non_constant_identifier_names
  _$CustomerStatusMeta get CustomerStatus => const _$CustomerStatusMeta();
}

Serializer<CustomerStatus> _$customerStatusSerializer =
    _$CustomerStatusSerializer();

class _$CustomerStatusSerializer
    implements PrimitiveSerializer<CustomerStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'active': 'active',
    'blocked': 'blocked',
    'deleted': 'deleted',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'active': 'active',
    'blocked': 'blocked',
    'deleted': 'deleted',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[CustomerStatus];
  @override
  final String wireName = 'CustomerStatus';

  @override
  Object serialize(Serializers serializers, CustomerStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  CustomerStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      CustomerStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
