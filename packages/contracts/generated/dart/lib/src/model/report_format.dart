//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'report_format.g.dart';

class ReportFormat extends EnumClass {
  @BuiltValueEnumConst(wireName: r'json')
  static const ReportFormat json = _$json;
  @BuiltValueEnumConst(wireName: r'csv')
  static const ReportFormat csv = _$csv;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const ReportFormat unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<ReportFormat> get serializer => _$reportFormatSerializer;

  const ReportFormat._(String name) : super(name);

  static BuiltSet<ReportFormat> get values => _$values;
  static ReportFormat valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class ReportFormatMixin = Object with _$ReportFormatMixin;
