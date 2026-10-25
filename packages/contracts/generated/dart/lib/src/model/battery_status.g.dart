// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'battery_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const BatteryStatus _$inVehicle = const BatteryStatus._('inVehicle');
const BatteryStatus _$inVan = const BatteryStatus._('inVan');
const BatteryStatus _$charging = const BatteryStatus._('charging');
const BatteryStatus _$inStation = const BatteryStatus._('inStation');
const BatteryStatus _$retired = const BatteryStatus._('retired');
const BatteryStatus _$charged = const BatteryStatus._('charged');
const BatteryStatus _$defective = const BatteryStatus._('defective');
const BatteryStatus _$unknownDefaultOpenApi =
    const BatteryStatus._('unknownDefaultOpenApi');

BatteryStatus _$valueOf(String name) {
  switch (name) {
    case 'inVehicle':
      return _$inVehicle;
    case 'inVan':
      return _$inVan;
    case 'charging':
      return _$charging;
    case 'inStation':
      return _$inStation;
    case 'retired':
      return _$retired;
    case 'charged':
      return _$charged;
    case 'defective':
      return _$defective;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<BatteryStatus> _$values =
    BuiltSet<BatteryStatus>(const <BatteryStatus>[
  _$inVehicle,
  _$inVan,
  _$charging,
  _$inStation,
  _$retired,
  _$charged,
  _$defective,
  _$unknownDefaultOpenApi,
]);

class _$BatteryStatusMeta {
  const _$BatteryStatusMeta();
  BatteryStatus get inVehicle => _$inVehicle;
  BatteryStatus get inVan => _$inVan;
  BatteryStatus get charging => _$charging;
  BatteryStatus get inStation => _$inStation;
  BatteryStatus get retired => _$retired;
  BatteryStatus get charged => _$charged;
  BatteryStatus get defective => _$defective;
  BatteryStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  BatteryStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<BatteryStatus> get values => _$values;
}

abstract class _$BatteryStatusMixin {
  // ignore: non_constant_identifier_names
  _$BatteryStatusMeta get BatteryStatus => const _$BatteryStatusMeta();
}

Serializer<BatteryStatus> _$batteryStatusSerializer =
    _$BatteryStatusSerializer();

class _$BatteryStatusSerializer implements PrimitiveSerializer<BatteryStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'inVehicle': 'in_vehicle',
    'inVan': 'in_van',
    'charging': 'charging',
    'inStation': 'in_station',
    'retired': 'retired',
    'charged': 'charged',
    'defective': 'defective',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'in_vehicle': 'inVehicle',
    'in_van': 'inVan',
    'charging': 'charging',
    'in_station': 'inStation',
    'retired': 'retired',
    'charged': 'charged',
    'defective': 'defective',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[BatteryStatus];
  @override
  final String wireName = 'BatteryStatus';

  @override
  Object serialize(Serializers serializers, BatteryStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  BatteryStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      BatteryStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
