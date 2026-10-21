// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'report_group_by.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const ReportGroupBy _$hour = const ReportGroupBy._('hour');
const ReportGroupBy _$day = const ReportGroupBy._('day');
const ReportGroupBy _$week = const ReportGroupBy._('week');
const ReportGroupBy _$month = const ReportGroupBy._('month');
const ReportGroupBy _$unknownDefaultOpenApi =
    const ReportGroupBy._('unknownDefaultOpenApi');

ReportGroupBy _$valueOf(String name) {
  switch (name) {
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

final BuiltSet<ReportGroupBy> _$values =
    BuiltSet<ReportGroupBy>(const <ReportGroupBy>[
  _$hour,
  _$day,
  _$week,
  _$month,
  _$unknownDefaultOpenApi,
]);

class _$ReportGroupByMeta {
  const _$ReportGroupByMeta();
  ReportGroupBy get hour => _$hour;
  ReportGroupBy get day => _$day;
  ReportGroupBy get week => _$week;
  ReportGroupBy get month => _$month;
  ReportGroupBy get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  ReportGroupBy valueOf(String name) => _$valueOf(name);
  BuiltSet<ReportGroupBy> get values => _$values;
}

abstract class _$ReportGroupByMixin {
  // ignore: non_constant_identifier_names
  _$ReportGroupByMeta get ReportGroupBy => const _$ReportGroupByMeta();
}

Serializer<ReportGroupBy> _$reportGroupBySerializer =
    _$ReportGroupBySerializer();

class _$ReportGroupBySerializer implements PrimitiveSerializer<ReportGroupBy> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'hour': 'hour',
    'day': 'day',
    'week': 'week',
    'month': 'month',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'hour': 'hour',
    'day': 'day',
    'week': 'week',
    'month': 'month',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[ReportGroupBy];
  @override
  final String wireName = 'ReportGroupBy';

  @override
  Object serialize(Serializers serializers, ReportGroupBy object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  ReportGroupBy deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      ReportGroupBy.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
