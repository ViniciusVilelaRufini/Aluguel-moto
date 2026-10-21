// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'top_up_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const TopUpStatus _$pending = const TopUpStatus._('pending');
const TopUpStatus _$paid = const TopUpStatus._('paid');
const TopUpStatus _$failed = const TopUpStatus._('failed');
const TopUpStatus _$expired = const TopUpStatus._('expired');
const TopUpStatus _$unknownDefaultOpenApi =
    const TopUpStatus._('unknownDefaultOpenApi');

TopUpStatus _$valueOf(String name) {
  switch (name) {
    case 'pending':
      return _$pending;
    case 'paid':
      return _$paid;
    case 'failed':
      return _$failed;
    case 'expired':
      return _$expired;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<TopUpStatus> _$values =
    BuiltSet<TopUpStatus>(const <TopUpStatus>[
  _$pending,
  _$paid,
  _$failed,
  _$expired,
  _$unknownDefaultOpenApi,
]);

class _$TopUpStatusMeta {
  const _$TopUpStatusMeta();
  TopUpStatus get pending => _$pending;
  TopUpStatus get paid => _$paid;
  TopUpStatus get failed => _$failed;
  TopUpStatus get expired => _$expired;
  TopUpStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  TopUpStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<TopUpStatus> get values => _$values;
}

abstract class _$TopUpStatusMixin {
  // ignore: non_constant_identifier_names
  _$TopUpStatusMeta get TopUpStatus => const _$TopUpStatusMeta();
}

Serializer<TopUpStatus> _$topUpStatusSerializer = _$TopUpStatusSerializer();

class _$TopUpStatusSerializer implements PrimitiveSerializer<TopUpStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'pending': 'pending',
    'paid': 'paid',
    'failed': 'failed',
    'expired': 'expired',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'pending': 'pending',
    'paid': 'paid',
    'failed': 'failed',
    'expired': 'expired',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[TopUpStatus];
  @override
  final String wireName = 'TopUpStatus';

  @override
  Object serialize(Serializers serializers, TopUpStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  TopUpStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      TopUpStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
