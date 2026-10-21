//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'incident_status.g.dart';

class IncidentStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'open')
  static const IncidentStatus open = _$open;
  @BuiltValueEnumConst(wireName: r'in_progress')
  static const IncidentStatus inProgress = _$inProgress;
  @BuiltValueEnumConst(wireName: r'resolved')
  static const IncidentStatus resolved = _$resolved;
  @BuiltValueEnumConst(wireName: r'closed')
  static const IncidentStatus closed = _$closed;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const IncidentStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<IncidentStatus> get serializer =>
      _$incidentStatusSerializer;

  const IncidentStatus._(String name) : super(name);

  static BuiltSet<IncidentStatus> get values => _$values;
  static IncidentStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class IncidentStatusMixin = Object with _$IncidentStatusMixin;
