// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'support_message_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const SupportMessageStatus _$sent = const SupportMessageStatus._('sent');
const SupportMessageStatus _$delivered =
    const SupportMessageStatus._('delivered');
const SupportMessageStatus _$read = const SupportMessageStatus._('read');
const SupportMessageStatus _$unknownDefaultOpenApi =
    const SupportMessageStatus._('unknownDefaultOpenApi');

SupportMessageStatus _$valueOf(String name) {
  switch (name) {
    case 'sent':
      return _$sent;
    case 'delivered':
      return _$delivered;
    case 'read':
      return _$read;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<SupportMessageStatus> _$values =
    BuiltSet<SupportMessageStatus>(const <SupportMessageStatus>[
  _$sent,
  _$delivered,
  _$read,
  _$unknownDefaultOpenApi,
]);

class _$SupportMessageStatusMeta {
  const _$SupportMessageStatusMeta();
  SupportMessageStatus get sent => _$sent;
  SupportMessageStatus get delivered => _$delivered;
  SupportMessageStatus get read => _$read;
  SupportMessageStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  SupportMessageStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<SupportMessageStatus> get values => _$values;
}

abstract class _$SupportMessageStatusMixin {
  // ignore: non_constant_identifier_names
  _$SupportMessageStatusMeta get SupportMessageStatus =>
      const _$SupportMessageStatusMeta();
}

Serializer<SupportMessageStatus> _$supportMessageStatusSerializer =
    _$SupportMessageStatusSerializer();

class _$SupportMessageStatusSerializer
    implements PrimitiveSerializer<SupportMessageStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[SupportMessageStatus];
  @override
  final String wireName = 'SupportMessageStatus';

  @override
  Object serialize(Serializers serializers, SupportMessageStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  SupportMessageStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      SupportMessageStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
