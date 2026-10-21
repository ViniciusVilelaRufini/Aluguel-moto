//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'alert_status.g.dart';

class AlertStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'open')
  static const AlertStatus open = _$open;
  @BuiltValueEnumConst(wireName: r'assigned')
  static const AlertStatus assigned = _$assigned;
  @BuiltValueEnumConst(wireName: r'resolved')
  static const AlertStatus resolved = _$resolved;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const AlertStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<AlertStatus> get serializer => _$alertStatusSerializer;

  const AlertStatus._(String name) : super(name);

  static BuiltSet<AlertStatus> get values => _$values;
  static AlertStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class AlertStatusMixin = Object with _$AlertStatusMixin;
