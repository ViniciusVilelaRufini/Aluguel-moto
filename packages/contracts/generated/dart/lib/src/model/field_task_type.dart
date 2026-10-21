//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'field_task_type.g.dart';

class FieldTaskType extends EnumClass {
  @BuiltValueEnumConst(wireName: r'collect')
  static const FieldTaskType collect = _$collect;
  @BuiltValueEnumConst(wireName: r'battery_swap')
  static const FieldTaskType batterySwap = _$batterySwap;
  @BuiltValueEnumConst(wireName: r'maintenance')
  static const FieldTaskType maintenance = _$maintenance;
  @BuiltValueEnumConst(wireName: r'reposition')
  static const FieldTaskType reposition = _$reposition;
  @BuiltValueEnumConst(wireName: r'inspection')
  static const FieldTaskType inspection = _$inspection;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const FieldTaskType unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<FieldTaskType> get serializer => _$fieldTaskTypeSerializer;

  const FieldTaskType._(String name) : super(name);

  static BuiltSet<FieldTaskType> get values => _$values;
  static FieldTaskType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class FieldTaskTypeMixin = Object with _$FieldTaskTypeMixin;
