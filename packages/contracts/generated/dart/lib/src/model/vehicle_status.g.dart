// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const VehicleStatus _$free = const VehicleStatus._('free');
const VehicleStatus _$rented = const VehicleStatus._('rented');
const VehicleStatus _$reserved = const VehicleStatus._('reserved');
const VehicleStatus _$paused = const VehicleStatus._('paused');
const VehicleStatus _$blocked = const VehicleStatus._('blocked');
const VehicleStatus _$maintenance = const VehicleStatus._('maintenance');
const VehicleStatus _$offline = const VehicleStatus._('offline');
const VehicleStatus _$unknownDefaultOpenApi =
    const VehicleStatus._('unknownDefaultOpenApi');

VehicleStatus _$valueOf(String name) {
  switch (name) {
    case 'free':
      return _$free;
    case 'rented':
      return _$rented;
    case 'reserved':
      return _$reserved;
    case 'paused':
      return _$paused;
    case 'blocked':
      return _$blocked;
    case 'maintenance':
      return _$maintenance;
    case 'offline':
      return _$offline;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<VehicleStatus> _$values =
    BuiltSet<VehicleStatus>(const <VehicleStatus>[
  _$free,
  _$rented,
  _$reserved,
  _$paused,
  _$blocked,
  _$maintenance,
  _$offline,
  _$unknownDefaultOpenApi,
]);

class _$VehicleStatusMeta {
  const _$VehicleStatusMeta();
  VehicleStatus get free => _$free;
  VehicleStatus get rented => _$rented;
  VehicleStatus get reserved => _$reserved;
  VehicleStatus get paused => _$paused;
  VehicleStatus get blocked => _$blocked;
  VehicleStatus get maintenance => _$maintenance;
  VehicleStatus get offline => _$offline;
  VehicleStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  VehicleStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<VehicleStatus> get values => _$values;
}

abstract class _$VehicleStatusMixin {
  // ignore: non_constant_identifier_names
  _$VehicleStatusMeta get VehicleStatus => const _$VehicleStatusMeta();
}

Serializer<VehicleStatus> _$vehicleStatusSerializer =
    _$VehicleStatusSerializer();

class _$VehicleStatusSerializer implements PrimitiveSerializer<VehicleStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'free': 'free',
    'rented': 'rented',
    'reserved': 'reserved',
    'paused': 'paused',
    'blocked': 'blocked',
    'maintenance': 'maintenance',
    'offline': 'offline',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'free': 'free',
    'rented': 'rented',
    'reserved': 'reserved',
    'paused': 'paused',
    'blocked': 'blocked',
    'maintenance': 'maintenance',
    'offline': 'offline',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[VehicleStatus];
  @override
  final String wireName = 'VehicleStatus';

  @override
  Object serialize(Serializers serializers, VehicleStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  VehicleStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      VehicleStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
