// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'subscription_plan_code.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const SubscriptionPlanCode _$weekly = const SubscriptionPlanCode._('weekly');
const SubscriptionPlanCode _$monthly = const SubscriptionPlanCode._('monthly');
const SubscriptionPlanCode _$unknownDefaultOpenApi =
    const SubscriptionPlanCode._('unknownDefaultOpenApi');

SubscriptionPlanCode _$valueOf(String name) {
  switch (name) {
    case 'weekly':
      return _$weekly;
    case 'monthly':
      return _$monthly;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<SubscriptionPlanCode> _$values =
    BuiltSet<SubscriptionPlanCode>(const <SubscriptionPlanCode>[
  _$weekly,
  _$monthly,
  _$unknownDefaultOpenApi,
]);

class _$SubscriptionPlanCodeMeta {
  const _$SubscriptionPlanCodeMeta();
  SubscriptionPlanCode get weekly => _$weekly;
  SubscriptionPlanCode get monthly => _$monthly;
  SubscriptionPlanCode get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  SubscriptionPlanCode valueOf(String name) => _$valueOf(name);
  BuiltSet<SubscriptionPlanCode> get values => _$values;
}

abstract class _$SubscriptionPlanCodeMixin {
  // ignore: non_constant_identifier_names
  _$SubscriptionPlanCodeMeta get SubscriptionPlanCode =>
      const _$SubscriptionPlanCodeMeta();
}

Serializer<SubscriptionPlanCode> _$subscriptionPlanCodeSerializer =
    _$SubscriptionPlanCodeSerializer();

class _$SubscriptionPlanCodeSerializer
    implements PrimitiveSerializer<SubscriptionPlanCode> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'weekly': 'weekly',
    'monthly': 'monthly',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'weekly': 'weekly',
    'monthly': 'monthly',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[SubscriptionPlanCode];
  @override
  final String wireName = 'SubscriptionPlanCode';

  @override
  Object serialize(Serializers serializers, SubscriptionPlanCode object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  SubscriptionPlanCode deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      SubscriptionPlanCode.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
