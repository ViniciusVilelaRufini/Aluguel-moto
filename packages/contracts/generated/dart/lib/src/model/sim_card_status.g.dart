// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sim_card_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const SimCardStatus _$active = const SimCardStatus._('active');
const SimCardStatus _$suspended = const SimCardStatus._('suspended');
const SimCardStatus _$cancelled = const SimCardStatus._('cancelled');
const SimCardStatus _$unknownDefaultOpenApi =
    const SimCardStatus._('unknownDefaultOpenApi');

SimCardStatus _$valueOf(String name) {
  switch (name) {
    case 'active':
      return _$active;
    case 'suspended':
      return _$suspended;
    case 'cancelled':
      return _$cancelled;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<SimCardStatus> _$values =
    BuiltSet<SimCardStatus>(const <SimCardStatus>[
  _$active,
  _$suspended,
  _$cancelled,
  _$unknownDefaultOpenApi,
]);

class _$SimCardStatusMeta {
  const _$SimCardStatusMeta();
  SimCardStatus get active => _$active;
  SimCardStatus get suspended => _$suspended;
  SimCardStatus get cancelled => _$cancelled;
  SimCardStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  SimCardStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<SimCardStatus> get values => _$values;
}

abstract class _$SimCardStatusMixin {
  // ignore: non_constant_identifier_names
  _$SimCardStatusMeta get SimCardStatus => const _$SimCardStatusMeta();
}

Serializer<SimCardStatus> _$simCardStatusSerializer =
    _$SimCardStatusSerializer();

class _$SimCardStatusSerializer implements PrimitiveSerializer<SimCardStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'active': 'active',
    'suspended': 'suspended',
    'cancelled': 'cancelled',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'active': 'active',
    'suspended': 'suspended',
    'cancelled': 'cancelled',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[SimCardStatus];
  @override
  final String wireName = 'SimCardStatus';

  @override
  Object serialize(Serializers serializers, SimCardStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  SimCardStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      SimCardStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
