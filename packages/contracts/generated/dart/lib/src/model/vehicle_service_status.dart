//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_service_status.g.dart';

/// Situação da revisão preventiva (Em dia / Próxima / Vencida).
class VehicleServiceStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'ok')
  static const VehicleServiceStatus ok = _$ok;
  @BuiltValueEnumConst(wireName: r'due_soon')
  static const VehicleServiceStatus dueSoon = _$dueSoon;
  @BuiltValueEnumConst(wireName: r'overdue')
  static const VehicleServiceStatus overdue = _$overdue;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const VehicleServiceStatus unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<VehicleServiceStatus> get serializer =>
      _$vehicleServiceStatusSerializer;

  const VehicleServiceStatus._(String name) : super(name);

  static BuiltSet<VehicleServiceStatus> get values => _$values;
  static VehicleServiceStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class VehicleServiceStatusMixin = Object
    with _$VehicleServiceStatusMixin;
