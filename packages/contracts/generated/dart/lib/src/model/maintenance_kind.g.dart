// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_kind.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const MaintenanceKind _$preventive = const MaintenanceKind._('preventive');
const MaintenanceKind _$corrective = const MaintenanceKind._('corrective');
const MaintenanceKind _$unknownDefaultOpenApi =
    const MaintenanceKind._('unknownDefaultOpenApi');

MaintenanceKind _$valueOf(String name) {
  switch (name) {
    case 'preventive':
      return _$preventive;
    case 'corrective':
      return _$corrective;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<MaintenanceKind> _$values =
    BuiltSet<MaintenanceKind>(const <MaintenanceKind>[
  _$preventive,
  _$corrective,
  _$unknownDefaultOpenApi,
]);

class _$MaintenanceKindMeta {
  const _$MaintenanceKindMeta();
  MaintenanceKind get preventive => _$preventive;
  MaintenanceKind get corrective => _$corrective;
  MaintenanceKind get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  MaintenanceKind valueOf(String name) => _$valueOf(name);
  BuiltSet<MaintenanceKind> get values => _$values;
}

abstract class _$MaintenanceKindMixin {
  // ignore: non_constant_identifier_names
  _$MaintenanceKindMeta get MaintenanceKind => const _$MaintenanceKindMeta();
}

Serializer<MaintenanceKind> _$maintenanceKindSerializer =
    _$MaintenanceKindSerializer();

class _$MaintenanceKindSerializer
    implements PrimitiveSerializer<MaintenanceKind> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'preventive': 'preventive',
    'corrective': 'corrective',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'preventive': 'preventive',
    'corrective': 'corrective',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[MaintenanceKind];
  @override
  final String wireName = 'MaintenanceKind';

  @override
  Object serialize(Serializers serializers, MaintenanceKind object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  MaintenanceKind deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      MaintenanceKind.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
