// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_source.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const MaintenanceSource _$staff = const MaintenanceSource._('staff');
const MaintenanceSource _$customer = const MaintenanceSource._('customer');
const MaintenanceSource _$system = const MaintenanceSource._('system');
const MaintenanceSource _$unknownDefaultOpenApi =
    const MaintenanceSource._('unknownDefaultOpenApi');

MaintenanceSource _$valueOf(String name) {
  switch (name) {
    case 'staff':
      return _$staff;
    case 'customer':
      return _$customer;
    case 'system':
      return _$system;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<MaintenanceSource> _$values =
    BuiltSet<MaintenanceSource>(const <MaintenanceSource>[
  _$staff,
  _$customer,
  _$system,
  _$unknownDefaultOpenApi,
]);

class _$MaintenanceSourceMeta {
  const _$MaintenanceSourceMeta();
  MaintenanceSource get staff => _$staff;
  MaintenanceSource get customer => _$customer;
  MaintenanceSource get system => _$system;
  MaintenanceSource get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  MaintenanceSource valueOf(String name) => _$valueOf(name);
  BuiltSet<MaintenanceSource> get values => _$values;
}

abstract class _$MaintenanceSourceMixin {
  // ignore: non_constant_identifier_names
  _$MaintenanceSourceMeta get MaintenanceSource =>
      const _$MaintenanceSourceMeta();
}

Serializer<MaintenanceSource> _$maintenanceSourceSerializer =
    _$MaintenanceSourceSerializer();

class _$MaintenanceSourceSerializer
    implements PrimitiveSerializer<MaintenanceSource> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'staff': 'staff',
    'customer': 'customer',
    'system': 'system',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'staff': 'staff',
    'customer': 'customer',
    'system': 'system',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[MaintenanceSource];
  @override
  final String wireName = 'MaintenanceSource';

  @override
  Object serialize(Serializers serializers, MaintenanceSource object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  MaintenanceSource deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      MaintenanceSource.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
