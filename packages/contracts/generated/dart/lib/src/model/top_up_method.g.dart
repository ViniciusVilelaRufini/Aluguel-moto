// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'top_up_method.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const TopUpMethod _$card = const TopUpMethod._('card');
const TopUpMethod _$pix = const TopUpMethod._('pix');
const TopUpMethod _$unknownDefaultOpenApi =
    const TopUpMethod._('unknownDefaultOpenApi');

TopUpMethod _$valueOf(String name) {
  switch (name) {
    case 'card':
      return _$card;
    case 'pix':
      return _$pix;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<TopUpMethod> _$values =
    BuiltSet<TopUpMethod>(const <TopUpMethod>[
  _$card,
  _$pix,
  _$unknownDefaultOpenApi,
]);

class _$TopUpMethodMeta {
  const _$TopUpMethodMeta();
  TopUpMethod get card => _$card;
  TopUpMethod get pix => _$pix;
  TopUpMethod get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  TopUpMethod valueOf(String name) => _$valueOf(name);
  BuiltSet<TopUpMethod> get values => _$values;
}

abstract class _$TopUpMethodMixin {
  // ignore: non_constant_identifier_names
  _$TopUpMethodMeta get TopUpMethod => const _$TopUpMethodMeta();
}

Serializer<TopUpMethod> _$topUpMethodSerializer = _$TopUpMethodSerializer();

class _$TopUpMethodSerializer implements PrimitiveSerializer<TopUpMethod> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'card': 'card',
    'pix': 'pix',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'card': 'card',
    'pix': 'pix',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[TopUpMethod];
  @override
  final String wireName = 'TopUpMethod';

  @override
  Object serialize(Serializers serializers, TopUpMethod object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  TopUpMethod deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      TopUpMethod.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
