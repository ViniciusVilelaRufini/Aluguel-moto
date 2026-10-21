// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'health_state.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const HealthState _$ok = const HealthState._('ok');
const HealthState _$degraded = const HealthState._('degraded');
const HealthState _$down = const HealthState._('down');
const HealthState _$unknownDefaultOpenApi =
    const HealthState._('unknownDefaultOpenApi');

HealthState _$valueOf(String name) {
  switch (name) {
    case 'ok':
      return _$ok;
    case 'degraded':
      return _$degraded;
    case 'down':
      return _$down;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<HealthState> _$values =
    BuiltSet<HealthState>(const <HealthState>[
  _$ok,
  _$degraded,
  _$down,
  _$unknownDefaultOpenApi,
]);

class _$HealthStateMeta {
  const _$HealthStateMeta();
  HealthState get ok => _$ok;
  HealthState get degraded => _$degraded;
  HealthState get down => _$down;
  HealthState get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  HealthState valueOf(String name) => _$valueOf(name);
  BuiltSet<HealthState> get values => _$values;
}

abstract class _$HealthStateMixin {
  // ignore: non_constant_identifier_names
  _$HealthStateMeta get HealthState => const _$HealthStateMeta();
}

Serializer<HealthState> _$healthStateSerializer = _$HealthStateSerializer();

class _$HealthStateSerializer implements PrimitiveSerializer<HealthState> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'ok': 'ok',
    'degraded': 'degraded',
    'down': 'down',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'ok': 'ok',
    'degraded': 'degraded',
    'down': 'down',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[HealthState];
  @override
  final String wireName = 'HealthState';

  @override
  Object serialize(Serializers serializers, HealthState object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  HealthState deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      HealthState.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
