//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/referral_reward_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'referral_reward.g.dart';

/// ReferralReward
///
/// Properties:
/// * [id]
/// * [refereeName] - Primeiro nome do amigo (LGPD).
/// * [status]
/// * [amountCents]
/// * [walletEntryId] - Lançamento `bonus` (quando `granted`).
/// * [createdAt]
/// * [grantedAt]
@BuiltValue()
abstract class ReferralReward
    implements Built<ReferralReward, ReferralRewardBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  /// Primeiro nome do amigo (LGPD).
  @BuiltValueField(wireName: r'refereeName')
  String get refereeName;

  @BuiltValueField(wireName: r'status')
  ReferralRewardStatus get status;
  // enum statusEnum {  pending,  granted,  canceled,  };

  @BuiltValueField(wireName: r'amountCents')
  int get amountCents;

  /// Lançamento `bonus` (quando `granted`).
  @BuiltValueField(wireName: r'walletEntryId')
  String? get walletEntryId;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'grantedAt')
  DateTime? get grantedAt;

  ReferralReward._();

  factory ReferralReward([void updates(ReferralRewardBuilder b)]) =
      _$ReferralReward;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReferralRewardBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ReferralReward> get serializer =>
      _$ReferralRewardSerializer();
}

class _$ReferralRewardSerializer
    implements PrimitiveSerializer<ReferralReward> {
  @override
  final Iterable<Type> types = const [ReferralReward, _$ReferralReward];

  @override
  final String wireName = r'ReferralReward';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ReferralReward object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'refereeName';
    yield serializers.serialize(
      object.refereeName,
      specifiedType: const FullType(String),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(ReferralRewardStatus),
    );
    yield r'amountCents';
    yield serializers.serialize(
      object.amountCents,
      specifiedType: const FullType(int),
    );
    if (object.walletEntryId != null) {
      yield r'walletEntryId';
      yield serializers.serialize(
        object.walletEntryId,
        specifiedType: const FullType(String),
      );
    }
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.grantedAt != null) {
      yield r'grantedAt';
      yield serializers.serialize(
        object.grantedAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    ReferralReward object, {
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
    required ReferralRewardBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'refereeName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.refereeName = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ReferralRewardStatus),
          ) as ReferralRewardStatus;
          result.status = valueDes;
          break;
        case r'amountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.amountCents = valueDes;
          break;
        case r'walletEntryId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.walletEntryId = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'grantedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.grantedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ReferralReward deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReferralRewardBuilder();
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
