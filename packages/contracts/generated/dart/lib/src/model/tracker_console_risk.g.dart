// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tracker_console_risk.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const TrackerConsoleRisk _$read = const TrackerConsoleRisk._('read');
const TrackerConsoleRisk _$change = const TrackerConsoleRisk._('change');
const TrackerConsoleRisk _$connection =
    const TrackerConsoleRisk._('connection');
const TrackerConsoleRisk _$unknownDefaultOpenApi =
    const TrackerConsoleRisk._('unknownDefaultOpenApi');

TrackerConsoleRisk _$valueOf(String name) {
  switch (name) {
    case 'read':
      return _$read;
    case 'change':
      return _$change;
    case 'connection':
      return _$connection;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<TrackerConsoleRisk> _$values =
    BuiltSet<TrackerConsoleRisk>(const <TrackerConsoleRisk>[
  _$read,
  _$change,
  _$connection,
  _$unknownDefaultOpenApi,
]);

class _$TrackerConsoleRiskMeta {
  const _$TrackerConsoleRiskMeta();
  TrackerConsoleRisk get read => _$read;
  TrackerConsoleRisk get change => _$change;
  TrackerConsoleRisk get connection => _$connection;
  TrackerConsoleRisk get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  TrackerConsoleRisk valueOf(String name) => _$valueOf(name);
  BuiltSet<TrackerConsoleRisk> get values => _$values;
}

abstract class _$TrackerConsoleRiskMixin {
  // ignore: non_constant_identifier_names
  _$TrackerConsoleRiskMeta get TrackerConsoleRisk =>
      const _$TrackerConsoleRiskMeta();
}

Serializer<TrackerConsoleRisk> _$trackerConsoleRiskSerializer =
    _$TrackerConsoleRiskSerializer();

class _$TrackerConsoleRiskSerializer
    implements PrimitiveSerializer<TrackerConsoleRisk> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'read': 'read',
    'change': 'change',
    'connection': 'connection',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'read': 'read',
    'change': 'change',
    'connection': 'connection',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[TrackerConsoleRisk];
  @override
  final String wireName = 'TrackerConsoleRisk';

  @override
  Object serialize(Serializers serializers, TrackerConsoleRisk object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  TrackerConsoleRisk deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      TrackerConsoleRisk.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
