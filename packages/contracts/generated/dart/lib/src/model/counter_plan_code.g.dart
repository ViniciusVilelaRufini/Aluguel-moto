// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'counter_plan_code.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const CounterPlanCode _$day = const CounterPlanCode._('day');
const CounterPlanCode _$weekly = const CounterPlanCode._('weekly');
const CounterPlanCode _$monthly = const CounterPlanCode._('monthly');
const CounterPlanCode _$unknownDefaultOpenApi =
    const CounterPlanCode._('unknownDefaultOpenApi');

CounterPlanCode _$valueOf(String name) {
  switch (name) {
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

final BuiltSet<CounterPlanCode> _$values =
    BuiltSet<CounterPlanCode>(const <CounterPlanCode>[
  _$day,
  _$weekly,
  _$monthly,
  _$unknownDefaultOpenApi,
]);

class _$CounterPlanCodeMeta {
  const _$CounterPlanCodeMeta();
  CounterPlanCode get day => _$day;
  CounterPlanCode get weekly => _$weekly;
  CounterPlanCode get monthly => _$monthly;
  CounterPlanCode get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  CounterPlanCode valueOf(String name) => _$valueOf(name);
  BuiltSet<CounterPlanCode> get values => _$values;
}

abstract class _$CounterPlanCodeMixin {
  // ignore: non_constant_identifier_names
  _$CounterPlanCodeMeta get CounterPlanCode => const _$CounterPlanCodeMeta();
}

Serializer<CounterPlanCode> _$counterPlanCodeSerializer =
    _$CounterPlanCodeSerializer();

class _$CounterPlanCodeSerializer
    implements PrimitiveSerializer<CounterPlanCode> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'day': 'day',
    'weekly': 'weekly',
    'monthly': 'monthly',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'day': 'day',
    'weekly': 'weekly',
    'monthly': 'monthly',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[CounterPlanCode];
  @override
  final String wireName = 'CounterPlanCode';

  @override
  Object serialize(Serializers serializers, CounterPlanCode object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  CounterPlanCode deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      CounterPlanCode.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
