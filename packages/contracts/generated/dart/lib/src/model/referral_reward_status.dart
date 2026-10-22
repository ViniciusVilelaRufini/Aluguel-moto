//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'referral_reward_status.g.dart';

/// `pending` até o indicado terminar a primeira corrida; `granted` com o bônus lançado na carteira.
class ReferralRewardStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'pending')
  static const ReferralRewardStatus pending = _$pending;
  @BuiltValueEnumConst(wireName: r'granted')
  static const ReferralRewardStatus granted = _$granted;
  @BuiltValueEnumConst(wireName: r'canceled')
  static const ReferralRewardStatus canceled = _$canceled;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const ReferralRewardStatus unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<ReferralRewardStatus> get serializer =>
      _$referralRewardStatusSerializer;

  const ReferralRewardStatus._(String name) : super(name);

  static BuiltSet<ReferralRewardStatus> get values => _$values;
  static ReferralRewardStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class ReferralRewardStatusMixin = Object
    with _$ReferralRewardStatusMixin;
