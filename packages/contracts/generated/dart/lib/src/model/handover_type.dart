//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'handover_type.g.dart';

/// `pickup` = saída do galpão com aceite do cliente; `return_depot` = chegada no galpão (encerra o aluguel).
class HandoverType extends EnumClass {
  @BuiltValueEnumConst(wireName: r'pickup')
  static const HandoverType pickup = _$pickup;
  @BuiltValueEnumConst(wireName: r'return_depot')
  static const HandoverType returnDepot = _$returnDepot;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const HandoverType unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<HandoverType> get serializer => _$handoverTypeSerializer;

  const HandoverType._(String name) : super(name);

  static BuiltSet<HandoverType> get values => _$values;
  static HandoverType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class HandoverTypeMixin = Object with _$HandoverTypeMixin;
