// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'battery_initial_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const BatteryInitialStatus _$charging =
    const BatteryInitialStatus._('charging');
const BatteryInitialStatus _$charged = const BatteryInitialStatus._('charged');
const BatteryInitialStatus _$unknownDefaultOpenApi =
    const BatteryInitialStatus._('unknownDefaultOpenApi');

BatteryInitialStatus _$valueOf(String name) {
  switch (name) {
    case 'charging':
      return _$charging;
    case 'charged':
      return _$charged;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<BatteryInitialStatus> _$values =
    BuiltSet<BatteryInitialStatus>(const <BatteryInitialStatus>[
  _$charging,
  _$charged,
  _$unknownDefaultOpenApi,
]);

class _$BatteryInitialStatusMeta {
  const _$BatteryInitialStatusMeta();
  BatteryInitialStatus get charging => _$charging;
  BatteryInitialStatus get charged => _$charged;
  BatteryInitialStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  BatteryInitialStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<BatteryInitialStatus> get values => _$values;
}

abstract class _$BatteryInitialStatusMixin {
  // ignore: non_constant_identifier_names
  _$BatteryInitialStatusMeta get BatteryInitialStatus =>
      const _$BatteryInitialStatusMeta();
}

Serializer<BatteryInitialStatus> _$batteryInitialStatusSerializer =
    _$BatteryInitialStatusSerializer();

class _$BatteryInitialStatusSerializer
    implements PrimitiveSerializer<BatteryInitialStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'charging': 'charging',
    'charged': 'charged',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'charging': 'charging',
    'charged': 'charged',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[BatteryInitialStatus];
  @override
  final String wireName = 'BatteryInitialStatus';

  @override
  Object serialize(Serializers serializers, BatteryInitialStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  BatteryInitialStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      BatteryInitialStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
