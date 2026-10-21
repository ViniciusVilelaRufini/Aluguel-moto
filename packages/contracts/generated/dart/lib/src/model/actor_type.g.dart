// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'actor_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const ActorType _$customer = const ActorType._('customer');
const ActorType _$staff = const ActorType._('staff');
const ActorType _$system = const ActorType._('system');
const ActorType _$unknownDefaultOpenApi =
    const ActorType._('unknownDefaultOpenApi');

ActorType _$valueOf(String name) {
  switch (name) {
    case 'customer':
      return _$customer;
    case 'staff':
      return _$staff;
    case 'system':
      return _$system;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<ActorType> _$values = BuiltSet<ActorType>(const <ActorType>[
  _$customer,
  _$staff,
  _$system,
  _$unknownDefaultOpenApi,
]);

class _$ActorTypeMeta {
  const _$ActorTypeMeta();
  ActorType get customer => _$customer;
  ActorType get staff => _$staff;
  ActorType get system => _$system;
  ActorType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  ActorType valueOf(String name) => _$valueOf(name);
  BuiltSet<ActorType> get values => _$values;
}

abstract class _$ActorTypeMixin {
  // ignore: non_constant_identifier_names
  _$ActorTypeMeta get ActorType => const _$ActorTypeMeta();
}

Serializer<ActorType> _$actorTypeSerializer = _$ActorTypeSerializer();

class _$ActorTypeSerializer implements PrimitiveSerializer<ActorType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'customer': 'customer',
    'staff': 'staff',
    'system': 'system',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'customer': 'customer',
    'staff': 'staff',
    'system': 'system',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[ActorType];
  @override
  final String wireName = 'ActorType';

  @override
  Object serialize(Serializers serializers, ActorType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  ActorType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      ActorType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
