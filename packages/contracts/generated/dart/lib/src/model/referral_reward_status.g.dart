// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral_reward_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const ReferralRewardStatus _$pending = const ReferralRewardStatus._('pending');
const ReferralRewardStatus _$granted = const ReferralRewardStatus._('granted');
const ReferralRewardStatus _$canceled =
    const ReferralRewardStatus._('canceled');
const ReferralRewardStatus _$unknownDefaultOpenApi =
    const ReferralRewardStatus._('unknownDefaultOpenApi');

ReferralRewardStatus _$valueOf(String name) {
  switch (name) {
    case 'pending':
      return _$pending;
    case 'granted':
      return _$granted;
    case 'canceled':
      return _$canceled;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<ReferralRewardStatus> _$values =
    BuiltSet<ReferralRewardStatus>(const <ReferralRewardStatus>[
  _$pending,
  _$granted,
  _$canceled,
  _$unknownDefaultOpenApi,
]);

class _$ReferralRewardStatusMeta {
  const _$ReferralRewardStatusMeta();
  ReferralRewardStatus get pending => _$pending;
  ReferralRewardStatus get granted => _$granted;
  ReferralRewardStatus get canceled => _$canceled;
  ReferralRewardStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  ReferralRewardStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<ReferralRewardStatus> get values => _$values;
}

abstract class _$ReferralRewardStatusMixin {
  // ignore: non_constant_identifier_names
  _$ReferralRewardStatusMeta get ReferralRewardStatus =>
      const _$ReferralRewardStatusMeta();
}

Serializer<ReferralRewardStatus> _$referralRewardStatusSerializer =
    _$ReferralRewardStatusSerializer();

class _$ReferralRewardStatusSerializer
    implements PrimitiveSerializer<ReferralRewardStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'pending': 'pending',
    'granted': 'granted',
    'canceled': 'canceled',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'pending': 'pending',
    'granted': 'granted',
    'canceled': 'canceled',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[ReferralRewardStatus];
  @override
  final String wireName = 'ReferralRewardStatus';

  @override
  Object serialize(Serializers serializers, ReferralRewardStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  ReferralRewardStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      ReferralRewardStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
