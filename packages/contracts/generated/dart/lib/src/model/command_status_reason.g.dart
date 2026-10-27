// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'command_status_reason.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const CommandStatusReason _$offline = const CommandStatusReason._('offline');
const CommandStatusReason _$timeout = const CommandStatusReason._('timeout');
const CommandStatusReason _$didNotStop =
    const CommandStatusReason._('didNotStop');
const CommandStatusReason _$invalidLimit =
    const CommandStatusReason._('invalidLimit');
const CommandStatusReason _$lockedByStaff =
    const CommandStatusReason._('lockedByStaff');
const CommandStatusReason _$unsupportedByTracker =
    const CommandStatusReason._('unsupportedByTracker');
const CommandStatusReason _$unknownDefaultOpenApi =
    const CommandStatusReason._('unknownDefaultOpenApi');

CommandStatusReason _$valueOf(String name) {
  switch (name) {
    case 'offline':
      return _$offline;
    case 'timeout':
      return _$timeout;
    case 'didNotStop':
      return _$didNotStop;
    case 'invalidLimit':
      return _$invalidLimit;
    case 'lockedByStaff':
      return _$lockedByStaff;
    case 'unsupportedByTracker':
      return _$unsupportedByTracker;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<CommandStatusReason> _$values =
    BuiltSet<CommandStatusReason>(const <CommandStatusReason>[
  _$offline,
  _$timeout,
  _$didNotStop,
  _$invalidLimit,
  _$lockedByStaff,
  _$unsupportedByTracker,
  _$unknownDefaultOpenApi,
]);

class _$CommandStatusReasonMeta {
  const _$CommandStatusReasonMeta();
  CommandStatusReason get offline => _$offline;
  CommandStatusReason get timeout => _$timeout;
  CommandStatusReason get didNotStop => _$didNotStop;
  CommandStatusReason get invalidLimit => _$invalidLimit;
  CommandStatusReason get lockedByStaff => _$lockedByStaff;
  CommandStatusReason get unsupportedByTracker => _$unsupportedByTracker;
  CommandStatusReason get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  CommandStatusReason valueOf(String name) => _$valueOf(name);
  BuiltSet<CommandStatusReason> get values => _$values;
}

abstract class _$CommandStatusReasonMixin {
  // ignore: non_constant_identifier_names
  _$CommandStatusReasonMeta get CommandStatusReason =>
      const _$CommandStatusReasonMeta();
}

Serializer<CommandStatusReason> _$commandStatusReasonSerializer =
    _$CommandStatusReasonSerializer();

class _$CommandStatusReasonSerializer
    implements PrimitiveSerializer<CommandStatusReason> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'offline': 'offline',
    'timeout': 'timeout',
    'didNotStop': 'did_not_stop',
    'invalidLimit': 'invalid_limit',
    'lockedByStaff': 'locked_by_staff',
    'unsupportedByTracker': 'unsupported_by_tracker',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'offline': 'offline',
    'timeout': 'timeout',
    'did_not_stop': 'didNotStop',
    'invalid_limit': 'invalidLimit',
    'locked_by_staff': 'lockedByStaff',
    'unsupported_by_tracker': 'unsupportedByTracker',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[CommandStatusReason];
  @override
  final String wireName = 'CommandStatusReason';

  @override
  Object serialize(Serializers serializers, CommandStatusReason object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  CommandStatusReason deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      CommandStatusReason.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
