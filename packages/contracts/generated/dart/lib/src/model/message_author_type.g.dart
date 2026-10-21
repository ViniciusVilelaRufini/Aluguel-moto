// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'message_author_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const MessageAuthorType _$customer = const MessageAuthorType._('customer');
const MessageAuthorType _$staff = const MessageAuthorType._('staff');
const MessageAuthorType _$system = const MessageAuthorType._('system');
const MessageAuthorType _$unknownDefaultOpenApi =
    const MessageAuthorType._('unknownDefaultOpenApi');

MessageAuthorType _$valueOf(String name) {
  switch (name) {
    case 'customer':
      return _$customer;
    case 'staff':
      return _$staff;
    case 'system':
      return _$system;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<MessageAuthorType> _$values =
    BuiltSet<MessageAuthorType>(const <MessageAuthorType>[
  _$customer,
  _$staff,
  _$system,
  _$unknownDefaultOpenApi,
]);

class _$MessageAuthorTypeMeta {
  const _$MessageAuthorTypeMeta();
  MessageAuthorType get customer => _$customer;
  MessageAuthorType get staff => _$staff;
  MessageAuthorType get system => _$system;
  MessageAuthorType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  MessageAuthorType valueOf(String name) => _$valueOf(name);
  BuiltSet<MessageAuthorType> get values => _$values;
}

abstract class _$MessageAuthorTypeMixin {
  // ignore: non_constant_identifier_names
  _$MessageAuthorTypeMeta get MessageAuthorType =>
      const _$MessageAuthorTypeMeta();
}

Serializer<MessageAuthorType> _$messageAuthorTypeSerializer =
    _$MessageAuthorTypeSerializer();

class _$MessageAuthorTypeSerializer
    implements PrimitiveSerializer<MessageAuthorType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'customer': 'customer',
    'staff': 'staff',
    'system': 'system',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'customer': 'customer',
    'staff': 'staff',
    'system': 'system',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[MessageAuthorType];
  @override
  final String wireName = 'MessageAuthorType';

  @override
  Object serialize(Serializers serializers, MessageAuthorType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  MessageAuthorType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      MessageAuthorType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
