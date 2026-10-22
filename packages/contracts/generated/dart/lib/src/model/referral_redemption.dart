//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/wallet_entry.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'referral_redemption.g.dart';

/// ReferralRedemption
///
/// Properties:
/// * [code]
/// * [referrerName] - Primeiro nome de quem indicou.
/// * [rewardCents]
/// * [walletEntry]
@BuiltValue()
abstract class ReferralRedemption
    implements Built<ReferralRedemption, ReferralRedemptionBuilder> {
  @BuiltValueField(wireName: r'code')
  String get code;

  /// Primeiro nome de quem indicou.
  @BuiltValueField(wireName: r'referrerName')
  String? get referrerName;

  @BuiltValueField(wireName: r'rewardCents')
  int get rewardCents;

  @BuiltValueField(wireName: r'walletEntry')
  WalletEntry get walletEntry;

  ReferralRedemption._();

  factory ReferralRedemption([void updates(ReferralRedemptionBuilder b)]) =
      _$ReferralRedemption;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReferralRedemptionBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ReferralRedemption> get serializer =>
      _$ReferralRedemptionSerializer();
}

class _$ReferralRedemptionSerializer
    implements PrimitiveSerializer<ReferralRedemption> {
  @override
  final Iterable<Type> types = const [ReferralRedemption, _$ReferralRedemption];

  @override
  final String wireName = r'ReferralRedemption';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ReferralRedemption object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(String),
    );
    if (object.referrerName != null) {
      yield r'referrerName';
      yield serializers.serialize(
        object.referrerName,
        specifiedType: const FullType(String),
      );
    }
    yield r'rewardCents';
    yield serializers.serialize(
      object.rewardCents,
      specifiedType: const FullType(int),
    );
    yield r'walletEntry';
    yield serializers.serialize(
      object.walletEntry,
      specifiedType: const FullType(WalletEntry),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    ReferralRedemption object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object,
            specifiedType: specifiedType)
        .toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required ReferralRedemptionBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.code = valueDes;
          break;
        case r'referrerName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.referrerName = valueDes;
          break;
        case r'rewardCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.rewardCents = valueDes;
          break;
        case r'walletEntry':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(WalletEntry),
          ) as WalletEntry;
          result.walletEntry.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ReferralRedemption deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReferralRedemptionBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}
