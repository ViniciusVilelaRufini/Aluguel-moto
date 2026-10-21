// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'kyc_decision.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const KycDecision _$approved = const KycDecision._('approved');
const KycDecision _$rejected = const KycDecision._('rejected');
const KycDecision _$unknownDefaultOpenApi =
    const KycDecision._('unknownDefaultOpenApi');

KycDecision _$valueOf(String name) {
  switch (name) {
    case 'approved':
      return _$approved;
    case 'rejected':
      return _$rejected;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<KycDecision> _$values =
    BuiltSet<KycDecision>(const <KycDecision>[
  _$approved,
  _$rejected,
  _$unknownDefaultOpenApi,
]);

class _$KycDecisionMeta {
  const _$KycDecisionMeta();
  KycDecision get approved => _$approved;
  KycDecision get rejected => _$rejected;
  KycDecision get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  KycDecision valueOf(String name) => _$valueOf(name);
  BuiltSet<KycDecision> get values => _$values;
}

abstract class _$KycDecisionMixin {
  // ignore: non_constant_identifier_names
  _$KycDecisionMeta get KycDecision => const _$KycDecisionMeta();
}

Serializer<KycDecision> _$kycDecisionSerializer = _$KycDecisionSerializer();

class _$KycDecisionSerializer implements PrimitiveSerializer<KycDecision> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'approved': 'approved',
    'rejected': 'rejected',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'approved': 'approved',
    'rejected': 'rejected',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[KycDecision];
  @override
  final String wireName = 'KycDecision';

  @override
  Object serialize(Serializers serializers, KycDecision object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  KycDecision deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      KycDecision.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
