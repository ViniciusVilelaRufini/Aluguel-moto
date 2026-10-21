//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'dispute_decision.g.dart';

class DisputeDecision extends EnumClass {
  @BuiltValueEnumConst(wireName: r'accepted')
  static const DisputeDecision accepted = _$accepted;
  @BuiltValueEnumConst(wireName: r'rejected')
  static const DisputeDecision rejected = _$rejected;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const DisputeDecision unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<DisputeDecision> get serializer =>
      _$disputeDecisionSerializer;

  const DisputeDecision._(String name) : super(name);

  static BuiltSet<DisputeDecision> get values => _$values;
  static DisputeDecision valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class DisputeDecisionMixin = Object with _$DisputeDecisionMixin;
