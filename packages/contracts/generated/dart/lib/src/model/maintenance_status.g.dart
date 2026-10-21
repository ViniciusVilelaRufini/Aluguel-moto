// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const MaintenanceStatus _$scheduled = const MaintenanceStatus._('scheduled');
const MaintenanceStatus _$inProgress = const MaintenanceStatus._('inProgress');
const MaintenanceStatus _$done = const MaintenanceStatus._('done');
const MaintenanceStatus _$canceled = const MaintenanceStatus._('canceled');
const MaintenanceStatus _$unknownDefaultOpenApi =
    const MaintenanceStatus._('unknownDefaultOpenApi');

MaintenanceStatus _$valueOf(String name) {
  switch (name) {
    case 'scheduled':
      return _$scheduled;
    case 'inProgress':
      return _$inProgress;
    case 'done':
      return _$done;
    case 'canceled':
      return _$canceled;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<MaintenanceStatus> _$values =
    BuiltSet<MaintenanceStatus>(const <MaintenanceStatus>[
  _$scheduled,
  _$inProgress,
  _$done,
  _$canceled,
  _$unknownDefaultOpenApi,
]);

class _$MaintenanceStatusMeta {
  const _$MaintenanceStatusMeta();
  MaintenanceStatus get scheduled => _$scheduled;
  MaintenanceStatus get inProgress => _$inProgress;
  MaintenanceStatus get done => _$done;
  MaintenanceStatus get canceled => _$canceled;
  MaintenanceStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  MaintenanceStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<MaintenanceStatus> get values => _$values;
}

abstract class _$MaintenanceStatusMixin {
  // ignore: non_constant_identifier_names
  _$MaintenanceStatusMeta get MaintenanceStatus =>
      const _$MaintenanceStatusMeta();
}

Serializer<MaintenanceStatus> _$maintenanceStatusSerializer =
    _$MaintenanceStatusSerializer();

class _$MaintenanceStatusSerializer
    implements PrimitiveSerializer<MaintenanceStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'scheduled': 'scheduled',
    'inProgress': 'in_progress',
    'done': 'done',
    'canceled': 'canceled',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'scheduled': 'scheduled',
    'in_progress': 'inProgress',
    'done': 'done',
    'canceled': 'canceled',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[MaintenanceStatus];
  @override
  final String wireName = 'MaintenanceStatus';

  @override
  Object serialize(Serializers serializers, MaintenanceStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  MaintenanceStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      MaintenanceStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
