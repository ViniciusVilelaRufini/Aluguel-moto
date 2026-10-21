// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'alert_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const AlertStatus _$open = const AlertStatus._('open');
const AlertStatus _$assigned = const AlertStatus._('assigned');
const AlertStatus _$resolved = const AlertStatus._('resolved');
const AlertStatus _$unknownDefaultOpenApi =
    const AlertStatus._('unknownDefaultOpenApi');

AlertStatus _$valueOf(String name) {
  switch (name) {
    case 'open':
      return _$open;
    case 'assigned':
      return _$assigned;
    case 'resolved':
      return _$resolved;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<AlertStatus> _$values =
    BuiltSet<AlertStatus>(const <AlertStatus>[
  _$open,
  _$assigned,
  _$resolved,
  _$unknownDefaultOpenApi,
]);

class _$AlertStatusMeta {
  const _$AlertStatusMeta();
  AlertStatus get open => _$open;
  AlertStatus get assigned => _$assigned;
  AlertStatus get resolved => _$resolved;
  AlertStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  AlertStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<AlertStatus> get values => _$values;
}

abstract class _$AlertStatusMixin {
  // ignore: non_constant_identifier_names
  _$AlertStatusMeta get AlertStatus => const _$AlertStatusMeta();
}

Serializer<AlertStatus> _$alertStatusSerializer = _$AlertStatusSerializer();

class _$AlertStatusSerializer implements PrimitiveSerializer<AlertStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'open': 'open',
    'assigned': 'assigned',
    'resolved': 'resolved',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'open': 'open',
    'assigned': 'assigned',
    'resolved': 'resolved',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[AlertStatus];
  @override
  final String wireName = 'AlertStatus';

  @override
  Object serialize(Serializers serializers, AlertStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  AlertStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      AlertStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
