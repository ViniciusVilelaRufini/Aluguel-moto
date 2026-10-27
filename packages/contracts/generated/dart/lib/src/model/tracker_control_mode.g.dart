// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tracker_control_mode.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const TrackerControlMode _$speedControl =
    const TrackerControlMode._('speedControl');
const TrackerControlMode _$relayOnly = const TrackerControlMode._('relayOnly');
const TrackerControlMode _$unknownDefaultOpenApi =
    const TrackerControlMode._('unknownDefaultOpenApi');

TrackerControlMode _$valueOf(String name) {
  switch (name) {
    case 'speedControl':
      return _$speedControl;
    case 'relayOnly':
      return _$relayOnly;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<TrackerControlMode> _$values =
    BuiltSet<TrackerControlMode>(const <TrackerControlMode>[
  _$speedControl,
  _$relayOnly,
  _$unknownDefaultOpenApi,
]);

class _$TrackerControlModeMeta {
  const _$TrackerControlModeMeta();
  TrackerControlMode get speedControl => _$speedControl;
  TrackerControlMode get relayOnly => _$relayOnly;
  TrackerControlMode get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  TrackerControlMode valueOf(String name) => _$valueOf(name);
  BuiltSet<TrackerControlMode> get values => _$values;
}

abstract class _$TrackerControlModeMixin {
  // ignore: non_constant_identifier_names
  _$TrackerControlModeMeta get TrackerControlMode =>
      const _$TrackerControlModeMeta();
}

Serializer<TrackerControlMode> _$trackerControlModeSerializer =
    _$TrackerControlModeSerializer();

class _$TrackerControlModeSerializer
    implements PrimitiveSerializer<TrackerControlMode> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'speedControl': 'speed_control',
    'relayOnly': 'relay_only',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'speed_control': 'speedControl',
    'relay_only': 'relayOnly',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[TrackerControlMode];
  @override
  final String wireName = 'TrackerControlMode';

  @override
  Object serialize(Serializers serializers, TrackerControlMode object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  TrackerControlMode deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      TrackerControlMode.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
