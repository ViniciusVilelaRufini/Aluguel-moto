// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'service_vehicle_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const ServiceVehicleStatus _$free = const ServiceVehicleStatus._('free');
const ServiceVehicleStatus _$maintenance =
    const ServiceVehicleStatus._('maintenance');
const ServiceVehicleStatus _$unknownDefaultOpenApi =
    const ServiceVehicleStatus._('unknownDefaultOpenApi');

ServiceVehicleStatus _$valueOf(String name) {
  switch (name) {
    case 'free':
      return _$free;
    case 'maintenance':
      return _$maintenance;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<ServiceVehicleStatus> _$values =
    BuiltSet<ServiceVehicleStatus>(const <ServiceVehicleStatus>[
  _$free,
  _$maintenance,
  _$unknownDefaultOpenApi,
]);

class _$ServiceVehicleStatusMeta {
  const _$ServiceVehicleStatusMeta();
  ServiceVehicleStatus get free => _$free;
  ServiceVehicleStatus get maintenance => _$maintenance;
  ServiceVehicleStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  ServiceVehicleStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<ServiceVehicleStatus> get values => _$values;
}

abstract class _$ServiceVehicleStatusMixin {
  // ignore: non_constant_identifier_names
  _$ServiceVehicleStatusMeta get ServiceVehicleStatus =>
      const _$ServiceVehicleStatusMeta();
}

Serializer<ServiceVehicleStatus> _$serviceVehicleStatusSerializer =
    _$ServiceVehicleStatusSerializer();

class _$ServiceVehicleStatusSerializer
    implements PrimitiveSerializer<ServiceVehicleStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'free': 'free',
    'maintenance': 'maintenance',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'free': 'free',
    'maintenance': 'maintenance',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[ServiceVehicleStatus];
  @override
  final String wireName = 'ServiceVehicleStatus';

  @override
  Object serialize(Serializers serializers, ServiceVehicleStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  ServiceVehicleStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      ServiceVehicleStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
