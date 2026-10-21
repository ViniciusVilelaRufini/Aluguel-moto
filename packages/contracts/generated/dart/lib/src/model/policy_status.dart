//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'policy_status.g.dart';

class PolicyStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'active')
  static const PolicyStatus active = _$active;
  @BuiltValueEnumConst(wireName: r'canceled')
  static const PolicyStatus canceled = _$canceled;
  @BuiltValueEnumConst(wireName: r'expired')
  static const PolicyStatus expired = _$expired;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const PolicyStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<PolicyStatus> get serializer => _$policyStatusSerializer;

  const PolicyStatus._(String name) : super(name);

  static BuiltSet<PolicyStatus> get values => _$values;
  static PolicyStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class PolicyStatusMixin = Object with _$PolicyStatusMixin;
