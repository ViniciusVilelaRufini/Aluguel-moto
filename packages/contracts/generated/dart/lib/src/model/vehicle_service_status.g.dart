// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_service_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const VehicleServiceStatus _$ok = const VehicleServiceStatus._('ok');
const VehicleServiceStatus _$dueSoon = const VehicleServiceStatus._('dueSoon');
const VehicleServiceStatus _$overdue = const VehicleServiceStatus._('overdue');
const VehicleServiceStatus _$unknownDefaultOpenApi =
    const VehicleServiceStatus._('unknownDefaultOpenApi');

VehicleServiceStatus _$valueOf(String name) {
  switch (name) {
    case 'ok':
      return _$ok;
    case 'dueSoon':
      return _$dueSoon;
    case 'overdue':
      return _$overdue;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<VehicleServiceStatus> _$values =
    BuiltSet<VehicleServiceStatus>(const <VehicleServiceStatus>[
  _$ok,
  _$dueSoon,
  _$overdue,
  _$unknownDefaultOpenApi,
]);

class _$VehicleServiceStatusMeta {
  const _$VehicleServiceStatusMeta();
  VehicleServiceStatus get ok => _$ok;
  VehicleServiceStatus get dueSoon => _$dueSoon;
  VehicleServiceStatus get overdue => _$overdue;
  VehicleServiceStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  VehicleServiceStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<VehicleServiceStatus> get values => _$values;
}

abstract class _$VehicleServiceStatusMixin {
  // ignore: non_constant_identifier_names
  _$VehicleServiceStatusMeta get VehicleServiceStatus =>
      const _$VehicleServiceStatusMeta();
}

Serializer<VehicleServiceStatus> _$vehicleServiceStatusSerializer =
    _$VehicleServiceStatusSerializer();

class _$VehicleServiceStatusSerializer
    implements PrimitiveSerializer<VehicleServiceStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'ok': 'ok',
    'dueSoon': 'due_soon',
    'overdue': 'overdue',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'ok': 'ok',
    'due_soon': 'dueSoon',
    'overdue': 'overdue',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[VehicleServiceStatus];
  @override
  final String wireName = 'VehicleServiceStatus';

  @override
  Object serialize(Serializers serializers, VehicleServiceStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  VehicleServiceStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      VehicleServiceStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
