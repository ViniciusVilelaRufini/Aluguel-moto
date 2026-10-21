//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'claim_status.g.dart';

class ClaimStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'submitted')
  static const ClaimStatus submitted = _$submitted;
  @BuiltValueEnumConst(wireName: r'under_review')
  static const ClaimStatus underReview = _$underReview;
  @BuiltValueEnumConst(wireName: r'approved')
  static const ClaimStatus approved = _$approved;
  @BuiltValueEnumConst(wireName: r'rejected')
  static const ClaimStatus rejected = _$rejected;
  @BuiltValueEnumConst(wireName: r'paid')
  static const ClaimStatus paid = _$paid;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const ClaimStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<ClaimStatus> get serializer => _$claimStatusSerializer;

  const ClaimStatus._(String name) : super(name);

  static BuiltSet<ClaimStatus> get values => _$values;
  static ClaimStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class ClaimStatusMixin = Object with _$ClaimStatusMixin;
