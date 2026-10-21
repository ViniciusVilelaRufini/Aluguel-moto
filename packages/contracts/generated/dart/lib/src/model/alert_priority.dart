//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'alert_priority.g.dart';

class AlertPriority extends EnumClass {
  @BuiltValueEnumConst(wireName: r'low')
  static const AlertPriority low = _$low;
  @BuiltValueEnumConst(wireName: r'medium')
  static const AlertPriority medium = _$medium;
  @BuiltValueEnumConst(wireName: r'high')
  static const AlertPriority high = _$high;
  @BuiltValueEnumConst(wireName: r'critical')
  static const AlertPriority critical = _$critical;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const AlertPriority unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<AlertPriority> get serializer => _$alertPrioritySerializer;

  const AlertPriority._(String name) : super(name);

  static BuiltSet<AlertPriority> get values => _$values;
  static AlertPriority valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class AlertPriorityMixin = Object with _$AlertPriorityMixin;
