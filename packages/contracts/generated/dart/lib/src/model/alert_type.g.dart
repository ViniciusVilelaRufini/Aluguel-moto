// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'alert_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const AlertType _$outOfOperationArea = const AlertType._('outOfOperationArea');
const AlertType _$forbiddenZoneEntered =
    const AlertType._('forbiddenZoneEntered');
const AlertType _$fallDetected = const AlertType._('fallDetected');
const AlertType _$tamper = const AlertType._('tamper');
const AlertType _$batteryCritical = const AlertType._('batteryCritical');
const AlertType _$movementWithoutRental =
    const AlertType._('movementWithoutRental');
const AlertType _$vehicleOffline = const AlertType._('vehicleOffline');
const AlertType _$commandFailed = const AlertType._('commandFailed');
const AlertType _$customerNotOk = const AlertType._('customerNotOk');
const AlertType _$incidentReported = const AlertType._('incidentReported');
const AlertType _$unknownDefaultOpenApi =
    const AlertType._('unknownDefaultOpenApi');

AlertType _$valueOf(String name) {
  switch (name) {
    case 'outOfOperationArea':
      return _$outOfOperationArea;
    case 'forbiddenZoneEntered':
      return _$forbiddenZoneEntered;
    case 'fallDetected':
      return _$fallDetected;
    case 'tamper':
      return _$tamper;
    case 'batteryCritical':
      return _$batteryCritical;
    case 'movementWithoutRental':
      return _$movementWithoutRental;
    case 'vehicleOffline':
      return _$vehicleOffline;
    case 'commandFailed':
      return _$commandFailed;
    case 'customerNotOk':
      return _$customerNotOk;
    case 'incidentReported':
      return _$incidentReported;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<AlertType> _$values = BuiltSet<AlertType>(const <AlertType>[
  _$outOfOperationArea,
  _$forbiddenZoneEntered,
  _$fallDetected,
  _$tamper,
  _$batteryCritical,
  _$movementWithoutRental,
  _$vehicleOffline,
  _$commandFailed,
  _$customerNotOk,
  _$incidentReported,
  _$unknownDefaultOpenApi,
]);

class _$AlertTypeMeta {
  const _$AlertTypeMeta();
  AlertType get outOfOperationArea => _$outOfOperationArea;
  AlertType get forbiddenZoneEntered => _$forbiddenZoneEntered;
  AlertType get fallDetected => _$fallDetected;
  AlertType get tamper => _$tamper;
  AlertType get batteryCritical => _$batteryCritical;
  AlertType get movementWithoutRental => _$movementWithoutRental;
  AlertType get vehicleOffline => _$vehicleOffline;
  AlertType get commandFailed => _$commandFailed;
  AlertType get customerNotOk => _$customerNotOk;
  AlertType get incidentReported => _$incidentReported;
  AlertType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  AlertType valueOf(String name) => _$valueOf(name);
  BuiltSet<AlertType> get values => _$values;
}

abstract class _$AlertTypeMixin {
  // ignore: non_constant_identifier_names
  _$AlertTypeMeta get AlertType => const _$AlertTypeMeta();
}

Serializer<AlertType> _$alertTypeSerializer = _$AlertTypeSerializer();

class _$AlertTypeSerializer implements PrimitiveSerializer<AlertType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'outOfOperationArea': 'out_of_operation_area',
    'forbiddenZoneEntered': 'forbidden_zone_entered',
    'fallDetected': 'fall_detected',
    'tamper': 'tamper',
    'batteryCritical': 'battery_critical',
    'movementWithoutRental': 'movement_without_rental',
    'vehicleOffline': 'vehicle_offline',
    'commandFailed': 'command_failed',
    'customerNotOk': 'customer_not_ok',
    'incidentReported': 'incident_reported',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'out_of_operation_area': 'outOfOperationArea',
    'forbidden_zone_entered': 'forbiddenZoneEntered',
    'fall_detected': 'fallDetected',
    'tamper': 'tamper',
    'battery_critical': 'batteryCritical',
    'movement_without_rental': 'movementWithoutRental',
    'vehicle_offline': 'vehicleOffline',
    'command_failed': 'commandFailed',
    'customer_not_ok': 'customerNotOk',
    'incident_reported': 'incidentReported',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[AlertType];
  @override
  final String wireName = 'AlertType';

  @override
  Object serialize(Serializers serializers, AlertType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  AlertType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      AlertType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
