// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'command_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const CommandStatus _$pending = const CommandStatus._('pending');
const CommandStatus _$inProgress = const CommandStatus._('inProgress');
const CommandStatus _$confirmed = const CommandStatus._('confirmed');
const CommandStatus _$failed = const CommandStatus._('failed');
const CommandStatus _$unknownDefaultOpenApi =
    const CommandStatus._('unknownDefaultOpenApi');

CommandStatus _$valueOf(String name) {
  switch (name) {
    case 'pending':
      return _$pending;
    case 'inProgress':
      return _$inProgress;
    case 'confirmed':
      return _$confirmed;
    case 'failed':
      return _$failed;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<CommandStatus> _$values =
    BuiltSet<CommandStatus>(const <CommandStatus>[
  _$pending,
  _$inProgress,
  _$confirmed,
  _$failed,
  _$unknownDefaultOpenApi,
]);

class _$CommandStatusMeta {
  const _$CommandStatusMeta();
  CommandStatus get pending => _$pending;
  CommandStatus get inProgress => _$inProgress;
  CommandStatus get confirmed => _$confirmed;
  CommandStatus get failed => _$failed;
  CommandStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  CommandStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<CommandStatus> get values => _$values;
}

abstract class _$CommandStatusMixin {
  // ignore: non_constant_identifier_names
  _$CommandStatusMeta get CommandStatus => const _$CommandStatusMeta();
}

Serializer<CommandStatus> _$commandStatusSerializer =
    _$CommandStatusSerializer();

class _$CommandStatusSerializer implements PrimitiveSerializer<CommandStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'pending': 'pending',
    'inProgress': 'in_progress',
    'confirmed': 'confirmed',
    'failed': 'failed',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'pending': 'pending',
    'in_progress': 'inProgress',
    'confirmed': 'confirmed',
    'failed': 'failed',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[CommandStatus];
  @override
  final String wireName = 'CommandStatus';

  @override
  Object serialize(Serializers serializers, CommandStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  CommandStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      CommandStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
