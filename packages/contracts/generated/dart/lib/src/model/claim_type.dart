//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'claim_type.g.dart';

class ClaimType extends EnumClass {
  @BuiltValueEnumConst(wireName: r'accident')
  static const ClaimType accident = _$accident;
  @BuiltValueEnumConst(wireName: r'theft')
  static const ClaimType theft = _$theft;
  @BuiltValueEnumConst(wireName: r'damage')
  static const ClaimType damage = _$damage;
  @BuiltValueEnumConst(wireName: r'personal_injury')
  static const ClaimType personalInjury = _$personalInjury;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const ClaimType unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<ClaimType> get serializer => _$claimTypeSerializer;

  const ClaimType._(String name) : super(name);

  static BuiltSet<ClaimType> get values => _$values;
  static ClaimType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class ClaimTypeMixin = Object with _$ClaimTypeMixin;
