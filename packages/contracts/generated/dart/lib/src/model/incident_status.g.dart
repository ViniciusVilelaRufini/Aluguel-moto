// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'incident_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const IncidentStatus _$open = const IncidentStatus._('open');
const IncidentStatus _$inProgress = const IncidentStatus._('inProgress');
const IncidentStatus _$resolved = const IncidentStatus._('resolved');
const IncidentStatus _$closed = const IncidentStatus._('closed');
const IncidentStatus _$unknownDefaultOpenApi =
    const IncidentStatus._('unknownDefaultOpenApi');

IncidentStatus _$valueOf(String name) {
  switch (name) {
    case 'open':
      return _$open;
    case 'inProgress':
      return _$inProgress;
    case 'resolved':
      return _$resolved;
    case 'closed':
      return _$closed;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<IncidentStatus> _$values =
    BuiltSet<IncidentStatus>(const <IncidentStatus>[
  _$open,
  _$inProgress,
  _$resolved,
  _$closed,
  _$unknownDefaultOpenApi,
]);

class _$IncidentStatusMeta {
  const _$IncidentStatusMeta();
  IncidentStatus get open => _$open;
  IncidentStatus get inProgress => _$inProgress;
  IncidentStatus get resolved => _$resolved;
  IncidentStatus get closed => _$closed;
  IncidentStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  IncidentStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<IncidentStatus> get values => _$values;
}

abstract class _$IncidentStatusMixin {
  // ignore: non_constant_identifier_names
  _$IncidentStatusMeta get IncidentStatus => const _$IncidentStatusMeta();
}

Serializer<IncidentStatus> _$incidentStatusSerializer =
    _$IncidentStatusSerializer();

class _$IncidentStatusSerializer
    implements PrimitiveSerializer<IncidentStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'open': 'open',
    'inProgress': 'in_progress',
    'resolved': 'resolved',
    'closed': 'closed',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'open': 'open',
    'in_progress': 'inProgress',
    'resolved': 'resolved',
    'closed': 'closed',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[IncidentStatus];
  @override
  final String wireName = 'IncidentStatus';

  @override
  Object serialize(Serializers serializers, IncidentStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  IncidentStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      IncidentStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
