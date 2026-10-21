//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'staff_group.g.dart';

class StaffGroup extends EnumClass {
  @BuiltValueEnumConst(wireName: r'admin')
  static const StaffGroup admin = _$admin;
  @BuiltValueEnumConst(wireName: r'operacao')
  static const StaffGroup operacao = _$operacao;
  @BuiltValueEnumConst(wireName: r'financeiro')
  static const StaffGroup financeiro = _$financeiro;
  @BuiltValueEnumConst(wireName: r'suporte')
  static const StaffGroup suporte = _$suporte;
  @BuiltValueEnumConst(wireName: r'campo')
  static const StaffGroup campo = _$campo;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const StaffGroup unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<StaffGroup> get serializer => _$staffGroupSerializer;

  const StaffGroup._(String name) : super(name);

  static BuiltSet<StaffGroup> get values => _$values;
  static StaffGroup valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class StaffGroupMixin = Object with _$StaffGroupMixin;
