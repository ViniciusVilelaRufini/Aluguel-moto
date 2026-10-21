// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'claim_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const ClaimStatus _$submitted = const ClaimStatus._('submitted');
const ClaimStatus _$underReview = const ClaimStatus._('underReview');
const ClaimStatus _$approved = const ClaimStatus._('approved');
const ClaimStatus _$rejected = const ClaimStatus._('rejected');
const ClaimStatus _$paid = const ClaimStatus._('paid');
const ClaimStatus _$unknownDefaultOpenApi =
    const ClaimStatus._('unknownDefaultOpenApi');

ClaimStatus _$valueOf(String name) {
  switch (name) {
    case 'submitted':
      return _$submitted;
    case 'underReview':
      return _$underReview;
    case 'approved':
      return _$approved;
    case 'rejected':
      return _$rejected;
    case 'paid':
      return _$paid;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<ClaimStatus> _$values =
    BuiltSet<ClaimStatus>(const <ClaimStatus>[
  _$submitted,
  _$underReview,
  _$approved,
  _$rejected,
  _$paid,
  _$unknownDefaultOpenApi,
]);

class _$ClaimStatusMeta {
  const _$ClaimStatusMeta();
  ClaimStatus get submitted => _$submitted;
  ClaimStatus get underReview => _$underReview;
  ClaimStatus get approved => _$approved;
  ClaimStatus get rejected => _$rejected;
  ClaimStatus get paid => _$paid;
  ClaimStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  ClaimStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<ClaimStatus> get values => _$values;
}

abstract class _$ClaimStatusMixin {
  // ignore: non_constant_identifier_names
  _$ClaimStatusMeta get ClaimStatus => const _$ClaimStatusMeta();
}

Serializer<ClaimStatus> _$claimStatusSerializer = _$ClaimStatusSerializer();

class _$ClaimStatusSerializer implements PrimitiveSerializer<ClaimStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'submitted': 'submitted',
    'underReview': 'under_review',
    'approved': 'approved',
    'rejected': 'rejected',
    'paid': 'paid',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'submitted': 'submitted',
    'under_review': 'underReview',
    'approved': 'approved',
    'rejected': 'rejected',
    'paid': 'paid',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[ClaimStatus];
  @override
  final String wireName = 'ClaimStatus';

  @override
  Object serialize(Serializers serializers, ClaimStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  ClaimStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      ClaimStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
