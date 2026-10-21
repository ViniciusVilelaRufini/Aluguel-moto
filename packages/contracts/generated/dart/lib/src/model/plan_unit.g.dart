// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'plan_unit.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const PlanUnit _$minute = const PlanUnit._('minute');
const PlanUnit _$hour = const PlanUnit._('hour');
const PlanUnit _$day = const PlanUnit._('day');
const PlanUnit _$week = const PlanUnit._('week');
const PlanUnit _$month = const PlanUnit._('month');
const PlanUnit _$unknownDefaultOpenApi =
    const PlanUnit._('unknownDefaultOpenApi');

PlanUnit _$valueOf(String name) {
  switch (name) {
    case 'minute':
      return _$minute;
    case 'hour':
      return _$hour;
    case 'day':
      return _$day;
    case 'week':
      return _$week;
    case 'month':
      return _$month;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<PlanUnit> _$values = BuiltSet<PlanUnit>(const <PlanUnit>[
  _$minute,
  _$hour,
  _$day,
  _$week,
  _$month,
  _$unknownDefaultOpenApi,
]);

class _$PlanUnitMeta {
  const _$PlanUnitMeta();
  PlanUnit get minute => _$minute;
  PlanUnit get hour => _$hour;
  PlanUnit get day => _$day;
  PlanUnit get week => _$week;
  PlanUnit get month => _$month;
  PlanUnit get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  PlanUnit valueOf(String name) => _$valueOf(name);
  BuiltSet<PlanUnit> get values => _$values;
}

abstract class _$PlanUnitMixin {
  // ignore: non_constant_identifier_names
  _$PlanUnitMeta get PlanUnit => const _$PlanUnitMeta();
}

Serializer<PlanUnit> _$planUnitSerializer = _$PlanUnitSerializer();

class _$PlanUnitSerializer implements PrimitiveSerializer<PlanUnit> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'minute': 'minute',
    'hour': 'hour',
    'day': 'day',
    'week': 'week',
    'month': 'month',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'minute': 'minute',
    'hour': 'hour',
    'day': 'day',
    'week': 'week',
    'month': 'month',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[PlanUnit];
  @override
  final String wireName = 'PlanUnit';

  @override
  Object serialize(Serializers serializers, PlanUnit object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  PlanUnit deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      PlanUnit.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
