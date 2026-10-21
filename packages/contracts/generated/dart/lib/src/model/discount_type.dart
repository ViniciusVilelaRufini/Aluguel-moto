//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'discount_type.g.dart';

class DiscountType extends EnumClass {
  @BuiltValueEnumConst(wireName: r'percent')
  static const DiscountType percent = _$percent;
  @BuiltValueEnumConst(wireName: r'fixed')
  static const DiscountType fixed = _$fixed;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const DiscountType unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<DiscountType> get serializer => _$discountTypeSerializer;

  const DiscountType._(String name) : super(name);

  static BuiltSet<DiscountType> get values => _$values;
  static DiscountType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class DiscountTypeMixin = Object with _$DiscountTypeMixin;
