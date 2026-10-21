// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dispute_decision.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const DisputeDecision _$accepted = const DisputeDecision._('accepted');
const DisputeDecision _$rejected = const DisputeDecision._('rejected');
const DisputeDecision _$unknownDefaultOpenApi =
    const DisputeDecision._('unknownDefaultOpenApi');

DisputeDecision _$valueOf(String name) {
  switch (name) {
    case 'accepted':
      return _$accepted;
    case 'rejected':
      return _$rejected;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<DisputeDecision> _$values =
    BuiltSet<DisputeDecision>(const <DisputeDecision>[
  _$accepted,
  _$rejected,
  _$unknownDefaultOpenApi,
]);

class _$DisputeDecisionMeta {
  const _$DisputeDecisionMeta();
  DisputeDecision get accepted => _$accepted;
  DisputeDecision get rejected => _$rejected;
  DisputeDecision get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  DisputeDecision valueOf(String name) => _$valueOf(name);
  BuiltSet<DisputeDecision> get values => _$values;
}

abstract class _$DisputeDecisionMixin {
  // ignore: non_constant_identifier_names
  _$DisputeDecisionMeta get DisputeDecision => const _$DisputeDecisionMeta();
}

Serializer<DisputeDecision> _$disputeDecisionSerializer =
    _$DisputeDecisionSerializer();

class _$DisputeDecisionSerializer
    implements PrimitiveSerializer<DisputeDecision> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'accepted': 'accepted',
    'rejected': 'rejected',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'accepted': 'accepted',
    'rejected': 'rejected',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[DisputeDecision];
  @override
  final String wireName = 'DisputeDecision';

  @override
  Object serialize(Serializers serializers, DisputeDecision object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  DisputeDecision deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      DisputeDecision.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
