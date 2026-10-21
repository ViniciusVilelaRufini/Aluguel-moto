// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'kyc_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const KycStatus _$notStarted = const KycStatus._('notStarted');
const KycStatus _$pending = const KycStatus._('pending');
const KycStatus _$approved = const KycStatus._('approved');
const KycStatus _$rejected = const KycStatus._('rejected');
const KycStatus _$unknownDefaultOpenApi =
    const KycStatus._('unknownDefaultOpenApi');

KycStatus _$valueOf(String name) {
  switch (name) {
    case 'notStarted':
      return _$notStarted;
    case 'pending':
      return _$pending;
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

final BuiltSet<KycStatus> _$values = BuiltSet<KycStatus>(const <KycStatus>[
  _$notStarted,
  _$pending,
  _$approved,
  _$rejected,
  _$unknownDefaultOpenApi,
]);

class _$KycStatusMeta {
  const _$KycStatusMeta();
  KycStatus get notStarted => _$notStarted;
  KycStatus get pending => _$pending;
  KycStatus get approved => _$approved;
  KycStatus get rejected => _$rejected;
  KycStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  KycStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<KycStatus> get values => _$values;
}

abstract class _$KycStatusMixin {
  // ignore: non_constant_identifier_names
  _$KycStatusMeta get KycStatus => const _$KycStatusMeta();
}

Serializer<KycStatus> _$kycStatusSerializer = _$KycStatusSerializer();

class _$KycStatusSerializer implements PrimitiveSerializer<KycStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'notStarted': 'not_started',
    'pending': 'pending',
    'approved': 'approved',
    'rejected': 'rejected',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'not_started': 'notStarted',
    'pending': 'pending',
    'approved': 'approved',
    'rejected': 'rejected',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[KycStatus];
  @override
  final String wireName = 'KycStatus';

  @override
  Object serialize(Serializers serializers, KycStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  KycStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      KycStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
