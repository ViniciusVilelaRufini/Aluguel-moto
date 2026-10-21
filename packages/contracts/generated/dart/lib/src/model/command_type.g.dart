// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'command_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const CommandType _$lock = const CommandType._('lock');
const CommandType _$unlock = const CommandType._('unlock');
const CommandType _$horn = const CommandType._('horn');
const CommandType _$speedLimit = const CommandType._('speedLimit');
const CommandType _$stolenMode = const CommandType._('stolenMode');
const CommandType _$unknownDefaultOpenApi =
    const CommandType._('unknownDefaultOpenApi');

CommandType _$valueOf(String name) {
  switch (name) {
    case 'lock':
      return _$lock;
    case 'unlock':
      return _$unlock;
    case 'horn':
      return _$horn;
    case 'speedLimit':
      return _$speedLimit;
    case 'stolenMode':
      return _$stolenMode;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<CommandType> _$values =
    BuiltSet<CommandType>(const <CommandType>[
  _$lock,
  _$unlock,
  _$horn,
  _$speedLimit,
  _$stolenMode,
  _$unknownDefaultOpenApi,
]);

class _$CommandTypeMeta {
  const _$CommandTypeMeta();
  CommandType get lock => _$lock;
  CommandType get unlock => _$unlock;
  CommandType get horn => _$horn;
  CommandType get speedLimit => _$speedLimit;
  CommandType get stolenMode => _$stolenMode;
  CommandType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  CommandType valueOf(String name) => _$valueOf(name);
  BuiltSet<CommandType> get values => _$values;
}

abstract class _$CommandTypeMixin {
  // ignore: non_constant_identifier_names
  _$CommandTypeMeta get CommandType => const _$CommandTypeMeta();
}

Serializer<CommandType> _$commandTypeSerializer = _$CommandTypeSerializer();

class _$CommandTypeSerializer implements PrimitiveSerializer<CommandType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'lock': 'lock',
    'unlock': 'unlock',
    'horn': 'horn',
    'speedLimit': 'speed_limit',
    'stolenMode': 'stolen_mode',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'lock': 'lock',
    'unlock': 'unlock',
    'horn': 'horn',
    'speed_limit': 'speedLimit',
    'stolen_mode': 'stolenMode',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[CommandType];
  @override
  final String wireName = 'CommandType';

  @override
  Object serialize(Serializers serializers, CommandType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  CommandType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      CommandType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
