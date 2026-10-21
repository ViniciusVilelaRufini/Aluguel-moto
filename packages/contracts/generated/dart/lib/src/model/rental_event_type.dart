//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'rental_event_type.g.dart';

class RentalEventType extends EnumClass {
  @BuiltValueEnumConst(wireName: r'started')
  static const RentalEventType started = _$started;
  @BuiltValueEnumConst(wireName: r'paused')
  static const RentalEventType paused = _$paused;
  @BuiltValueEnumConst(wireName: r'resumed')
  static const RentalEventType resumed = _$resumed;
  @BuiltValueEnumConst(wireName: r'vehicle_swapped')
  static const RentalEventType vehicleSwapped = _$vehicleSwapped;
  @BuiltValueEnumConst(wireName: r'zone_entered')
  static const RentalEventType zoneEntered = _$zoneEntered;
  @BuiltValueEnumConst(wireName: r'zone_exited')
  static const RentalEventType zoneExited = _$zoneExited;
  @BuiltValueEnumConst(wireName: r'left_operation_area')
  static const RentalEventType leftOperationArea = _$leftOperationArea;
  @BuiltValueEnumConst(wireName: r'returned_operation_area')
  static const RentalEventType returnedOperationArea = _$returnedOperationArea;
  @BuiltValueEnumConst(wireName: r'alert')
  static const RentalEventType alert = _$alert;
  @BuiltValueEnumConst(wireName: r'fall_detected')
  static const RentalEventType fallDetected = _$fallDetected;
  @BuiltValueEnumConst(wireName: r'ending')
  static const RentalEventType ending = _$ending;
  @BuiltValueEnumConst(wireName: r'ended')
  static const RentalEventType ended = _$ended;
  @BuiltValueEnumConst(wireName: r'force_ended')
  static const RentalEventType forceEnded = _$forceEnded;
  @BuiltValueEnumConst(wireName: r'command')
  static const RentalEventType command = _$command;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const RentalEventType unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<RentalEventType> get serializer =>
      _$rentalEventTypeSerializer;

  const RentalEventType._(String name) : super(name);

  static BuiltSet<RentalEventType> get values => _$values;
  static RentalEventType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class RentalEventTypeMixin = Object with _$RentalEventTypeMixin;
