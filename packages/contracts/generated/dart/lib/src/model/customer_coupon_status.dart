//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'customer_coupon_status.g.dart';

class CustomerCouponStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'available')
  static const CustomerCouponStatus available = _$available;
  @BuiltValueEnumConst(wireName: r'used')
  static const CustomerCouponStatus used = _$used;
  @BuiltValueEnumConst(wireName: r'expired')
  static const CustomerCouponStatus expired = _$expired;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const CustomerCouponStatus unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<CustomerCouponStatus> get serializer =>
      _$customerCouponStatusSerializer;

  const CustomerCouponStatus._(String name) : super(name);

  static BuiltSet<CustomerCouponStatus> get values => _$values;
  static CustomerCouponStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class CustomerCouponStatusMixin = Object
    with _$CustomerCouponStatusMixin;
