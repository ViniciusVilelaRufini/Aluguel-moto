// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'handover_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const HandoverStatus _$pendingCustomer =
    const HandoverStatus._('pendingCustomer');
const HandoverStatus _$accepted = const HandoverStatus._('accepted');
const HandoverStatus _$disputed = const HandoverStatus._('disputed');
const HandoverStatus _$canceled = const HandoverStatus._('canceled');
const HandoverStatus _$unknownDefaultOpenApi =
    const HandoverStatus._('unknownDefaultOpenApi');

HandoverStatus _$valueOf(String name) {
  switch (name) {
    case 'pendingCustomer':
      return _$pendingCustomer;
    case 'accepted':
      return _$accepted;
    case 'disputed':
      return _$disputed;
    case 'canceled':
      return _$canceled;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<HandoverStatus> _$values =
    BuiltSet<HandoverStatus>(const <HandoverStatus>[
  _$pendingCustomer,
  _$accepted,
  _$disputed,
  _$canceled,
  _$unknownDefaultOpenApi,
]);

class _$HandoverStatusMeta {
  const _$HandoverStatusMeta();
  HandoverStatus get pendingCustomer => _$pendingCustomer;
  HandoverStatus get accepted => _$accepted;
  HandoverStatus get disputed => _$disputed;
  HandoverStatus get canceled => _$canceled;
  HandoverStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  HandoverStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<HandoverStatus> get values => _$values;
}

abstract class _$HandoverStatusMixin {
  // ignore: non_constant_identifier_names
  _$HandoverStatusMeta get HandoverStatus => const _$HandoverStatusMeta();
}

Serializer<HandoverStatus> _$handoverStatusSerializer =
    _$HandoverStatusSerializer();

class _$HandoverStatusSerializer
    implements PrimitiveSerializer<HandoverStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'pendingCustomer': 'pending_customer',
    'accepted': 'accepted',
    'disputed': 'disputed',
    'canceled': 'canceled',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'pending_customer': 'pendingCustomer',
    'accepted': 'accepted',
    'disputed': 'disputed',
    'canceled': 'canceled',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[HandoverStatus];
  @override
  final String wireName = 'HandoverStatus';

  @override
  Object serialize(Serializers serializers, HandoverStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  HandoverStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      HandoverStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
