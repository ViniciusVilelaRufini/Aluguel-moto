//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'field_task_status.g.dart';

class FieldTaskStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'open')
  static const FieldTaskStatus open = _$open;
  @BuiltValueEnumConst(wireName: r'assigned')
  static const FieldTaskStatus assigned = _$assigned;
  @BuiltValueEnumConst(wireName: r'in_progress')
  static const FieldTaskStatus inProgress = _$inProgress;
  @BuiltValueEnumConst(wireName: r'done')
  static const FieldTaskStatus done = _$done;
  @BuiltValueEnumConst(wireName: r'canceled')
  static const FieldTaskStatus canceled = _$canceled;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const FieldTaskStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<FieldTaskStatus> get serializer =>
      _$fieldTaskStatusSerializer;

  const FieldTaskStatus._(String name) : super(name);

  static BuiltSet<FieldTaskStatus> get values => _$values;
  static FieldTaskStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class FieldTaskStatusMixin = Object with _$FieldTaskStatusMixin;
