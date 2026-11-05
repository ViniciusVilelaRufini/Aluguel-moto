// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tracker_console_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const TrackerConsoleStatus _$pending = const TrackerConsoleStatus._('pending');
const TrackerConsoleStatus _$answered =
    const TrackerConsoleStatus._('answered');
const TrackerConsoleStatus _$failed = const TrackerConsoleStatus._('failed');
const TrackerConsoleStatus _$unknownDefaultOpenApi =
    const TrackerConsoleStatus._('unknownDefaultOpenApi');

TrackerConsoleStatus _$valueOf(String name) {
  switch (name) {
    case 'pending':
      return _$pending;
    case 'answered':
      return _$answered;
    case 'failed':
      return _$failed;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<TrackerConsoleStatus> _$values =
    BuiltSet<TrackerConsoleStatus>(const <TrackerConsoleStatus>[
  _$pending,
  _$answered,
  _$failed,
  _$unknownDefaultOpenApi,
]);

class _$TrackerConsoleStatusMeta {
  const _$TrackerConsoleStatusMeta();
  TrackerConsoleStatus get pending => _$pending;
  TrackerConsoleStatus get answered => _$answered;
  TrackerConsoleStatus get failed => _$failed;
  TrackerConsoleStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  TrackerConsoleStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<TrackerConsoleStatus> get values => _$values;
}

abstract class _$TrackerConsoleStatusMixin {
  // ignore: non_constant_identifier_names
  _$TrackerConsoleStatusMeta get TrackerConsoleStatus =>
      const _$TrackerConsoleStatusMeta();
}

Serializer<TrackerConsoleStatus> _$trackerConsoleStatusSerializer =
    _$TrackerConsoleStatusSerializer();

class _$TrackerConsoleStatusSerializer
    implements PrimitiveSerializer<TrackerConsoleStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'pending': 'pending',
    'answered': 'answered',
    'failed': 'failed',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'pending': 'pending',
    'answered': 'answered',
    'failed': 'failed',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[TrackerConsoleStatus];
  @override
  final String wireName = 'TrackerConsoleStatus';

  @override
  Object serialize(Serializers serializers, TrackerConsoleStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  TrackerConsoleStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      TrackerConsoleStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
