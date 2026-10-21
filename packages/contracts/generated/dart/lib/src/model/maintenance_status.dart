//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'maintenance_status.g.dart';

class MaintenanceStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'scheduled')
  static const MaintenanceStatus scheduled = _$scheduled;
  @BuiltValueEnumConst(wireName: r'in_progress')
  static const MaintenanceStatus inProgress = _$inProgress;
  @BuiltValueEnumConst(wireName: r'done')
  static const MaintenanceStatus done = _$done;
  @BuiltValueEnumConst(wireName: r'canceled')
  static const MaintenanceStatus canceled = _$canceled;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const MaintenanceStatus unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<MaintenanceStatus> get serializer =>
      _$maintenanceStatusSerializer;

  const MaintenanceStatus._(String name) : super(name);

  static BuiltSet<MaintenanceStatus> get values => _$values;
  static MaintenanceStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class MaintenanceStatusMixin = Object with _$MaintenanceStatusMixin;
