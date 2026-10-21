// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'policy_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const PolicyStatus _$active = const PolicyStatus._('active');
const PolicyStatus _$canceled = const PolicyStatus._('canceled');
const PolicyStatus _$expired = const PolicyStatus._('expired');
const PolicyStatus _$unknownDefaultOpenApi =
    const PolicyStatus._('unknownDefaultOpenApi');

PolicyStatus _$valueOf(String name) {
  switch (name) {
    case 'active':
      return _$active;
    case 'canceled':
      return _$canceled;
    case 'expired':
      return _$expired;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<PolicyStatus> _$values =
    BuiltSet<PolicyStatus>(const <PolicyStatus>[
  _$active,
  _$canceled,
  _$expired,
  _$unknownDefaultOpenApi,
]);

class _$PolicyStatusMeta {
  const _$PolicyStatusMeta();
  PolicyStatus get active => _$active;
  PolicyStatus get canceled => _$canceled;
  PolicyStatus get expired => _$expired;
  PolicyStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  PolicyStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<PolicyStatus> get values => _$values;
}

abstract class _$PolicyStatusMixin {
  // ignore: non_constant_identifier_names
  _$PolicyStatusMeta get PolicyStatus => const _$PolicyStatusMeta();
}

Serializer<PolicyStatus> _$policyStatusSerializer = _$PolicyStatusSerializer();

class _$PolicyStatusSerializer implements PrimitiveSerializer<PolicyStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'active': 'active',
    'canceled': 'canceled',
    'expired': 'expired',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'active': 'active',
    'canceled': 'canceled',
    'expired': 'expired',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[PolicyStatus];
  @override
  final String wireName = 'PolicyStatus';

  @override
  Object serialize(Serializers serializers, PolicyStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  PolicyStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      PolicyStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
