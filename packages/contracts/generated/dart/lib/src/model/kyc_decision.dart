//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'kyc_decision.g.dart';

class KycDecision extends EnumClass {
  @BuiltValueEnumConst(wireName: r'approved')
  static const KycDecision approved = _$approved;
  @BuiltValueEnumConst(wireName: r'rejected')
  static const KycDecision rejected = _$rejected;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const KycDecision unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<KycDecision> get serializer => _$kycDecisionSerializer;

  const KycDecision._(String name) : super(name);

  static BuiltSet<KycDecision> get values => _$values;
  static KycDecision valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class KycDecisionMixin = Object with _$KycDecisionMixin;
