//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'alert_type.g.dart';

class AlertType extends EnumClass {
  @BuiltValueEnumConst(wireName: r'out_of_operation_area')
  static const AlertType outOfOperationArea = _$outOfOperationArea;
  @BuiltValueEnumConst(wireName: r'forbidden_zone_entered')
  static const AlertType forbiddenZoneEntered = _$forbiddenZoneEntered;
  @BuiltValueEnumConst(wireName: r'fall_detected')
  static const AlertType fallDetected = _$fallDetected;
  @BuiltValueEnumConst(wireName: r'tamper')
  static const AlertType tamper = _$tamper;
  @BuiltValueEnumConst(wireName: r'battery_critical')
  static const AlertType batteryCritical = _$batteryCritical;
  @BuiltValueEnumConst(wireName: r'movement_without_rental')
  static const AlertType movementWithoutRental = _$movementWithoutRental;
  @BuiltValueEnumConst(wireName: r'vehicle_offline')
  static const AlertType vehicleOffline = _$vehicleOffline;
  @BuiltValueEnumConst(wireName: r'command_failed')
  static const AlertType commandFailed = _$commandFailed;
  @BuiltValueEnumConst(wireName: r'customer_not_ok')
  static const AlertType customerNotOk = _$customerNotOk;
  @BuiltValueEnumConst(wireName: r'incident_reported')
  static const AlertType incidentReported = _$incidentReported;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const AlertType unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<AlertType> get serializer => _$alertTypeSerializer;

  const AlertType._(String name) : super(name);

  static BuiltSet<AlertType> get values => _$values;
  static AlertType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class AlertTypeMixin = Object with _$AlertTypeMixin;
