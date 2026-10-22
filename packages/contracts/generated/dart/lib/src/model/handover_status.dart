//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'handover_status.g.dart';

class HandoverStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'pending_customer')
  static const HandoverStatus pendingCustomer = _$pendingCustomer;
  @BuiltValueEnumConst(wireName: r'accepted')
  static const HandoverStatus accepted = _$accepted;
  @BuiltValueEnumConst(wireName: r'disputed')
  static const HandoverStatus disputed = _$disputed;
  @BuiltValueEnumConst(wireName: r'canceled')
  static const HandoverStatus canceled = _$canceled;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const HandoverStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<HandoverStatus> get serializer =>
      _$handoverStatusSerializer;

  const HandoverStatus._(String name) : super(name);

  static BuiltSet<HandoverStatus> get values => _$values;
  static HandoverStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class HandoverStatusMixin = Object with _$HandoverStatusMixin;
