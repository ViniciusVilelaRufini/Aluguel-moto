//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'plan_code.g.dart';

class PlanCode extends EnumClass {
  @BuiltValueEnumConst(wireName: r'minute')
  static const PlanCode minute = _$minute;
  @BuiltValueEnumConst(wireName: r'hour')
  static const PlanCode hour = _$hour;
  @BuiltValueEnumConst(wireName: r'day')
  static const PlanCode day = _$day;
  @BuiltValueEnumConst(wireName: r'weekly')
  static const PlanCode weekly = _$weekly;
  @BuiltValueEnumConst(wireName: r'monthly')
  static const PlanCode monthly = _$monthly;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const PlanCode unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<PlanCode> get serializer => _$planCodeSerializer;

  const PlanCode._(String name) : super(name);

  static BuiltSet<PlanCode> get values => _$values;
  static PlanCode valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class PlanCodeMixin = Object with _$PlanCodeMixin;
