// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tracker_console_fail_reason.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const TrackerConsoleFailReason _$offline =
    const TrackerConsoleFailReason._('offline');
const TrackerConsoleFailReason _$timeout =
    const TrackerConsoleFailReason._('timeout');
const TrackerConsoleFailReason _$error =
    const TrackerConsoleFailReason._('error');
const TrackerConsoleFailReason _$unknownDefaultOpenApi =
    const TrackerConsoleFailReason._('unknownDefaultOpenApi');

TrackerConsoleFailReason _$valueOf(String name) {
  switch (name) {
    case 'offline':
      return _$offline;
    case 'timeout':
      return _$timeout;
    case 'error':
      return _$error;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<TrackerConsoleFailReason> _$values =
    BuiltSet<TrackerConsoleFailReason>(const <TrackerConsoleFailReason>[
  _$offline,
  _$timeout,
  _$error,
  _$unknownDefaultOpenApi,
]);

class _$TrackerConsoleFailReasonMeta {
  const _$TrackerConsoleFailReasonMeta();
  TrackerConsoleFailReason get offline => _$offline;
  TrackerConsoleFailReason get timeout => _$timeout;
  TrackerConsoleFailReason get error => _$error;
  TrackerConsoleFailReason get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  TrackerConsoleFailReason valueOf(String name) => _$valueOf(name);
  BuiltSet<TrackerConsoleFailReason> get values => _$values;
}

abstract class _$TrackerConsoleFailReasonMixin {
  // ignore: non_constant_identifier_names
  _$TrackerConsoleFailReasonMeta get TrackerConsoleFailReason =>
      const _$TrackerConsoleFailReasonMeta();
}

Serializer<TrackerConsoleFailReason> _$trackerConsoleFailReasonSerializer =
    _$TrackerConsoleFailReasonSerializer();

class _$TrackerConsoleFailReasonSerializer
    implements PrimitiveSerializer<TrackerConsoleFailReason> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'offline': 'offline',
    'timeout': 'timeout',
    'error': 'error',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'offline': 'offline',
    'timeout': 'timeout',
    'error': 'error',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[TrackerConsoleFailReason];
  @override
  final String wireName = 'TrackerConsoleFailReason';

  @override
  Object serialize(Serializers serializers, TrackerConsoleFailReason object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  TrackerConsoleFailReason deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      TrackerConsoleFailReason.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
