//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'plan_unit.g.dart';

class PlanUnit extends EnumClass {
  @BuiltValueEnumConst(wireName: r'minute')
  static const PlanUnit minute = _$minute;
  @BuiltValueEnumConst(wireName: r'hour')
  static const PlanUnit hour = _$hour;
  @BuiltValueEnumConst(wireName: r'day')
  static const PlanUnit day = _$day;
  @BuiltValueEnumConst(wireName: r'week')
  static const PlanUnit week = _$week;
  @BuiltValueEnumConst(wireName: r'month')
  static const PlanUnit month = _$month;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const PlanUnit unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<PlanUnit> get serializer => _$planUnitSerializer;

  const PlanUnit._(String name) : super(name);

  static BuiltSet<PlanUnit> get values => _$values;
  static PlanUnit valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class PlanUnitMixin = Object with _$PlanUnitMixin;
