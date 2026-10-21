// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'report_format.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const ReportFormat _$json = const ReportFormat._('json');
const ReportFormat _$csv = const ReportFormat._('csv');
const ReportFormat _$unknownDefaultOpenApi =
    const ReportFormat._('unknownDefaultOpenApi');

ReportFormat _$valueOf(String name) {
  switch (name) {
    case 'json':
      return _$json;
    case 'csv':
      return _$csv;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<ReportFormat> _$values =
    BuiltSet<ReportFormat>(const <ReportFormat>[
  _$json,
  _$csv,
  _$unknownDefaultOpenApi,
]);

class _$ReportFormatMeta {
  const _$ReportFormatMeta();
  ReportFormat get json => _$json;
  ReportFormat get csv => _$csv;
  ReportFormat get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  ReportFormat valueOf(String name) => _$valueOf(name);
  BuiltSet<ReportFormat> get values => _$values;
}

abstract class _$ReportFormatMixin {
  // ignore: non_constant_identifier_names
  _$ReportFormatMeta get ReportFormat => const _$ReportFormatMeta();
}

Serializer<ReportFormat> _$reportFormatSerializer = _$ReportFormatSerializer();

class _$ReportFormatSerializer implements PrimitiveSerializer<ReportFormat> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'json': 'json',
    'csv': 'csv',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'json': 'json',
    'csv': 'csv',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[ReportFormat];
  @override
  final String wireName = 'ReportFormat';

  @override
  Object serialize(Serializers serializers, ReportFormat object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  ReportFormat deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      ReportFormat.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
