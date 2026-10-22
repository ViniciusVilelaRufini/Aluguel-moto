// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'handover_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const HandoverType _$pickup = const HandoverType._('pickup');
const HandoverType _$returnDepot = const HandoverType._('returnDepot');
const HandoverType _$unknownDefaultOpenApi =
    const HandoverType._('unknownDefaultOpenApi');

HandoverType _$valueOf(String name) {
  switch (name) {
    case 'pickup':
      return _$pickup;
    case 'returnDepot':
      return _$returnDepot;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<HandoverType> _$values =
    BuiltSet<HandoverType>(const <HandoverType>[
  _$pickup,
  _$returnDepot,
  _$unknownDefaultOpenApi,
]);

class _$HandoverTypeMeta {
  const _$HandoverTypeMeta();
  HandoverType get pickup => _$pickup;
  HandoverType get returnDepot => _$returnDepot;
  HandoverType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  HandoverType valueOf(String name) => _$valueOf(name);
  BuiltSet<HandoverType> get values => _$values;
}

abstract class _$HandoverTypeMixin {
  // ignore: non_constant_identifier_names
  _$HandoverTypeMeta get HandoverType => const _$HandoverTypeMeta();
}

Serializer<HandoverType> _$handoverTypeSerializer = _$HandoverTypeSerializer();

class _$HandoverTypeSerializer implements PrimitiveSerializer<HandoverType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'pickup': 'pickup',
    'returnDepot': 'return_depot',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'pickup': 'pickup',
    'return_depot': 'returnDepot',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[HandoverType];
  @override
  final String wireName = 'HandoverType';

  @override
  Object serialize(Serializers serializers, HandoverType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  HandoverType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      HandoverType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
