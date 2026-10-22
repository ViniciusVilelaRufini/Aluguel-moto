// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pix_key_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const PixKeyType _$cpf = const PixKeyType._('cpf');
const PixKeyType _$email = const PixKeyType._('email');
const PixKeyType _$phone = const PixKeyType._('phone');
const PixKeyType _$random = const PixKeyType._('random');
const PixKeyType _$unknownDefaultOpenApi =
    const PixKeyType._('unknownDefaultOpenApi');

PixKeyType _$valueOf(String name) {
  switch (name) {
    case 'cpf':
      return _$cpf;
    case 'email':
      return _$email;
    case 'phone':
      return _$phone;
    case 'random':
      return _$random;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<PixKeyType> _$values = BuiltSet<PixKeyType>(const <PixKeyType>[
  _$cpf,
  _$email,
  _$phone,
  _$random,
  _$unknownDefaultOpenApi,
]);

class _$PixKeyTypeMeta {
  const _$PixKeyTypeMeta();
  PixKeyType get cpf => _$cpf;
  PixKeyType get email => _$email;
  PixKeyType get phone => _$phone;
  PixKeyType get random => _$random;
  PixKeyType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  PixKeyType valueOf(String name) => _$valueOf(name);
  BuiltSet<PixKeyType> get values => _$values;
}

abstract class _$PixKeyTypeMixin {
  // ignore: non_constant_identifier_names
  _$PixKeyTypeMeta get PixKeyType => const _$PixKeyTypeMeta();
}

Serializer<PixKeyType> _$pixKeyTypeSerializer = _$PixKeyTypeSerializer();

class _$PixKeyTypeSerializer implements PrimitiveSerializer<PixKeyType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'cpf': 'cpf',
    'email': 'email',
    'phone': 'phone',
    'random': 'random',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'cpf': 'cpf',
    'email': 'email',
    'phone': 'phone',
    'random': 'random',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[PixKeyType];
  @override
  final String wireName = 'PixKeyType';

  @override
  Object serialize(Serializers serializers, PixKeyType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  PixKeyType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      PixKeyType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
