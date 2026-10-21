//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'dispute_status.g.dart';

class DisputeStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'open')
  static const DisputeStatus open = _$open;
  @BuiltValueEnumConst(wireName: r'under_review')
  static const DisputeStatus underReview = _$underReview;
  @BuiltValueEnumConst(wireName: r'accepted')
  static const DisputeStatus accepted = _$accepted;
  @BuiltValueEnumConst(wireName: r'rejected')
  static const DisputeStatus rejected = _$rejected;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const DisputeStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<DisputeStatus> get serializer => _$disputeStatusSerializer;

  const DisputeStatus._(String name) : super(name);

  static BuiltSet<DisputeStatus> get values => _$values;
  static DisputeStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class DisputeStatusMixin = Object with _$DisputeStatusMixin;
