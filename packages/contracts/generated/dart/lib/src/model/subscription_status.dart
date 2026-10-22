//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'subscription_status.g.dart';

/// `paused`: pausada pelo cliente (`POST /payments/subscriptions/{id}/pause`); aluguéis no plano não são cobertos.
class SubscriptionStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'active')
  static const SubscriptionStatus active = _$active;
  @BuiltValueEnumConst(wireName: r'past_due')
  static const SubscriptionStatus pastDue = _$pastDue;
  @BuiltValueEnumConst(wireName: r'canceled')
  static const SubscriptionStatus canceled = _$canceled;
  @BuiltValueEnumConst(wireName: r'expired')
  static const SubscriptionStatus expired = _$expired;
  @BuiltValueEnumConst(wireName: r'paused')
  static const SubscriptionStatus paused = _$paused;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const SubscriptionStatus unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<SubscriptionStatus> get serializer =>
      _$subscriptionStatusSerializer;

  const SubscriptionStatus._(String name) : super(name);

  static BuiltSet<SubscriptionStatus> get values => _$values;
  static SubscriptionStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class SubscriptionStatusMixin = Object with _$SubscriptionStatusMixin;
