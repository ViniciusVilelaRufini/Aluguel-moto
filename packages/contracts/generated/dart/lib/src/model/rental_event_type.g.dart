// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rental_event_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const RentalEventType _$started = const RentalEventType._('started');
const RentalEventType _$paused = const RentalEventType._('paused');
const RentalEventType _$resumed = const RentalEventType._('resumed');
const RentalEventType _$vehicleSwapped =
    const RentalEventType._('vehicleSwapped');
const RentalEventType _$zoneEntered = const RentalEventType._('zoneEntered');
const RentalEventType _$zoneExited = const RentalEventType._('zoneExited');
const RentalEventType _$leftOperationArea =
    const RentalEventType._('leftOperationArea');
const RentalEventType _$returnedOperationArea =
    const RentalEventType._('returnedOperationArea');
const RentalEventType _$alert = const RentalEventType._('alert');
const RentalEventType _$fallDetected = const RentalEventType._('fallDetected');
const RentalEventType _$ending = const RentalEventType._('ending');
const RentalEventType _$ended = const RentalEventType._('ended');
const RentalEventType _$forceEnded = const RentalEventType._('forceEnded');
const RentalEventType _$command = const RentalEventType._('command');
const RentalEventType _$unknownDefaultOpenApi =
    const RentalEventType._('unknownDefaultOpenApi');

RentalEventType _$valueOf(String name) {
  switch (name) {
    case 'started':
      return _$started;
    case 'paused':
      return _$paused;
    case 'resumed':
      return _$resumed;
    case 'vehicleSwapped':
      return _$vehicleSwapped;
    case 'zoneEntered':
      return _$zoneEntered;
    case 'zoneExited':
      return _$zoneExited;
    case 'leftOperationArea':
      return _$leftOperationArea;
    case 'returnedOperationArea':
      return _$returnedOperationArea;
    case 'alert':
      return _$alert;
    case 'fallDetected':
      return _$fallDetected;
    case 'ending':
      return _$ending;
    case 'ended':
      return _$ended;
    case 'forceEnded':
      return _$forceEnded;
    case 'command':
      return _$command;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<RentalEventType> _$values =
    BuiltSet<RentalEventType>(const <RentalEventType>[
  _$started,
  _$paused,
  _$resumed,
  _$vehicleSwapped,
  _$zoneEntered,
  _$zoneExited,
  _$leftOperationArea,
  _$returnedOperationArea,
  _$alert,
  _$fallDetected,
  _$ending,
  _$ended,
  _$forceEnded,
  _$command,
  _$unknownDefaultOpenApi,
]);

class _$RentalEventTypeMeta {
  const _$RentalEventTypeMeta();
  RentalEventType get started => _$started;
  RentalEventType get paused => _$paused;
  RentalEventType get resumed => _$resumed;
  RentalEventType get vehicleSwapped => _$vehicleSwapped;
  RentalEventType get zoneEntered => _$zoneEntered;
  RentalEventType get zoneExited => _$zoneExited;
  RentalEventType get leftOperationArea => _$leftOperationArea;
  RentalEventType get returnedOperationArea => _$returnedOperationArea;
  RentalEventType get alert => _$alert;
  RentalEventType get fallDetected => _$fallDetected;
  RentalEventType get ending => _$ending;
  RentalEventType get ended => _$ended;
  RentalEventType get forceEnded => _$forceEnded;
  RentalEventType get command => _$command;
  RentalEventType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  RentalEventType valueOf(String name) => _$valueOf(name);
  BuiltSet<RentalEventType> get values => _$values;
}

abstract class _$RentalEventTypeMixin {
  // ignore: non_constant_identifier_names
  _$RentalEventTypeMeta get RentalEventType => const _$RentalEventTypeMeta();
}

Serializer<RentalEventType> _$rentalEventTypeSerializer =
    _$RentalEventTypeSerializer();

class _$RentalEventTypeSerializer
    implements PrimitiveSerializer<RentalEventType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'started': 'started',
    'paused': 'paused',
    'resumed': 'resumed',
    'vehicleSwapped': 'vehicle_swapped',
    'zoneEntered': 'zone_entered',
    'zoneExited': 'zone_exited',
    'leftOperationArea': 'left_operation_area',
    'returnedOperationArea': 'returned_operation_area',
    'alert': 'alert',
    'fallDetected': 'fall_detected',
    'ending': 'ending',
    'ended': 'ended',
    'forceEnded': 'force_ended',
    'command': 'command',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'started': 'started',
    'paused': 'paused',
    'resumed': 'resumed',
    'vehicle_swapped': 'vehicleSwapped',
    'zone_entered': 'zoneEntered',
    'zone_exited': 'zoneExited',
    'left_operation_area': 'leftOperationArea',
    'returned_operation_area': 'returnedOperationArea',
    'alert': 'alert',
    'fall_detected': 'fallDetected',
    'ending': 'ending',
    'ended': 'ended',
    'force_ended': 'forceEnded',
    'command': 'command',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[RentalEventType];
  @override
  final String wireName = 'RentalEventType';

  @override
  Object serialize(Serializers serializers, RentalEventType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  RentalEventType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      RentalEventType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
