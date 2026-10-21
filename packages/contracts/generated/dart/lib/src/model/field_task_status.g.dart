// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'field_task_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const FieldTaskStatus _$open = const FieldTaskStatus._('open');
const FieldTaskStatus _$assigned = const FieldTaskStatus._('assigned');
const FieldTaskStatus _$inProgress = const FieldTaskStatus._('inProgress');
const FieldTaskStatus _$done = const FieldTaskStatus._('done');
const FieldTaskStatus _$canceled = const FieldTaskStatus._('canceled');
const FieldTaskStatus _$unknownDefaultOpenApi =
    const FieldTaskStatus._('unknownDefaultOpenApi');

FieldTaskStatus _$valueOf(String name) {
  switch (name) {
    case 'open':
      return _$open;
    case 'assigned':
      return _$assigned;
    case 'inProgress':
      return _$inProgress;
    case 'done':
      return _$done;
    case 'canceled':
      return _$canceled;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<FieldTaskStatus> _$values =
    BuiltSet<FieldTaskStatus>(const <FieldTaskStatus>[
  _$open,
  _$assigned,
  _$inProgress,
  _$done,
  _$canceled,
  _$unknownDefaultOpenApi,
]);

class _$FieldTaskStatusMeta {
  const _$FieldTaskStatusMeta();
  FieldTaskStatus get open => _$open;
  FieldTaskStatus get assigned => _$assigned;
  FieldTaskStatus get inProgress => _$inProgress;
  FieldTaskStatus get done => _$done;
  FieldTaskStatus get canceled => _$canceled;
  FieldTaskStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  FieldTaskStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<FieldTaskStatus> get values => _$values;
}

abstract class _$FieldTaskStatusMixin {
  // ignore: non_constant_identifier_names
  _$FieldTaskStatusMeta get FieldTaskStatus => const _$FieldTaskStatusMeta();
}

Serializer<FieldTaskStatus> _$fieldTaskStatusSerializer =
    _$FieldTaskStatusSerializer();

class _$FieldTaskStatusSerializer
    implements PrimitiveSerializer<FieldTaskStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'open': 'open',
    'assigned': 'assigned',
    'inProgress': 'in_progress',
    'done': 'done',
    'canceled': 'canceled',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'open': 'open',
    'assigned': 'assigned',
    'in_progress': 'inProgress',
    'done': 'done',
    'canceled': 'canceled',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[FieldTaskStatus];
  @override
  final String wireName = 'FieldTaskStatus';

  @override
  Object serialize(Serializers serializers, FieldTaskStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  FieldTaskStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      FieldTaskStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
