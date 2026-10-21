// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dispute_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const DisputeStatus _$open = const DisputeStatus._('open');
const DisputeStatus _$underReview = const DisputeStatus._('underReview');
const DisputeStatus _$accepted = const DisputeStatus._('accepted');
const DisputeStatus _$rejected = const DisputeStatus._('rejected');
const DisputeStatus _$unknownDefaultOpenApi =
    const DisputeStatus._('unknownDefaultOpenApi');

DisputeStatus _$valueOf(String name) {
  switch (name) {
    case 'open':
      return _$open;
    case 'underReview':
      return _$underReview;
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

final BuiltSet<DisputeStatus> _$values =
    BuiltSet<DisputeStatus>(const <DisputeStatus>[
  _$open,
  _$underReview,
  _$accepted,
  _$rejected,
  _$unknownDefaultOpenApi,
]);

class _$DisputeStatusMeta {
  const _$DisputeStatusMeta();
  DisputeStatus get open => _$open;
  DisputeStatus get underReview => _$underReview;
  DisputeStatus get accepted => _$accepted;
  DisputeStatus get rejected => _$rejected;
  DisputeStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  DisputeStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<DisputeStatus> get values => _$values;
}

abstract class _$DisputeStatusMixin {
  // ignore: non_constant_identifier_names
  _$DisputeStatusMeta get DisputeStatus => const _$DisputeStatusMeta();
}

Serializer<DisputeStatus> _$disputeStatusSerializer =
    _$DisputeStatusSerializer();

class _$DisputeStatusSerializer implements PrimitiveSerializer<DisputeStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'open': 'open',
    'underReview': 'under_review',
    'accepted': 'accepted',
    'rejected': 'rejected',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'open': 'open',
    'under_review': 'underReview',
    'accepted': 'accepted',
    'rejected': 'rejected',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[DisputeStatus];
  @override
  final String wireName = 'DisputeStatus';

  @override
  Object serialize(Serializers serializers, DisputeStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  DisputeStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      DisputeStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
