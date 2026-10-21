// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_pool.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const AuthPool _$customer = const AuthPool._('customer');
const AuthPool _$staff = const AuthPool._('staff');
const AuthPool _$unknownDefaultOpenApi =
    const AuthPool._('unknownDefaultOpenApi');

AuthPool _$valueOf(String name) {
  switch (name) {
    case 'customer':
      return _$customer;
    case 'staff':
      return _$staff;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<AuthPool> _$values = BuiltSet<AuthPool>(const <AuthPool>[
  _$customer,
  _$staff,
  _$unknownDefaultOpenApi,
]);

class _$AuthPoolMeta {
  const _$AuthPoolMeta();
  AuthPool get customer => _$customer;
  AuthPool get staff => _$staff;
  AuthPool get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  AuthPool valueOf(String name) => _$valueOf(name);
  BuiltSet<AuthPool> get values => _$values;
}

abstract class _$AuthPoolMixin {
  // ignore: non_constant_identifier_names
  _$AuthPoolMeta get AuthPool => const _$AuthPoolMeta();
}

Serializer<AuthPool> _$authPoolSerializer = _$AuthPoolSerializer();

class _$AuthPoolSerializer implements PrimitiveSerializer<AuthPool> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'customer': 'customer',
    'staff': 'staff',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'customer': 'customer',
    'staff': 'staff',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[AuthPool];
  @override
  final String wireName = 'AuthPool';

  @override
  Object serialize(Serializers serializers, AuthPool object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  AuthPool deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      AuthPool.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
