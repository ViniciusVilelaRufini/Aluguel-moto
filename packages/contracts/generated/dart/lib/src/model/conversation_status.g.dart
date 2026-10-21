// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'conversation_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const ConversationStatus _$open = const ConversationStatus._('open');
const ConversationStatus _$closed = const ConversationStatus._('closed');
const ConversationStatus _$unknownDefaultOpenApi =
    const ConversationStatus._('unknownDefaultOpenApi');

ConversationStatus _$valueOf(String name) {
  switch (name) {
    case 'open':
      return _$open;
    case 'closed':
      return _$closed;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<ConversationStatus> _$values =
    BuiltSet<ConversationStatus>(const <ConversationStatus>[
  _$open,
  _$closed,
  _$unknownDefaultOpenApi,
]);

class _$ConversationStatusMeta {
  const _$ConversationStatusMeta();
  ConversationStatus get open => _$open;
  ConversationStatus get closed => _$closed;
  ConversationStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  ConversationStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<ConversationStatus> get values => _$values;
}

abstract class _$ConversationStatusMixin {
  // ignore: non_constant_identifier_names
  _$ConversationStatusMeta get ConversationStatus =>
      const _$ConversationStatusMeta();
}

Serializer<ConversationStatus> _$conversationStatusSerializer =
    _$ConversationStatusSerializer();

class _$ConversationStatusSerializer
    implements PrimitiveSerializer<ConversationStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'open': 'open',
    'closed': 'closed',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'open': 'open',
    'closed': 'closed',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[ConversationStatus];
  @override
  final String wireName = 'ConversationStatus';

  @override
  Object serialize(Serializers serializers, ConversationStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  ConversationStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      ConversationStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
