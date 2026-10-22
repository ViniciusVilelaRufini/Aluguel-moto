// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pickup_mode.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const PickupMode _$now = const PickupMode._('now');
const PickupMode _$scheduled = const PickupMode._('scheduled');
const PickupMode _$unknownDefaultOpenApi =
    const PickupMode._('unknownDefaultOpenApi');

PickupMode _$valueOf(String name) {
  switch (name) {
    case 'now':
      return _$now;
    case 'scheduled':
      return _$scheduled;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<PickupMode> _$values = BuiltSet<PickupMode>(const <PickupMode>[
  _$now,
  _$scheduled,
  _$unknownDefaultOpenApi,
]);

class _$PickupModeMeta {
  const _$PickupModeMeta();
  PickupMode get now => _$now;
  PickupMode get scheduled => _$scheduled;
  PickupMode get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  PickupMode valueOf(String name) => _$valueOf(name);
  BuiltSet<PickupMode> get values => _$values;
}

abstract class _$PickupModeMixin {
  // ignore: non_constant_identifier_names
  _$PickupModeMeta get PickupMode => const _$PickupModeMeta();
}

Serializer<PickupMode> _$pickupModeSerializer = _$PickupModeSerializer();

class _$PickupModeSerializer implements PrimitiveSerializer<PickupMode> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'now': 'now',
    'scheduled': 'scheduled',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'now': 'now',
    'scheduled': 'scheduled',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[PickupMode];
  @override
  final String wireName = 'PickupMode';

  @override
  Object serialize(Serializers serializers, PickupMode object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  PickupMode deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      PickupMode.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
