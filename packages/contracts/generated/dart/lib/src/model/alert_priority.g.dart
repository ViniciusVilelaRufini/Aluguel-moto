// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'alert_priority.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const AlertPriority _$low = const AlertPriority._('low');
const AlertPriority _$medium = const AlertPriority._('medium');
const AlertPriority _$high = const AlertPriority._('high');
const AlertPriority _$critical = const AlertPriority._('critical');
const AlertPriority _$unknownDefaultOpenApi =
    const AlertPriority._('unknownDefaultOpenApi');

AlertPriority _$valueOf(String name) {
  switch (name) {
    case 'low':
      return _$low;
    case 'medium':
      return _$medium;
    case 'high':
      return _$high;
    case 'critical':
      return _$critical;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<AlertPriority> _$values =
    BuiltSet<AlertPriority>(const <AlertPriority>[
  _$low,
  _$medium,
  _$high,
  _$critical,
  _$unknownDefaultOpenApi,
]);

class _$AlertPriorityMeta {
  const _$AlertPriorityMeta();
  AlertPriority get low => _$low;
  AlertPriority get medium => _$medium;
  AlertPriority get high => _$high;
  AlertPriority get critical => _$critical;
  AlertPriority get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  AlertPriority valueOf(String name) => _$valueOf(name);
  BuiltSet<AlertPriority> get values => _$values;
}

abstract class _$AlertPriorityMixin {
  // ignore: non_constant_identifier_names
  _$AlertPriorityMeta get AlertPriority => const _$AlertPriorityMeta();
}

Serializer<AlertPriority> _$alertPrioritySerializer =
    _$AlertPrioritySerializer();

class _$AlertPrioritySerializer implements PrimitiveSerializer<AlertPriority> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
    'critical': 'critical',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
    'critical': 'critical',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[AlertPriority];
  @override
  final String wireName = 'AlertPriority';

  @override
  Object serialize(Serializers serializers, AlertPriority object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  AlertPriority deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      AlertPriority.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
