// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'field_task_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const FieldTaskType _$collect = const FieldTaskType._('collect');
const FieldTaskType _$batterySwap = const FieldTaskType._('batterySwap');
const FieldTaskType _$maintenance = const FieldTaskType._('maintenance');
const FieldTaskType _$reposition = const FieldTaskType._('reposition');
const FieldTaskType _$inspection = const FieldTaskType._('inspection');
const FieldTaskType _$unknownDefaultOpenApi =
    const FieldTaskType._('unknownDefaultOpenApi');

FieldTaskType _$valueOf(String name) {
  switch (name) {
    case 'collect':
      return _$collect;
    case 'batterySwap':
      return _$batterySwap;
    case 'maintenance':
      return _$maintenance;
    case 'reposition':
      return _$reposition;
    case 'inspection':
      return _$inspection;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<FieldTaskType> _$values =
    BuiltSet<FieldTaskType>(const <FieldTaskType>[
  _$collect,
  _$batterySwap,
  _$maintenance,
  _$reposition,
  _$inspection,
  _$unknownDefaultOpenApi,
]);

class _$FieldTaskTypeMeta {
  const _$FieldTaskTypeMeta();
  FieldTaskType get collect => _$collect;
  FieldTaskType get batterySwap => _$batterySwap;
  FieldTaskType get maintenance => _$maintenance;
  FieldTaskType get reposition => _$reposition;
  FieldTaskType get inspection => _$inspection;
  FieldTaskType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  FieldTaskType valueOf(String name) => _$valueOf(name);
  BuiltSet<FieldTaskType> get values => _$values;
}

abstract class _$FieldTaskTypeMixin {
  // ignore: non_constant_identifier_names
  _$FieldTaskTypeMeta get FieldTaskType => const _$FieldTaskTypeMeta();
}

Serializer<FieldTaskType> _$fieldTaskTypeSerializer =
    _$FieldTaskTypeSerializer();

class _$FieldTaskTypeSerializer implements PrimitiveSerializer<FieldTaskType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'collect': 'collect',
    'batterySwap': 'battery_swap',
    'maintenance': 'maintenance',
    'reposition': 'reposition',
    'inspection': 'inspection',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'collect': 'collect',
    'battery_swap': 'batterySwap',
    'maintenance': 'maintenance',
    'reposition': 'reposition',
    'inspection': 'inspection',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[FieldTaskType];
  @override
  final String wireName = 'FieldTaskType';

  @override
  Object serialize(Serializers serializers, FieldTaskType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  FieldTaskType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      FieldTaskType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
