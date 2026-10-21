//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'service_vehicle_status.g.dart';

/// Subconjunto de `VehicleStatus` que o time pode definir manualmente.
class ServiceVehicleStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'free')
  static const ServiceVehicleStatus free = _$free;
  @BuiltValueEnumConst(wireName: r'maintenance')
  static const ServiceVehicleStatus maintenance = _$maintenance;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const ServiceVehicleStatus unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<ServiceVehicleStatus> get serializer =>
      _$serviceVehicleStatusSerializer;

  const ServiceVehicleStatus._(String name) : super(name);

  static BuiltSet<ServiceVehicleStatus> get values => _$values;
  static ServiceVehicleStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class ServiceVehicleStatusMixin = Object
    with _$ServiceVehicleStatusMixin;
