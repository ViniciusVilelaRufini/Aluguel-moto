// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'plan_code.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const PlanCode _$minute = const PlanCode._('minute');
const PlanCode _$hour = const PlanCode._('hour');
const PlanCode _$day = const PlanCode._('day');
const PlanCode _$weekly = const PlanCode._('weekly');
const PlanCode _$monthly = const PlanCode._('monthly');
const PlanCode _$unknownDefaultOpenApi =
    const PlanCode._('unknownDefaultOpenApi');

PlanCode _$valueOf(String name) {
  switch (name) {
    case 'minute':
      return _$minute;
    case 'hour':
      return _$hour;
    case 'day':
      return _$day;
    case 'weekly':
      return _$weekly;
    case 'monthly':
      return _$monthly;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<PlanCode> _$values = BuiltSet<PlanCode>(const <PlanCode>[
  _$minute,
  _$hour,
  _$day,
  _$weekly,
  _$monthly,
  _$unknownDefaultOpenApi,
]);

class _$PlanCodeMeta {
  const _$PlanCodeMeta();
  PlanCode get minute => _$minute;
  PlanCode get hour => _$hour;
  PlanCode get day => _$day;
  PlanCode get weekly => _$weekly;
  PlanCode get monthly => _$monthly;
  PlanCode get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  PlanCode valueOf(String name) => _$valueOf(name);
  BuiltSet<PlanCode> get values => _$values;
}

abstract class _$PlanCodeMixin {
  // ignore: non_constant_identifier_names
  _$PlanCodeMeta get PlanCode => const _$PlanCodeMeta();
}

Serializer<PlanCode> _$planCodeSerializer = _$PlanCodeSerializer();

class _$PlanCodeSerializer implements PrimitiveSerializer<PlanCode> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'minute': 'minute',
    'hour': 'hour',
    'day': 'day',
    'weekly': 'weekly',
    'monthly': 'monthly',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'minute': 'minute',
    'hour': 'hour',
    'day': 'day',
    'weekly': 'weekly',
    'monthly': 'monthly',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[PlanCode];
  @override
  final String wireName = 'PlanCode';

  @override
  Object serialize(Serializers serializers, PlanCode object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  PlanCode deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      PlanCode.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
