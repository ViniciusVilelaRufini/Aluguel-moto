// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'zone_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const ZoneType _$operation = const ZoneType._('operation');
const ZoneType _$return_ = const ZoneType._('return_');
const ZoneType _$forbidden = const ZoneType._('forbidden');
const ZoneType _$reducedSpeed = const ZoneType._('reducedSpeed');
const ZoneType _$unknownDefaultOpenApi =
    const ZoneType._('unknownDefaultOpenApi');

ZoneType _$valueOf(String name) {
  switch (name) {
    case 'operation':
      return _$operation;
    case 'return_':
      return _$return_;
    case 'forbidden':
      return _$forbidden;
    case 'reducedSpeed':
      return _$reducedSpeed;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<ZoneType> _$values = BuiltSet<ZoneType>(const <ZoneType>[
  _$operation,
  _$return_,
  _$forbidden,
  _$reducedSpeed,
  _$unknownDefaultOpenApi,
]);

class _$ZoneTypeMeta {
  const _$ZoneTypeMeta();
  ZoneType get operation => _$operation;
  ZoneType get return_ => _$return_;
  ZoneType get forbidden => _$forbidden;
  ZoneType get reducedSpeed => _$reducedSpeed;
  ZoneType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  ZoneType valueOf(String name) => _$valueOf(name);
  BuiltSet<ZoneType> get values => _$values;
}

abstract class _$ZoneTypeMixin {
  // ignore: non_constant_identifier_names
  _$ZoneTypeMeta get ZoneType => const _$ZoneTypeMeta();
}

Serializer<ZoneType> _$zoneTypeSerializer = _$ZoneTypeSerializer();

class _$ZoneTypeSerializer implements PrimitiveSerializer<ZoneType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'operation': 'operation',
    'return_': 'return',
    'forbidden': 'forbidden',
    'reducedSpeed': 'reduced_speed',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'operation': 'operation',
    'return': 'return_',
    'forbidden': 'forbidden',
    'reduced_speed': 'reducedSpeed',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[ZoneType];
  @override
  final String wireName = 'ZoneType';

  @override
  Object serialize(Serializers serializers, ZoneType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  ZoneType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      ZoneType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
