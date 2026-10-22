//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'pix_key_type.g.dart';

/// `cpf` 11 dígitos (o CPF do próprio cliente); `email`; `phone` E.164 brasileiro (`+55…`); `random` chave aleatória (UUID).
class PixKeyType extends EnumClass {
  @BuiltValueEnumConst(wireName: r'cpf')
  static const PixKeyType cpf = _$cpf;
  @BuiltValueEnumConst(wireName: r'email')
  static const PixKeyType email = _$email;
  @BuiltValueEnumConst(wireName: r'phone')
  static const PixKeyType phone = _$phone;
  @BuiltValueEnumConst(wireName: r'random')
  static const PixKeyType random = _$random;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const PixKeyType unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<PixKeyType> get serializer => _$pixKeyTypeSerializer;

  const PixKeyType._(String name) : super(name);

  static BuiltSet<PixKeyType> get values => _$values;
  static PixKeyType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class PixKeyTypeMixin = Object with _$PixKeyTypeMixin;
