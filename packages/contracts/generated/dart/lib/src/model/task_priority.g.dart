// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'task_priority.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const TaskPriority _$low = const TaskPriority._('low');
const TaskPriority _$medium = const TaskPriority._('medium');
const TaskPriority _$high = const TaskPriority._('high');
const TaskPriority _$urgent = const TaskPriority._('urgent');
const TaskPriority _$unknownDefaultOpenApi =
    const TaskPriority._('unknownDefaultOpenApi');

TaskPriority _$valueOf(String name) {
  switch (name) {
    case 'low':
      return _$low;
    case 'medium':
      return _$medium;
    case 'high':
      return _$high;
    case 'urgent':
      return _$urgent;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<TaskPriority> _$values =
    BuiltSet<TaskPriority>(const <TaskPriority>[
  _$low,
  _$medium,
  _$high,
  _$urgent,
  _$unknownDefaultOpenApi,
]);

class _$TaskPriorityMeta {
  const _$TaskPriorityMeta();
  TaskPriority get low => _$low;
  TaskPriority get medium => _$medium;
  TaskPriority get high => _$high;
  TaskPriority get urgent => _$urgent;
  TaskPriority get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  TaskPriority valueOf(String name) => _$valueOf(name);
  BuiltSet<TaskPriority> get values => _$values;
}

abstract class _$TaskPriorityMixin {
  // ignore: non_constant_identifier_names
  _$TaskPriorityMeta get TaskPriority => const _$TaskPriorityMeta();
}

Serializer<TaskPriority> _$taskPrioritySerializer = _$TaskPrioritySerializer();

class _$TaskPrioritySerializer implements PrimitiveSerializer<TaskPriority> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
    'urgent': 'urgent',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
    'urgent': 'urgent',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[TaskPriority];
  @override
  final String wireName = 'TaskPriority';

  @override
  Object serialize(Serializers serializers, TaskPriority object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  TaskPriority deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      TaskPriority.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
