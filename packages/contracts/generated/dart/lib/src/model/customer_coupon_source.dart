//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'customer_coupon_source.g.dart';

class CustomerCouponSource extends EnumClass {
  @BuiltValueEnumConst(wireName: r'manual')
  static const CustomerCouponSource manual = _$manual;
  @BuiltValueEnumConst(wireName: r'referral')
  static const CustomerCouponSource referral = _$referral;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const CustomerCouponSource unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<CustomerCouponSource> get serializer =>
      _$customerCouponSourceSerializer;

  const CustomerCouponSource._(String name) : super(name);

  static BuiltSet<CustomerCouponSource> get values => _$values;
  static CustomerCouponSource valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class CustomerCouponSourceMixin = Object
    with _$CustomerCouponSourceMixin;
