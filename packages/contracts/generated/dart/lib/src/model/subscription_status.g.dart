// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'subscription_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const SubscriptionStatus _$active = const SubscriptionStatus._('active');
const SubscriptionStatus _$pastDue = const SubscriptionStatus._('pastDue');
const SubscriptionStatus _$canceled = const SubscriptionStatus._('canceled');
const SubscriptionStatus _$expired = const SubscriptionStatus._('expired');
const SubscriptionStatus _$unknownDefaultOpenApi =
    const SubscriptionStatus._('unknownDefaultOpenApi');

SubscriptionStatus _$valueOf(String name) {
  switch (name) {
    case 'active':
      return _$active;
    case 'pastDue':
      return _$pastDue;
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

final BuiltSet<SubscriptionStatus> _$values =
    BuiltSet<SubscriptionStatus>(const <SubscriptionStatus>[
  _$active,
  _$pastDue,
  _$canceled,
  _$expired,
  _$unknownDefaultOpenApi,
]);

class _$SubscriptionStatusMeta {
  const _$SubscriptionStatusMeta();
  SubscriptionStatus get active => _$active;
  SubscriptionStatus get pastDue => _$pastDue;
  SubscriptionStatus get canceled => _$canceled;
  SubscriptionStatus get expired => _$expired;
  SubscriptionStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  SubscriptionStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<SubscriptionStatus> get values => _$values;
}

abstract class _$SubscriptionStatusMixin {
  // ignore: non_constant_identifier_names
  _$SubscriptionStatusMeta get SubscriptionStatus =>
      const _$SubscriptionStatusMeta();
}

Serializer<SubscriptionStatus> _$subscriptionStatusSerializer =
    _$SubscriptionStatusSerializer();

class _$SubscriptionStatusSerializer
    implements PrimitiveSerializer<SubscriptionStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'active': 'active',
    'pastDue': 'past_due',
    'canceled': 'canceled',
    'expired': 'expired',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'active': 'active',
    'past_due': 'pastDue',
    'canceled': 'canceled',
    'expired': 'expired',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[SubscriptionStatus];
  @override
  final String wireName = 'SubscriptionStatus';

  @override
  Object serialize(Serializers serializers, SubscriptionStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  SubscriptionStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      SubscriptionStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
