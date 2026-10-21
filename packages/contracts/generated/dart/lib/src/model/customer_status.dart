//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'customer_status.g.dart';

class CustomerStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'active')
  static const CustomerStatus active = _$active;
  @BuiltValueEnumConst(wireName: r'blocked')
  static const CustomerStatus blocked = _$blocked;
  @BuiltValueEnumConst(wireName: r'deleted')
  static const CustomerStatus deleted = _$deleted;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const CustomerStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<CustomerStatus> get serializer =>
      _$customerStatusSerializer;

  const CustomerStatus._(String name) : super(name);

  static BuiltSet<CustomerStatus> get values => _$values;
  static CustomerStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class CustomerStatusMixin = Object with _$CustomerStatusMixin;
